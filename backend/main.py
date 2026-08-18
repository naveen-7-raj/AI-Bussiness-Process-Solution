import asyncio
import datetime
import json
import os
import threading
import time
from typing import Any

import asyncpg
import jwt
from fastapi import Depends, FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from kafka import KafkaConsumer
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr

from ml.predict import predict_delay
from recommendations_engine import generate_recommendations, Recommendation
from llm_layer import generate_business_explanation

app = FastAPI()

# Global references for thread-safe event broadcasting
main_event_loop: asyncio.AbstractEventLoop | None = None
# Queue shared between the Kafka thread and the async broadcast task
_broadcast_queue: asyncio.Queue | None = None

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f"[WS] Client connected. Total connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        print(f"[WS] Client disconnected. Total connections: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        for connection in list(self.active_connections):
            try:
                await connection.send_json(message)
            except Exception as e:
                print(f"[WS] Failed to send message: {e}")
                self.disconnect(connection)

manager = ConnectionManager()

def broadcast_update_to_clients(data: dict):
    """Thread-safe: push a message onto the queue for the async broadcaster."""
    if _broadcast_queue is not None and main_event_loop is not None and main_event_loop.is_running():
        # put_nowait is safe to call from any thread on an asyncio.Queue
        main_event_loop.call_soon_threadsafe(_broadcast_queue.put_nowait, data)
    else:
        print("[WS] Broadcast queue not ready. Message dropped.")


async def _broadcast_worker():
    """Async task that drains the queue and sends messages to all WS clients."""
    while True:
        try:
            data = await _broadcast_queue.get()
            await manager.broadcast(data)
            _broadcast_queue.task_done()
        except Exception as exc:
            print(f"[WS] Broadcast worker error: {exc}")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/app_db")
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "fallback_secret")
ALGORITHM = "HS256"
KAFKA_BOOTSTRAP_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092").split(",")
KAFKA_TOPICS = ("inventory", "orders", "warehouse", "logistics")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()


class RegisterRequest(BaseModel):
    company_name: str
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


def parse_event_timestamp(value: Any) -> datetime.datetime:
    if value is None:
        return datetime.datetime.now(datetime.timezone.utc)
    if isinstance(value, datetime.datetime):
        return value.astimezone(datetime.timezone.utc) if value.tzinfo else value.replace(tzinfo=datetime.timezone.utc)
    try:
        return datetime.datetime.fromisoformat(str(value).replace("Z", "+00:00")).astimezone(datetime.timezone.utc)
    except ValueError:
        return datetime.datetime.now(datetime.timezone.utc)


async def initialize_database() -> None:
    conn = await asyncpg.connect(DATABASE_URL)
    try:
        await conn.execute(
            """
            CREATE TABLE IF NOT EXISTS companies (
                id SERIAL PRIMARY KEY,
                name VARCHAR UNIQUE NOT NULL
            );

            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                company_id INT REFERENCES companies(id),
                email VARCHAR UNIQUE NOT NULL,
                hashed_password VARCHAR NOT NULL
            );

            CREATE TABLE IF NOT EXISTS warehouses (
                warehouse_id VARCHAR PRIMARY KEY,
                status VARCHAR NOT NULL DEFAULT 'NORMAL',
                backlog_orders INT NOT NULL DEFAULT 0,
                avg_processing_time_sec NUMERIC(10,2) NOT NULL DEFAULT 0,
                last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS inventory (
                warehouse_id VARCHAR NOT NULL,
                product_id VARCHAR NOT NULL,
                available_quantity INT NOT NULL DEFAULT 0,
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                PRIMARY KEY (warehouse_id, product_id)
            );

            CREATE TABLE IF NOT EXISTS orders (
                order_id VARCHAR PRIMARY KEY,
                warehouse_id VARCHAR NOT NULL,
                product_id VARCHAR NOT NULL,
                quantity INT NOT NULL DEFAULT 0,
                status VARCHAR NOT NULL DEFAULT 'CREATED',
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS business_events (
                id SERIAL PRIMARY KEY,
                event_type VARCHAR NOT NULL,
                source_topic VARCHAR NOT NULL,
                event_data JSONB NOT NULL,
                event_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS predictions (
                id SERIAL PRIMARY KEY,
                warehouse_id VARCHAR,
                product_id VARCHAR,
                prediction_type VARCHAR NOT NULL,
                prediction_value NUMERIC(12,2),
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS recommendations (
                id SERIAL PRIMARY KEY,
                warehouse_id VARCHAR,
                product_id VARCHAR,
                recommendation_type VARCHAR NOT NULL,
                recommendation_text TEXT NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
            """
        )
    finally:
        await conn.close()


