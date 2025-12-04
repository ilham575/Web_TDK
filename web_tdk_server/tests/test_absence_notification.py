import pytest
import time
import random
from fastapi.testclient import TestClient
import os
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from main import app

client = TestClient(app)


def create_school_and_admin():
    r = client.post('/schools', json={'name': f'Test School {int(time.time())}-{random.randint(0,9999)}'})
    assert r.status_code == 201
    school = r.json()

    # admin
    admin_username = f"testadmin{int(time.time())}{random.randint(0,9999)}"
    admin_data = {
        'username': admin_username,
        'email': f'{admin_username}@example.com',
        'password': 'adminpass',
        'role': 'admin',
        'full_name': 'Test Admin',
        'school_id': school['id']
    }
    r = client.post('/users', json=admin_data)
    assert r.status_code == 201

    r = client.post('/users/login', data={'username': admin_username, 'password': 'adminpass'})
    assert r.status_code == 200
    token = r.json()['access_token']
    headers = {'Authorization': f'Bearer {token}'}
    return school, headers


def create_teacher_and_assign_homeroom(school_id, admin_headers):
    teacher_username = f"teacher{int(time.time())}{random.randint(0,9999)}"
    teacher_data = {
        'username': teacher_username,
        'email': f'{teacher_username}@example.com',
        'password': 'teacherpass',
        'role': 'teacher',
        'full_name': 'Test Teacher',
        'school_id': school_id
    }
    r = client.post('/users', json=teacher_data)
    assert r.status_code == 201
    teacher = r.json()

    # Create homeroom assignment
    hr_payload = {
        'teacher_id': teacher['id'],
        'grade_level': 'Grade 1',
        'school_id': school_id,
        'academic_year': '2025'
    }
    r = client.post('/homeroom', json=hr_payload, headers=admin_headers)
    assert r.status_code == 201

    return teacher


def create_student_and_enroll(school_id, admin_headers, classroom_id):
    student_username = f"student{int(time.time())}{random.randint(0,9999)}"
    student_data = {
        'username': student_username,
        'email': f'{student_username}@example.com',
        'password': 'studentpass',
        'role': 'student',
        'full_name': 'Test Student',
        'school_id': school_id,
        'grade_level': 'Grade 1'
    }
    r = client.post('/users', json=student_data)
    assert r.status_code == 201
    student = r.json()

    # Add to classroom
    r = client.post(f"/classrooms/{classroom_id}/add-students", json=[student['id']], headers=admin_headers)
    assert r.status_code == 200
    return student


def create_classroom(school_id, admin_headers):
    payload = {
        'name': 'Test Grade 1',
        'grade_level': 'Grade 1',
        'room_number': '1',
        'semester': 1,
        'academic_year': '2025',
        'school_id': school_id
    }
    r = client.post('/classrooms/create', json=payload, headers=admin_headers)
    assert r.status_code == 200
    return r.json()


def test_student_absence_creates_announcement_and_notifies_homeroom():
    school, admin_headers = create_school_and_admin()
    classroom = create_classroom(school['id'], admin_headers)
    teacher = create_teacher_and_assign_homeroom(school['id'], admin_headers)
    student = create_student_and_enroll(school['id'], admin_headers, classroom['id'])

    # Login student
    r = client.post('/users/login', data={'username': student['username'], 'password': 'studentpass'})
    assert r.status_code == 200
    token = r.json()['access_token']
    student_headers = {'Authorization': f'Bearer {token}'}

    # Create absence
    payload = {
        'subject_id': None,
        'absence_date': '2025-12-01',
        'absence_date_end': None,
        'days_count': 1,
        'absence_type': 'sick',
        'reason': 'ไม่สบาย'
    }
    r = client.post('/absences/', json=payload, headers=student_headers)
    assert r.status_code == 201
    absence = r.json()

    # Check that an announcement was created for the school
    r = client.get(f"/announcements?school_id={school['id']}")
    assert r.status_code == 200
    announcements = r.json()
    # There should be at least one announcement containing our student's name
    assert any(student['full_name'] in (a.get('title') or a.get('content') or '') for a in announcements)

    # Approve the absence with the homeroom teacher and verify announcement is deleted
    # Login teacher
    r = client.post('/users/login', data={'username': teacher['username'], 'password': 'teacherpass'})
    assert r.status_code == 200
    teacher_token = r.json()['access_token']
    teacher_headers = {'Authorization': f'Bearer {teacher_token}'}

    # Approve
    r = client.put(f"/absences/{absence['id']}", json={'status': 'approved', 'version': absence['version']}, headers=teacher_headers)
    assert r.status_code == 200

    # Announcements should no longer contain our title
    r = client.get(f"/announcements?school_id={school['id']}")
    assert r.status_code == 200
    announcements = r.json()
    assert not any(student['full_name'] in (a.get('title') or a.get('content') or '') for a in announcements)
