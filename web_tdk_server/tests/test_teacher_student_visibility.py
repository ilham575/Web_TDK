import os
import random
import sys
import time

import pytest
from fastapi.testclient import TestClient

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from database.connection import create_all_tables, SessionLocal
from main import app
from models.school import School as SchoolModel
from models.user import User as UserModel
from utils.security import hash_password


create_all_tables()
client = TestClient(app)


def _make_name(prefix: str) -> str:
    return f"{prefix}{int(time.time())}{random.randint(0, 9999)}"


def _create_school_and_admin():
    school_resp = client.post('/schools', json={'name': _make_name('Teacher Scope School ')})
    assert school_resp.status_code == 201
    school = school_resp.json()

    db = SessionLocal()
    try:
        db_school = db.query(SchoolModel).filter(SchoolModel.id == school['id']).first()
        db_school.is_academic_year_setup = True
        db_school.current_academic_year = '2569'
        db_school.current_semester = 1
        db_school.can_teacher_view_summary = 1
        db.commit()
    finally:
        db.close()

    admin_username = _make_name('admin')
    db = SessionLocal()
    try:
        admin = UserModel(
            username=admin_username,
            email=f'{admin_username}@example.com',
            hashed_password=hash_password('adminpass'),
            role='admin',
            full_name='Teacher Scope Admin',
            school_id=school['id'],
            is_active=True,
            user_status='active',
        )
        db.add(admin)
        db.commit()
    finally:
        db.close()

    login_resp = client.post('/users/login', data={'username': admin_username, 'password': 'adminpass'})
    assert login_resp.status_code == 200
    token = login_resp.json()['access_token']
    return school, {'Authorization': f'Bearer {token}'}


def _create_user(headers, school_id, role, full_name, grade_level='ป.1'):
    username = _make_name(role)
    db = SessionLocal()
    try:
        user = UserModel(
            username=username,
            email=f'{username}@example.com',
            hashed_password=hash_password('pass1234'),
            role=role,
            full_name=full_name,
            school_id=school_id,
            grade_level=grade_level if role == 'student' else None,
            is_active=True,
            user_status='active',
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'role': user.role,
            'full_name': user.full_name,
            'school_id': user.school_id,
            'grade_level': user.grade_level,
        }, username
    finally:
        db.close()


def _login(username, password='pass1234'):
    resp = client.post('/users/login', data={'username': username, 'password': password})
    assert resp.status_code == 200
    return {'Authorization': f"Bearer {resp.json()['access_token']}"}


def _create_classroom(headers, school_id, name, year='2569', semester=1):
    resp = client.post('/classrooms/create', json={
        'name': name,
        'grade_level': 'ป.1',
        'room_number': name,
        'semester': semester,
        'academic_year': year,
        'school_id': school_id,
    }, headers=headers)
    assert resp.status_code == 200
    return resp.json()


def _create_subject(headers, school_id, name, year='2569', semester=1):
    resp = client.post('/subjects', json={
        'name': name,
        'code': _make_name('SUB'),
        'subject_type': 'main',
        'teacher_id': None,
        'school_id': school_id,
        'academic_year': year,
        'semester': semester,
    }, headers=headers)
    assert resp.status_code == 201
    return resp.json()


@pytest.mark.order(2)
def test_subject_students_ignore_resigned_and_non_classroom_students_for_teacher_view():
    school, admin_headers = _create_school_and_admin()
    teacher, teacher_username = _create_user(admin_headers, school['id'], 'teacher', 'Scoped Teacher')
    active_student, _ = _create_user(admin_headers, school['id'], 'student', 'Visible Student')
    removed_student, _ = _create_user(admin_headers, school['id'], 'student', 'Removed Student')
    other_room_student, _ = _create_user(admin_headers, school['id'], 'student', 'Other Room Student')
    resigned_student, _ = _create_user(admin_headers, school['id'], 'student', 'Resigned Student')

    classroom = _create_classroom(admin_headers, school['id'], '1/1')
    other_classroom = _create_classroom(admin_headers, school['id'], '1/2')
    subject = _create_subject(admin_headers, school['id'], 'Math Scope Test')

    assert client.post(f"/classrooms/{classroom['id']}/add-students", json=[
        active_student['id'], removed_student['id'], resigned_student['id']
    ], headers=admin_headers).status_code == 200
    assert client.post(f"/classrooms/{other_classroom['id']}/add-students", json=[other_room_student['id']], headers=admin_headers).status_code == 200

    assert client.post(f"/subjects/{subject['id']}/assign-classroom", json={'classroom_id': classroom['id']}, headers=admin_headers).status_code == 201
    assert client.post(f"/subjects/{subject['id']}/enroll", json={'student_id': other_room_student['id']}, headers=admin_headers).status_code == 201
    assert client.post(f"/subjects/{subject['id']}/teachers", json={'teacher_id': teacher['id'], 'classroom_id': None}, headers=admin_headers).status_code == 200

    assert client.delete(f"/classrooms/{classroom['id']}/students/{removed_student['id']}", headers=admin_headers).status_code == 200
    assert client.patch(f"/users/{resigned_student['id']}/resign", headers=admin_headers).status_code == 200

    teacher_headers = _login(teacher_username)
    resp = client.get(f"/subjects/{subject['id']}/students", headers=teacher_headers)
    assert resp.status_code == 200
    students = resp.json()

    names = {student['full_name'] for student in students}
    assert names == {'Visible Student'}
    assert students[0]['classroom']['id'] == classroom['id']


@pytest.mark.order(3)
def test_homeroom_summary_and_ranking_ignore_removed_and_resigned_students():
    school, admin_headers = _create_school_and_admin()
    teacher, teacher_username = _create_user(admin_headers, school['id'], 'teacher', 'Homeroom Teacher')
    active_student, _ = _create_user(admin_headers, school['id'], 'student', 'Homeroom Active')
    removed_student, _ = _create_user(admin_headers, school['id'], 'student', 'Homeroom Removed')
    resigned_student, _ = _create_user(admin_headers, school['id'], 'student', 'Homeroom Resigned')

    classroom = _create_classroom(admin_headers, school['id'], '2/1')

    assert client.post(f"/classrooms/{classroom['id']}/add-students", json=[
        active_student['id'], removed_student['id'], resigned_student['id']
    ], headers=admin_headers).status_code == 200
    assert client.post('/homeroom/', json={
        'teacher_id': teacher['id'],
        'grade_level': 'ป.1',
        'classroom_id': classroom['id'],
        'school_id': school['id'],
        'academic_year': '2569',
        'semester': 1,
    }, headers=admin_headers).status_code == 201

    assert client.delete(f"/classrooms/{classroom['id']}/students/{removed_student['id']}", headers=admin_headers).status_code == 200
    assert client.patch(f"/users/{resigned_student['id']}/resign", headers=admin_headers).status_code == 200

    teacher_headers = _login(teacher_username)

    summary_resp = client.get('/homeroom/my-classrooms/summary?academic_year=2569&semester=1', headers=teacher_headers)
    assert summary_resp.status_code == 200
    summary = summary_resp.json()
    assert len(summary['classrooms']) == 1
    classroom_summary = summary['classrooms'][0]
    assert classroom_summary['student_count'] == 1
    assert {student['full_name'] for student in classroom_summary['students']} == {'Homeroom Active'}

    ranking_resp = client.get(f"/grades/classroom/{classroom['id']}/ranking?academic_year=2569&semester=1", headers=teacher_headers)
    assert ranking_resp.status_code == 200
    ranking = ranking_resp.json()
    assert {student['full_name'] for student in ranking} == {'Homeroom Active'}