async def process_inventory_event(conn: asyncpg.Connection, payload: dict) -> None:
    warehouse_id = str(payload.get("warehouse_id", "")).strip()
    product_id = str(payload.get("product_id", "")).strip()
    available_quantity = int(payload.get("available_quantity", payload.get("inventory_quantity", 0)))
    event_ts = parse_event_timestamp(payload.get("timestamp"))

    if not warehouse_id or not product_id:
        return

    await conn.execute(
        """
        INSERT INTO inventory (warehouse_id, product_id, available_quantity, updated_at)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (warehouse_id, product_id)
        DO UPDATE SET available_quantity = EXCLUDED.available_quantity, updated_at = EXCLUDED.updated_at
        """,
        warehouse_id,
        product_id,
        available_quantity,
        event_ts,
    )

    if available_quantity <= 10:
        await conn.execute(
            """
            INSERT INTO predictions (warehouse_id, product_id, prediction_type, prediction_value, created_at)
            VALUES ($1, $2, 'inventory_shortage', $3, $4)
            """,
            warehouse_id,
            product_id,
            float(available_quantity),
            event_ts,
        )
        await conn.execute(
            """
            INSERT INTO recommendations (warehouse_id, product_id, recommendation_type, recommendation_text, created_at)
            VALUES ($1, $2, 'restock', $3, $4)
            """,
            warehouse_id,
            product_id,
            f"Replenish stock for product {product_id} at warehouse {warehouse_id}.",
            event_ts,
        )


async def process_order_event(conn: asyncpg.Connection, payload: dict) -> None:
    event_type = str(payload.get("event_type", "order_created")).lower()
    warehouse_id = str(payload.get("warehouse_id", "")).strip()
    product_id = str(payload.get("product_id", "")).strip()
    quantity = int(payload.get("quantity", 0))
    order_id = str(payload.get("order_id", f"{event_type}-{warehouse_id}-{product_id}-{int(datetime.datetime.now(datetime.timezone.utc).timestamp())}"))
    event_ts = parse_event_timestamp(payload.get("timestamp"))

    if not warehouse_id or not product_id:
        return

    await conn.execute(
        """
        INSERT INTO orders (order_id, warehouse_id, product_id, quantity, status, created_at)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (order_id)
        DO UPDATE SET warehouse_id = EXCLUDED.warehouse_id,
                     product_id = EXCLUDED.product_id,
                     quantity = EXCLUDED.quantity,
                     status = EXCLUDED.status,
                     created_at = EXCLUDED.created_at
        """,
        order_id,
        warehouse_id,
        product_id,
        quantity,
        event_type.upper().replace("_", " "),
        event_ts,
    )

    if event_type == "demand_spike":
        await conn.execute(
            """
            INSERT INTO predictions (warehouse_id, product_id, prediction_type, prediction_value, created_at)
            VALUES ($1, $2, 'demand_spike', $3, $4)
            """,
            warehouse_id,
            product_id,
            float(quantity),
            event_ts,
        )
        await conn.execute(
            """
            INSERT INTO recommendations (warehouse_id, product_id, recommendation_type, recommendation_text, created_at)
            VALUES ($1, $2, 'capacity', $3, $4)
            """,
            warehouse_id,
            product_id,
            f"Demand spike detected for product {product_id}; consider stock reallocation to {warehouse_id}.",
            event_ts,
        )


