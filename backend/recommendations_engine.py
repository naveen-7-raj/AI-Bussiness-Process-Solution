"""
Deterministic Recommendation Engine.

Generates inventory transfer and operational recommendations using ONLY
business rules applied to live PostgreSQL data.  No LLM is involved at any
stage — every recommendation is fully traceable to numeric thresholds and
data values.

Inputs consumed (all from PostgreSQL):
  - inventory          (warehouse × product quantities)
  - orders / demand    (recent order counts per warehouse × product)
  - warehouses         (backlog, processing time, status)
  - predictions        (demand_spike, inventory_shortage, warehouse_overload, delay_risk)

Outputs (per recommendation):
  risk, root_cause, recommended_action, source_warehouse,
  target_warehouse, recommended_quantity, product_id, reason
"""

from __future__ import annotations

import datetime
from dataclasses import dataclass, field

import asyncpg


# ---------------------------------------------------------------------------
# Configuration constants — all thresholds live here for easy tuning
# ---------------------------------------------------------------------------
CRITICAL_INVENTORY_THRESHOLD = 10   # units — below this is "low inventory"
HIGH_DEMAND_THRESHOLD = 3           # orders in the time window
SAFETY_STOCK = 15                   # units kept at source after transfer
BACKLOG_OVERLOAD_THRESHOLD = 20     # orders — above this is "overloaded"
IMBALANCE_HIGH_FACTOR = 2.0         # warehouse > avg × factor ⇒ excess
IMBALANCE_LOW_FACTOR = 0.5          # warehouse < avg × factor ⇒ deficit
MIN_TRANSFER_QTY = 5               # minimum transfer worth executing
MAX_TRANSFER_QTY = 100             # cap per transfer
MIN_REBALANCE_QTY = 5              # minimum imbalance transfer
DEMAND_WINDOW_HOURS = 1            # look-back window for order counting
PREDICTION_WINDOW_HOURS = 2        # look-back for prediction signals


# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------
@dataclass
class ProductState:
    """Inventory + demand state for a single product at a single warehouse."""
    product_id: str
    quantity: int
    demand: int  # orders in the last DEMAND_WINDOW_HOURS


@dataclass
class WarehouseSnapshot:
    """Complete point-in-time state of a single warehouse."""
    warehouse_id: str
    status: str
    backlog: int
    processing_time: float
    products: dict[str, ProductState] = field(default_factory=dict)
    predictions: list[dict] = field(default_factory=list)

    @property
    def total_inventory(self) -> int:
        return sum(p.quantity for p in self.products.values())

    @property
    def total_demand(self) -> int:
        return sum(p.demand for p in self.products.values())

    @property
    def warehouse_load(self) -> float:
        """Normalised load 0.0–1.0 based on backlog."""
        return min(1.0, self.backlog / 100.0)

    def has_prediction(self, prediction_type: str) -> bool:
        return any(p["prediction_type"] == prediction_type for p in self.predictions)

    def product_has_prediction(self, product_id: str, prediction_type: str) -> bool:
        return any(
            p["prediction_type"] == prediction_type and p.get("product_id") == product_id
            for p in self.predictions
        )


@dataclass
class Recommendation:
    """A single actionable recommendation."""
    risk: str                             # "high" / "medium" / "low"
    root_cause: str                       # what triggered this
    recommended_action: str               # what to do
    source_warehouse: str | None = None   # transfer from
    target_warehouse: str | None = None   # transfer to
    recommended_quantity: int = 0         # units
    product_id: str | None = None         # affected product
    reason: str = ""                      # detailed explanation

    def to_dict(self) -> dict:
        return {
            "risk": self.risk,
            "root_cause": self.root_cause,
            "recommended_action": self.recommended_action,
            "source_warehouse": self.source_warehouse,
            "target_warehouse": self.target_warehouse,
            "recommended_quantity": self.recommended_quantity,
            "product_id": self.product_id,
            "reason": self.reason,
        }

    def to_text(self) -> str:
        parts = [
            f"Risk Level: {self.risk.upper()}",
            f"Root Cause: {self.root_cause}",
            f"Recommended Action: {self.recommended_action}",
        ]
        if self.source_warehouse and self.target_warehouse:
            parts.append(
                f"Transfer: {self.recommended_quantity} units "
                f"from {self.source_warehouse} -> {self.target_warehouse}"
            )
            if self.product_id:
                parts.append(f"Product: {self.product_id}")
        parts.append(f"Reason: {self.reason}")
        return "\n".join(parts)


