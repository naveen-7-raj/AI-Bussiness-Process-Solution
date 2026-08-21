"""
Nexora BPI -- SMTP Email Notification Verification
Self-contained: loads .env, starts backend with SMTP env, runs controlled test.
SECURITY: never prints credential values.
"""
import os, sys, time, json, subprocess, urllib.request, urllib.error, signal

# ── 1. Load .env into this process ────────────────────────────────────────────
from dotenv import load_dotenv
load_dotenv(dotenv_path=".env", override=True)

results = {}

# ── SMTP CONFIG LOADED ─────────────────────────────────────────────────────────
required = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD", "SMTP_FROM_EMAIL"]
missing  = [k for k in required if not os.getenv(k, "").strip()]
results["SMTP CONFIG LOADED"] = "PASS" if not missing else f"FAIL (missing: {missing})"

if missing:
    for k, v in results.items():
        print(f"  {k}: {v}")
    print("\n  Cannot continue — add missing SMTP keys to .env")
    sys.exit(1)

SMTP_HOST     = os.getenv("SMTP_HOST")
SMTP_PORT     = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER     = os.getenv("SMTP_USER")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
SMTP_FROM     = os.getenv("SMTP_FROM_EMAIL", "alerts@nexora-bpi.com")

# ── SMTP CONNECTION TEST ───────────────────────────────────────────────────────
import smtplib
try:
    srv = smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=8)
    srv.ehlo()
    srv.starttls()
    srv.ehlo()
    srv.login(SMTP_USER, SMTP_PASSWORD)
    results["SMTP CONNECTION"] = "PASS"
    _smtp_ok = True
    srv.quit()
except Exception as e:
    results["SMTP CONNECTION"] = f"FAIL ({e})"
    _smtp_ok = False

# ── EMAIL SENDING — one controlled test email ──────────────────────────────────
if _smtp_ok:
    from email.mime.text import MIMEText
    try:
        msg = MIMEText(
            "This is a single controlled verification email from Nexora BPI.\n"
            "If you received this, the SMTP pipeline is fully operational.\n\n"
            "-- Nexora BPI Intelligence Engine"
        )
        msg["Subject"] = "[Nexora BPI] SMTP Verification Test"
        msg["From"]    = SMTP_FROM

        # Recipient: read from backend DB via API (after backend starts)
        # For the SMTP send test, temporarily use SMTP_FROM as sender/recipient
        # The real per-user routing is tested in the API round-trip below.
        msg["To"] = SMTP_FROM   # self-send for verification only

        srv2 = smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=8)
        srv2.ehlo()
        srv2.starttls()
        srv2.login(SMTP_USER, SMTP_PASSWORD)
        srv2.sendmail(SMTP_FROM, [SMTP_FROM], msg.as_string())
        srv2.quit()
        results["EMAIL SENDING"] = "PASS (accepted by SMTP provider)"
    except Exception as e:
        results["EMAIL SENDING"] = f"FAIL ({e})"
else:
    results["EMAIL SENDING"] = "FAIL (skipped — SMTP connection failed)"

# ── Start backend with SMTP env loaded ────────────────────────────────────────
# Kill any existing process on port 8000
import socket
def port_open(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(1)
        return s.connect_ex(("127.0.0.1", port)) == 0

if port_open(8000):
    # Already running — check if it knows the SMTP config via /api/settings
    pass
else:
    env = os.environ.copy()
    env["PYTHONPATH"] = ".;backend"
    env["PYTHONIOENCODING"] = "utf-8"
    proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "backend.main:app", "--port", "8000"],
        env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
    )
    for _ in range(15):
        if port_open(8000):
            break
        time.sleep(1)

# ── API helpers ───────────────────────────────────────────────────────────────
API = "http://127.0.0.1:8000"