async def process_warehouse_event(conn: asyncpg.Connection, payload: dict) -> None:
    warehouse_id = str(payload.get("warehouse_id", "")).strip()
    backlog_orders = int(payload.get("backlog_orders", 0))
    avg_processing_time = float(payload.get("avg_processing_time_sec", 0) or 0)
    event_ts = parse_event_timestamp(payload.get("timestamp"))
    status = "OVERLOADED" if backlog_orders >= 20 else "NORMAL"

    if not warehouse_id:
        return

    await conn.execute(
        """
        INSERT INTO warehouses (warehouse_id, status, backlog_orders, avg_processing_time_sec, last_updated)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (warehouse_id)
        DO UPDATE SET status = EXCLUDED.status,
                     backlog_orders = EXCLUDED.backlog_orders,
                     avg_processing_time_sec = EXCLUDED.avg_processing_time_sec,
                     last_updated = EXCLUDED.last_updated
        """,
        warehouse_id,
        status,
        backlog_orders,
        avg_processing_time,
        event_ts,
    )

    if backlog_orders >= 20:
        await conn.execute(
            """
            INSERT INTO predictions (warehouse_id, product_id, prediction_type, prediction_value, created_at)
            VALUES ($1, NULL, 'warehouse_overload', $2, $3)
            """,
            warehouse_id,
            float(backlog_orders),
            event_ts,
        )
        await conn.execute(
            """
            INSERT INTO recommendations (warehouse_id, product_id, recommendation_type, recommendation_text, created_at)
            VALUES ($1, NULL, 'load_balance', $2, $3)
            """,
            warehouse_id,
            f"Shift workload away from warehouse {warehouse_id} to reduce backlog.",
            event_ts,
        )


async def build_ml_feature_row(conn: asyncpg.Connection, payload: dict) -> dict:
    warehouse_id = str(payload.get("warehouse_id", "")).strip()
    product_id = str(payload.get("product_id", "")).strip()

    inventory_row = None
    if warehouse_id and product_id:
        inventory_row = await conn.fetchrow(
            "SELECT available_quantity FROM inventory WHERE warehouse_id = $1 AND product_id = $2",
            warehouse_id,
            product_id,
        )

    warehouse_row = None
    if warehouse_id:
        warehouse_row = await conn.fetchrow(
            "SELECT backlog_orders, avg_processing_time_sec FROM warehouses WHERE warehouse_id = $1",
            warehouse_id,
        )

    orders_per_hour = int(payload.get("orders_per_hour", 0) or 0)
    demand_rate = float(payload.get("demand_rate", 0.0) or 0.0)
    processing_time = float(payload.get("avg_processing_time_sec", payload.get("processing_time", 0.0)) or 0.0)
    backlog = int(payload.get("backlog_orders", payload.get("backlog", 0)) or 0)
    warehouse_load = float(payload.get("warehouse_load", 0.0) or 0.0)
    quantity = int(payload.get("available_quantity", payload.get("inventory_quantity", 0)) or 0)

    if inventory_row is not None:
        quantity = int(inventory_row["available_quantity"])
    if warehouse_row is not None:
        backlog = int(warehouse_row["backlog_orders"] if warehouse_row["backlog_orders"] is not None else backlog)
        processing_time = float(warehouse_row["avg_processing_time_sec"] if warehouse_row["avg_processing_time_sec"] is not None else processing_time)

    if payload.get("orders_per_hour") is None:
        orders_per_hour = max(1, int(quantity * 0.75) if quantity > 0 else 12)
    if payload.get("demand_rate") is None:
        demand_rate = max(0.25, min(3.0, float(quantity / 10.0) if quantity > 0 else 1.5))
    if payload.get("processing_time") is None and payload.get("avg_processing_time_sec") is None and processing_time <= 0:
        processing_time = 2.5
    if payload.get("backlog_orders") is None and payload.get("backlog") is None and backlog <= 0:
        backlog = 12
    if payload.get("warehouse_load") is None and warehouse_load <= 0:
        warehouse_load = min(1.0, max(0.2, backlog / 100.0))

    if warehouse_load <= 0:
        warehouse_load = min(1.0, max(0.2, backlog / 100.0))
    if processing_time <= 0:
        processing_time = 2.5
    if backlog <= 0:
        backlog = 12

    return {
        "inventory_quantity": max(0, quantity),
        "orders_per_hour": max(1, orders_per_hour),
        "demand_rate": max(0.1, demand_rate),
        "warehouse_load": max(0.0, min(1.0, warehouse_load)),
        "processing_time": max(0.1, processing_time),
        "backlog": max(0, backlog),
    }