# ---------------------------------------------------------------------------
# Data fetch layer — all reads from PostgreSQL
# ---------------------------------------------------------------------------
async def fetch_all_snapshots(conn: asyncpg.Connection) -> dict[str, WarehouseSnapshot]:
    """
    Build a complete cross-warehouse snapshot from the database.

    Queries:
      1. warehouses table          → backlog, processing time, status
      2. inventory table           → per-product quantities
      3. orders table              → demand counts (last N hours)
      4. predictions table         → recent prediction signals
    """
    snapshots: dict[str, WarehouseSnapshot] = {}

    # --- 1. Warehouse base state ---
    wh_rows = await conn.fetch(
        "SELECT warehouse_id, status, backlog_orders, avg_processing_time_sec "
        "FROM warehouses"
    )
    for row in wh_rows:
        wh_id = row["warehouse_id"]
        snapshots[wh_id] = WarehouseSnapshot(
            warehouse_id=wh_id,
            status=row["status"] or "NORMAL",
            backlog=int(row["backlog_orders"] or 0),
            processing_time=float(row["avg_processing_time_sec"] or 0),
        )

    if not snapshots:
        return snapshots

    # --- 2. Inventory per warehouse × product ---
    inv_rows = await conn.fetch(
        "SELECT warehouse_id, product_id, available_quantity FROM inventory"
    )
    for row in inv_rows:
        wh_id = row["warehouse_id"]
        if wh_id not in snapshots:
            # Warehouse exists in inventory but not in warehouses table —
            # create a minimal snapshot so we don't lose inventory data.
            snapshots[wh_id] = WarehouseSnapshot(
                warehouse_id=wh_id, status="NORMAL", backlog=0, processing_time=0,
            )
        product_id = row["product_id"]
        snapshots[wh_id].products[product_id] = ProductState(
            product_id=product_id,
            quantity=int(row["available_quantity"] or 0),
            demand=0,  # filled below
        )

    # --- 3. Demand (order counts per warehouse × product in the last N hours) ---
    demand_rows = await conn.fetch(
        """
        SELECT warehouse_id, product_id, COUNT(*) AS order_count
        FROM orders
        WHERE created_at > NOW() - make_interval(hours => $1)
        GROUP BY warehouse_id, product_id
        """,
        DEMAND_WINDOW_HOURS,
    )
    for row in demand_rows:
        wh_id = row["warehouse_id"]
        pid = row["product_id"]
        if wh_id in snapshots and pid in snapshots[wh_id].products:
            snapshots[wh_id].products[pid].demand = int(row["order_count"])

    # --- 4. Recent predictions ---
    pred_rows = await conn.fetch(
        """
        SELECT warehouse_id, product_id, prediction_type, prediction_value
        FROM predictions
        WHERE created_at > NOW() - make_interval(hours => $1)
        ORDER BY created_at DESC
        """,
        PREDICTION_WINDOW_HOURS,
    )
    for row in pred_rows:
        wh_id = row["warehouse_id"]
        if wh_id and wh_id in snapshots:
            snapshots[wh_id].predictions.append({
                "prediction_type": row["prediction_type"],
                "product_id": row["product_id"],
                "value": float(row["prediction_value"] or 0),
            })

    return snapshots


# ---------------------------------------------------------------------------
# Scoring & quantity helpers
# ---------------------------------------------------------------------------
def _score_source(snapshot: WarehouseSnapshot, product_id: str) -> float:
    """
    Score a warehouse as a potential *source* for an inventory transfer.
    Higher score = better source.

    Formula:
        score = (inventory − safety_stock) × 0.5
              − demand × 2.0
              − warehouse_load × 10.0
    """
    product = snapshot.products.get(product_id)
    qty = product.quantity if product else 0
    demand = product.demand if product else 0
    return (qty - SAFETY_STOCK) * 0.5 - demand * 2.0 - snapshot.warehouse_load * 10.0


