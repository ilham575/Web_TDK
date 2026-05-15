import pytest
import time
import random
from fastapi.testclient import TestClient
import os
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from database.connection import SessionLocal, create_all_tables
from main import app
from models.school import School as SchoolModel

client = TestClient(app)
create_all_tables()


def _create_classroom(headers, school_id: int, name: str, *, year: str = '2026', semester: int = 1):
    payload = {
        'name': name,
        'grade_level': 'ป.1',
        'room_number': name,
        'semester': semester,
        'academic_year': year,
        'school_id': school_id,
    }
    r = client.post('/classrooms/create', json=payload, headers=headers)
    assert r.status_code == 200
    return r.json()


def _enable_school_term(school_id: int):
    db = SessionLocal()
    try:
        school = db.query(SchoolModel).filter(SchoolModel.id == school_id).first()
        school.is_academic_year_setup = True
        school.current_academic_year = '2026'
        school.current_semester = 1
        db.commit()
    finally:
        db.close()


@pytest.mark.order(1)
def test_create_schedule_slot_accepts_int_and_string_day():
    # create a school
    r = client.post('/schools', json={'name': f'Test School {int(time.time())}-{random.randint(0,9999)}'})
    assert r.status_code == 201
    school = r.json()
    _enable_school_term(school['id'])

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
    assert r.status_code == 200

    # try with string day
    payload_str = {'day_of_week': '1', 'start_time': '09:00', 'end_time': '10:00', 'school_id': school['id']}
    r = client.post('/schedule/slots', json=payload_str, headers=headers)
    assert r.status_code == 200


@pytest.mark.order(2)
def test_schedule_slots_reject_break_configuration():
    r = client.post('/schools', json={'name': f'Break Slot School {int(time.time())}-{random.randint(0,9999)}'})
    assert r.status_code == 201
    school = r.json()
    _enable_school_term(school['id'])

    admin_username = f"breakadmin{int(time.time())}{random.randint(0,9999)}"
    admin_email = f"{admin_username}@example.com"
    admin_data = {
        'username': admin_username,
        'email': admin_email,
        'password': 'adminpass',
        'role': 'admin',
        'full_name': 'Break Admin',
        'school_id': school['id']
    }
    r = client.post('/users', json=admin_data)
    assert r.status_code == 201

    teacher_username = f"breakteacher{int(time.time())}{random.randint(0,9999)}"
    teacher_data = {
        'username': teacher_username,
        'email': f'{teacher_username}@example.com',
        'password': 'teacherpass',
        'role': 'teacher',
        'full_name': 'Break Teacher',
        'school_id': school['id']
    }
    r = client.post('/users', json=teacher_data)
    assert r.status_code == 201
    teacher = r.json()

    r = client.post('/users/login', data={'username': admin_username, 'password': 'adminpass'})
    assert r.status_code == 200
    token = r.json()['access_token']
    headers = {'Authorization': f'Bearer {token}'}

    break_payload = {
        'day_of_week': 1,
        'start_time': '12:00',
        'end_time': '13:00',
        'is_break': True,
        'school_id': school['id']
    }
    r = client.post('/schedule/slots', json=break_payload, headers=headers)
    assert r.status_code == 400
    assert 'schedule assignments flow' in r.json()['detail']


@pytest.mark.order(3)
def test_break_schedule_blocks_subject_assignment_overlap():
    r = client.post('/schools', json={'name': f'Break Schedule School {int(time.time())}-{random.randint(0,9999)}'})
    assert r.status_code == 201
    school = r.json()
    _enable_school_term(school['id'])

    admin_username = f"breaktermadmin{int(time.time())}{random.randint(0,9999)}"
    admin_email = f"{admin_username}@example.com"
    admin_data = {
        'username': admin_username,
        'email': admin_email,
        'password': 'adminpass',
        'role': 'admin',
        'full_name': 'Break Term Admin',
        'school_id': school['id']
    }
    r = client.post('/users', json=admin_data)
    assert r.status_code == 201

    teacher_username = f"breaktermteacher{int(time.time())}{random.randint(0,9999)}"
    teacher_data = {
        'username': teacher_username,
        'email': f'{teacher_username}@example.com',
        'password': 'teacherpass',
        'role': 'teacher',
        'full_name': 'Break Term Teacher',
        'school_id': school['id']
    }
    r = client.post('/users', json=teacher_data)
    assert r.status_code == 201
    teacher = r.json()

    r = client.post('/users/login', data={'username': admin_username, 'password': 'adminpass'})
    assert r.status_code == 200
    token = r.json()['access_token']
    headers = {'Authorization': f'Bearer {token}'}

    payload_int = {'day_of_week': 1, 'start_time': '08:00', 'end_time': '16:00', 'school_id': school['id']}
    r = client.post('/schedule/slots', json=payload_int, headers=headers)
    assert r.status_code == 200

    break_payload = {
        'academic_year': '2026',
        'semester': 1,
        'day_of_week': 1,
        'start_time': '12:00',
        'end_time': '13:00',
        'note': 'Lunch break',
    }
    r = client.post('/schedule/breaks', json=break_payload, headers=headers)
    assert r.status_code == 201
    assert r.json()['is_break'] is True

    subject_payload = {
        'name': 'Break Test Subject',
        'code': f'BRK{random.randint(100,999)}',
        'subject_type': 'main',
        'teacher_id': None,
        'school_id': school['id'],
        'academic_year': '2026',
        'semester': 1,
    }
    r = client.post('/subjects', json=subject_payload, headers=headers)
    assert r.status_code == 201
    subject = r.json()

    assignment_payload = {
        'subject_id': subject['id'],
        'day_of_week': '1',
        'start_time': '12:00',
        'end_time': '13:00',
        'classroom_id': None,
    }
    r = client.post(f"/schedule/assign_admin?teacher_id={teacher['id']}", json=assignment_payload, headers=headers)
    assert r.status_code == 400
    assert 'school break' in r.json()['detail'].lower()