async def process_kafka_event(topic: str, payload: dict) -> None:
    conn = await asyncpg.connect(DATABASE_URL)
    try:
        event_type = str(payload.get("event_type", "unknown")).lower()
        event_ts = parse_event_timestamp(payload.get("timestamp"))
        print(f"[CONSUMER] Received event: {event_type} on topic: {topic}")

        await conn.execute(
            """
            INSERT INTO business_events (event_type, source_topic, event_data, event_timestamp)
            VALUES ($1, $2, $3::jsonb, $4)
            """,
            event_type,
            topic,
            json.dumps(payload),
            event_ts,
        )

        if topic == "inventory":
            await process_inventory_event(conn, payload)
        elif topic == "orders":
            await process_order_event(conn, payload)
        elif topic == "warehouse":
            await process_warehouse_event(conn, payload)
        elif topic == "logistics":
            await conn.execute(
                """
                INSERT INTO recommendations (warehouse_id, product_id, recommendation_type, recommendation_text, created_at)
                VALUES ($1, $2, 'logistics', $3, $4)
                """,
                payload.get("warehouse_id"),
                payload.get("product_id"),
                json.dumps(payload),
                event_ts,
            )

        try:
            warehouse_id = str(payload.get("warehouse_id", "")).strip()
            product_id = str(payload.get("product_id", "")).strip()
            features = await build_ml_feature_row(conn, payload)
            prediction_payload = predict_delay(features)

            if event_type == "inventory_shortage":
                available_quantity = int(payload.get("available_quantity", payload.get("inventory_quantity", 0)) or 0)
                if available_quantity <= 5:
                    prediction_payload["delay_probability"] = max(float(prediction_payload.get("delay_probability", 0.0)), 0.91)
                    prediction_payload["risk_level"] = "high"
                    prediction_payload["predicted_delay_minutes"] = max(float(prediction_payload.get("predicted_delay_minutes", 0.0)), 82.0)

            risk_level = str(prediction_payload.get("risk_level", "low")).upper()
            explanations = prediction_payload.get("explanations", [])
            
            # Format SHAP explanations as root cause
            explanation_parts = []
            if explanations:
                for idx, exp in enumerate(explanations, 1):
                    explanation_parts.append(
                        f"{idx}. {exp['feature'].replace('_', ' ').title()}: {exp['direction']} risk (value: {exp['value']:.2f})"
                    )
            root_cause_str = "\n".join(explanation_parts) if explanation_parts else "No specific SHAP contributions (low risk level)."

            # Query the deterministic recommendation engine
            recs = await generate_recommendations(conn)
            matching_recs = []
            if warehouse_id:
                for r in recs:
                    if r.target_warehouse == warehouse_id or r.source_warehouse == warehouse_id:
                        if not product_id or not r.product_id or r.product_id == product_id:
                            matching_recs.append(r)

            # Format recommended action
            if matching_recs:
                best_rec = matching_recs[0]
                if best_rec.source_warehouse and best_rec.target_warehouse:
                    rec_text = f"Transfer {best_rec.recommended_quantity} units of {best_rec.product_id} from {best_rec.source_warehouse} to {best_rec.target_warehouse}. Reason: {best_rec.reason}"
                else:
                    rec_text = f"{best_rec.recommended_action}. Reason: {best_rec.reason}"
            else:
                if risk_level == "HIGH":
                    rec_text = f"Urgent action required at {warehouse_id}. Monitor backlog of {payload.get('backlog_orders', 'N/A')} orders."
                else:
                    rec_text = f"No immediate action required. System operating within normal thresholds."

            # Save prediction to DB
            if warehouse_id:
                await conn.execute(
                    """
                    INSERT INTO predictions (warehouse_id, product_id, prediction_type, prediction_value, created_at)
                    VALUES ($1, $2, 'delay_risk', $3, $4)
                    """,
                    warehouse_id,
                    product_id or None,
                    float(prediction_payload.get("delay_probability", 0.0)),
                    event_ts,
                )

                await conn.execute(
                    """
                    INSERT INTO recommendations (warehouse_id, product_id, recommendation_type, recommendation_text, created_at)
                    VALUES ($1, $2, 'delay_risk', $3, $4)
                    """,
                    warehouse_id,
                    product_id or None,
                    f"Risk level {risk_level} at {warehouse_id}: delay_probability={prediction_payload.get('delay_probability', 0.0)}\n\n{root_cause_str}",
                    event_ts,
                )

            # Generate LLM business explanation
            explanation = await generate_business_explanation(
                prediction=f"{prediction_payload.get('delay_probability', 0.0) * 100:.1f}% delay probability",
                risk=risk_level,
                root_causes=root_cause_str,
                recommendation=rec_text
            )

            # Broadcast update payload via WebSocket to clients
            ws_payload = {
                "event": event_type.replace("_", " ").title(),
                "warehouse": warehouse_id or "N/A",
                "risk": risk_level,
                "prediction": f"{prediction_payload.get('delay_probability', 0.0) * 100:.1f}% delay probability ({prediction_payload.get('predicted_delay_minutes', 0.0)} min delay)",
                "root_cause": root_cause_str,
                "recommendation": rec_text,
                "explanation": explanation,
                "timestamp": datetime.datetime.now().isoformat()
            }
            broadcast_update_to_clients(ws_payload)

        except Exception as ml_exc:  # pragma: no cover - operational fallback
            print(f"[ML] prediction or websocket broadcast skipped for event: {ml_exc}")
            import traceback
            traceback.print_exc()
    finally:
        await conn.close()