def _calculate_transfer_qty(
    source_qty: int,
    target_demand: int,
    target_qty: int,
) -> int:
    """
    Deterministic transfer-quantity formula.

    excess_at_source = source_qty − SAFETY_STOCK
    needed_at_target = max(20, target_demand × 3)
    transfer = min(excess_at_source, needed_at_target)
    transfer = clamp(transfer, MIN_TRANSFER_QTY, MAX_TRANSFER_QTY)
    """
    excess = source_qty - SAFETY_STOCK
    if excess <= 0:
        return 0
    needed = max(20, target_demand * 3)
    qty = min(excess, needed)
    return max(MIN_TRANSFER_QTY, min(qty, MAX_TRANSFER_QTY))


def _select_best_source(
    snapshots: dict[str, WarehouseSnapshot],
    exclude_wh: str,
    product_id: str,
) -> str | None:
    """
    Pick the best source warehouse for a given product using the scoring
    formula.  Returns warehouse_id or None if no viable source exists.
    """
    candidates: list[tuple[str, float, int]] = []
    for wh_id, snap in snapshots.items():
        if wh_id == exclude_wh:
            continue
        product = snap.products.get(product_id)
        if not product or product.quantity <= SAFETY_STOCK:
            continue
        score = _score_source(snap, product_id)
        candidates.append((wh_id, score, snap.backlog))

    if not candidates:
        return None

    # Sort by score descending, then backlog ascending (tie-breaker)
    candidates.sort(key=lambda c: (-c[1], c[2]))
    return candidates[0][0]


# ---------------------------------------------------------------------------
# Business-rule analyzers
# ---------------------------------------------------------------------------
async def analyze_critical_shortage(
    snapshots: dict[str, WarehouseSnapshot],
) -> list[Recommendation]:
    """
    Rule: inventory ≤ CRITICAL_INVENTORY_THRESHOLD
          AND (demand ≥ HIGH_DEMAND_THRESHOLD OR prediction = shortage/spike)
    Risk: HIGH
    Action: Transfer from best-scored source warehouse.
    """
    recommendations: list[Recommendation] = []

    for wh_id, snap in snapshots.items():
        for pid, product in snap.products.items():
            if product.quantity > CRITICAL_INVENTORY_THRESHOLD:
                continue

            # Check demand or prediction trigger
            high_demand = product.demand >= HIGH_DEMAND_THRESHOLD
            has_shortage_pred = snap.product_has_prediction(pid, "inventory_shortage")
            has_spike_pred = snap.product_has_prediction(pid, "demand_spike")

            if not (high_demand or has_shortage_pred or has_spike_pred):
                continue

            # Find best source
            source_wh = _select_best_source(snapshots, wh_id, pid)
            if not source_wh:
                # No viable source — still emit a warning recommendation
                recommendations.append(Recommendation(
                    risk="high",
                    root_cause=(
                        f"Critical shortage: {pid} at {wh_id} has {product.quantity} units "
                        f"with {product.demand} orders in the last {DEMAND_WINDOW_HOURS}h"
                    ),
                    recommended_action="Urgent restock required (no warehouse has surplus)",
                    target_warehouse=wh_id,
                    product_id=pid,
                    reason=(
                        f"No other warehouse has enough surplus of {pid} above "
                        f"safety stock ({SAFETY_STOCK} units) to transfer.  "
                        f"External procurement or expedited supply is needed."
                    ),
                ))
                continue

            source_snap = snapshots[source_wh]
            source_product = source_snap.products[pid]
            transfer_qty = _calculate_transfer_qty(
                source_qty=source_product.quantity,
                target_demand=product.demand,
                target_qty=product.quantity,
            )

            if transfer_qty < MIN_TRANSFER_QTY:
                continue

            trigger_parts = []
            if high_demand:
                trigger_parts.append(f"high demand ({product.demand} orders/{DEMAND_WINDOW_HOURS}h)")
            if has_shortage_pred:
                trigger_parts.append("inventory_shortage prediction")
            if has_spike_pred:
                trigger_parts.append("demand_spike prediction")
            trigger_text = " + ".join(trigger_parts)

            recommendations.append(Recommendation(
                risk="high",
                root_cause=(
                    f"Critical shortage: {pid} at {wh_id} has only {product.quantity} units "
                    f"(threshold: {CRITICAL_INVENTORY_THRESHOLD}).  Triggered by: {trigger_text}."
                ),
                recommended_action="Transfer inventory",
                source_warehouse=source_wh,
                target_warehouse=wh_id,
                recommended_quantity=transfer_qty,
                product_id=pid,
                reason=(
                    f"{source_wh} has {source_product.quantity} units of {pid} "
                    f"with only {source_product.demand} orders/{DEMAND_WINDOW_HOURS}h "
                    f"(load: {source_snap.warehouse_load:.0%}).  "
                    f"Transferring {transfer_qty} units leaves {source_product.quantity - transfer_qty} "
                    f"at source (above safety stock of {SAFETY_STOCK})."
                ),
            ))

    return recommendations


