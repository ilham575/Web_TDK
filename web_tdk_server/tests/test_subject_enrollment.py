import pytest
import time
import random
from fastapi.testclient import TestClient
import os
import sys
# allow running tests when `web_tdk_server` is not a python package in sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from main import app

client = TestClient(app)


@pytest.mark.order(1)
def test_student_enrolled_after_assigning_classroom():
    # Create a school
    r = client.post('/schools', json={'name': f'Test School {int(time.time())}-{random.randint(0,9999)}'})
    assert r.status_code == 201
    school = r.json()

    # Create admin user
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

    # Login admin
    r = client.post('/users/login', data={'username': admin_username, 'password': 'adminpass'})
    assert r.status_code == 200
    token = r.json()['access_token']
    headers = {'Authorization': f'Bearer {token}'}

    # Create a classroom
    classroom_payload = {
        'name': 'Test Grade 1',
        'grade_level': 'Grade 1',
        'room_number': '1',
        'semester': 1,
        'academic_year': '2025',
        'school_id': school['id']
    }
    r = client.post('/classrooms/create', json=classroom_payload, headers=headers)
    assert r.status_code == 200
    classroom = r.json()

    # Create student
    student_username = f"student{int(time.time())}{random.randint(0,9999)}"
    student_data = {
        'username': student_username,
        'email': f"{student_username}@example.com",
        'password': 'studentpass',
        'role': 'student',
        'full_name': 'Test Student',
        'school_id': school['id']
    }
    r = client.post('/users', json=student_data)
    assert r.status_code == 201
    student = r.json()

    # Add student to classroom
    r = client.post(f"/classrooms/{classroom['id']}/add-students", json=[student['id']], headers=headers)
    assert r.status_code == 200
    add_result = r.json()
    assert add_result['added_count'] >= 1

    # Create subject
    subject_payload = {
        'name': 'Test Subject',
        'code': 'TS101',
        'subject_type': 'main',
        'teacher_id': None,
        'school_id': school['id']
    }
    r = client.post('/subjects', json=subject_payload, headers=headers)
    assert r.status_code == 201
    subject = r.json()

    # Assign classroom to subject (should auto-enroll student)
    r = client.post(f"/subjects/{subject['id']}/assign-classroom", json={'classroom_id': classroom['id']}, headers=headers)
    assert r.status_code == 201

    # Login as student
    r = client.post('/users/login', data={'username': student_username, 'password': 'studentpass'})
    assert r.status_code == 200
    student_token = r.json()['access_token']
    student_headers = {'Authorization': f'Bearer {student_token}'}

    # Fetch student subjects
    r = client.get(f"/subjects/student/{student['id']}", headers=student_headers)
    assert r.status_code == 200
    subjects = r.json()
    assert isinstance(subjects, list)
    # find our subject
    found = [s for s in subjects if s.get('id') == subject['id']]
    assert len(found) == 1

    # Clean up (if necessary) - no explicit cleanup in tests

