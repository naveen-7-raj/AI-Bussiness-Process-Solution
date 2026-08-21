import urllib.request
import json

# 1. Login with registered user
login_req = urllib.request.Request(
    'http://127.0.0.1:8000/auth/login',
    data=json.dumps({'email': 'nexora_test_user@example.com', 'password': 'NexoraSecurePassword123!'}).encode('utf-8'),
    headers={'Content-Type': 'application/json'}
)
token = json.loads(urllib.request.urlopen(login_req).read().decode())['access_token']
headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}

# 2. Test GET and POST /api/settings
get_settings_req = urllib.request.Request('http://127.0.0.1:8000/api/settings', headers=headers)
settings_data = json.loads(urllib.request.urlopen(get_settings_req).read().decode())
print("=== SETTINGS CHECK ===")
print("Registered User Email:", settings_data.get('email'))
print("Current Timezone:", settings_data.get('timezone'))
assert settings_data.get('email') == 'nexora_test_user@example.com', "User email must map to authenticated account!"

# Save new timezone and preference
save_settings_req = urllib.request.Request(
    'http://127.0.0.1:8000/api/settings',
    data=json.dumps({'email_notifications': 'All Alerts', 'timezone': 'Asia/Kolkata'}).encode('utf-8'),
    headers=headers
)
save_res = json.loads(urllib.request.urlopen(save_settings_req).read().decode())
print("Save Settings Status:", save_res.get('status'))

# 3. Test High-Risk Condition Notification Dispatch
print("\n=== ALERT 1: HIGH RISK ALERT ===")
high_risk_alert = {
    "alert_type": "High Risk Demand Surge",
    "warehouse_id": "WH01",
    "product_id": "P001",
    "severity": "HIGH",
    "description": "Order arrival rate spiked by 300% exceeding warehouse throughput."
}
req1 = urllib.request.Request(
    'http://127.0.0.1:8000/api/notifications/dispatch-alert',
    data=json.dumps(high_risk_alert).encode('utf-8'),
    headers=headers
)
res1 = json.loads(urllib.request.urlopen(req1).read().decode())
print("Recipient Selected:", res1.get('recipient'))
print("Alert Status:", res1.get('status'))
assert res1.get('recipient') == 'nexora_test_user@example.com'

# 4. Test Critical Condition Notification Dispatch
print("\n=== ALERT 2: CRITICAL INVENTORY SHORTAGE ===")
critical_alert = {
    "alert_type": "Critical Stockout",
    "warehouse_id": "WH03",
    "product_id": "P018",
    "severity": "CRITICAL",
    "description": "Stock depleted to 0 units with pending backorders."
}
req2 = urllib.request.Request(
    'http://127.0.0.1:8000/api/notifications/dispatch-alert',
    data=json.dumps(critical_alert).encode('utf-8'),
    headers=headers
)
res2 = json.loads(urllib.request.urlopen(req2).read().decode())
print("Recipient Selected:", res2.get('recipient'))
print("Alert Status:", res2.get('status'))
assert res2.get('recipient') == 'nexora_test_user@example.com'

# 5. Test Duplicate Alert Prevention
print("\n=== ALERT 3: DUPLICATE PREVENTION CHECK ===")
req3 = urllib.request.Request(
    'http://127.0.0.1:8000/api/notifications/dispatch-alert',
    data=json.dumps(critical_alert).encode('utf-8'),
    headers=headers
)
res3 = json.loads(urllib.request.urlopen(req3).read().decode())
print("Duplicate Status:", res3.get('status'))
print("Duplicate Message:", res3.get('message'))
assert res3.get('status') == 'duplicate_suppressed'

print("\nALL SETTINGS & NOTIFICATION TESTS PASSED SUCCESSFULLY!")