async def analyze_warehouse_overload(
    snapshots: dict[str, WarehouseSnapshot],
) -> list[Recommendation]:
    """
    Rule: backlog ≥ BACKLOG_OVERLOAD_THRESHOLD OR status = 'OVERLOADED'
    Risk: MEDIUM
    Action: Redistribute load to under-utilised warehouse.
    """
    recommendations: list[Recommendation] = []

    # Find under-utilised warehouses for redistribution suggestions
    underloaded = [
        (wh_id, snap)
        for wh_id, snap in snapshots.items()
        if snap.backlog < BACKLOG_OVERLOAD_THRESHOLD // 2
        and snap.status != "OVERLOADED"
    ]
    underloaded.sort(key=lambda x: x[1].backlog)

    for wh_id, snap in snapshots.items():
        is_overloaded = (
            snap.backlog >= BACKLOG_OVERLOAD_THRESHOLD
            or snap.status == "OVERLOADED"
        )
        if not is_overloaded:
            continue

        hours_per_order = snap.processing_time / 3600.0 if snap.processing_time > 0 else 0.5
        clearance_hours = snap.backlog * hours_per_order

        # Find best target for load redistribution
        target_wh = None
        for uid, usnap in underloaded:
            if uid != wh_id:
                target_wh = uid
                break

        action = "Redistribute incoming orders"
        if target_wh:
            action = f"Redistribute incoming orders to {target_wh}"

        recommendations.append(Recommendation(
            risk="medium",
            root_cause=(
                f"Warehouse {wh_id} is overloaded: {snap.backlog} backlog orders, "
                f"status={snap.status}, avg processing time={snap.processing_time:.1f}s"
            ),
            recommended_action=action,
            source_warehouse=wh_id,
            target_warehouse=target_wh,
            reason=(
                f"At current processing rate ({hours_per_order:.2f} hours/order), "
                f"backlog will take ~{clearance_hours:.1f} hours to clear.  "
                f"{'Route new orders to ' + target_wh + ' (backlog: ' + str(snapshots[target_wh].backlog) + ').' if target_wh else 'Increase staffing or automation capacity.'}"
            ),
        ))

    return recommendations


async def analyze_demand_spike(
    snapshots: dict[str, WarehouseSnapshot],
) -> list[Recommendation]:
    """
    Rule: A demand_spike prediction exists for a product in the last
          PREDICTION_WINDOW_HOURS AND current inventory can cover < 3× demand.
    Risk: HIGH
    Action: Pre-emptive transfer before stockout.
    """
    recommendations: list[Recommendation] = []
    already_covered: set[tuple[str, str]] = set()  # (wh_id, product_id)

    for wh_id, snap in snapshots.items():
        for pred in snap.predictions:
            if pred["prediction_type"] != "demand_spike":
                continue
            pid = pred.get("product_id")
            if not pid or pid not in snap.products:
                continue
            if (wh_id, pid) in already_covered:
                continue

            product = snap.products[pid]
            # Only act if inventory won't sustain 3× current demand
            if product.quantity >= product.demand * 3 + CRITICAL_INVENTORY_THRESHOLD:
                continue

            source_wh = _select_best_source(snapshots, wh_id, pid)
            if not source_wh:
                continue

            source_snap = snapshots[source_wh]
            source_product = source_snap.products[pid]
            transfer_qty = _calculate_transfer_qty(
                source_qty=source_product.quantity,
                target_demand=max(product.demand, int(pred["value"])),
                target_qty=product.quantity,
            )
            if transfer_qty < MIN_TRANSFER_QTY:
                continue

            already_covered.add((wh_id, pid))

            recommendations.append(Recommendation(
                risk="high",
                root_cause=(
                    f"Demand spike predicted for {pid} at {wh_id} "
                    f"(predicted volume: {pred['value']:.0f}).  "
                    f"Current inventory: {product.quantity} units, "
                    f"current demand: {product.demand} orders/{DEMAND_WINDOW_HOURS}h."
                ),
                recommended_action="Pre-emptive inventory transfer",
                source_warehouse=source_wh,
                target_warehouse=wh_id,
                recommended_quantity=transfer_qty,
                product_id=pid,
                reason=(
                    f"Demand spike signal detected.  {source_wh} has "
                    f"{source_product.quantity} units with low utilisation "
                    f"(load: {source_snap.warehouse_load:.0%}).  "
                    f"Transfer {transfer_qty} units to pre-empt stockout."
                ),
            ))

    return recommendations