@pytest.mark.order(4)
def test_teacher_schedule_with_date_includes_free_periods_for_tracking_view_only():
    r = client.post('/schools', json={'name': f'Teacher Free Period School {int(time.time())}-{random.randint(0,9999)}'})
    assert r.status_code == 201
    school = r.json()
    _enable_school_term(school['id'])

    admin_username = f"freeperiodadmin{int(time.time())}{random.randint(0,9999)}"
    admin_data = {
        'username': admin_username,
        'email': f'{admin_username}@example.com',
        'password': 'adminpass',
        'role': 'admin',
        'full_name': 'Free Period Admin',
        'school_id': school['id']
    }
    r = client.post('/users', json=admin_data)
    assert r.status_code == 201

    teacher_username = f"freeperiodteacher{int(time.time())}{random.randint(0,9999)}"
    teacher_data = {
        'username': teacher_username,
        'email': f'{teacher_username}@example.com',
        'password': 'teacherpass',
        'role': 'teacher',
        'full_name': 'Free Period Teacher',
        'school_id': school['id']
    }
    r = client.post('/users', json=teacher_data)
    assert r.status_code == 201
    teacher = r.json()

    r = client.post('/users/login', data={'username': admin_username, 'password': 'adminpass'})
    assert r.status_code == 200
    admin_headers = {'Authorization': f"Bearer {r.json()['access_token']}"}

    for start_time, end_time in [('08:00', '09:00'), ('09:00', '10:00')]:
        r = client.post('/schedule/slots', json={
            'day_of_week': 1,
            'start_time': start_time,
            'end_time': end_time,
            'school_id': school['id']
        }, headers=admin_headers)
        assert r.status_code == 200

    subject_payload = {
        'name': 'Teacher Free Period Subject',
        'code': f'FRP{random.randint(100,999)}',
        'subject_type': 'main',
        'teacher_id': None,
        'school_id': school['id'],
        'academic_year': '2026',
        'semester': 1,
    }
    r = client.post('/subjects', json=subject_payload, headers=admin_headers)
    assert r.status_code == 201
    subject = r.json()

    assignment_payload = {
        'subject_id': subject['id'],
        'day_of_week': '1',
        'start_time': '08:00',
        'end_time': '09:00',
        'classroom_id': None,
    }
    r = client.post(f"/schedule/assign_admin?teacher_id={teacher['id']}", json=assignment_payload, headers=admin_headers)
    assert r.status_code == 200

    r = client.post('/users/login', data={'username': teacher_username, 'password': 'teacherpass'})
    assert r.status_code == 200
    teacher_headers = {'Authorization': f"Bearer {r.json()['access_token']}"}

    r = client.get('/schedule/teacher?academic_year=2026&semester=1', headers=teacher_headers)
    assert r.status_code == 200
    weekly_rows = r.json()
    assert len([row for row in weekly_rows if row.get('subject_name') == 'คาบว่าง']) == 0

    r = client.get('/schedule/teacher?academic_year=2026&semester=1&date=2026-01-05', headers=teacher_headers)
    assert r.status_code == 200
    tracking_rows = r.json()

    subject_names = [row.get('subject_name') for row in tracking_rows if str(row.get('day_of_week')) == '1']
    assert 'Teacher Free Period Subject' in subject_names
    assert 'คาบว่าง' in subject_names

    free_period_row = next(row for row in tracking_rows if row.get('subject_name') == 'คาบว่าง')
    assert free_period_row['is_free_period'] is True
    assert free_period_row['start_time'] == '09:00:00'
    assert free_period_row['end_time'] == '10:00:00'


