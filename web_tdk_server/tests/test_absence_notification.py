import pytest
import time
import random
from fastapi.testclient import TestClient
import os
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from main import app
from database.connection import create_all_tables, SessionLocal
from models.user import User
from models.classroom import Classroom, ClassroomStudent
from models.homeroom import HomeroomTeacher
from models.semester_period import SemesterPeriod
from models.subject import Subject
from utils.security import hash_password
from datetime import datetime

create_all_tables()

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
    db = SessionLocal()
    try:
        admin = User(
            username=admin_data['username'],
            email=admin_data['email'],
            hashed_password=hash_password(admin_data['password']),
            role=admin_data['role'],
            full_name=admin_data['full_name'],
            school_id=admin_data['school_id'],
            is_active=True,
        )
        db.add(admin)
        db.commit()
    finally:
        db.close()

    r = client.post('/users/login', data={'username': admin_username, 'password': 'adminpass'})
    assert r.status_code == 200
    return school, admin_data


def create_teacher_and_assign_homeroom(school_id, admin_headers, classroom_id=None, grade_level='Grade 1', academic_year='2025', semester=1):
    teacher_username = f"teacher{int(time.time())}{random.randint(0,9999)}"
    teacher_data = {
        'username': teacher_username,
        'email': f'{teacher_username}@example.com',
        'password': 'teacherpass',
        'role': 'teacher',
        'full_name': 'Test Teacher',
        'school_id': school_id
    }
    db = SessionLocal()
    try:
        teacher = User(
            username=teacher_data['username'],
            email=teacher_data['email'],
            hashed_password=hash_password(teacher_data['password']),
            role=teacher_data['role'],
            full_name=teacher_data['full_name'],
            school_id=teacher_data['school_id'],
            is_active=True,
        )
        db.add(teacher)
        db.commit()
        db.refresh(teacher)
        teacher_data['id'] = teacher.id
    finally:
        db.close()

    db = SessionLocal()
    try:
        homeroom = HomeroomTeacher(
            teacher_id=teacher_data['id'],
            grade_level=grade_level,
            classroom_id=classroom_id,
            school_id=school_id,
            academic_year=academic_year,
            semester=semester,
        )
        db.add(homeroom)
        db.commit()
    finally:
        db.close()

    return teacher_data


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
    db = SessionLocal()
    try:
        student = User(
            username=student_data['username'],
            email=student_data['email'],
            hashed_password=hash_password(student_data['password']),
            role=student_data['role'],
            full_name=student_data['full_name'],
            school_id=student_data['school_id'],
            grade_level=student_data['grade_level'],
            is_active=True,
        )
        db.add(student)
        db.commit()
        db.refresh(student)
        student_data['id'] = student.id
    finally:
        db.close()

    db = SessionLocal()
    try:
        enrollment = ClassroomStudent(
            classroom_id=classroom_id,
            student_id=student_data['id'],
            is_active=True,
        )
        db.add(enrollment)
        db.commit()
    finally:
        db.close()

    return student_data