def kafka_consumer_loop() -> None:
    """Runs in a background daemon thread. Processes Kafka messages and pushes
    WS broadcast updates via the thread-safe queue.

    Uses asyncio.run() to process each event (safe: each call creates its own
    short-lived event loop for the DB work), and then calls
    broadcast_update_to_clients() which schedules on the *main* event loop via
    call_soon_threadsafe — so WebSocket sends happen on the correct loop.
    """
    while True:
        try:
            consumer = KafkaConsumer(
                *KAFKA_TOPICS,
                bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
                auto_offset_reset="latest",
                enable_auto_commit=True,
                value_deserializer=lambda value: json.loads(value.decode("utf-8")) if value else None,
                group_id="ai-bpi-db-consumer",
                consumer_timeout_ms=-1,   # block forever — never exit the for-loop
            )
            print("[KAFKA] Consumer connected and listening...")
            for message in consumer:
                try:
                    if message.value is None:
                        continue
                    # asyncio.run() is fine here: it creates a temporary loop
                    # solely for the DB work. The WS broadcast is dispatched
                    # to the main loop via call_soon_threadsafe inside
                    # broadcast_update_to_clients(), so there is no conflict.
                    asyncio.run(process_kafka_event(message.topic, message.value))
                except Exception as exc:  # pragma: no cover - operational fallback
                    print(f"[KAFKA] Event processing failed: {exc}")
                    import traceback
                    traceback.print_exc()
            # If the consumer iterator exits (should not happen), reconnect
            print("[KAFKA] Consumer iterator exited unexpectedly, reconnecting...")
        except Exception as exc:
            print(f"[KAFKA] Waiting for broker availability: {exc}")
            time.sleep(5)


# --- DB Initialization ---
@app.on_event("startup")
async def startup():
    global main_event_loop, _broadcast_queue
    main_event_loop = asyncio.get_running_loop()
    _broadcast_queue = asyncio.Queue()
    # Start the async broadcast worker as a background task on the main loop
    asyncio.create_task(_broadcast_worker())
    await initialize_database()
    threading.Thread(target=kafka_consumer_loop, daemon=True).start()
    print("[STARTUP] WebSocket broadcast worker started.")


# --- Auth Utils ---
def get_password_hash(password):
    return pwd_context.hash(password)