@pytest.mark.order(5)
def test_teacher_tracking_hides_breaks_that_overlap_other_classroom_teaching():
    r = client.post('/schools', json={'name': f'Teacher Mixed Break School {int(time.time())}-{random.randint(0,9999)}'})
    assert r.status_code == 201
    school = r.json()
    _enable_school_term(school['id'])

    admin_username = f"mixedbreakadmin{int(time.time())}{random.randint(0,9999)}"
    admin_data = {
        'username': admin_username,
        'email': f'{admin_username}@example.com',
        'password': 'adminpass',
        'role': 'admin',
        'full_name': 'Mixed Break Admin',
        'school_id': school['id']
    }
    r = client.post('/users', json=admin_data)
    assert r.status_code == 201

    teacher_username = f"mixedbreakteacher{int(time.time())}{random.randint(0,9999)}"
    teacher_data = {
        'username': teacher_username,
        'email': f'{teacher_username}@example.com',
        'password': 'teacherpass',
        'role': 'teacher',
        'full_name': 'Mixed Break Teacher',
        'school_id': school['id']
    }
    r = client.post('/users', json=teacher_data)
    assert r.status_code == 201
    teacher = r.json()

    r = client.post('/users/login', data={'username': admin_username, 'password': 'adminpass'})
    assert r.status_code == 200
    admin_headers = {'Authorization': f"Bearer {r.json()['access_token']}"}

    classroom_one = _create_classroom(admin_headers, school['id'], '1/1')
    classroom_two = _create_classroom(admin_headers, school['id'], '1/2')

    for start_time, end_time in [('08:35', '09:15'), ('09:55', '10:35')]:
        r = client.post('/schedule/slots', json={
            'day_of_week': 1,
            'start_time': start_time,
            'end_time': end_time,
            'school_id': school['id']
        }, headers=admin_headers)
        assert r.status_code == 200

    subject_one_payload = {
        'name': 'Class One Subject',
        'code': f'MB1{random.randint(100,999)}',
        'subject_type': 'main',
        'teacher_id': None,
        'school_id': school['id'],
        'academic_year': '2026',
        'semester': 1,
    }
    r = client.post('/subjects', json=subject_one_payload, headers=admin_headers)
    assert r.status_code == 201
    subject_one = r.json()

    subject_two_payload = {
        'name': 'Class Two Subject',
        'code': f'MB2{random.randint(100,999)}',
        'subject_type': 'main',
        'teacher_id': None,
        'school_id': school['id'],
        'academic_year': '2026',
        'semester': 1,
    }
    r = client.post('/subjects', json=subject_two_payload, headers=admin_headers)
    assert r.status_code == 201
    subject_two = r.json()

    r = client.post(f"/schedule/assign_admin?teacher_id={teacher['id']}", json={
        'subject_id': subject_one['id'],
        'day_of_week': '1',
        'start_time': '08:35',
        'end_time': '09:15',
        'classroom_id': classroom_one['id'],
    }, headers=admin_headers)
    assert r.status_code == 200

    r = client.post(f"/schedule/assign_admin?teacher_id={teacher['id']}", json={
        'subject_id': subject_two['id'],
        'day_of_week': '1',
        'start_time': '09:55',
        'end_time': '10:35',
        'classroom_id': classroom_two['id'],
    }, headers=admin_headers)
    assert r.status_code == 200

    r = client.post('/schedule/breaks', json={
        'academic_year': '2026',
        'semester': 1,
        'day_of_week': 1,
        'start_time': '09:55',
        'end_time': '10:35',
        'classroom_id': classroom_one['id'],
        'note': 'Classroom one break',
    }, headers=admin_headers)
    assert r.status_code == 201

    r = client.post('/users/login', data={'username': teacher_username, 'password': 'teacherpass'})
    assert r.status_code == 200
    teacher_headers = {'Authorization': f"Bearer {r.json()['access_token']}"}

    schedule_resp = client.get('/schedule/teacher?academic_year=2026&semester=1&date=2026-01-05', headers=teacher_headers)
    assert schedule_resp.status_code == 200
    schedule_rows = schedule_resp.json()

    monday_break_rows = [
        row for row in schedule_rows
        if str(row.get('day_of_week')) == '1' and row.get('is_break')
    ]
    assert monday_break_rows == []
    assert any(row.get('subject_name') == 'Class Two Subject' for row in schedule_rows)

    tracking_resp = client.get('/schedule/tracking/teacher?academic_year=2026&semester=1&date=2026-01-05', headers=teacher_headers)
    assert tracking_resp.status_code == 200
    tracking_rows = tracking_resp.json()

    monday_tracking_break_rows = [
        row for row in tracking_rows
        if str(row.get('day_of_week')) == '1' and row.get('is_break')
    ]
    assert monday_tracking_break_rows == []
    assert any(row.get('subject_name') == 'Class Two Subject' for row in tracking_rows)