def create_user(school_id, role, password, full_name_prefix):
    username = f"{role}{int(time.time())}{random.randint(0,9999)}"
    payload = {
        'username': username,
        'email': f'{username}@example.com',
        'password': password,
        'role': role,
        'full_name': f'{full_name_prefix} {username}',
        'school_id': school_id,
    }
    db = SessionLocal()
    try:
        user = User(
            username=payload['username'],
            email=payload['email'],
            hashed_password=hash_password(payload['password']),
            role=payload['role'],
            full_name=payload['full_name'],
            school_id=payload['school_id'],
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        payload['id'] = user.id
    finally:
        db.close()
    return payload


def create_classroom(school_id, admin_headers, semester=1, academic_year='2025', name='Test Grade 1'):
    db = SessionLocal()
    try:
        classroom = Classroom(
            name=name,
            grade_level='Grade 1',
            room_number='1',
            semester=semester,
            academic_year=academic_year,
            school_id=school_id,
            is_active=True,
        )
        db.add(classroom)
        db.commit()
        db.refresh(classroom)
        return {
            'id': classroom.id,
            'name': classroom.name,
            'grade_level': classroom.grade_level,
            'room_number': classroom.room_number,
            'semester': classroom.semester,
            'academic_year': classroom.academic_year,
            'school_id': classroom.school_id,
        }
    finally:
        db.close()


def create_semester_period(school_id, admin_headers, academic_year, semester, start_date, end_date):
    db = SessionLocal()
    try:
        period = SemesterPeriod(
            school_id=school_id,
            academic_year=academic_year,
            semester=semester,
            start_date=datetime.fromisoformat(start_date),
            end_date=datetime.fromisoformat(end_date),
            is_auto_closed=False,
        )
        db.add(period)
        db.commit()
        db.refresh(period)
        return {
            'id': period.id,
            'school_id': period.school_id,
            'academic_year': period.academic_year,
            'semester': period.semester,
        }
    finally:
        db.close()


def create_subject(school_id, academic_year='2025', semester=1, name='Test Subject'):
    db = SessionLocal()
    try:
        subject = Subject(
            name=name,
            code=f'SUB-{random.randint(1000, 9999)}',
            subject_type='main',
            school_id=school_id,
            academic_year=academic_year,
            semester=semester,
            is_ended=False,
        )
        db.add(subject)
        db.commit()
        db.refresh(subject)
        return {
            'id': subject.id,
            'name': subject.name,
            'academic_year': subject.academic_year,
            'semester': subject.semester,
        }
    finally:
        db.close()


def test_student_absence_creates_announcement_and_notifies_homeroom():
    school, admin_headers = create_school_and_admin()
    classroom = create_classroom(school['id'], admin_headers)
    create_semester_period(school['id'], admin_headers, '2025', 1, '2020-01-01T00:00:00', '2030-12-31T23:59:59')
    teacher = create_teacher_and_assign_homeroom(school['id'], admin_headers, classroom_id=classroom['id'])
    student = create_student_and_enroll(school['id'], admin_headers, classroom['id'])

    # Login student
    r = client.post('/users/login', data={'username': student['username'], 'password': 'studentpass'})
    assert r.status_code == 200

    # Create absence
    payload = {
        'subject_id': None,
        'absence_date': '2025-12-01',
        'absence_date_end': None,
        'days_count': 1,
        'absence_type': 'sick',
        'reason': 'ไม่สบาย'
    }
    r = client.post('/absences/', json=payload)
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

    # Approve
    r = client.put(f"/absences/{absence['id']}", json={'status': 'approved', 'version': absence['version']})
    assert r.status_code == 200

    # Announcements should no longer contain our title
    r = client.get(f"/announcements?school_id={school['id']}")
    assert r.status_code == 200
    announcements = r.json()
    assert not any(student['full_name'] in (a.get('title') or a.get('content') or '') for a in announcements)


def test_absence_approval_respects_homeroom_semester_assignment():
    school, admin_headers = create_school_and_admin()

    semester_1_classroom = create_classroom(school['id'], admin_headers, semester=1, academic_year='2025', name='Grade 1 / Sem 1')
    semester_2_classroom = create_classroom(school['id'], admin_headers, semester=2, academic_year='2025', name='Grade 1 / Sem 2')

    create_semester_period(school['id'], admin_headers, '2025', 1, '2020-01-01T00:00:00', '2030-12-31T23:59:59')
    create_semester_period(school['id'], admin_headers, '2025', 2, '2031-01-01T00:00:00', '2032-12-31T23:59:59')

    semester_1_teacher = create_teacher_and_assign_homeroom(
        school['id'],
        admin_headers,
        classroom_id=semester_1_classroom['id'],
        academic_year='2025',
        semester=1,
    )
    semester_2_teacher = create_teacher_and_assign_homeroom(
        school['id'],
        admin_headers,
        classroom_id=semester_2_classroom['id'],
        academic_year='2025',
        semester=2,
    )

    student = create_student_and_enroll(school['id'], admin_headers, semester_1_classroom['id'])
    db = SessionLocal()
    try:
        second_enrollment = ClassroomStudent(
            classroom_id=semester_2_classroom['id'],
            student_id=student['id'],
            is_active=True,
        )
        db.add(second_enrollment)
        db.commit()
    finally:
        db.close()

    r = client.post('/users/login', data={'username': student['username'], 'password': 'studentpass'})
    assert r.status_code == 200

    r = client.post('/absences/', json={
        'subject_id': None,
        'absence_date': '2025-06-15',
        'absence_date_end': None,
        'days_count': 1,
        'absence_type': 'personal',
        'reason': 'ธุระส่วนตัว'
    })
    assert r.status_code == 201
    absence = r.json()

    r = client.post('/users/login', data={'username': semester_2_teacher['username'], 'password': 'teacherpass'})
    assert r.status_code == 200

    r = client.put(
        f"/absences/{absence['id']}",
        json={'status': 'approved', 'version': absence['version']},
    )
    assert r.status_code == 403

    r = client.post('/users/login', data={'username': semester_1_teacher['username'], 'password': 'teacherpass'})
    assert r.status_code == 200

    r = client.put(
        f"/absences/{absence['id']}",
        json={'status': 'approved', 'version': absence['version']},
    )
    assert r.status_code == 200


def test_student_absence_is_full_day_and_ignores_subject_selection():
    school, admin_headers = create_school_and_admin()
    classroom = create_classroom(school['id'], admin_headers, semester=1, academic_year='2025')
    create_semester_period(school['id'], admin_headers, '2025', 1, '2020-01-01T00:00:00', '2030-12-31T23:59:59')
    student = create_student_and_enroll(school['id'], admin_headers, classroom['id'])
    subject = create_subject(school['id'], academic_year='2025', semester=1)

    r = client.post('/users/login', data={'username': student['username'], 'password': 'studentpass'})
    assert r.status_code == 200

    r = client.post('/absences/', json={
        'subject_id': subject['id'],
        'absence_date': '2025-07-15',
        'absence_date_end': None,
        'days_count': 1,
        'absence_type': 'personal',
        'reason': 'ธุระส่วนตัว'
    })
    assert r.status_code == 201
    absence = r.json()
    assert absence['subject_id'] is None
    assert absence['subject_name'] is None

    r = client.put(
        f"/absences/{absence['id']}",
        json={'subject_id': subject['id'], 'reason': 'อัปเดตเหตุผล'},
    )
    assert r.status_code == 200
    updated = r.json()
    assert updated['subject_id'] is None
    assert updated['subject_name'] is None
    assert updated['reason'] == 'อัปเดตเหตุผล'


def test_teacher_only_announcement_visible_with_cookie_auth():
    school, admin = create_school_and_admin()
    teacher = create_user(school['id'], 'teacher', 'teacherpass', 'Teacher')
    student = create_user(school['id'], 'student', 'studentpass', 'Student')

    teacher_only = {
        'title': 'Teacher Only Notice',
        'content': 'Visible only to teachers',
        'school_id': school['id'],
        'to_students': False,
        'to_teachers': True,
    }

    r = client.post('/users/login', data={'username': admin['username'], 'password': 'adminpass'})
    assert r.status_code == 200

    r = client.post('/announcements/', json=teacher_only)
    assert r.status_code == 201
    created = r.json()
    assert created['to_students'] is False
    assert created['to_teachers'] is True

    r = client.get(f"/announcements?school_id={school['id']}")
    assert r.status_code == 200
    admin_items = r.json()
    assert any(item['id'] == created['id'] for item in admin_items)

    r = client.post('/users/login', data={'username': teacher['username'], 'password': 'teacherpass'})
    assert r.status_code == 200
    r = client.get(f"/announcements?school_id={school['id']}")
    assert r.status_code == 200
    teacher_items = r.json()
    assert any(item['id'] == created['id'] for item in teacher_items)

    r = client.post('/users/login', data={'username': student['username'], 'password': 'studentpass'})
    assert r.status_code == 200
    r = client.get(f"/announcements?school_id={school['id']}")
    assert r.status_code == 200
    student_items = r.json()
    assert not any(item['id'] == created['id'] for item in student_items)
