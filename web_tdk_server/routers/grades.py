from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict
from sqlalchemy import distinct, func, or_, and_
from datetime import datetime, timezone

from database.connection import get_db
from routers.user import get_current_user
from models.subject import Subject as SubjectModel
from models.grade import Grade as GradeModel
from models.user import User as UserModel
from models.subject_student import SubjectStudent as SubjectStudentModel
from models.classroom import ClassroomStudent as ClassroomStudentModel, Classroom as ClassroomModel
from models.classroom_subject import ClassroomSubject as ClassroomSubjectModel
from models.schedule import SubjectSchedule as SubjectScheduleModel
from models.school import School as SchoolModel
from models.school_access_control import SchoolAccessControl as SchoolAccessControlModel
from schemas.grade import (
    GradesBulk,
    GradeResponse,
    AssignmentCreate,
    AssignmentUpdate,
    AssignmentResponse,
    SummaryCompletionReportItem,
)
from utils.semester_window_guard import enforce_admin_time_window

router = APIRouter(prefix="/grades", tags=["grades"])


def _is_exam_title(title: str) -> bool:
    if not title:
        return False

    normalized = str(title).strip().lower()
    return (
        'กลางภาค' in normalized
        or 'ปลายภาค' in normalized
        or 'final' in normalized
        or 'midterm' in normalized
        or 'คะแนนสอบ' in normalized
    )


def _get_student_access_periods(student: UserModel, school: SchoolModel, db: Session, academic_year: str = None, semester: int = None):
    check_year = academic_year if academic_year else school.current_academic_year

    if not check_year:
        raise HTTPException(status_code=400, detail="Academic year must be specified")

    if semester is not None:
        return str(check_year), [int(semester)]

    subject_semesters = db.query(SubjectModel.semester).join(
        SubjectStudentModel, SubjectModel.id == SubjectStudentModel.subject_id
    ).filter(
        SubjectStudentModel.student_id == student.id,
        SubjectModel.academic_year == check_year,
        SubjectModel.semester.isnot(None)
    ).distinct().all()

    classroom_semesters = db.query(ClassroomModel.semester).join(
        ClassroomStudentModel, ClassroomModel.id == ClassroomStudentModel.classroom_id
    ).filter(
        ClassroomStudentModel.student_id == student.id,
        ClassroomModel.academic_year == check_year,
        ClassroomModel.semester.isnot(None)
    ).distinct().all()

    semester_values = {
        int(row[0]) for row in (subject_semesters + classroom_semesters) if row and row[0] is not None
    }

    if semester_values:
        semesters_to_check = sorted(list(semester_values))
    elif school.current_semester:
        semesters_to_check = [int(school.current_semester)]
    else:
        semesters_to_check = []

    if not semesters_to_check:
        raise HTTPException(status_code=400, detail="Academic year and semester must be specified")

    return str(check_year), semesters_to_check


def _enforce_student_ranking_access(current_user: UserModel, db: Session, academic_year: str = None, semester: int = None):
    if getattr(current_user, 'role', None) != 'student':
        return

    student = db.query(UserModel).filter(UserModel.id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail='Student not found')

    school = db.query(SchoolModel).filter(SchoolModel.id == student.school_id).first()
    if not school:
        raise HTTPException(status_code=404, detail='School not found')

    check_year, semesters_to_check = _get_student_access_periods(student, school, db, academic_year=academic_year, semester=semester)
    access_controls = db.query(SchoolAccessControlModel).filter(
        and_(
            SchoolAccessControlModel.school_id == student.school_id,
            SchoolAccessControlModel.academic_year == check_year
        )
    ).all()
    access_map = {int(a.semester): a for a in access_controls if a.semester is not None}

    for check_semester in semesters_to_check:
        access_control = access_map.get(int(check_semester))
        if not access_control or not getattr(access_control, 'allow_student_view_ranking', False):
            raise HTTPException(
                status_code=403,
                detail=f"ทางโรงเรียนยังไม่เปิดให้เข้าดูผลการจัดอันดับสำหรับปี {check_year} ภาคเรียนที่ {check_semester}"
            )


def _pick_preferred_classroom(classroom_rows, school_id, academic_year, semester):
    if not classroom_rows:
        return None

    for row in classroom_rows:
        if (
            row.school_id == school_id
            and str(row.academic_year or '') == str(academic_year or '')
            and int(row.semester or 0) == int(semester or 0)
        ):
            return row

    return None


