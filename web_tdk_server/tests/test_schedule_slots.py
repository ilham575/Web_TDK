import pytest
import time
import random
from fastapi.testclient import TestClient
import os
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from main import app

client = TestClient(app)


@pytest.mark.order(1)
def test_create_schedule_slot_accepts_int_and_string_day():
    # create a school
    r = client.post('/schools', json={'name': f'Test School {int(time.time())}-{random.randint(0,9999)}'})
    assert r.status_code == 201
    school = r.json()

    # create admin user
    admin_username = f"testadmin{int(time.time())}{random.randint(0,9999)}"
    admin_email = f"{admin_username}@example.com"
    admin_data = {
        'username': admin_username,
        'email': admin_email,
        'password': 'adminpass',
        'role': 'admin',
        'full_name': 'Test Admin',
        'school_id': school['id']
    }
    r = client.post('/users', json=admin_data)
    assert r.status_code == 201

    # login
    r = client.post('/users/login', data={'username': admin_username, 'password': 'adminpass'})
    assert r.status_code == 200
    token = r.json()['access_token']
    headers = {'Authorization': f'Bearer {token}'}

    # try with int day
    payload_int = {'day_of_week': 0, 'start_time': '08:00', 'end_time': '09:00', 'school_id': school['id']}
    r = client.post('/schedule/slots', json=payload_int, headers=headers)
    assert r.status_code == 201

    # try with string day
    payload_str = {'day_of_week': '1', 'start_time': '09:00', 'end_time': '10:00', 'school_id': school['id']}
    r = client.post('/schedule/slots', json=payload_str, headers=headers)
    assert r.status_code == 201