async def analyze_inventory_imbalance(
    snapshots: dict[str, WarehouseSnapshot],
) -> list[Recommendation]:
    """
    Rule: Any warehouse total > avg × IMBALANCE_HIGH_FACTOR
          AND another < avg × IMBALANCE_LOW_FACTOR.
    Risk: LOW
    Action: Proactive rebalance.
    """
    recommendations: list[Recommendation] = []

    if len(snapshots) < 2:
        return recommendations

    totals = {wh_id: snap.total_inventory for wh_id, snap in snapshots.items()}
    avg_inventory = sum(totals.values()) / len(totals) if totals else 0

    if avg_inventory == 0:
        return recommendations

    high_whs = [
        (wh_id, total) for wh_id, total in totals.items()
        if total > avg_inventory * IMBALANCE_HIGH_FACTOR
    ]
    low_whs = [
        (wh_id, total) for wh_id, total in totals.items()
        if total < avg_inventory * IMBALANCE_LOW_FACTOR
    ]

    # Sort: most overstocked first, most understocked first
    high_whs.sort(key=lambda x: -x[1])
    low_whs.sort(key=lambda x: x[1])

    for high_wh_id, high_total in high_whs:
        for low_wh_id, low_total in low_whs:
            diff = (high_total - low_total) / 2
            transfer_qty = int(min(diff, MAX_TRANSFER_QTY // 2))  # conservative

            if transfer_qty < MIN_REBALANCE_QTY:
                continue

            recommendations.append(Recommendation(
                risk="low",
                root_cause=(
                    f"Inventory imbalance: {high_wh_id} has {high_total} units "
                    f"(avg: {avg_inventory:.0f}) while {low_wh_id} has {low_total} units"
                ),
                recommended_action="Rebalance inventory",
                source_warehouse=high_wh_id,
                target_warehouse=low_wh_id,
                recommended_quantity=transfer_qty,
                reason=(
                    f"{high_wh_id} holds {high_total / avg_inventory:.1f}× the average "
                    f"inventory.  Transferring {transfer_qty} units to {low_wh_id} "
                    f"reduces carrying-cost concentration and improves fulfilment "
                    f"speed at {low_wh_id}."
                ),
            ))
            # One transfer per high warehouse
            break

    return recommendations


# ---------------------------------------------------------------------------
# Main orchestrator
# ---------------------------------------------------------------------------
async def generate_recommendations(conn: asyncpg.Connection) -> list[Recommendation]:
    """
    Main entry point.  Fetches live data from PostgreSQL and runs all
    business-rule analyzers.  Returns a list of Recommendation objects
    sorted by risk priority (high → medium → low).

    This function is 100% deterministic — same database state always
    produces the same recommendations.
    """
    snapshots = await fetch_all_snapshots(conn)

    if not snapshots:
        return []

    all_recs: list[Recommendation] = []

    # Run all analyzers
    all_recs.extend(await analyze_critical_shortage(snapshots))
    all_recs.extend(await analyze_demand_spike(snapshots))
    all_recs.extend(await analyze_warehouse_overload(snapshots))
    all_recs.extend(await analyze_inventory_imbalance(snapshots))

    # Deduplicate: same (source, target, product) keeps highest risk
    seen: dict[tuple, Recommendation] = {}
    risk_rank = {"high": 0, "medium": 1, "low": 2}
    for rec in all_recs:
        key = (rec.source_warehouse, rec.target_warehouse, rec.product_id)
        existing = seen.get(key)
        if existing is None or risk_rank.get(rec.risk, 99) < risk_rank.get(existing.risk, 99):
            seen[key] = rec
    deduped = list(seen.values())

    # Sort: high risk first, then medium, then low
    deduped.sort(key=lambda r: risk_rank.get(r.risk, 99))

    return deduped
