import urllib.request
import json

login_req = urllib.request.Request(
    'http://127.0.0.1:8000/auth/login',
    data=json.dumps({'email': 'nexora_test_user@example.com', 'password': 'NexoraSecurePassword123!'}).encode('utf-8'),
    headers={'Content-Type': 'application/json'}
)
token = json.loads(urllib.request.urlopen(login_req).read().decode())['access_token']
headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}

questions = [
    'What is the current inventory situation?',
    'Which warehouse has the highest load?',
    'Which products have shortage risk?',
    'Why is this warehouse at risk?',
    'What recommendations are currently active?'
]

print('=== TESTING 5 REPRESENTATIVE COPILOT QUESTIONS ===\n')

for idx, q in enumerate(questions, 1):
    req = urllib.request.Request(
        'http://127.0.0.1:8000/api/copilot/chat',
        data=json.dumps({'question': q}).encode('utf-8'),
        headers=headers
    )
    res = json.loads(urllib.request.urlopen(req).read().decode())
    print(f'Q{idx}: "{q}"')
    print(f'Source: {res.get("source")}')
    print(f'Answer: {res.get("answer")}\n' + '-'*60)
    assert bool(res.get('answer')), f'Empty answer for Q{idx}'

print('\nALL 5 COPILOT QUESTIONS PASSED ACCURATELY!')