def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.datetime.utcnow() + datetime.timedelta(minutes=60)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# --- Routes ---
@app.websocket("/api/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive; client can send pings/messages if desired
            data = await websocket.receive_text()
            # Echo back or ignore
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"[WS] WebSocket error: {e}")
        manager.disconnect(websocket)

@app.get("/health")
async def health_check():
    db_status = "disconnected"
    try:
        conn = await asyncpg.connect(DATABASE_URL)
        await conn.close()
        db_status = "connected"
    except Exception as e:
        db_status = f"error: {str(e)}"
    return {"status": "ok", "db_status": db_status}


@app.post("/auth/register")
async def register(req: RegisterRequest):
    conn = await asyncpg.connect(DATABASE_URL)
    try:
        company_id = await conn.fetchval(
            "INSERT INTO companies (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name=EXCLUDED.name RETURNING id",
            req.company_name,
        )
        hashed_password = get_password_hash(req.password)
        await conn.execute(
            "INSERT INTO users (company_id, email, hashed_password) VALUES ($1, $2, $3)",
            company_id,
            req.email,
            hashed_password,
        )
        return {"msg": "Registered successfully"}
    except asyncpg.exceptions.UniqueViolationError:
        raise HTTPException(status_code=400, detail="Email already registered")
    finally:
        await conn.close()