def _build_summary_completion_report(db: Session, school_id: int, academic_year: str = None, semester: int = None):
    subjects_query = db.query(SubjectModel).filter(SubjectModel.school_id == school_id)
    if academic_year is not None:
        subjects_query = subjects_query.filter(SubjectModel.academic_year == academic_year)
    if semester is not None:
        subjects_query = subjects_query.filter(SubjectModel.semester == semester)

    subjects = subjects_query.order_by(SubjectModel.academic_year.desc(), SubjectModel.semester.desc(), SubjectModel.name.asc()).all()
    if not subjects:
        return []

    subject_ids = [subject.id for subject in subjects]
    summary_titles = ["คะแนนเก็บรวม", "คะแนนสอบรวม"]

    all_grade_rows = db.query(
        GradeModel.subject_id,
        GradeModel.student_id,
        GradeModel.classroom_id,
        GradeModel.title,
        GradeModel.grade,
    ).filter(
        GradeModel.subject_id.in_(subject_ids),
        GradeModel.title.isnot(None)
    ).all()

    grades_by_subject = {}
    for grade in all_grade_rows:
        grades_by_subject.setdefault(grade.subject_id, []).append(grade)

    subject_schedules = db.query(SubjectScheduleModel).filter(
        SubjectScheduleModel.subject_id.in_(subject_ids)
    ).all()
    schedules_by_subject = {}
    teacher_ids = set()
    for schedule in subject_schedules:
        schedules_by_subject.setdefault(schedule.subject_id, []).append(schedule)
        teacher_ids.add(schedule.teacher_id)

    classroom_links = db.query(ClassroomSubjectModel).filter(
        ClassroomSubjectModel.subject_id.in_(subject_ids)
    ).all()
    classroom_links_by_subject = {}
    linked_classroom_ids = set()
    for link in classroom_links:
        classroom_links_by_subject.setdefault(link.subject_id, []).append(link.classroom_id)
        linked_classroom_ids.add(link.classroom_id)

    classroom_link_sets_by_subject = {
        subject_id: set(classroom_ids)
        for subject_id, classroom_ids in classroom_links_by_subject.items()
    }

    enrollments = db.query(SubjectStudentModel).filter(
        SubjectStudentModel.subject_id.in_(subject_ids)
    ).all()
    enrollments_by_subject = {}
    directly_enrolled_student_ids = set()
    for enrollment in enrollments:
        enrollments_by_subject.setdefault(enrollment.subject_id, []).append(enrollment.student_id)
        directly_enrolled_student_ids.add(enrollment.student_id)

    linked_classroom_students = {}
    if linked_classroom_ids:
        classroom_student_rows = db.query(ClassroomStudentModel).filter(
            ClassroomStudentModel.classroom_id.in_(list(linked_classroom_ids)),
        ).all()
        for row in classroom_student_rows:
            linked_classroom_students.setdefault(row.classroom_id, []).append(row)
            directly_enrolled_student_ids.add(row.student_id)

    direct_classroom_rows_by_student = {}
    all_classroom_ids = set(linked_classroom_ids)
    if directly_enrolled_student_ids:
        direct_classroom_rows = db.query(
            ClassroomStudentModel.student_id,
            ClassroomStudentModel.classroom_id,
            ClassroomStudentModel.student_number,
            ClassroomModel.name,
            ClassroomModel.grade_level,
            ClassroomModel.academic_year,
            ClassroomModel.semester,
            ClassroomModel.school_id,
        ).join(
            ClassroomModel,
            ClassroomModel.id == ClassroomStudentModel.classroom_id
        ).filter(
            ClassroomStudentModel.student_id.in_(list(directly_enrolled_student_ids)),
        ).all()

        for row in direct_classroom_rows:
            direct_classroom_rows_by_student.setdefault(row.student_id, []).append(row)
            all_classroom_ids.add(row.classroom_id)

    classrooms_map = {}
    if all_classroom_ids:
        classroom_rows = db.query(ClassroomModel).filter(ClassroomModel.id.in_(list(all_classroom_ids))).all()
        classrooms_map = {row.id: row for row in classroom_rows}

    student_map = {}
    if directly_enrolled_student_ids:
        student_rows = db.query(UserModel).filter(
            UserModel.id.in_(list(directly_enrolled_student_ids)),
            UserModel.is_active == True,
        ).all()
        student_map = {row.id: row for row in student_rows}

    if teacher_ids:
        teacher_rows = db.query(UserModel).filter(UserModel.id.in_(list(teacher_ids))).all()
        teacher_map = {row.id: row for row in teacher_rows}
    else:
        teacher_map = {}

    if any(subject.teacher_id for subject in subjects):
        extra_teacher_ids = [subject.teacher_id for subject in subjects if subject.teacher_id and subject.teacher_id not in teacher_map]
        if extra_teacher_ids:
            for teacher in db.query(UserModel).filter(UserModel.id.in_(extra_teacher_ids)).all():
                teacher_map[teacher.id] = teacher

    report_items = []

    for subject in subjects:
        required_summary_titles = ["คะแนนเก็บรวม"]
        if subject.subject_type != 'activity' and float(subject.max_exam_score or 100) > 0:
            required_summary_titles.append("คะแนนสอบรวม")

        linked_classroom_ids_for_subject = classroom_link_sets_by_subject.get(subject.id, set())

        teacher_names = []
        seen_teacher_ids = set()
        for schedule in schedules_by_subject.get(subject.id, []):
            if schedule.teacher_id in seen_teacher_ids:
                continue
            teacher = teacher_map.get(schedule.teacher_id)
            teacher_names.append((teacher.full_name or teacher.username) if teacher else f"ครู #{schedule.teacher_id}")
            seen_teacher_ids.add(schedule.teacher_id)

        if not teacher_names and subject.teacher_id:
            teacher = teacher_map.get(subject.teacher_id)
            if teacher:
                teacher_names.append(teacher.full_name or teacher.username)

        scopes = {}

        for classroom_id in classroom_links_by_subject.get(subject.id, []):
            classroom = classrooms_map.get(classroom_id)
            scopes[classroom_id] = {
                'classroom_id': classroom_id,
                'classroom_name': classroom.name if classroom else f"ห้อง #{classroom_id}",
                'students': set(),
            }
            for row in linked_classroom_students.get(classroom_id, []):
                scopes[classroom_id]['students'].add(row.student_id)

        for student_id in enrollments_by_subject.get(subject.id, []):
            preferred_classroom = _pick_preferred_classroom(
                direct_classroom_rows_by_student.get(student_id, []),
                subject.school_id,
                subject.academic_year,
                subject.semester,
            )

            # If the subject is already scoped to specific classrooms, ignore dangling
            # direct enrollments that no longer belong to one of those active classrooms.
            if linked_classroom_ids_for_subject:
                if not preferred_classroom or preferred_classroom.classroom_id not in linked_classroom_ids_for_subject:
                    continue

            if preferred_classroom:
                classroom_id = preferred_classroom.classroom_id
                if classroom_id not in scopes:
                    scopes[classroom_id] = {
                        'classroom_id': classroom_id,
                        'classroom_name': preferred_classroom.name,
                        'students': set(),
                    }
                scopes[classroom_id]['students'].add(student_id)
            else:
                general_key = 'general'
                if general_key not in scopes:
                    scopes[general_key] = {
                        'classroom_id': None,
                        'classroom_name': 'ทั่วไป',
                        'students': set(),
                    }
                scopes[general_key]['students'].add(student_id)

        if not scopes:
            continue

        summary_index = set()
        summary_by_student_title = set()
        assignment_title_set = set()
        assignment_title_is_exam = {}
        graded_by_student_title = set()

        for grade in grades_by_subject.get(subject.id, []):
            normalized_title = (grade.title or '').strip()

            if normalized_title in summary_titles:
                if grade.grade is not None:
                    summary_index.add((grade.student_id, normalized_title, grade.classroom_id))
                    summary_by_student_title.add((grade.student_id, normalized_title))
                continue

            assignment_title_set.add(normalized_title)
            if normalized_title not in assignment_title_is_exam:
                assignment_title_is_exam[normalized_title] = _is_exam_title(normalized_title)

            if grade.grade is not None:
                graded_by_student_title.add((grade.student_id, normalized_title))

        scope_entries = sorted(
            scopes.values(),
            key=lambda item: (
                item['classroom_id'] is None,
                item['classroom_name'] or '',
            )
        )

        for scope in scope_entries:
            student_rows = []
            for student_id in scope['students']:
                student = student_map.get(student_id)
                if not student:
                    continue

                preferred_classroom = _pick_preferred_classroom(
                    direct_classroom_rows_by_student.get(student_id, []),
                    subject.school_id,
                    subject.academic_year,
                    subject.semester,
                )
                student_rows.append({
                    'student_id': student_id,
                    'student_number': preferred_classroom.student_number if preferred_classroom else None,
                    'classroom_id': preferred_classroom.classroom_id if preferred_classroom else scope['classroom_id'],
                    'full_name': student.full_name or student.username,
                    'username': student.username,
                    'classroom_name': preferred_classroom.name if preferred_classroom else scope['classroom_name'],
                })

            student_rows.sort(key=lambda item: (
                item['student_number'] is None,
                item['student_number'] if item['student_number'] is not None else 999999,
                item['full_name'],
            ))

            missing_students = []
            completed_students_count = 0

            for student_row in student_rows:
                missing_titles = []

                def has_complete_assignment_group(is_exam_group: bool) -> bool:
                    applicable_titles = [
                        title for title in assignment_title_set
                        if assignment_title_is_exam.get(title, False) == is_exam_group
                    ]

                    if not applicable_titles:
                        return False

                    return all(
                        (student_row['student_id'], title) in graded_by_student_title
                        for title in applicable_titles
                    )

                for title in required_summary_titles:
                    has_classroom_summary = False
                    if scope['classroom_id'] is not None:
                        has_classroom_summary = (student_row['student_id'], title, scope['classroom_id']) in summary_index

                    has_global_summary = (student_row['student_id'], title, None) in summary_index
                    has_any_summary = (student_row['student_id'], title) in summary_by_student_title
                    has_assignment_derived_summary = has_complete_assignment_group(_is_exam_title(title))

                    if not has_classroom_summary and not has_global_summary and not has_any_summary and not has_assignment_derived_summary:
                        missing_titles.append(title)

                if missing_titles:
                    missing_students.append({
                        'student_id': student_row['student_id'],
                        'student_number': student_row['student_number'],
                        'full_name': student_row['full_name'],
                        'username': student_row['username'],
                        'classroom_name': student_row['classroom_name'],
                        'missing_titles': missing_titles,
                    })
                else:
                    completed_students_count += 1

            student_count = len(student_rows)
            missing_students_count = len(missing_students)
            completion_percentage = round((completed_students_count / student_count) * 100, 2) if student_count else 0.0

            report_items.append({
                'subject_id': subject.id,
                'subject_name': subject.name,
                'subject_type': subject.subject_type,
                'academic_year': subject.academic_year,
                'semester': subject.semester,
                'classroom_id': scope['classroom_id'],
                'classroom_name': scope['classroom_name'],
                'teacher_names': teacher_names,
                'required_summary_titles': required_summary_titles,
                'student_count': student_count,
                'completed_students_count': completed_students_count,
                'missing_students_count': missing_students_count,
                'completion_percentage': completion_percentage,
                'is_complete': student_count > 0 and missing_students_count == 0,
                'missing_students': missing_students,
            })

    report_items.sort(key=lambda item: (
        item['is_complete'],
        item['subject_name'].lower(),
        item['classroom_name'] or '',
    ))
    return report_items


