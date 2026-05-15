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


def test_get_users_includes_student_classroom_academic_year_context():
    school, _headers = create_school_admin_and_headers(graduation_grade_level='Grade 6')
    classroom_id, student_id = create_classroom_with_student(
        school['id'],
        grade_level='Grade 6',
        academic_year='2569',
        semester=1,
    )

    response = client.get('/users?limit=500')

    assert response.status_code == 200
    payload = response.json()
    student_payload = next(item for item in payload if item['id'] == student_id)
    assert student_payload['classroom_id'] == classroom_id
    assert student_payload['classroom_name'] == 'Grade 6/1'
    assert student_payload['classroom_academic_year'] == '2569'
    assert student_payload['classroom_semester'] == 1
    assert student_payload['classroom_enrollment_active'] is True


def test_graduate_user_rejects_mismatched_academic_year_scope():
    school, headers = create_school_admin_and_headers(graduation_grade_level='Grade 6')
    _classroom_id, student_id = create_classroom_with_student(
        school['id'],
        grade_level='Grade 6',
        academic_year='2568',
        semester=1,
    )

    response = client.patch(f'/users/{student_id}/graduate?academic_year=2569', headers=headers)

    assert response.status_code == 400
    assert 'ปีการศึกษา 2569' in response.json()['detail']

    db = SessionLocal()
    try:
        student = db.query(User).filter(User.id == student_id).first()
        assert student is not None
        assert student.user_status == 'active'
        assert student.is_active is True
    finally:
        db.close()


def test_bulk_graduate_students_filters_by_academic_year():
    school, headers = create_school_admin_and_headers(graduation_grade_level='Grade 6')
    _old_classroom_id, old_student_id = create_classroom_with_student(
        school['id'],
        grade_level='Grade 6',
        academic_year='2568',
        semester=1,
    )
    _current_classroom_id, current_student_id = create_classroom_with_student(
        school['id'],
        grade_level='Grade 6',
        academic_year='2569',
        semester=1,
    )

    response = client.post('/users/bulk/graduate?academic_year=2569', headers=headers)

    assert response.status_code == 200
    payload = response.json()
    assert payload['graduated_count'] == 1
    assert payload['graduation_grade_level'] == 'Grade 6'
    assert payload['academic_year'] == '2569'
    assert {item['id'] for item in payload['graduated']} == {current_student_id}

    db = SessionLocal()
    try:
        old_student = db.query(User).filter(User.id == old_student_id).first()
        current_student = db.query(User).filter(User.id == current_student_id).first()
        assert old_student is not None
        assert current_student is not None
        assert old_student.user_status == 'active'
        assert old_student.is_active is True
        assert current_student.user_status == 'graduated'
        assert current_student.is_active is False
    finally:
        db.close()


def test_available_students_excludes_non_active_student_statuses():
    school, headers = create_school_admin_and_headers(graduation_grade_level='Grade 6')

    db = SessionLocal()
    try:
        classroom = Classroom(
            name='Grade 5/1',
            grade_level='Grade 5',
            room_number='1',
            semester=1,
            academic_year='2568',
            school_id=school['id'],
            is_active=True,
        )
        db.add(classroom)
        db.flush()

        active_suffix = _suffix()
        active_student = User(
            username=f'availableactive{active_suffix}',
            email=f'availableactive{active_suffix}@example.com',
            hashed_password=hash_password('studentpass'),
            role='student',
            full_name='Available Active Student',
            school_id=school['id'],
            grade_level='Grade 5',
            is_active=True,
            user_status='active',
        )
        resigned_suffix = _suffix()
        resigned_student = User(
            username=f'availableresigned{resigned_suffix}',
            email=f'availableresigned{resigned_suffix}@example.com',
            hashed_password=hash_password('studentpass'),
            role='student',
            full_name='Available Resigned Student',
            school_id=school['id'],
            grade_level='Grade 5',
            is_active=True,
            user_status='resigned',
        )
        graduated_suffix = _suffix()
        graduated_student = User(
            username=f'availablegraduated{graduated_suffix}',
            email=f'availablegraduated{graduated_suffix}@example.com',
            hashed_password=hash_password('studentpass'),
            role='student',
            full_name='Available Graduated Student',
            school_id=school['id'],
            grade_level='Grade 5',
            is_active=False,
            user_status='graduated',
        )
        inactive_suffix = _suffix()
        inactive_student = User(
            username=f'availableinactive{inactive_suffix}',
            email=f'availableinactive{inactive_suffix}@example.com',
            hashed_password=hash_password('studentpass'),
            role='student',
            full_name='Available Inactive Student',
            school_id=school['id'],
            grade_level='Grade 5',
            is_active=False,
            user_status='active',
        )

        db.add_all([
            active_student,
            resigned_student,
            graduated_student,
            inactive_student,
        ])
        db.commit()

        classroom_id = classroom.id
        active_student_id = active_student.id
    finally:
        db.close()

    response = client.get(f'/classrooms/{classroom_id}/available-students', headers=headers)

    assert response.status_code == 200
    payload = response.json()
    assert {item['id'] for item in payload} == {active_student_id}