@app.post("/auth/login")
async def login(req: LoginRequest):
    conn = await asyncpg.connect(DATABASE_URL)
    user = await conn.fetchrow("SELECT id, company_id, hashed_password FROM users WHERE email = $1", req.email)
    await conn.close()

    if not user or not verify_password(req.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({"user_id": user["id"], "company_id": user["company_id"]})
    return {"access_token": token, "token_type": "bearer"}


@app.get("/api/dashboard")
async def dashboard(current_user: dict = Depends(get_current_user)):
    return {
        "message": f"Welcome! You are viewing isolated data for Company ID {current_user['company_id']}",
        "user_id": current_user['user_id'],
        "company_id": current_user['company_id'],
    }


async def generate_and_store_recommendations() -> list[dict]:
    """
    Generate recommendations using the deterministic engine and store them
    in PostgreSQL.  Returns the list of recommendation dicts.
    """
    conn = await asyncpg.connect(DATABASE_URL)
    try:
        recommendations = await generate_recommendations(conn)

        for rec in recommendations:
            await conn.execute(
                """
                INSERT INTO recommendations
                    (warehouse_id, product_id, recommendation_type, recommendation_text, created_at)
                VALUES ($1, $2, $3, $4, NOW())
                """,
                rec.target_warehouse or rec.source_warehouse,
                rec.product_id,
                "operational",
                rec.to_text(),
            )

        if recommendations:
            print(f"[RECOMMENDATIONS] Generated {len(recommendations)} operational recommendations")

        return [rec.to_dict() for rec in recommendations]
    except Exception as e:
        print(f"[RECOMMENDATIONS] Failed to generate recommendations: {e}")
        return []
    finally:
        await conn.close()


@app.get("/api/recommendations/live")
async def get_live_recommendations(current_user: dict = Depends(get_current_user)):
    """
    Run the deterministic recommendation engine in real-time against current
    DB state and return structured JSON.  Nothing is persisted.
    """
    conn = await asyncpg.connect(DATABASE_URL)
    try:
        recommendations = await generate_recommendations(conn)
        result = [rec.to_dict() for rec in recommendations]
        return {
            "recommendations": result,
            "count": len(result),
            "summary": {
                "high": sum(1 for r in result if r["risk"] == "high"),
                "medium": sum(1 for r in result if r["risk"] == "medium"),
                "low": sum(1 for r in result if r["risk"] == "low"),
            },
        }
    finally:
        await conn.close()


@app.get("/api/recommendations")
async def get_recommendations(current_user: dict = Depends(get_current_user)):
    """
    Get latest persisted operational recommendations with structured fields.
    """
    conn = await asyncpg.connect(DATABASE_URL)
    try:
        recs = await conn.fetch(
            """
            SELECT warehouse_id, product_id, recommendation_type,
                   recommendation_text, created_at
            FROM recommendations
            WHERE recommendation_type = 'operational'
            ORDER BY created_at DESC
            LIMIT 20
            """
        )

        return {
            "recommendations": [
                {
                    "warehouse": rec["warehouse_id"],
                    "product": rec["product_id"],
                    "type": rec["recommendation_type"],
                    "text": rec["recommendation_text"],
                    "created_at": rec["created_at"].isoformat() if rec["created_at"] else None,
                }
                for rec in recs
            ]
        }
    finally:
        await conn.close()


@app.post("/api/recommendations/generate")
async def trigger_recommendations(current_user: dict = Depends(get_current_user)):
    """
    Manually trigger recommendation generation, persist results, and return them.
    """
    results = await generate_and_store_recommendations()
    return {
        "status": "recommendations generated",
        "count": len(results),
        "recommendations": results,
    }


# ─── Dashboard data endpoints ────────────────────────────────────────────────

@app.get("/api/stats")
async def get_stats(current_user: dict = Depends(get_current_user)):
    """KPI counters for the dashboard header cards."""
    conn = await asyncpg.connect(DATABASE_URL)
    try:
        total_orders = await conn.fetchval("SELECT COUNT(*) FROM orders") or 0
        total_inventory = await conn.fetchval("SELECT COALESCE(SUM(available_quantity), 0) FROM inventory") or 0
        active_alerts = await conn.fetchval(
            """
            SELECT COUNT(DISTINCT warehouse_id)
            FROM predictions
            WHERE prediction_type = 'delay_risk'
              AND prediction_value >= 0.7
              AND created_at >= NOW() - INTERVAL '1 hour'
            """
        ) or 0
        high_risk_count = await conn.fetchval(
            "SELECT COUNT(*) FROM warehouses WHERE status = 'OVERLOADED'"
        ) or 0
        return {
            "total_orders": int(total_orders),
            "total_inventory": int(total_inventory),
            "active_alerts": int(active_alerts),
            "high_risk_warehouses": int(high_risk_count),
        }
    finally:
        await conn.close()


@app.get("/api/warehouses")
async def get_warehouses(current_user: dict = Depends(get_current_user)):
    """All warehouse records with current state."""
    conn = await asyncpg.connect(DATABASE_URL)
    try:
        rows = await conn.fetch(
            """
            SELECT warehouse_id, status, backlog_orders,
                   avg_processing_time_sec, last_updated
            FROM warehouses
            ORDER BY backlog_orders DESC
            """
        )
        return {
            "warehouses": [
                {
                    "warehouse_id": r["warehouse_id"],
                    "status": r["status"],
                    "backlog_orders": r["backlog_orders"],
                    "avg_processing_time_sec": float(r["avg_processing_time_sec"]),
                    "last_updated": r["last_updated"].isoformat() if r["last_updated"] else None,
                }
                for r in rows
            ]
        }
    finally:
        await conn.close()


@app.get("/api/high-risk-warehouses")
async def get_high_risk_warehouses(current_user: dict = Depends(get_current_user)):
    """
    Warehouses with OVERLOADED status, enriched with their latest prediction
    value and recommendation text so the dashboard can render the high-risk table.
    """
    conn = await asyncpg.connect(DATABASE_URL)
    try:
        warehouses = await conn.fetch(
            """
            SELECT warehouse_id, status, backlog_orders, avg_processing_time_sec
            FROM warehouses
            WHERE status = 'OVERLOADED'
            ORDER BY backlog_orders DESC
            """
        )

        result = []
        for wh in warehouses:
            wid = wh["warehouse_id"]

            # Latest delay_risk prediction for this warehouse
            pred = await conn.fetchrow(
                """
                SELECT prediction_value, created_at
                FROM predictions
                WHERE warehouse_id = $1 AND prediction_type = 'delay_risk'
                ORDER BY created_at DESC LIMIT 1
                """,
                wid,
            )

            # Latest ML-generated recommendation (delay_risk type carries SHAP root cause)
            rec = await conn.fetchrow(
                """
                SELECT recommendation_text, created_at
                FROM recommendations
                WHERE warehouse_id = $1 AND recommendation_type = 'delay_risk'
                ORDER BY created_at DESC LIMIT 1
                """,
                wid,
            )

            # Latest operational recommendation for action text
            op_rec = await conn.fetchrow(
                """
                SELECT recommendation_text
                FROM recommendations
                WHERE warehouse_id = $1 AND recommendation_type IN ('load_balance', 'operational', 'capacity')
                ORDER BY created_at DESC LIMIT 1
                """,
                wid,
            )

            delay_prob = float(pred["prediction_value"]) if pred and pred["prediction_value"] is not None else 0.0
            rec_text = rec["recommendation_text"] if rec else ""

            # Separate root cause (SHAP lines) from the risk header in rec_text
            lines = rec_text.split("\n\n", 1) if rec_text else []
            root_cause = lines[1].strip() if len(lines) > 1 else rec_text

            result.append({
                "warehouse_id": wid,
                "status": wh["status"],
                "backlog_orders": wh["backlog_orders"],
                "risk_pct": round(delay_prob * 100, 1),
                "prediction": f"{delay_prob * 100:.1f}% delay probability",
                "root_cause": root_cause or "Warehouse overload detected",
                "recommended_action": (
                    op_rec["recommendation_text"] if op_rec
                    else f"Redistribute orders away from {wid} to reduce backlog."
                ),
            })

        return {"high_risk_warehouses": result, "count": len(result)}
    finally:
        await conn.close()


@app.get("/api/orders/trend")
async def get_orders_trend(current_user: dict = Depends(get_current_user)):
    """Hourly order counts over the last 24 hours for the trend chart."""
    conn = await asyncpg.connect(DATABASE_URL)
    try:
        rows = await conn.fetch(
            """
            SELECT
                date_trunc('hour', created_at) AS hour,
                COUNT(*) AS order_count
            FROM orders
            WHERE created_at >= NOW() - INTERVAL '24 hours'
            GROUP BY hour
            ORDER BY hour ASC
            """
        )
        return {
            "trend": [
                {
                    "hour": r["hour"].isoformat(),
                    "order_count": int(r["order_count"]),
                }
                for r in rows
            ]
        }
    finally:
        await conn.close()


@app.get("/api/inventory/trend")
async def get_inventory_trend(current_user: dict = Depends(get_current_user)):
    """Hourly total-inventory snapshots over the last 24 hours for the trend chart."""
    conn = await asyncpg.connect(DATABASE_URL)
    try:
        rows = await conn.fetch(
            """
            SELECT
                date_trunc('hour', updated_at) AS hour,
                SUM(available_quantity) AS total_qty
            FROM inventory
            WHERE updated_at >= NOW() - INTERVAL '24 hours'
            GROUP BY hour
            ORDER BY hour ASC
            """
        )
        return {
            "trend": [
                {
                    "hour": r["hour"].isoformat(),
                    "total_qty": int(r["total_qty"]),
                }
                for r in rows
            ]
        }
    finally:
        await conn.close()


@app.get("/api/warehouse-risk-trend")
async def get_warehouse_risk_trend(current_user: dict = Depends(get_current_user)):
    """
    Average delay_risk prediction value per warehouse over last 24 h,
    used to draw the warehouse risk chart.
    """
    conn = await asyncpg.connect(DATABASE_URL)
    try:
        rows = await conn.fetch(
            """
            SELECT
                warehouse_id,
                ROUND(AVG(prediction_value) * 100, 1) AS avg_risk_pct,
                COUNT(*) AS sample_count
            FROM predictions
            WHERE prediction_type = 'delay_risk'
              AND created_at >= NOW() - INTERVAL '24 hours'
              AND warehouse_id IS NOT NULL
            GROUP BY warehouse_id
            ORDER BY avg_risk_pct DESC
            LIMIT 10
            """
        )
        return {
            "warehouses": [
                {
                    "warehouse_id": r["warehouse_id"],
                    "avg_risk_pct": float(r["avg_risk_pct"]),
                    "sample_count": int(r["sample_count"]),
                }
                for r in rows
            ]
        }
    finally:
        await conn.close()