@router.get('/admin/summary-completion', response_model=List[SummaryCompletionReportItem])
def get_admin_summary_completion_report(
    academic_year: str = None,
    semester: int = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if getattr(current_user, 'role', None) != 'admin':
        raise HTTPException(status_code=403, detail='Not authorized to view summary completion report')

    school_id = getattr(current_user, 'school_id', None)
    if school_id is None:
        raise HTTPException(status_code=400, detail='Admin user has no school assigned')

    return _build_summary_completion_report(db, school_id=school_id, academic_year=academic_year, semester=semester)


def calculate_activity_grades(db: Session, student_id: int, classroom_id: int = None, academic_year: str = None, semester: int = None):
    """
    Aggregate grades for all activity-type subjects for a student.
    Returns: {
        'activity_subjects': [list of activity subjects with breakdown],
        'total_activity_score': aggregated score (sum of score*percent, capped at 100),
        'total_activity_percent': sum of percentages
    }
    """
    # Find all activity subjects that have grades for this student
    activity_query = db.query(
        SubjectModel.id,
        SubjectModel.name,
        SubjectModel.activity_percentage,
        SubjectModel.academic_year,
        SubjectModel.semester
    ).filter(
        SubjectModel.subject_type == 'activity'
    )
    if academic_year is not None:
        q_year = str(academic_year).strip()
        if len(q_year) <= 2:
            activity_query = activity_query.filter(or_(
                SubjectModel.academic_year == academic_year,
                func.right(SubjectModel.academic_year, len(q_year)) == q_year
            ))
        else:
            activity_query = activity_query.filter(SubjectModel.academic_year == academic_year)
    if semester is not None:
        activity_query = activity_query.filter(SubjectModel.semester == semester)
    activity_data = activity_query.all()
    
    if not activity_data:
        return {
            'activity_subjects': [],
            'total_activity_score': None,
            'total_activity_percent': 0
        }
    
    activity_subjects = []
    total_score = 0
    total_percent = 0
    
    for subject_id, subject_name, activity_percent, academic_year, semester in activity_data:
        # Get all grades for this student in this subject
        grades = db.query(GradeModel).filter(
            GradeModel.subject_id == subject_id,
            GradeModel.student_id == student_id
        )
        
        if classroom_id:
            grades = grades.filter(GradeModel.classroom_id == classroom_id)
        
        grades = grades.all()

        if not grades:
            continue

        # If teacher provided a manual aggregate (title == "คะแนนเก็บรวม"), prefer that
        # single record instead of summing all individual assignments. This prevents
        # double-counting when multiple assignment rows exist (e.g., per-class records).
        manual_aggregate = None
        try:
            candidates = [g for g in grades if isinstance(getattr(g, 'title', None), str) and g.title.strip() == "คะแนนเก็บรวม"]
        except Exception:
            candidates = []

        # Fallback to case-insensitive match if exact match not found
        if not candidates:
            try:
                candidates = [g for g in grades if isinstance(getattr(g, 'title', None), str) and g.title.strip().lower() == "คะแนนเก็บรวม"]
            except Exception:
                candidates = []

        if candidates:
            chosen = None
            # Prefer classroom-specific manual if classroom filter provided
            if classroom_id is not None:
                for c in candidates:
                    if c.classroom_id == classroom_id:
                        chosen = c
                        break
            # Otherwise prefer a global (classroom_id is None) manual grade
            if not chosen:
                for c in candidates:
                    if c.classroom_id is None:
                        chosen = c
                        break
            if not chosen:
                chosen = candidates[0]
            manual_aggregate = chosen

        if manual_aggregate:
            total_raw_score = float(manual_aggregate.grade or 0)
            total_max_score = float(manual_aggregate.max_score or 100)
            # Normalize to 100 scale based on total
            normalized_score = (total_raw_score / total_max_score) * 100 if total_max_score else 0

            percent = activity_percent or 0
            contribution = (normalized_score * percent) / 100

            activity_subjects.append({
                'subject_id': subject_id,
                'subject_name': subject_name,
                'raw_score': round(total_raw_score, 2),
                'max_score': round(total_max_score, 2),
                'normalized_score': round(normalized_score, 2),
                'percentage': percent,
                'contribution': round(contribution, 2),
                'grade_count': 1,
                'academic_year': academic_year,
                'semester': semester
            })

            total_score += contribution
            total_percent += percent
            continue

        # Aggregate all assignments for this subject correctly
        valid_grades = [g for g in grades if g.grade is not None and g.max_score]
        if not valid_grades:
            continue

        # Sum all raw scores and max scores across all assignments (supports multi-assignment subjects)
        total_raw_score = sum(float(g.grade) for g in valid_grades)
        total_max_score = sum(float(g.max_score) for g in valid_grades)

        # Normalize to 100 scale based on total
        normalized_score = (total_raw_score / total_max_score) * 100 if total_max_score else 0
        
        # Calculate contribution
        percent = activity_percent or 0
        contribution = (normalized_score * percent) / 100
        
        activity_subjects.append({
            'subject_id': subject_id,
            'subject_name': subject_name,
            'raw_score': round(total_raw_score, 2),
            'max_score': round(total_max_score, 2),
            'normalized_score': round(normalized_score, 2),
            'percentage': percent,
            'contribution': round(contribution, 2),
            'grade_count': len(valid_grades),
            'academic_year': academic_year,
            'semester': semester
        })
        
        total_score += contribution
        total_percent += percent
    
    return {
        'activity_subjects': activity_subjects,
        'total_activity_score': min(round(total_score, 2), 100),  # Cap at 100
        'total_activity_percent': total_percent

    }


@router.post('/bulk', status_code=status.HTTP_201_CREATED)
def bulk_grades(payload: GradesBulk, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    subj = db.query(SubjectModel).filter(SubjectModel.id == payload.subject_id).first()
    if not subj:
        raise HTTPException(status_code=404, detail='Subject not found')

    enforce_admin_time_window(
        db,
        school_id=subj.school_id,
        academic_year=subj.academic_year,
        semester=subj.semester,
        action_label='ส่งคะแนน',
    )
    # only admin or teacher assigned can submit grades
    is_authorized = False
    if getattr(current_user, 'role', None) == 'admin':
        is_authorized = True
    elif getattr(current_user, 'role', None) == 'teacher':
        if subj.teacher_id == current_user.id:
            is_authorized = True
        else:
            from models.schedule import SubjectSchedule
            if db.query(SubjectSchedule).filter_by(subject_id=subj.id, teacher_id=current_user.id).first():
                is_authorized = True
    
    if not is_authorized:
        raise HTTPException(status_code=403, detail='Not authorized to submit grades for this subject')

    results = []
    for entry in payload.grades:
        # Filter by subject_id, student_id, title and classroom if provided
        if payload.classroom_id is not None:
            g = db.query(GradeModel).filter(
                GradeModel.subject_id == payload.subject_id,
                GradeModel.student_id == entry.student_id,
                GradeModel.title == payload.title,
                GradeModel.classroom_id == payload.classroom_id
            ).first()
        else:
            g = db.query(GradeModel).filter(
                GradeModel.subject_id == payload.subject_id,
                GradeModel.student_id == entry.student_id,
                GradeModel.title == payload.title,
                GradeModel.classroom_id.is_(None)
            ).first()
        if g:
            # Admin cannot overwrite existing summary grades — only the teacher (or original creator) can
            if getattr(current_user, 'role', None) == 'admin' and payload.title in {"\u0e04\u0e30\u0e41\u0e19\u0e19\u0e40\u0e01\u0e47\u0e1a\u0e23\u0e27\u0e21", "\u0e04\u0e30\u0e41\u0e19\u0e19\u0e2a\u0e2d\u0e1a\u0e23\u0e27\u0e21"} and g.grade is not None:
                continue
            g.title = payload.title
            g.max_score = payload.max_score
            g.grade = entry.grade
            db.commit()
            db.refresh(g)
            results.append(g)
        else:
            new = GradeModel(
                subject_id=payload.subject_id,
                student_id=entry.student_id,
                title=payload.title,
                max_score=payload.max_score,
                grade=entry.grade,
                classroom_id=payload.classroom_id
            )
            db.add(new)
            db.commit()
            db.refresh(new)
            results.append(new)
    return { 'detail': 'ok', 'count': len(results) }


@router.get('', response_model=List[GradeResponse])
@router.get('/', response_model=List[GradeResponse])
def get_grades(subject_id: int = None, classroom_id: int = None, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    # Check if grades are announced (only for students)
    if getattr(current_user, 'role', None) == 'student' and subject_id is not None:
        subject = db.query(SubjectModel).filter(SubjectModel.id == subject_id).first()
        if subject and subject.classroom_id:
            # Get classroom and school to check grade_announcement_date
            from models.classroom import Classroom as ClassroomModel
            classroom = db.query(ClassroomModel).filter(ClassroomModel.id == subject.classroom_id).first()
            if classroom:
                school = db.query(SchoolModel).filter(SchoolModel.id == classroom.school_id).first()
                if school and school.grade_announcement_date:
                    # Use UTC-aware datetime comparison (check if current time is before announcement date)
                    now = datetime.now(timezone.utc)
                    announcement_date = school.grade_announcement_date
                    # Ensure announcement_date is timezone-aware for proper comparison
                    if announcement_date.tzinfo is None:
                        announcement_date = announcement_date.replace(tzinfo=timezone.utc)
                    if now < announcement_date:
                        raise HTTPException(status_code=403, detail='Grades have not been announced yet')
    
    query = db.query(
        GradeModel.id,
        GradeModel.subject_id,
        GradeModel.student_id,
        GradeModel.classroom_id,
        GradeModel.title,
        GradeModel.max_score,
        GradeModel.grade,
        ClassroomStudentModel.student_number
    ).outerjoin(
        ClassroomStudentModel,
        (GradeModel.student_id == ClassroomStudentModel.student_id) & (GradeModel.classroom_id == ClassroomStudentModel.classroom_id)
    )
    
    if subject_id is not None:
        query = query.filter(GradeModel.subject_id == subject_id)
    if classroom_id is not None:
        # ONLY return grades for this specific classroom (strict filter)
        query = query.filter(GradeModel.classroom_id == classroom_id)
    # When no classroom_id provided, return ALL grades (no additional filter)
    rows = query.all()
    
    # Map rows to dict for response model
    result = []
    for row in rows:
        result.append({
            'id': row.id,
            'subject_id': row.subject_id,
            'student_id': row.student_id,
            'classroom_id': row.classroom_id,
            'title': row.title,
            'max_score': row.max_score,
            'grade': row.grade,
            'student_number': row.student_number
        })
    return result


@router.get('/assignments/{subject_id}', response_model=List[AssignmentResponse])
def get_assignments(subject_id: int, classroom_id: int = None, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    subj = db.query(SubjectModel).filter(SubjectModel.id == subject_id).first()
    if not subj:
        raise HTTPException(status_code=404, detail='Subject not found')

    # Check authorization
    user_role = getattr(current_user, 'role', None)
    is_authorized = False
    if user_role == 'admin':
        is_authorized = True
    elif user_role == 'teacher':
        if subj.teacher_id == current_user.id:
            is_authorized = True
        else:
            from models.schedule import SubjectSchedule
            if db.query(SubjectSchedule).filter_by(subject_id=subj.id, teacher_id=current_user.id).first():
                is_authorized = True
    
    if is_authorized:
        # Teacher or Admin assigned to this subject
        pass
    elif user_role == 'student':
        # Check if student is enrolled in this subject
        enrollment = db.query(SubjectStudentModel).filter(
            SubjectStudentModel.subject_id == subject_id,
            SubjectStudentModel.student_id == getattr(current_user, 'id', None)
        ).first()
        if not enrollment:
            raise HTTPException(status_code=403, detail='Not authorized to view assignments for this subject')
    else:
        raise HTTPException(status_code=403, detail='Not authorized to view assignments for this subject')

    # Get distinct assignments (unique title + max_score + classroom_id combinations)
    query = db.query(
        GradeModel.title,
        GradeModel.max_score,
        GradeModel.classroom_id
    ).filter(
        GradeModel.subject_id == subject_id,
        GradeModel.title.isnot(None)
    )
    if classroom_id is not None:
        # ONLY show assignments created for this specific classroom (strict filter)
        query = query.filter(GradeModel.classroom_id == classroom_id)
    # When no classroom_id provided, return ALL assignments (no additional filter)
    assignments = query.distinct().all()

    # Convert to response format with generated IDs
    result = []
    for idx, (title, max_score, classroom_id) in enumerate(assignments, 1):
        result.append({
            'id': idx,  # Use index as ID since we don't have assignment table
            'title': title,
            'max_score': max_score,
            'classroom_id': classroom_id
        })

    return result


@router.post('/assignments/{subject_id}', response_model=AssignmentResponse)
def create_assignment(subject_id: int, assignment: AssignmentCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    subj = db.query(SubjectModel).filter(SubjectModel.id == subject_id).first()
    if not subj:
        raise HTTPException(status_code=404, detail='Subject not found')

    enforce_admin_time_window(
        db,
        school_id=subj.school_id,
        academic_year=subj.academic_year,
        semester=subj.semester,
        action_label='สร้างงานคะแนน',
    )

    # Check authorization
    is_authorized = False
    if getattr(current_user, 'role', None) == 'admin':
        is_authorized = True
    elif getattr(current_user, 'role', None) == 'teacher':
        if subj.teacher_id == current_user.id:
            is_authorized = True
        else:
            from models.schedule import SubjectSchedule
            if db.query(SubjectSchedule).filter_by(subject_id=subj.id, teacher_id=current_user.id).first():
                is_authorized = True
    
    if not is_authorized:
        raise HTTPException(status_code=403, detail='Not authorized to create assignments for this subject')

    # Check if assignment with same title already exists
    # Check if assignment with same title already exists for the same classroom (or globally if classroom_id is None)
    if assignment.classroom_id is not None:
        existing = db.query(GradeModel).filter(
            GradeModel.subject_id == subject_id,
            GradeModel.title == assignment.title,
            GradeModel.classroom_id == assignment.classroom_id
        ).first()
    else:
        existing = db.query(GradeModel).filter(
            GradeModel.subject_id == subject_id,
            GradeModel.title == assignment.title,
            GradeModel.classroom_id.is_(None)
        ).first()

    if existing:
        raise HTTPException(status_code=400, detail='Assignment with this title already exists')

    # Get all students enrolled in this subject; optionally filter by classroom
    if assignment.classroom_id is not None:
        students = db.query(UserModel).join(
            SubjectStudentModel, UserModel.id == SubjectStudentModel.student_id
        ).join(
            ClassroomStudentModel, UserModel.id == ClassroomStudentModel.student_id
        ).filter(
            SubjectStudentModel.subject_id == subject_id,
            ClassroomStudentModel.classroom_id == assignment.classroom_id,
            ClassroomStudentModel.is_active == True
        ).all()
    else:
        students = db.query(UserModel).join(
            SubjectStudentModel, UserModel.id == SubjectStudentModel.student_id
        ).filter(SubjectStudentModel.subject_id == subject_id).all()

    if not students:
        raise HTTPException(status_code=400, detail='No students enrolled in this subject')

    # Create grade records for all students with this assignment
    created_grades = []
    for student in students:
        grade = GradeModel(
            subject_id=subject_id,
            student_id=student.id,
            title=assignment.title,
            max_score=assignment.max_score,
            grade=None,  # No grade yet
            classroom_id=assignment.classroom_id
        )
        db.add(grade)
        created_grades.append(grade)

    db.commit()

    # Return assignment info
    return {
        'id': len(db.query(GradeModel.title, GradeModel.max_score).filter(
            GradeModel.subject_id == subject_id,
            GradeModel.title.isnot(None)
        ).distinct().all()),
        'title': assignment.title,
        'max_score': assignment.max_score
        , 'classroom_id': assignment.classroom_id
    }


@router.put('/assignments/{subject_id}/{assignment_title}', response_model=AssignmentResponse)
def update_assignment(subject_id: int, assignment_title: str, assignment: AssignmentUpdate, classroom_id: int = None, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    subj = db.query(SubjectModel).filter(SubjectModel.id == subject_id).first()
    if not subj:
        raise HTTPException(status_code=404, detail='Subject not found')

    enforce_admin_time_window(
        db,
        school_id=subj.school_id,
        academic_year=subj.academic_year,
        semester=subj.semester,
        action_label='แก้ไขงานคะแนน',
    )

    # Check authorization
    is_authorized = False
    if getattr(current_user, 'role', None) == 'admin':
        is_authorized = True
    elif getattr(current_user, 'role', None) == 'teacher':
        if subj.teacher_id == current_user.id:
            is_authorized = True
        else:
            from models.schedule import SubjectSchedule
            if db.query(SubjectSchedule).filter_by(subject_id=subj.id, teacher_id=current_user.id).first():
                is_authorized = True
                
    if not is_authorized:
        raise HTTPException(status_code=403, detail='Not authorized to update assignments for this subject')

    # Check if assignment exists
    if classroom_id is not None:
        existing_grades = db.query(GradeModel).filter(
            GradeModel.subject_id == subject_id,
            GradeModel.title == assignment_title,
            GradeModel.classroom_id == classroom_id
        ).all()
    else:
        existing_grades = db.query(GradeModel).filter(
            GradeModel.subject_id == subject_id,
            GradeModel.title == assignment_title,
            GradeModel.classroom_id.is_(None)
        ).all()

    if not existing_grades:
        raise HTTPException(status_code=404, detail='Assignment not found')

    # Prepare new values
    new_title = assignment.title if assignment.title is not None else assignment_title
    new_max_score = assignment.max_score if assignment.max_score is not None else existing_grades[0].max_score

    # Check if new title conflicts with other assignments (if title is being changed)
    if assignment.title is not None and assignment.title != assignment_title:
        if classroom_id is not None:
            conflict = db.query(GradeModel).filter(
                GradeModel.subject_id == subject_id,
                GradeModel.title == assignment.title,
                GradeModel.classroom_id == classroom_id
            ).first()
        else:
            conflict = db.query(GradeModel).filter(
                GradeModel.subject_id == subject_id,
                GradeModel.title == assignment.title,
                GradeModel.classroom_id.is_(None)
            ).first()
        if conflict:
            raise HTTPException(status_code=400, detail='Assignment with this title already exists')

    # Update all grade records with this assignment
    for grade in existing_grades:
        if assignment.title is not None:
            grade.title = assignment.title
        if assignment.max_score is not None:
            grade.max_score = assignment.max_score
        # allow moving assignment to different classroom if specified
        if assignment.classroom_id is not None:
            grade.classroom_id = assignment.classroom_id
        grade.updated_at = func.now()

    db.commit()

    # Determine classroom_id for response
    new_classroom_id = assignment.classroom_id if assignment.classroom_id is not None else (existing_grades[0].classroom_id if existing_grades else None)

    # Return updated assignment info
    return {
        'id': 0,  # Not used in frontend
        'title': new_title,
        'max_score': new_max_score,
        'classroom_id': new_classroom_id
    }


@router.delete('/assignments/{subject_id}/{assignment_title}')
def delete_assignment(subject_id: int, assignment_title: str, classroom_id: int = None, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    subj = db.query(SubjectModel).filter(SubjectModel.id == subject_id).first()
    if not subj:
        raise HTTPException(status_code=404, detail='Subject not found')

    enforce_admin_time_window(
        db,
        school_id=subj.school_id,
        academic_year=subj.academic_year,
        semester=subj.semester,
        action_label='ลบงานคะแนน',
    )

    # Check authorization
    is_authorized = False
    if getattr(current_user, 'role', None) == 'admin':
        is_authorized = True
    elif getattr(current_user, 'role', None) == 'teacher':
        if subj.teacher_id == current_user.id:
            is_authorized = True
        else:
            from models.schedule import SubjectSchedule
            if db.query(SubjectSchedule).filter_by(subject_id=subj.id, teacher_id=current_user.id).first():
                is_authorized = True

    if not is_authorized:
        raise HTTPException(status_code=403, detail='Not authorized to delete assignments for this subject')

    # Check if assignment exists
    if classroom_id is not None:
        existing_grades = db.query(GradeModel).filter(
            GradeModel.subject_id == subject_id,
            GradeModel.title == assignment_title,
            GradeModel.classroom_id == classroom_id
        ).all()
    else:
        existing_grades = db.query(GradeModel).filter(
            GradeModel.subject_id == subject_id,
            GradeModel.title == assignment_title,
            GradeModel.classroom_id.is_(None)
        ).all()

    if not existing_grades:
        raise HTTPException(status_code=404, detail='Assignment not found')

    # Delete all grade records with this assignment
    for grade in existing_grades:
        db.delete(grade)

    db.commit()

    return {'detail': 'Assignment deleted successfully'}


@router.get('/student/{student_id}/activity-breakdown')
def get_student_activity_breakdown(student_id: int, classroom_id: int = None, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """
    Get activity grade breakdown for a student.
    Includes individual activity subjects with their raw scores, percentages, and calculated contributions.
    """
    # Authorization: student can view own, admin can view all, or homeroom teacher
    is_authorized = False
    if getattr(current_user, 'role', None) == 'admin':
        is_authorized = True
    elif getattr(current_user, 'id', None) == student_id:
        is_authorized = True
    elif getattr(current_user, 'role', None) == 'teacher':
        # Check if homeroom teacher for any class these students might be in
        is_authorized = True # Allow teachers for now to support ranking view
    
    if not is_authorized:
        raise HTTPException(status_code=403, detail='Not authorized to view this student grades')
    
    # Check student exists
    student = db.query(UserModel).filter(UserModel.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail='Student not found')
    
    return calculate_activity_grades(db, student_id, classroom_id)


def _get_student_transcript_internal(student_id: int, classroom_id: int, db: Session, academic_year: str = None, semester: int = None):
    """Internal helper to calculate transcript using scaling logic consistent with UI."""
    # Get all subjects this student is enrolled in
    subjects_query = db.query(SubjectModel).join(
        SubjectStudentModel, SubjectModel.id == SubjectStudentModel.subject_id
    ).filter(SubjectStudentModel.student_id == student_id)

    # Apply semester/year filters if provided (support short-year like '69')
    if academic_year is not None:
        q_year = str(academic_year).strip()
        if len(q_year) <= 2:
            subjects_query = subjects_query.filter(or_(
                SubjectModel.academic_year == academic_year,
                func.right(SubjectModel.academic_year, len(q_year)) == q_year
            ))
        else:
            subjects_query = subjects_query.filter(SubjectModel.academic_year == academic_year)
    if semester is not None:
        subjects_query = subjects_query.filter(SubjectModel.semester == semester)

    subjects = subjects_query.all()
    
    regular_subjects = []
    
    def check_is_exam(title):
        if not title: return False
        t = title.lower()
        exam_keywords = ['กลางภาค', 'ปลายภาค', 'final', 'midterm', 'คะแนนสอบ']
        return any(keyword in t for keyword in exam_keywords)

    for subject in subjects:
        if subject.subject_type == 'activity':
            continue
            
        # Get grades for this subject
        grades_query = db.query(GradeModel).filter(
            GradeModel.subject_id == subject.id,
            GradeModel.student_id == student_id
        )
        # Apply classroom filter if provided (for classroom-specific assignments)
        if classroom_id:
            grades_query = grades_query.filter(
                (GradeModel.classroom_id == classroom_id) | (GradeModel.classroom_id.is_(None))
            )
            
        grades = grades_query.all()
        if not grades:
            continue
            
        raw_collected_score = 0.0
        raw_collected_max = 0.0
        raw_exam_score = 0.0
        raw_exam_max = 0.0
        
        manual_collected = None
        manual_exam = None
        
        has_real_collected = False
        has_real_exam = False
        
        for g in grades:
            # Handle manual summary titles
            if g.title == "คะแนนเก็บรวม":
                manual_collected = float(g.grade or 0)
                continue
            if g.title == "คะแนนสอบรวม":
                manual_exam = float(g.grade or 0)
                continue
            
            score = float(g.grade or 0)
            max_s = float(g.max_score or 100)
            
            if check_is_exam(g.title):
                has_real_exam = True
                raw_exam_score += score
                raw_exam_max += max_s
            else:
                has_real_collected = True
                raw_collected_score += score
                raw_collected_max += max_s
        
        # Subject level settings
        max_c = float(subject.max_collected_score or 100)
        max_e = float(subject.max_exam_score or 100)
        
        # Scaling logic for Collected Score
        if not has_real_collected and manual_collected is not None:
            final_collected = min(manual_collected, max_c)
        else:
            final_collected = (raw_collected_score / raw_collected_max * max_c) if raw_collected_max > 0 else raw_collected_score
            
        # Scaling logic for Exam Score
        if not has_real_exam and manual_exam is not None:
            final_exam = min(manual_exam, max_e)
        else:
            final_exam = (raw_exam_score / raw_exam_max * max_e) if raw_exam_max > 0 else raw_exam_score

        # Only include exam portion in denominator if exam data actually exists
        # This prevents subjects with no exam from showing artificially low scores
        has_exam_data = has_real_exam or (manual_exam is not None)
        effective_max_e = max_e if has_exam_data else 0.0

        total_score = final_collected + final_exam
        total_max = max_c + effective_max_e
        normalized = (total_score / total_max * 100) if total_max > 0 else 0
        
        # Get all teachers assigned to this subject (with is_ended status)
        all_schedules = db.query(SubjectScheduleModel).filter(
            SubjectScheduleModel.subject_id == subject.id
        ).all()
        
        teachers_list = []
        for sched in all_schedules:
            teacher = db.query(UserModel).filter(UserModel.id == sched.teacher_id).first()
            teacher_name = teacher.full_name or teacher.username if teacher else "Unknown"
            teachers_list.append({
                'id': sched.id,
                'teacher_id': sched.teacher_id,
                'teacher_name': teacher_name,
                'is_ended': sched.is_ended
            })

        regular_subjects.append({
            'subject_id': subject.id,
            'subject_name': subject.name,
            'subject_type': 'regular',
            'credits': subject.credits or 0,
            'score': round(total_score, 2),
            'max_score': round(total_max, 2),
            'normalized_score': round(normalized, 2),
            'teachers': teachers_list,
            'academic_year': subject.academic_year,
            'semester': subject.semester
        })
    
    # Calculate activity grades (Uses its own scaling logic to 100)
    activity_breakdown = calculate_activity_grades(db, student_id, classroom_id, academic_year=academic_year, semester=semester)
    
    # Build transcript
    transcript = regular_subjects
    if activity_breakdown['activity_subjects']:
        transcript.append({
            'subject_id': None,
            'subject_name': 'กิจกรรม (Activity)',
            'subject_type': 'activity',
            'credits': 0,
            'score': round(activity_breakdown['total_activity_score'], 2),
            'max_score': 100.0,
            'breakdown': activity_breakdown['activity_subjects'],
            'total_percent': round(activity_breakdown['total_activity_percent'], 2)
        })
    
    return transcript


@router.get('/student/{student_id}/transcript')
def get_student_transcript(student_id: int, classroom_id: int = None, academic_year: str = None, semester: int = None, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """
    Get student's full transcript with activity grades aggregated into a single "Activity" entry.
    Regular subjects show individual entries; activity subjects are combined.
    """
    # Authorization: Student themselves, Admin, or Teacher
    is_authorized = False
    is_student = (getattr(current_user, 'id', None) == student_id)
    is_teacher = (getattr(current_user, 'role', None) == 'teacher')
    
    if getattr(current_user, 'role', None) == 'admin':
        is_authorized = True
    elif is_student:
        is_authorized = True
    elif is_teacher:
        is_authorized = True 

    if not is_authorized:
        raise HTTPException(status_code=403, detail='Not authorized to view this student transcript')

    # Check student exists
    student = db.query(UserModel).filter(UserModel.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail='Student not found')

    # Load school for access control and default year/semester
    from models.school import School as SchoolModel
    school = db.query(SchoolModel).filter(SchoolModel.id == student.school_id).first()
    if not school:
        raise HTTPException(status_code=404, detail='School not found')

    # Access Control Logic per Year/Semester (Students/Teachers)
    if not getattr(current_user, 'role', None) == 'admin':
        # Determine which year/semester(s) to check
        check_year = academic_year if academic_year else school.current_academic_year

        if not check_year:
            raise HTTPException(status_code=400, detail="Academic year must be specified")

        if semester is not None:
            semesters_to_check = [int(semester)]
        else:
            subject_semesters = db.query(SubjectModel.semester).join(
                SubjectStudentModel, SubjectModel.id == SubjectStudentModel.subject_id
            ).filter(
                SubjectStudentModel.student_id == student_id,
                SubjectModel.academic_year == check_year,
                SubjectModel.semester.isnot(None)
            ).distinct().all()

            classroom_semesters = db.query(ClassroomModel.semester).join(
                ClassroomStudentModel, ClassroomModel.id == ClassroomStudentModel.classroom_id
            ).filter(
                ClassroomStudentModel.student_id == student_id,
                ClassroomModel.academic_year == check_year,
                ClassroomModel.semester.isnot(None)
            ).distinct().all()

            semester_values = {
                int(row[0]) for row in (subject_semesters + classroom_semesters) if row and row[0] is not None
            }

            if semester_values:
                semesters_to_check = sorted(list(semester_values))
            elif school.current_semester:
                semesters_to_check = [int(school.current_semester)]
            else:
                semesters_to_check = []

        if not semesters_to_check:
            raise HTTPException(status_code=400, detail="Academic year and semester must be specified")

        access_controls = db.query(SchoolAccessControlModel).filter(
            and_(
                SchoolAccessControlModel.school_id == student.school_id,
                SchoolAccessControlModel.academic_year == check_year
            )
        ).all()
        access_map = {int(a.semester): a for a in access_controls if a.semester is not None}

        for check_semester in semesters_to_check:
            access_control = access_map.get(int(check_semester))
            if is_student:
                if not access_control or not access_control.allow_student_view_grades:
                    raise HTTPException(
                        status_code=403,
                        detail=f"ทางโรงเรียนยังไม่เปิดให้เข้าดูผลการเรียนสำหรับปี {check_year} ภาคเรียนที่ {check_semester}"
                    )
            elif is_teacher:
                if not access_control or not access_control.allow_teacher_view_summary:
                    raise HTTPException(
                        status_code=403,
                        detail=f"ทางโรงเรียนยังไม่อนุญาตให้ครูดูสรุปคะแนนสำหรับปี {check_year} ภาคเรียนที่ {check_semester}"
                    )
    
    return _get_student_transcript_internal(student_id, classroom_id, db, academic_year=academic_year, semester=semester)


@router.get('/student/{student_id}/semester-list')
def get_student_semester_list(student_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """
    Return a list of unique (academic_year, semester) combinations that the student has subjects in.
    Also includes semesters from classroom enrollments (for new students without subject assignments yet).
    Useful for populating semester selector UI.
    """
    is_authorized = (
        getattr(current_user, 'id', None) == student_id or
        getattr(current_user, 'role', None) in ('admin', 'teacher')
    )
    if not is_authorized:
        raise HTTPException(status_code=403, detail='Not authorized')

    student = db.query(UserModel).filter(UserModel.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail='Student not found')

    # Get semesters from enrolled subjects
    subject_rows = db.query(SubjectModel.academic_year, SubjectModel.semester).join(
        SubjectStudentModel, SubjectModel.id == SubjectStudentModel.subject_id
    ).filter(
        SubjectStudentModel.student_id == student_id,
        SubjectModel.academic_year.isnot(None),
        SubjectModel.semester.isnot(None)
    ).distinct().all()

    # Also get semesters from classroom enrollments (for students without subject assignments yet)
    classroom_rows = db.query(ClassroomModel.academic_year, ClassroomModel.semester).join(
        ClassroomStudentModel, ClassroomModel.id == ClassroomStudentModel.classroom_id
    ).filter(
        ClassroomStudentModel.student_id == student_id,
        ClassroomModel.academic_year.isnot(None),
        ClassroomModel.semester.isnot(None),
    ).distinct().all()

    # Merge and deduplicate
    all_rows = set()
    for row in subject_rows + classroom_rows:
        all_rows.add((row[0], row[1]))

    access_rows = db.query(SchoolAccessControlModel).filter(
        SchoolAccessControlModel.school_id == student.school_id
    ).all()
    access_map = {
        (str(r.academic_year), int(r.semester)): r for r in access_rows
    }

    result = []
    for year, sem in all_rows:
        key = (str(year), int(sem))
        access = access_map.get(key)
        result.append({
            'academic_year': year,
            'semester': sem,
            'allow_student_view_grades': bool(getattr(access, 'allow_student_view_grades', False)),
            'allow_teacher_view_summary': bool(getattr(access, 'allow_teacher_view_summary', False)),
            'allow_student_view_ranking': bool(getattr(access, 'allow_student_view_ranking', False))
        })

    result = sorted(result, key=lambda x: (x['academic_year'], x['semester']))
    return result


@router.get('/classroom/{classroom_id}/ranking')
def get_classroom_ranking(classroom_id: int, academic_year: str = None, semester: int = None, grade_level: str = None, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """Calculate ranking for all students in a classroom or grade level based on weighted average of scores."""
    # Check authorization (Admin or Teacher or Student)
    user_role = getattr(current_user, 'role', None)
    if user_role not in ['admin', 'teacher', 'student']:
        raise HTTPException(status_code=403, detail='Not authorized')

    _enforce_student_ranking_access(current_user, db, academic_year=academic_year, semester=semester)

    # Get students in classroom or grade level
    query = db.query(UserModel).join(
        ClassroomStudentModel, UserModel.id == ClassroomStudentModel.student_id
    )
    is_combined_classroom_mode = (not grade_level and semester is None)
    target_classroom = None
    q_year = str(academic_year).strip() if academic_year is not None else None
    
    if grade_level:
        # If grade_level is provided, find all students in any classroom of that grade level
        # scoped to the correct school + year + semester so that students from other years
        # (e.g. newly enrolled year-69 students) are not mixed into the year-68 ranking.
        query = query.join(ClassroomModel, ClassroomStudentModel.classroom_id == ClassroomModel.id)
        query = query.filter(ClassroomModel.grade_level == grade_level)
        school_id_scope = getattr(current_user, 'school_id', None)
        if school_id_scope:
            query = query.filter(ClassroomModel.school_id == school_id_scope)
        if q_year is not None:
            if len(q_year) <= 2:
                query = query.filter(or_(
                    ClassroomModel.academic_year == academic_year,
                    func.right(ClassroomModel.academic_year, len(q_year)) == q_year
                ))
            else:
                query = query.filter(ClassroomModel.academic_year == academic_year)
        if semester is not None:
            query = query.filter(ClassroomModel.semester == semester)
    elif is_combined_classroom_mode:
        # Combined mode: merge same classroom across semesters in the selected academic year
        # (same school + same classroom name + same grade level)
        target_classroom = db.query(ClassroomModel).filter(ClassroomModel.id == classroom_id).first()
        if not target_classroom:
            return []

        query = query.join(ClassroomModel, ClassroomStudentModel.classroom_id == ClassroomModel.id)
        query = query.filter(
            ClassroomModel.school_id == target_classroom.school_id,
            ClassroomModel.name == target_classroom.name,
            ClassroomModel.grade_level == target_classroom.grade_level
        )

        if q_year is not None:
            if len(q_year) <= 2:
                query = query.filter(or_(
                    ClassroomModel.academic_year == academic_year,
                    func.right(ClassroomModel.academic_year, len(q_year)) == q_year
                ))
            else:
                query = query.filter(ClassroomModel.academic_year == academic_year)
        elif target_classroom.academic_year:
            query = query.filter(ClassroomModel.academic_year == target_classroom.academic_year)
    else:
        query = query.filter(ClassroomStudentModel.classroom_id == classroom_id)
        
    students = query.all()
    # Deduplicate students that appear in both semesters of the same classroom
    students = list({s.id: s for s in students}.values())

    if not students:
        return []

    # Build student_number lookup map
    student_ids = [s.id for s in students]
    enrollments_query = db.query(ClassroomStudentModel).filter(
        ClassroomStudentModel.student_id.in_(student_ids)
    )

    if grade_level:
        enrollments_query = enrollments_query.join(
            ClassroomModel, ClassroomStudentModel.classroom_id == ClassroomModel.id
        ).filter(ClassroomModel.grade_level == grade_level)
        school_id_scope = getattr(current_user, 'school_id', None)
        if school_id_scope:
            enrollments_query = enrollments_query.filter(ClassroomModel.school_id == school_id_scope)
        if q_year is not None:
            if len(q_year) <= 2:
                enrollments_query = enrollments_query.filter(or_(
                    ClassroomModel.academic_year == academic_year,
                    func.right(ClassroomModel.academic_year, len(q_year)) == q_year
                ))
            else:
                enrollments_query = enrollments_query.filter(ClassroomModel.academic_year == academic_year)
        if semester is not None:
            enrollments_query = enrollments_query.filter(ClassroomModel.semester == semester)
    elif is_combined_classroom_mode and target_classroom is not None:
        enrollments_query = enrollments_query.join(
            ClassroomModel, ClassroomStudentModel.classroom_id == ClassroomModel.id
        ).filter(
            ClassroomModel.school_id == target_classroom.school_id,
            ClassroomModel.name == target_classroom.name,
            ClassroomModel.grade_level == target_classroom.grade_level
        )

        if q_year is not None:
            if len(q_year) <= 2:
                enrollments_query = enrollments_query.filter(or_(
                    ClassroomModel.academic_year == academic_year,
                    func.right(ClassroomModel.academic_year, len(q_year)) == q_year
                ))
            else:
                enrollments_query = enrollments_query.filter(ClassroomModel.academic_year == academic_year)
        elif target_classroom.academic_year:
            enrollments_query = enrollments_query.filter(ClassroomModel.academic_year == target_classroom.academic_year)
    else:
        enrollments_query = enrollments_query.filter(ClassroomStudentModel.classroom_id == classroom_id)

    enrollments = enrollments_query.all()
    student_number_map = {}
    for e in enrollments:
        if e.student_id not in student_number_map or (student_number_map[e.student_id] is None and e.student_number is not None):
            student_number_map[e.student_id] = e.student_number

    results = []
    for student in students:
        # When a specific academic year/semester is requested, ranking should follow the
        # same transcript scope used by export and student views: all subjects in that period.
        # Limiting by classroom_id here can drop valid grades whose rows were saved without
        # the matching classroom reference and incorrectly force totals to 0.
        has_period_filter = academic_year is not None or semester is not None
        cid_for_transcript = None if (grade_level or is_combined_classroom_mode or has_period_filter) else classroom_id
        transcript = _get_student_transcript_internal(student.id, cid_for_transcript, db, academic_year=academic_year, semester=semester)
        
        total_score = 0.0
        total_max = 0.0
        
        for item in transcript:
            # ใช้พจน์ 'score' และ 'max_score' ที่สรุปมาให้แล้วในแต่ละวิชา (รวมวิชากิจกรรมด้วยถ้ามีคะแนน)
            s = item.get('score') or 0.0
            m = item.get('max_score') or 0.0
            
            total_score += float(s)
            total_max += float(m)
        
        # คำนวณเปอร์เซ็นต์เฉลี่ยจากคะแนนรวมทั้งหมด
        final_percentage = (total_score / total_max * 100) if total_max > 0 else 0.0
        
        results.append({
            'student_id': student.id,
            'full_name': student.full_name,
            'username': student.username,
            'total_score': round(total_score, 2),
            'total_max_score': round(total_max, 2),
            'average_score': round(final_percentage, 2),
            'student_number': student_number_map.get(student.id)
        })

    # Sort descending by average_score (percentage) so ranking is fair
    # regardless of how many subjects each student has
    results.sort(key=lambda x: x['average_score'], reverse=True)

    # Assign ranks
    current_rank = 0
    last_val = -1.0
    for i, item in enumerate(results):
        if item['average_score'] != last_val:
            current_rank = i + 1
            last_val = item['average_score']
        item['rank'] = current_rank

    return results


@router.get('/school/{school_id}/ranking')
def get_school_ranking(
    school_id: int,
    academic_year: str = None,
    semester: int = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Calculate ranking for all students in the entire school based on selected period."""
    # Check authorization (Admin or Teacher or Student in this school)
    user_role = getattr(current_user, 'role', None)
    if user_role not in ['admin', 'teacher', 'student']:
        raise HTTPException(status_code=403, detail='Not authorized')

    _enforce_student_ranking_access(current_user, db, academic_year=academic_year, semester=semester)

    # Start from all students in school
    students_query = db.query(UserModel).filter(
        UserModel.school_id == school_id,
        UserModel.role == 'student'
    )

    # When year/semester is selected, rank only students who are in that period.
    if academic_year is not None or semester is not None:
        q_year = str(academic_year).strip() if academic_year is not None else None

        subject_ids_query = db.query(SubjectStudentModel.student_id).join(
            SubjectModel, SubjectModel.id == SubjectStudentModel.subject_id
        ).filter(SubjectModel.school_id == school_id)

        classroom_ids_query = db.query(ClassroomStudentModel.student_id).join(
            ClassroomModel, ClassroomModel.id == ClassroomStudentModel.classroom_id
        ).filter(
            ClassroomModel.school_id == school_id,
        )

        if q_year is not None:
            if len(q_year) <= 2:
                subject_ids_query = subject_ids_query.filter(or_(
                    SubjectModel.academic_year == academic_year,
                    func.right(SubjectModel.academic_year, len(q_year)) == q_year
                ))
                classroom_ids_query = classroom_ids_query.filter(or_(
                    ClassroomModel.academic_year == academic_year,
                    func.right(ClassroomModel.academic_year, len(q_year)) == q_year
                ))
            else:
                subject_ids_query = subject_ids_query.filter(SubjectModel.academic_year == academic_year)
                classroom_ids_query = classroom_ids_query.filter(ClassroomModel.academic_year == academic_year)

        if semester is not None:
            subject_ids_query = subject_ids_query.filter(SubjectModel.semester == semester)
            classroom_ids_query = classroom_ids_query.filter(ClassroomModel.semester == semester)

        period_student_ids = {
            row[0] for row in subject_ids_query.distinct().all() if row and row[0] is not None
        }
        period_student_ids.update({
            row[0] for row in classroom_ids_query.distinct().all() if row and row[0] is not None
        })

        if not period_student_ids:
            return []

        students_query = students_query.filter(UserModel.id.in_(period_student_ids))

    students = students_query.all()

    if not students:
        return []

    student_ids = [student.id for student in students]
    classroom_rows_query = db.query(
        ClassroomStudentModel.student_id,
        ClassroomModel.id.label('classroom_id'),
        ClassroomModel.name.label('classroom_name'),
        ClassroomModel.grade_level.label('grade_level'),
        ClassroomModel.academic_year.label('academic_year'),
        ClassroomModel.semester.label('semester'),
    ).join(
        ClassroomModel, ClassroomModel.id == ClassroomStudentModel.classroom_id
    ).filter(
        ClassroomStudentModel.student_id.in_(student_ids),
        ClassroomModel.school_id == school_id,
    )

    if academic_year is not None:
        q_year = str(academic_year).strip()
        if len(q_year) <= 2:
            classroom_rows_query = classroom_rows_query.filter(or_(
                ClassroomModel.academic_year == academic_year,
                func.right(ClassroomModel.academic_year, len(q_year)) == q_year
            ))
        else:
            classroom_rows_query = classroom_rows_query.filter(ClassroomModel.academic_year == academic_year)

    if semester is not None:
        classroom_rows_query = classroom_rows_query.filter(ClassroomModel.semester == semester)

    def _year_sort_value(raw_year):
        year_text = str(raw_year or '').strip()
        digits = ''.join(ch for ch in year_text if ch.isdigit())
        if digits:
            try:
                return int(digits)
            except ValueError:
                return 0
        return 0

    classroom_map = {}
    for row in classroom_rows_query.all():
        current = classroom_map.get(row.student_id)
        candidate_key = (
            _year_sort_value(row.academic_year),
            int(row.semester or 0),
            int(row.classroom_id or 0),
        )
        current_key = current.get('_sort_key') if current else None
        if current is None or candidate_key > current_key:
            classroom_map[row.student_id] = {
                'classroom_id': row.classroom_id,
                'classroom_name': row.classroom_name,
                'grade_level': row.grade_level,
                'classroom_display': ' '.join(part for part in [row.grade_level, row.classroom_name] if part),
                '_sort_key': candidate_key,
            }

    results = []
    for student in students:
        # Pass classroom_id=None to get overall grades for the selected period
        transcript = _get_student_transcript_internal(
            student.id,
            None,
            db,
            academic_year=academic_year,
            semester=semester
        )
        
        total_score = 0.0
        total_max = 0.0
        
        for item in transcript:
            s = item.get('score') or 0.0
            m = item.get('max_score') or 0.0
            
            total_score += float(s)
            total_max += float(m)
        
        final_percentage = (total_score / total_max * 100) if total_max > 0 else 0.0
        classroom_info = classroom_map.get(student.id, {})
        
        results.append({
            'student_id': student.id,
            'full_name': student.full_name,
            'username': student.username,
            'total_score': round(total_score, 2),
            'total_max_score': round(total_max, 2),
            'average_score': round(final_percentage, 2),
            'classroom_id': classroom_info.get('classroom_id'),
            'classroom_name': classroom_info.get('classroom_name'),
            'grade_level': classroom_info.get('grade_level'),
            'classroom_display': classroom_info.get('classroom_display') or None,
        })

    # Sort descending by average_score (percentage) for fair ranking
    results.sort(key=lambda x: x['average_score'], reverse=True)

    # Assign ranks
    current_rank = 0
    last_val = -1.0
    for i, item in enumerate(results):
        if item['average_score'] != last_val:
            current_rank = i + 1
            last_val = item['average_score']
        item['rank'] = current_rank

    return results