def api(path, method="GET", body=None, token=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(
        f"{API}{path}", data=data, headers=headers, method=method
    )
    try:
        resp = urllib.request.urlopen(req, timeout=10)
        return json.loads(resp.read().decode()), None
    except urllib.error.HTTPError as e:
        return None, f"HTTP {e.code}: {e.read().decode()[:200]}"
    except Exception as e:
        return None, str(e)

# ── Login ──────────────────────────────────────────────────────────────────────
login_data, err = api("/auth/login", "POST", {
    "email": "nexora_test_user@example.com",
    "password": "NexoraSecurePassword123!"
})
if err or not login_data:
    print("  FATAL: Login failed:", err)
    sys.exit(1)
token = login_data["access_token"]

# ── REGISTERED USER RECIPIENT ─────────────────────────────────────────────────
settings, err = api("/api/settings", token=token)
if settings and settings.get("email") and "@" in settings["email"]:
    registered_email = settings["email"]
    smtp_backend = settings.get("smtp_configured", False)
    results["REGISTERED USER RECIPIENT"] = f"PASS (email resolved from DB)"
else:
    results["REGISTERED USER RECIPIENT"] = f"FAIL ({err})"
    registered_email = None

# ── Alert type tests ──────────────────────────────────────────────────────────
RUN_ID = str(int(time.time()))

ALERT_TESTS = [
    ("CRITICAL ALERT",   "Critical Stockout",        "WH03", "P018", "CRITICAL",
     "Stock depleted to 0 units. Expedited replenishment required."),
    ("HIGH-RISK ALERT",  "High Risk Demand Surge",   "WH01", "P001", "HIGH",
     "Demand 300% above normal velocity."),
    ("INVENTORY ALERT",  "Inventory Shortage",       "WH05", "P012", "HIGH",
     "Quantity dropped below safety stock threshold."),
    ("WAREHOUSE ALERT",  "Warehouse Overload",       "WH02", None,   "HIGH",
     "Backlog exceeded critical threshold. Capacity at 95%."),
]

for label, alert_type, wh, prod, sev, desc in ALERT_TESTS:
    body = {
        "alert_type": f"{alert_type} {RUN_ID}",
        "warehouse_id": wh,
        "severity": sev,
        "description": desc,
    }
    if prod:
        body["product_id"] = prod

    resp, err = api("/api/notifications/dispatch-alert", "POST", body, token=token)
    if err:
        results[label] = f"FAIL ({err})"
    elif resp:
        status = resp.get("status", "")
        recip  = resp.get("recipient", "")
        if status == "delivered":
            results[label] = f"PASS (delivered to {recip})"
        elif status == "duplicate_suppressed":
            results[label] = "PASS (duplicate suppressed correctly)"
        elif status == "PROVIDER REQUIRED":
            results[label] = "FAIL (SMTP not loaded by running backend — restart required)"
        elif status == "delivery_failed":
            results[label] = f"FAIL (SMTP error: {resp.get('error','')})"
        else:
            results[label] = f"FAIL (unexpected status: {status})"
    else:
        results[label] = "FAIL (no response)"

# ── GIT SECRET SAFETY ─────────────────────────────────────────────────────────
git_check = subprocess.run(
    ["git", "check-ignore", "-q", ".env"],
    capture_output=True,
    cwd=os.getcwd()
)
results["GIT SECRET SAFETY"] = (
    "PASS (.env is git-ignored)" if git_check.returncode == 0
    else "FAIL (.env is NOT ignored — fix .gitignore immediately)"
)

# ── Print final results ────────────────────────────────────────────────────────
print("\n========== NEXORA BPI EMAIL NOTIFICATION VERIFICATION ==========\n")
for k, v in results.items():
    print(f"  {k}: {v}")
print("\n=================================================================")
print(f"  SMTP backend-loaded: {smtp_backend if 'smtp_backend' in dir() else 'unknown'}")
print(f"  Registered recipient: {registered_email or 'unknown'}")
print(f"  Test run ID: {RUN_ID}")
print("=================================================================\n")
