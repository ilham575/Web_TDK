import os
import random
import sys
import time

from fastapi.testclient import TestClient

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from main import app
from database.connection import SessionLocal, create_all_tables
from models.classroom import Classroom, ClassroomStudent
from models.school import School
from models.user import User
from utils.security import hash_password


create_all_tables()
client = TestClient(app)


def _suffix():
    return f"{int(time.time())}{random.randint(1000, 9999)}"


def create_school_admin_and_headers(graduation_grade_level='Grade 6'):
    school_name = f"Graduation Guard School {_suffix()}"
    response = client.post('/schools', json={'name': school_name})
    assert response.status_code == 201
    school = response.json()

    db = SessionLocal()
    try:
        school_row = db.query(School).filter(School.id == school['id']).first()
        school_row.is_academic_year_setup = True
        school_row.current_academic_year = '2568'
        school_row.current_semester = 1
        school_row.graduation_grade_level = graduation_grade_level

        admin_username = f"guardadmin{_suffix()}"
        admin = User(
            username=admin_username,
            email=f'{admin_username}@example.com',
            hashed_password=hash_password('adminpass'),
            role='admin',
            full_name='Graduation Guard Admin',
            school_id=school['id'],
            is_active=True,
        )
        db.add(admin)
        db.commit()
    finally:
        db.close()

    login_response = client.post('/users/login', data={'username': admin_username, 'password': 'adminpass'})
    assert login_response.status_code == 200
    token = login_response.json()['access_token']
    headers = {'Authorization': f'Bearer {token}'}

    return school, headers


def create_classroom_with_student(school_id, grade_level='Grade 6', academic_year='2568', semester=1):
    db = SessionLocal()
    try:
        classroom = Classroom(
            name=f'{grade_level}/1',
            grade_level=grade_level,
            room_number='1',
            semester=semester,
            academic_year=academic_year,
            school_id=school_id,
            is_active=True,
        )
        db.add(classroom)
        db.flush()

        student_username = f"guardstudent{_suffix()}"
        student = User(
            username=student_username,
            email=f'{student_username}@example.com',
            hashed_password=hash_password('studentpass'),
            role='student',
            full_name='Graduation Guard Student',
            school_id=school_id,
            grade_level=grade_level,
            is_active=True,
            user_status='active',
        )
        db.add(student)
        db.flush()

        enrollment = ClassroomStudent(
            classroom_id=classroom.id,
            student_id=student.id,
            student_number=1,
            is_active=True,
        )
        db.add(enrollment)
        db.commit()

        return classroom.id, student.id
    finally:
        db.close()


def test_end_of_year_classroom_promotion_blocks_advancing_beyond_graduation_grade():
    school, headers = create_school_admin_and_headers(graduation_grade_level='Grade 6')
    classroom_id, student_id = create_classroom_with_student(school['id'], grade_level='Grade 6', academic_year='2568')

    response = client.post(
        f'/classrooms/{classroom_id}/promote',
        headers=headers,
        json={
            'promotion_type': 'end_of_year',
            'new_grade_level': 'Grade 7',
            'new_academic_year': '2569',
            'include_grades': False,
        },
    )

    assert response.status_code == 400
    assert 'ชั้นจบ' in response.json()['detail']

    db = SessionLocal()
    try:
        next_year_classroom = db.query(Classroom).filter(
            Classroom.school_id == school['id'],
            Classroom.academic_year == '2569',
            Classroom.grade_level == 'Grade 7',
        ).first()
        assert next_year_classroom is None

        active_enrollment = db.query(ClassroomStudent).filter(
            ClassroomStudent.classroom_id == classroom_id,
            ClassroomStudent.student_id == student_id,
            ClassroomStudent.is_active == True,
        ).first()
        assert active_enrollment is not None
    finally:
        db.close()


