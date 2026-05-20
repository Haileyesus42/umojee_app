from server.main import app
from fastapi.testclient import TestClient

client = TestClient(app)

def main():
    r1 = client.get('/api/ai/hello')
    print('HELLO:', r1.status_code, r1.json())

    r2 = client.post('/api/ai/session/new', json={
        'user_id': 'test_user',
        'user_name': 'Test',
        'is_logged_in': False,
    })
    print('NEW  :', r2.status_code, r2.json())

    conv_id = r2.json().get('conversation_id')
    r3 = client.post('/api/ai/respond', json={
        'user_id': 'test_user',
        'message': 'Hello agent, test greeting',
        'conversation_id': conv_id,
    })
    print('RESP :', r3.status_code, r3.json())

if __name__ == '__main__':
    main()