@pytest.mark.order(6)
def test_tracking_supports_single_day_school_holiday_override():
    r = client.post('/schools', json={'name': f'Holiday Tracking School {int(time.time())}-{random.randint(0,9999)}'})
    assert r.status_code == 201
    school = r.json()
    _enable_school_term(school['id'])

    admin_username = f"holidayadmin{int(time.time())}{random.randint(0,9999)}"
    admin_data = {
        'username': admin_username,
        'email': f'{admin_username}@example.com',
        'password': 'adminpass',
        'role': 'admin',
        'full_name': 'Holiday Admin',
        'school_id': school['id']
    }
    r = client.post('/users', json=admin_data)
    assert r.status_code == 201

    teacher_username = f"holidayteacher{int(time.time())}{random.randint(0,9999)}"
    teacher_data = {
        'username': teacher_username,
        'email': f'{teacher_username}@example.com',
        'password': 'teacherpass',
        'role': 'teacher',
        'full_name': 'Holiday Teacher',
        'school_id': school['id']
    }
    r = client.post('/users', json=teacher_data)
    assert r.status_code == 201

    student_username = f"holidaystudent{int(time.time())}{random.randint(0,9999)}"
    student_data = {
        'username': student_username,
        'email': f'{student_username}@example.com',
        'password': 'studentpass',
        'role': 'student',
        'full_name': 'Holiday Student',
        'school_id': school['id']
    }
    r = client.post('/users', json=student_data)
    assert r.status_code == 201

    holiday_date = '2026-01-05'

    r = client.post('/users/login', data={'username': admin_username, 'password': 'adminpass'})
    assert r.status_code == 200
    admin_headers = {'Authorization': f"Bearer {r.json()['access_token']}"}

    r = client.post('/schedule/holidays', json={
        'holiday_date': holiday_date,
        'note': 'หยุดเฉพาะวันนี้',
    }, headers=admin_headers)
    assert r.status_code == 201
    holiday = r.json()
    assert holiday['holiday_date'] == holiday_date
    assert holiday['note'] == 'หยุดเฉพาะวันนี้'

    r = client.get(f'/schedule/tracking/admin?date={holiday_date}&academic_year=2026&semester=1', headers=admin_headers)
    assert r.status_code == 200
    admin_rows = r.json()
    assert len(admin_rows) == 1
    assert admin_rows[0]['is_holiday'] is True
    assert admin_rows[0]['subject_name'] == 'วันหยุดเรียน'
    assert admin_rows[0]['can_edit'] is True
    assert admin_rows[0]['holiday_id'] == holiday['id']

    r = client.post('/users/login', data={'username': teacher_username, 'password': 'teacherpass'})
    assert r.status_code == 200
    teacher_headers = {'Authorization': f"Bearer {r.json()['access_token']}"}

    r = client.get(f'/schedule/tracking/teacher?date={holiday_date}&academic_year=2026&semester=1', headers=teacher_headers)
    assert r.status_code == 200
    teacher_rows = r.json()
    assert len(teacher_rows) == 1
    assert teacher_rows[0]['is_holiday'] is True
    assert teacher_rows[0]['can_edit'] is False
    assert teacher_rows[0]['note'] == 'หยุดเฉพาะวันนี้'

    r = client.post('/users/login', data={'username': student_username, 'password': 'studentpass'})
    assert r.status_code == 200
    student_headers = {'Authorization': f"Bearer {r.json()['access_token']}"}

    r = client.get(f'/schedule/tracking/student?date={holiday_date}&academic_year=2026&semester=1', headers=student_headers)
    assert r.status_code == 200
    student_rows = r.json()
    assert len(student_rows) == 1
    assert student_rows[0]['is_holiday'] is True
    assert student_rows[0]['holiday_id'] == holiday['id']

    r = client.delete(f"/schedule/holidays/{holiday['id']}", headers=admin_headers)
    assert r.status_code == 200

    r = client.get(f'/schedule/tracking/admin?date={holiday_date}&academic_year=2026&semester=1', headers=admin_headers)
    assert r.status_code == 200
    assert r.json() == []
