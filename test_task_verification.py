import urllib.request
import json
import time
from ml.predict import predict_delay

API = "http://127.0.0.1:8000"

def api(path, method="GET", body=None, token=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(f"{API}{path}", data=data, headers=headers, method=method)
    resp = urllib.request.urlopen(req, timeout=10)
    return json.loads(resp.read().decode())

time.sleep(2)

# 1. Login to get token
login_res = api("/auth/login", "POST", {
    "email": "test_redesign_user@example.com",
    "password": "Password123!"
})
token = login_res["access_token"]

results = {}

# 2. Risk Colors verification (Code Inspection of Charts.jsx and Dashboard.jsx)
with open("frontend/src/components/Charts.jsx", "r") as f:
    charts_code = f.read()

with open("frontend/src/components/Dashboard.jsx", "r") as f:
    dashboard_code = f.read()

risk_colors_ok = (
    ("val >= 70" in charts_code or "pct >= 70" in dashboard_code) and
    ("var(--status-error" in charts_code or "var(--status-error" in dashboard_code) and
    ("val >= 40" in charts_code or "pct >= 40" in dashboard_code) and
    ("var(--status-warning" in charts_code or "var(--status-warning" in dashboard_code) and
    ("var(--status-success" in charts_code or "var(--status-success" in dashboard_code)
)
results["RISK COLORS"] = "PASS" if risk_colors_ok else "FAIL"

# 3. ML Prediction verification
sample_features = {
    "backlog_orders": 28,
    "avg_processing_time_sec": 4.2,
    "item_count": 12,
    "carrier_transit_hours": 36,
    "historical_delay_rate": 0.35,
    "safety_stock_ratio": 0.4
}
ml_pred = predict_delay(sample_features)
ml_ok = (
    "delay_probability" in ml_pred and
    "risk_level" in ml_pred and
    "predicted_delay_minutes" in ml_pred and
    0.0 <= ml_pred["delay_probability"] <= 1.0
)
results["ML PREDICTION"] = "PASS" if ml_ok else "FAIL"

# 4. Live Data Connection verification
stats = api("/api/stats", token=token)
warehouses = api("/api/warehouses", token=token)
live_ok = (
    "total_orders" in stats and
    "total_inventory" in stats and
    isinstance(warehouses, dict) and "warehouses" in warehouses
)
results["LIVE DATA CONNECTION"] = "PASS" if live_ok else "FAIL"

# 5. Copilot Live Data & Questions
# 5a. Inventory question
copilot_inv = api("/api/copilot/chat", "POST", {"question": "What is the current inventory stock level?"}, token=token)
inv_ans = copilot_inv.get("answer", "")
copilot_inv_ok = "inventory units" in inv_ans or "available units" in inv_ans or "stock" in inv_ans
results["COPILOT INVENTORY QUESTION"] = "PASS" if copilot_inv_ok else "FAIL"

# 5b. Warehouse Risk question
copilot_wh = api("/api/copilot/chat", "POST", {"question": "What is the current warehouse with the highest risk?"}, token=token)
wh_ans = copilot_wh.get("answer", "")
copilot_wh_ok = "highest" in wh_ans.lower() and ("facility" in wh_ans.lower() or "warehouse" in wh_ans.lower()) and "risk" in wh_ans.lower()
results["COPILOT RISK QUESTION"] = "PASS" if copilot_wh_ok else "FAIL"

# 5c. Root-Cause question
copilot_rc = api("/api/copilot/chat", "POST", {"question": "Why is this warehouse high risk?"}, token=token)
rc_ans = copilot_rc.get("answer", "")
copilot_rc_ok = ("backlog" in rc_ans.lower() or "capacity" in rc_ans.lower() or "latency" in rc_ans.lower()) and len(rc_ans) > 20
results["COPILOT ROOT-CAUSE QUESTION"] = "PASS" if copilot_rc_ok else "FAIL"

# 5d. General Live Data grounding
results["COPILOT LIVE DATA"] = "PASS" if (copilot_inv_ok and copilot_wh_ok and copilot_rc_ok) else "FAIL"

# 5e. Hallucination Safety test (asking about unrelated/unavailable info)
copilot_hallucination = api("/api/copilot/chat", "POST", {"question": "What is the weather in Paris?"}, token=token)
hal_ans = copilot_hallucination.get("answer", "")
hal_safe = "unavailable" in hal_ans.lower() or "not available" in hal_ans.lower()
results["HALLUCINATION SAFETY"] = "PASS" if hal_safe else "FAIL"

for k, v in results.items():
    print(f"{k}: {v}")