def test_end_of_year_student_promotion_blocks_advancing_beyond_graduation_grade():
    school, headers = create_school_admin_and_headers(graduation_grade_level='Grade 6')
    classroom_id, student_id = create_classroom_with_student(school['id'], grade_level='Grade 6', academic_year='2568')

    response = client.post(
        '/users/promote_students',
        headers=headers,
        json={
            'promotion_type': 'end_of_year',
            'student_ids': [student_id],
            'new_grade_level': 'Grade 7',
            'new_academic_year': '2569',
            'classroom_id': classroom_id,
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload['promoted_count'] == 0
    assert payload['failed_count'] == 1
    assert any('ชั้นจบ' in error for error in payload['errors'])

    db = SessionLocal()
    try:
        student = db.query(User).filter(User.id == student_id).first()
        assert student is not None
        assert student.grade_level == 'Grade 6'

        active_enrollment = db.query(ClassroomStudent).filter(
            ClassroomStudent.classroom_id == classroom_id,
            ClassroomStudent.student_id == student_id,
            ClassroomStudent.is_active == True,
        ).first()
        assert active_enrollment is not None

        next_year_classroom = db.query(Classroom).filter(
            Classroom.school_id == school['id'],
            Classroom.academic_year == '2569',
            Classroom.grade_level == 'Grade 7',
        ).first()
        assert next_year_classroom is None
    finally:
        db.close()


def test_end_of_year_classroom_promotion_allows_repeating_same_graduation_grade():
    school, headers = create_school_admin_and_headers(graduation_grade_level='Grade 6')
    classroom_id, student_id = create_classroom_with_student(school['id'], grade_level='Grade 6', academic_year='2568')

    response = client.post(
        f'/classrooms/{classroom_id}/promote',
        headers=headers,
        json={
            'promotion_type': 'end_of_year',
            'new_grade_level': 'Grade 6',
            'new_academic_year': '2569',
            'include_grades': False,
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload['new_classroom_name'] == 'Grade 6/1'
    assert payload['promoted_students'] == 1

    db = SessionLocal()
    try:
        next_year_classroom = db.query(Classroom).filter(
            Classroom.school_id == school['id'],
            Classroom.academic_year == '2569',
            Classroom.grade_level == 'Grade 6',
            Classroom.room_number == '1',
        ).first()
        assert next_year_classroom is not None

        repeated_enrollment = db.query(ClassroomStudent).filter(
            ClassroomStudent.classroom_id == next_year_classroom.id,
            ClassroomStudent.student_id == student_id,
            ClassroomStudent.is_active == True,
        ).first()
        assert repeated_enrollment is not None
    finally:
        db.close()


def test_end_of_year_student_promotion_allows_repeating_same_graduation_grade():
    school, headers = create_school_admin_and_headers(graduation_grade_level='Grade 6')
    classroom_id, student_id = create_classroom_with_student(school['id'], grade_level='Grade 6', academic_year='2568')

    response = client.post(
        '/users/promote_students',
        headers=headers,
        json={
            'promotion_type': 'end_of_year',
            'student_ids': [student_id],
            'new_grade_level': 'Grade 6',
            'new_academic_year': '2569',
            'classroom_id': classroom_id,
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload['promoted_count'] == 1
    assert payload['failed_count'] == 0

    db = SessionLocal()
    try:
        student = db.query(User).filter(User.id == student_id).first()
        assert student is not None
        assert student.grade_level == 'Grade 6'

        old_enrollment = db.query(ClassroomStudent).filter(
            ClassroomStudent.classroom_id == classroom_id,
            ClassroomStudent.student_id == student_id,
        ).first()
        assert old_enrollment is not None
        assert old_enrollment.is_active is False

        next_year_classroom = db.query(Classroom).filter(
            Classroom.school_id == school['id'],
            Classroom.academic_year == '2569',
            Classroom.grade_level == 'Grade 6',
            Classroom.room_number == '1',
        ).first()
        assert next_year_classroom is not None

        repeated_enrollment = db.query(ClassroomStudent).filter(
            ClassroomStudent.classroom_id == next_year_classroom.id,
            ClassroomStudent.student_id == student_id,
            ClassroomStudent.is_active == True,
        ).first()
        assert repeated_enrollment is not None
    finally:
        db.close()