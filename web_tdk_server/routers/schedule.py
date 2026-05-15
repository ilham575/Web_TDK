from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from database.connection import get_db
from models.schedule import BreakSchedule, DailyBreakTracking, DailySubjectTracking, ScheduleSlot, SchoolHoliday, SubjectSchedule
from models.subject import Subject
from models.user import User
from models.subject_student import SubjectStudent
from models.classroom import Classroom
from schemas.schedule import (
    DailySubjectTrackingBulkItemUpsert,
    DailySubjectTrackingBulkUpsert,
    DailySubjectTrackingResponse,
    DailySubjectTrackingUpsert,
    BreakSchedule as BreakScheduleSchema,
    BreakScheduleCreate,
    BreakScheduleUpdate,
    SchoolHolidayCreate,
    SchoolHolidayResponse,
    ScheduleSlot as ScheduleSlotSchema,
    ScheduleSlotCreate,
    ScheduleSlotUpdate,
    SubjectSchedule as SubjectScheduleSchema,
    SubjectScheduleCreate,
    StudentScheduleResponse
)
from utils.security import get_current_user

router = APIRouter(prefix="/schedule", tags=["schedule"])


def _get_break_scope_label(break_schedule: BreakSchedule) -> str:
    classroom = getattr(break_schedule, 'classroom', None)
    classroom_name = getattr(classroom, 'name', None)
    if getattr(break_schedule, 'classroom_id', None) is not None:
        return f"เฉพาะชั้น {classroom_name}" if classroom_name else "เฉพาะชั้นเรียน"
    return "ทุกชั้นเรียน"


def _build_break_api_response(
    break_schedule: BreakSchedule,
) -> BreakScheduleSchema:
    classroom = getattr(break_schedule, 'classroom', None)

    return BreakScheduleSchema(
        id=break_schedule.id,
        school_id=break_schedule.school_id,
        created_by=break_schedule.created_by,
        academic_year=break_schedule.academic_year,
        semester=break_schedule.semester,
        day_of_week=break_schedule.day_of_week,
        start_time=break_schedule.start_time,
        end_time=break_schedule.end_time,
        classroom_id=break_schedule.classroom_id,
        classroom_name=classroom.name if classroom else None,
        note=break_schedule.note,
        is_break=True,
        scope_label=_get_break_scope_label(break_schedule),
    )


def _build_subject_schedule_response(
    schedule: SubjectSchedule,
    teacher_name_override: Optional[str] = None,
) -> SubjectScheduleSchema:
    subject = schedule.subject
    teacher = schedule.teacher
    classroom = schedule.classroom
    schedule_slot = schedule.schedule_slot

    teacher_name = teacher_name_override
    if not teacher_name and teacher is not None:
        teacher_name = getattr(teacher, 'full_name', None) or getattr(teacher, 'username', None)

    day_of_week = schedule.day_of_week or (schedule_slot.day_of_week if schedule_slot else None)
    start_time = schedule.start_time or (schedule_slot.start_time if schedule_slot else None)
    end_time = schedule.end_time or (schedule_slot.end_time if schedule_slot else None)

    return SubjectScheduleSchema(
        id=schedule.id,
        subject_id=schedule.subject_id,
        schedule_slot_id=schedule.schedule_slot_id,
        teacher_id=schedule.teacher_id,
        classroom_id=schedule.classroom_id,
        day_of_week=day_of_week,
        start_time=start_time,
        end_time=end_time,
        subject_name=subject.name if subject else None,
        subject_code=subject.code if subject else None,
        teacher_name=teacher_name,
        classroom_name=classroom.name if classroom else None,
        academic_year=subject.academic_year if subject else None,
        semester=subject.semester if subject else None,
        note=None,
        is_break=False,
        scope_label=None,
    )


def _build_break_schedule_response(
    break_schedule: BreakSchedule,
) -> SubjectScheduleSchema:
    classroom = getattr(break_schedule, 'classroom', None)

    return SubjectScheduleSchema(
        id=break_schedule.id,
        subject_id=None,
        schedule_slot_id=None,
        teacher_id=None,
        classroom_id=break_schedule.classroom_id,
        day_of_week=break_schedule.day_of_week,
        start_time=break_schedule.start_time,
        end_time=break_schedule.end_time,
        subject_name="เวลาพัก",
        subject_code=None,
        teacher_name=None,
        classroom_name=classroom.name if classroom else None,
        academic_year=break_schedule.academic_year,
        semester=break_schedule.semester,
        note=break_schedule.note,
        is_break=True,
        is_free_period=False,
        scope_label=_get_break_scope_label(break_schedule),
    )


def _build_free_period_schedule_response(
    slot: ScheduleSlot,
    *,
    academic_year: Optional[str] = None,
    semester: Optional[int] = None,
) -> SubjectScheduleSchema:
    return SubjectScheduleSchema(
        id=-int(slot.id),
        subject_id=None,
        schedule_slot_id=slot.id,
        teacher_id=None,
        classroom_id=None,
        day_of_week=slot.day_of_week,
        start_time=slot.start_time,
        end_time=slot.end_time,
        subject_name="คาบว่าง",
        subject_code=None,
        teacher_name=None,
        classroom_name=None,
        academic_year=academic_year,
        semester=semester,
        note="ไม่มีคาบเรียนของครูในช่วงเวลานี้",
        is_break=False,
        is_free_period=True,
        scope_label="ช่วงว่าง",
    )


def _get_holiday_note(holiday: SchoolHoliday) -> str:
    return (getattr(holiday, 'note', None) or '').strip() or "วันหยุดเรียนเฉพาะวันที่เลือก"


def _get_school_holiday(
    db: Session,
    school_id: int,
    holiday_date: date,
) -> Optional[SchoolHoliday]:
    return db.query(SchoolHoliday).filter(
        SchoolHoliday.school_id == school_id,
        SchoolHoliday.holiday_date == holiday_date,
    ).first()


def _time_ranges_overlap(start_a, end_a, start_b, end_b) -> bool:
    if not start_a or not end_a or not start_b or not end_b:
        return False
    return start_a < end_b and end_a > start_b


def _filter_teacher_actual_break_schedules(
    teacher_schedules: List[SubjectSchedule],
    break_schedules: List[BreakSchedule],
) -> List[BreakSchedule]:
    if not teacher_schedules or not break_schedules:
        return break_schedules

    teacher_ranges = [
        (
            _get_schedule_day_value(schedule),
            _get_schedule_start_time(schedule),
            _get_schedule_end_time(schedule),
        )
        for schedule in teacher_schedules
    ]

    filtered_breaks = []
    for break_schedule in break_schedules:
        overlaps_teaching = any(
            str(break_schedule.day_of_week) == str(day_of_week)
            and _time_ranges_overlap(
                break_schedule.start_time,
                break_schedule.end_time,
                start_time,
                end_time,
            )
            for day_of_week, start_time, end_time in teacher_ranges
        )
        if not overlaps_teaching:
            filtered_breaks.append(break_schedule)

    return filtered_breaks


def _build_student_break_schedule_response(
    break_schedule: BreakSchedule,
) -> StudentScheduleResponse:
    return StudentScheduleResponse(
        id=break_schedule.id,
        subject_id=None,
        subject_name="เวลาพัก",
        subject_code=None,
        teacher_name=None,
        day_of_week=str(break_schedule.day_of_week),
        start_time=break_schedule.start_time,
        end_time=break_schedule.end_time,
        note=break_schedule.note,
        is_break=True,
        scope_label=_get_break_scope_label(break_schedule),
    )


def _get_schedule_day_value(schedule: SubjectSchedule) -> Optional[str]:
    schedule_slot = getattr(schedule, 'schedule_slot', None)
    day_of_week = schedule.day_of_week or (schedule_slot.day_of_week if schedule_slot else None)
    return str(day_of_week) if day_of_week is not None else None


def _get_schedule_start_time(schedule: SubjectSchedule):
    schedule_slot = getattr(schedule, 'schedule_slot', None)
    return schedule.start_time or (schedule_slot.start_time if schedule_slot else None)


def _get_schedule_end_time(schedule: SubjectSchedule):
    schedule_slot = getattr(schedule, 'schedule_slot', None)
    return schedule.end_time or (schedule_slot.end_time if schedule_slot else None)


def _date_to_schedule_day(tracking_date: date) -> str:
    return str(tracking_date.isoweekday() % 7)


def _build_holiday_api_response(
    holiday: SchoolHoliday,
) -> SchoolHolidayResponse:
    return SchoolHolidayResponse(
        id=holiday.id,
        school_id=holiday.school_id,
        holiday_date=holiday.holiday_date,
        note=_get_holiday_note(holiday),
        created_by=holiday.created_by,
    )


def _build_holiday_tracking_response(
    holiday: SchoolHoliday,
    tracking_date: date,
    *,
    academic_year: Optional[str] = None,
    semester: Optional[int] = None,
    can_edit: bool = False,
) -> DailySubjectTrackingResponse:
    return DailySubjectTrackingResponse(
        tracking_id=None,
        subject_schedule_id=f"holiday-{holiday.id}",
        break_schedule_id=None,
        holiday_id=holiday.id,
        tracking_date=tracking_date,
        subject_id=None,
        subject_name="วันหยุดเรียน",
        subject_code=None,
        teacher_id=None,
        teacher_name=None,
        classroom_id=None,
        classroom_name=None,
        academic_year=academic_year,
        semester=semester,
        day_of_week=_date_to_schedule_day(tracking_date),
        scheduled_start_time=None,
        scheduled_end_time=None,
        actual_start_time=None,
        actual_end_time=None,
        is_skipped=False,
        note=_get_holiday_note(holiday),
        can_edit=can_edit,
        is_break=False,
        is_holiday=True,
        scope_label="หยุดเฉพาะวันที่",
    )


def _ensure_not_school_holiday(
    db: Session,
    school_id: int,
    tracking_date: date,
):
    holiday = _get_school_holiday(db, school_id, tracking_date)
    if holiday is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Selected date is marked as a school holiday",
        )


def _build_daily_tracking_response(
    schedule: SubjectSchedule,
    tracking_date: date,
    tracking_row: Optional[DailySubjectTracking] = None,
    *,
    can_edit: bool = False,
) -> DailySubjectTrackingResponse:
    subject = getattr(schedule, 'subject', None)
    teacher = getattr(schedule, 'teacher', None)
    classroom = getattr(schedule, 'classroom', None)

    teacher_name = None
    if teacher is not None:
        teacher_name = getattr(teacher, 'full_name', None) or getattr(teacher, 'username', None)

    return DailySubjectTrackingResponse(
        tracking_id=tracking_row.id if tracking_row else None,
        subject_schedule_id=schedule.id,
        break_schedule_id=None,
        tracking_date=tracking_date,
        subject_id=schedule.subject_id,
        subject_name=subject.name if subject else None,
        subject_code=subject.code if subject else None,
        teacher_id=schedule.teacher_id,
        teacher_name=teacher_name,
        classroom_id=schedule.classroom_id,
        classroom_name=classroom.name if classroom else None,
        academic_year=subject.academic_year if subject else None,
        semester=subject.semester if subject else None,
        day_of_week=_get_schedule_day_value(schedule),
        scheduled_start_time=_get_schedule_start_time(schedule),
        scheduled_end_time=_get_schedule_end_time(schedule),
        actual_start_time=tracking_row.actual_start_time if tracking_row else None,
        actual_end_time=tracking_row.actual_end_time if tracking_row else None,
        is_skipped=bool(tracking_row.is_skipped) if tracking_row else False,
        note=tracking_row.note if tracking_row else None,
        can_edit=can_edit,
        is_break=False,
        scope_label=None,
    )


def _build_daily_break_tracking_response(
    break_schedule: BreakSchedule,
    tracking_date: date,
    tracking_row: Optional[DailyBreakTracking] = None,
    *,
    can_edit: bool = False,
) -> DailySubjectTrackingResponse:
    classroom = getattr(break_schedule, 'classroom', None)

    return DailySubjectTrackingResponse(
        tracking_id=tracking_row.id if tracking_row else None,
        subject_schedule_id=f"break-{break_schedule.id}",
        break_schedule_id=break_schedule.id,
        tracking_date=tracking_date,
        subject_id=None,
        subject_name="เวลาพัก",
        subject_code=None,
        teacher_id=None,
        teacher_name=None,
        classroom_id=break_schedule.classroom_id,
        classroom_name=classroom.name if classroom else None,
        academic_year=break_schedule.academic_year,
        semester=break_schedule.semester,
        day_of_week=str(break_schedule.day_of_week),
        scheduled_start_time=break_schedule.start_time,
        scheduled_end_time=break_schedule.end_time,
        actual_start_time=tracking_row.actual_start_time if tracking_row else None,
        actual_end_time=tracking_row.actual_end_time if tracking_row else None,
        is_skipped=bool(tracking_row.is_skipped) if tracking_row else False,
        note=tracking_row.note if tracking_row else break_schedule.note,
        can_edit=can_edit,
        is_break=True,
        scope_label=_get_break_scope_label(break_schedule),
    )


def _build_daily_tracking_list(
    db: Session,
    schedules: List[SubjectSchedule],
    school_id: int,
    tracking_date: date,
    *,
    can_edit: bool = False,
) -> List[DailySubjectTrackingResponse]:
    schedule_ids = [schedule.id for schedule in schedules]
    tracking_map = {}

    if schedule_ids:
        tracking_rows = db.query(DailySubjectTracking).filter(
            DailySubjectTracking.school_id == school_id,
            DailySubjectTracking.tracking_date == tracking_date,
            DailySubjectTracking.subject_schedule_id.in_(schedule_ids),
        ).all()
        tracking_map = {row.subject_schedule_id: row for row in tracking_rows}

    items = [
        _build_daily_tracking_response(
            schedule,
            tracking_date,
            tracking_map.get(schedule.id),
            can_edit=can_edit,
        )
        for schedule in schedules
    ]
    items.sort(key=lambda item: (item.classroom_name or '', str(item.scheduled_start_time or ''), item.subject_name or ''))
    return items


def _build_daily_break_tracking_list(
    db: Session,
    break_schedules: List[BreakSchedule],
    school_id: int,
    tracking_date: date,
    *,
    can_edit: bool = False,
) -> List[DailySubjectTrackingResponse]:
    break_ids = [break_schedule.id for break_schedule in break_schedules]
    tracking_map = {}

    if break_ids:
        tracking_rows = db.query(DailyBreakTracking).filter(
            DailyBreakTracking.school_id == school_id,
            DailyBreakTracking.tracking_date == tracking_date,
            DailyBreakTracking.break_schedule_id.in_(break_ids),
        ).all()
        tracking_map = {row.break_schedule_id: row for row in tracking_rows}

    items = [
        _build_daily_break_tracking_response(
            break_schedule,
            tracking_date,
            tracking_map.get(break_schedule.id),
            can_edit=can_edit,
        )
        for break_schedule in break_schedules
    ]
    items.sort(key=lambda item: (item.classroom_name or '', str(item.scheduled_start_time or ''), item.subject_name or ''))
    return items


def _get_tracking_break_schedules(
    db: Session,
    school_id: int,
    tracking_date: date,
    academic_year: Optional[str] = None,
    semester: Optional[int] = None,
    classroom_ids: Optional[List[int]] = None,
    *,
    global_only_when_no_classrooms: bool = False,
) -> List[BreakSchedule]:
    target_day = _date_to_schedule_day(tracking_date)
    query = db.query(BreakSchedule).options(
        joinedload(BreakSchedule.classroom),
    ).filter(
        BreakSchedule.school_id == school_id,
        BreakSchedule.day_of_week == target_day,
    )

    if academic_year is not None:
        query = query.filter(BreakSchedule.academic_year == academic_year)
    if semester is not None:
        query = query.filter(BreakSchedule.semester == semester)

    if classroom_ids is not None:
        if classroom_ids:
            query = query.filter(
                or_(
                    BreakSchedule.classroom_id.is_(None),
                    BreakSchedule.classroom_id.in_(classroom_ids),
                )
            )
        elif global_only_when_no_classrooms:
            query = query.filter(BreakSchedule.classroom_id.is_(None))

    return query.order_by(BreakSchedule.start_time, BreakSchedule.end_time).all()


def _get_admin_tracking_schedules(
    db: Session,
    school_id: int,
    tracking_date: date,
    academic_year: Optional[str] = None,
    semester: Optional[int] = None,
) -> List[SubjectSchedule]:
    target_day = _date_to_schedule_day(tracking_date)
    query = db.query(SubjectSchedule).options(
        joinedload(SubjectSchedule.subject),
        joinedload(SubjectSchedule.schedule_slot),
        joinedload(SubjectSchedule.teacher),
        joinedload(SubjectSchedule.classroom),
    ).join(
        Subject,
        SubjectSchedule.subject_id == Subject.id,
    ).filter(
        Subject.school_id == school_id,
    )

    if academic_year is not None:
        query = query.filter(Subject.academic_year == academic_year)
    if semester is not None:
        query = query.filter(Subject.semester == semester)

    return [schedule for schedule in query.all() if _get_schedule_day_value(schedule) == target_day]


def _get_teacher_tracking_schedules(
    db: Session,
    teacher_id: int,
    school_id: int,
    tracking_date: date,
    academic_year: Optional[str] = None,
    semester: Optional[int] = None,
) -> List[SubjectSchedule]:
    target_day = _date_to_schedule_day(tracking_date)
    query = db.query(SubjectSchedule).options(
        joinedload(SubjectSchedule.subject),
        joinedload(SubjectSchedule.schedule_slot),
        joinedload(SubjectSchedule.teacher),
        joinedload(SubjectSchedule.classroom),
    ).join(
        Subject,
        SubjectSchedule.subject_id == Subject.id,
    ).filter(
        Subject.school_id == school_id,
        SubjectSchedule.teacher_id == teacher_id,
    )

    if academic_year is not None:
        query = query.filter(Subject.academic_year == academic_year)
    if semester is not None:
        query = query.filter(Subject.semester == semester)

    return [schedule for schedule in query.all() if _get_schedule_day_value(schedule) == target_day]


def _get_student_tracking_schedules(
    db: Session,
    student_id: int,
    school_id: int,
    tracking_date: date,
    academic_year: Optional[str] = None,
    semester: Optional[int] = None,
) -> List[SubjectSchedule]:
    from models.classroom_subject import ClassroomSubject as ClassroomSubjectModel

    target_day = _date_to_schedule_day(tracking_date)
    classroom_ids = _resolve_student_classroom_ids(
        db,
        student_id=student_id,
        school_id=school_id,
        academic_year=academic_year,
        semester=semester,
    )

    direct_subject_query = db.query(SubjectStudent.subject_id).join(
        Subject,
        SubjectStudent.subject_id == Subject.id,
    ).filter(
        SubjectStudent.student_id == student_id,
        Subject.school_id == school_id,
    )
    if academic_year is not None:
        direct_subject_query = direct_subject_query.filter(Subject.academic_year == academic_year)
    if semester is not None:
        direct_subject_query = direct_subject_query.filter(Subject.semester == semester)
    direct_subject_ids = {row[0] for row in direct_subject_query.all()}

    classroom_subject_ids = set()
    if classroom_ids:
        classroom_subject_query = db.query(ClassroomSubjectModel.subject_id).join(
            Subject,
            ClassroomSubjectModel.subject_id == Subject.id,
        ).filter(
            ClassroomSubjectModel.classroom_id.in_(classroom_ids),
            Subject.school_id == school_id,
        )
        if academic_year is not None:
            classroom_subject_query = classroom_subject_query.filter(Subject.academic_year == academic_year)
        if semester is not None:
            classroom_subject_query = classroom_subject_query.filter(Subject.semester == semester)
        classroom_subject_ids = {row[0] for row in classroom_subject_query.all()}

    scheduled_classroom_subject_ids = set()
    if classroom_ids:
        scheduled_subject_query = db.query(SubjectSchedule.subject_id).join(
            Subject,
            SubjectSchedule.subject_id == Subject.id,
        ).filter(
            SubjectSchedule.classroom_id.in_(classroom_ids),
            Subject.school_id == school_id,
        )
        if academic_year is not None:
            scheduled_subject_query = scheduled_subject_query.filter(Subject.academic_year == academic_year)
        if semester is not None:
            scheduled_subject_query = scheduled_subject_query.filter(Subject.semester == semester)
        scheduled_classroom_subject_ids = {row[0] for row in scheduled_subject_query.distinct().all()}

    subject_ids = list(direct_subject_ids | classroom_subject_ids | scheduled_classroom_subject_ids)
    if not subject_ids:
        return []

    query = db.query(SubjectSchedule).options(
        joinedload(SubjectSchedule.subject),
        joinedload(SubjectSchedule.schedule_slot),
        joinedload(SubjectSchedule.teacher),
        joinedload(SubjectSchedule.classroom),
    ).join(
        Subject,
        SubjectSchedule.subject_id == Subject.id,
    ).filter(
        SubjectSchedule.subject_id.in_(subject_ids),
        Subject.school_id == school_id,
    )

    if academic_year is not None:
        query = query.filter(Subject.academic_year == academic_year)
    if semester is not None:
        query = query.filter(Subject.semester == semester)

    if classroom_ids:
        query = query.filter(
            or_(
                SubjectSchedule.classroom_id.is_(None),
                SubjectSchedule.classroom_id.in_(classroom_ids),
            )
        )
    else:
        query = query.filter(SubjectSchedule.classroom_id.is_(None))

    return [schedule for schedule in query.all() if _get_schedule_day_value(schedule) == target_day]


def _validate_tracking_date_matches_schedule(schedule: SubjectSchedule, tracking_date: date):
    schedule_day = _get_schedule_day_value(schedule)
    tracking_day = _date_to_schedule_day(tracking_date)
    if schedule_day is None or schedule_day != tracking_day:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tracking date does not match the scheduled day of this subject",
        )


def _validate_tracking_date_matches_break_schedule(break_schedule: BreakSchedule, tracking_date: date):
    tracking_day = _date_to_schedule_day(tracking_date)
    if str(break_schedule.day_of_week) != tracking_day:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tracking date does not match the scheduled day of this break",
        )


def _validate_tracking_payload(payload: DailySubjectTrackingUpsert):
    if payload.actual_start_time and payload.actual_end_time and payload.actual_end_time < payload.actual_start_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Actual end time must be after actual start time",
        )


@router.post("/holidays", response_model=SchoolHolidayResponse, status_code=status.HTTP_201_CREATED)
def create_school_holiday(
    payload: SchoolHolidayCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can create school holidays",
        )

    note = (payload.note or '').strip() or None
    holiday = _get_school_holiday(db, current_user.school_id, payload.holiday_date)
    if holiday is None:
        holiday = SchoolHoliday(
            school_id=current_user.school_id,
            holiday_date=payload.holiday_date,
            note=note,
            created_by=current_user.id,
        )
        db.add(holiday)
    else:
        holiday.note = note

    db.query(DailySubjectTracking).filter(
        DailySubjectTracking.school_id == current_user.school_id,
        DailySubjectTracking.tracking_date == payload.holiday_date,
    ).delete(synchronize_session=False)
    db.query(DailyBreakTracking).filter(
        DailyBreakTracking.school_id == current_user.school_id,
        DailyBreakTracking.tracking_date == payload.holiday_date,
    ).delete(synchronize_session=False)

    db.commit()
    db.refresh(holiday)
    return _build_holiday_api_response(holiday)


@router.delete("/holidays/{holiday_id}")
def delete_school_holiday(
    holiday_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can delete school holidays",
        )

    holiday = db.query(SchoolHoliday).filter(
        SchoolHoliday.id == holiday_id,
        SchoolHoliday.school_id == current_user.school_id,
    ).first()
    if holiday is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="School holiday not found",
        )

    db.delete(holiday)
    db.commit()
    return {"message": "School holiday deleted successfully"}


def _get_admin_tracking_schedule_by_ids(
    db: Session,
    school_id: int,
    subject_schedule_ids: List[int],
) -> List[SubjectSchedule]:
    if not subject_schedule_ids:
        return []

    return db.query(SubjectSchedule).options(
        joinedload(SubjectSchedule.subject),
        joinedload(SubjectSchedule.schedule_slot),
        joinedload(SubjectSchedule.teacher),
        joinedload(SubjectSchedule.classroom),
    ).join(
        Subject,
        SubjectSchedule.subject_id == Subject.id,
    ).filter(
        SubjectSchedule.id.in_(subject_schedule_ids),
        Subject.school_id == school_id,
    ).all()


def _get_admin_break_schedule_by_ids(
    db: Session,
    school_id: int,
    break_schedule_ids: List[int],
) -> List[BreakSchedule]:
    if not break_schedule_ids:
        return []

    return db.query(BreakSchedule).options(
        joinedload(BreakSchedule.classroom),
    ).filter(
        BreakSchedule.id.in_(break_schedule_ids),
        BreakSchedule.school_id == school_id,
    ).all()


def _upsert_tracking_row_for_schedule(
    db: Session,
    schedule: SubjectSchedule,
    school_id: int,
    user_id: int,
    payload: DailySubjectTrackingUpsert,
) -> DailySubjectTrackingResponse:
    _validate_tracking_date_matches_schedule(schedule, payload.tracking_date)

    note = (payload.note or '').strip() or None
    has_values = bool(payload.actual_start_time or payload.actual_end_time or payload.is_skipped or note)

    tracking_row = db.query(DailySubjectTracking).filter(
        DailySubjectTracking.school_id == school_id,
        DailySubjectTracking.subject_schedule_id == schedule.id,
        DailySubjectTracking.tracking_date == payload.tracking_date,
    ).first()

    if not has_values:
        if tracking_row is not None:
            db.delete(tracking_row)
            db.flush()
        return _build_daily_tracking_response(schedule, payload.tracking_date, None, can_edit=True)

    if tracking_row is None:
        tracking_row = DailySubjectTracking(
            school_id=school_id,
            subject_schedule_id=schedule.id,
            tracking_date=payload.tracking_date,
            created_by=user_id,
            updated_by=user_id,
        )
        db.add(tracking_row)

    tracking_row.actual_start_time = payload.actual_start_time
    tracking_row.actual_end_time = payload.actual_end_time
    tracking_row.is_skipped = payload.is_skipped
    tracking_row.note = note
    tracking_row.updated_by = user_id
    db.flush()

    return _build_daily_tracking_response(schedule, payload.tracking_date, tracking_row, can_edit=True)


def _upsert_tracking_row_for_break_schedule(
    db: Session,
    break_schedule: BreakSchedule,
    school_id: int,
    user_id: int,
    payload: DailySubjectTrackingUpsert,
) -> DailySubjectTrackingResponse:
    _validate_tracking_date_matches_break_schedule(break_schedule, payload.tracking_date)

    note = (payload.note or '').strip() or None
    has_values = bool(payload.actual_start_time or payload.actual_end_time or payload.is_skipped or note)

    tracking_row = db.query(DailyBreakTracking).filter(
        DailyBreakTracking.school_id == school_id,
        DailyBreakTracking.break_schedule_id == break_schedule.id,
        DailyBreakTracking.tracking_date == payload.tracking_date,
    ).first()

    if not has_values:
        if tracking_row is not None:
            db.delete(tracking_row)
            db.flush()
        return _build_daily_break_tracking_response(break_schedule, payload.tracking_date, None, can_edit=True)

    if tracking_row is None:
        tracking_row = DailyBreakTracking(
            school_id=school_id,
            break_schedule_id=break_schedule.id,
            tracking_date=payload.tracking_date,
            created_by=user_id,
            updated_by=user_id,
        )
        db.add(tracking_row)

    tracking_row.actual_start_time = payload.actual_start_time
    tracking_row.actual_end_time = payload.actual_end_time
    tracking_row.is_skipped = payload.is_skipped
    tracking_row.note = note
    tracking_row.updated_by = user_id
    db.flush()

    return _build_daily_break_tracking_response(break_schedule, payload.tracking_date, tracking_row, can_edit=True)


def _build_period_overlap_query(
    db: Session,
    school_id: int,
    day_of_week,
    start_time,
    end_time,
    academic_year: Optional[str] = None,
    semester: Optional[int] = None,
):
    query = db.query(SubjectSchedule).join(
        Subject, SubjectSchedule.subject_id == Subject.id
    ).filter(
        Subject.school_id == school_id,
        SubjectSchedule.day_of_week == str(day_of_week),
        SubjectSchedule.start_time < end_time,
        SubjectSchedule.end_time > start_time,
    )

    if academic_year is not None:
        query = query.filter(Subject.academic_year == academic_year)
    if semester is not None:
        query = query.filter(Subject.semester == semester)

    return query


def _get_day_schedule_window(
    db: Session,
    school_id: int,
    day_of_week,
):
    slots = db.query(ScheduleSlot).filter(
        ScheduleSlot.school_id == school_id,
        ScheduleSlot.day_of_week == str(day_of_week),
        ScheduleSlot.is_break == False,
    ).order_by(
        ScheduleSlot.start_time,
        ScheduleSlot.end_time,
    ).all()

    if not slots:
        return None

    return {
        "start_time": slots[0].start_time,
        "end_time": max(slot.end_time for slot in slots),
    }


def _build_break_overlap_query(
    db: Session,
    school_id: int,
    academic_year: Optional[str],
    semester: Optional[int],
    day_of_week,
    start_time,
    end_time,
    classroom_id: Optional[int] = None,
    exclude_break_id: Optional[int] = None,
):
    query = db.query(BreakSchedule).filter(
        BreakSchedule.school_id == school_id,
        BreakSchedule.day_of_week == str(day_of_week),
        BreakSchedule.start_time < end_time,
        BreakSchedule.end_time > start_time,
    )

    if academic_year is not None:
        query = query.filter(BreakSchedule.academic_year == academic_year)
    if semester is not None:
        query = query.filter(BreakSchedule.semester == semester)
    if classroom_id is not None:
        query = query.filter(
            or_(
                BreakSchedule.classroom_id.is_(None),
                BreakSchedule.classroom_id == classroom_id,
            )
        )
    if exclude_break_id is not None:
        query = query.filter(BreakSchedule.id != exclude_break_id)

    return query.order_by(BreakSchedule.start_time, BreakSchedule.end_time).first()


def _ensure_no_term_break_overlap(
    db: Session,
    school_id: int,
    academic_year: Optional[str],
    semester: Optional[int],
    day_of_week,
    start_time,
    end_time,
    classroom_id: Optional[int] = None,
    *,
    exclude_break_id: Optional[int] = None,
):
    break_schedule = _build_break_overlap_query(
        db,
        school_id=school_id,
        academic_year=academic_year,
        semester=semester,
        day_of_week=day_of_week,
        start_time=start_time,
        end_time=end_time,
        classroom_id=classroom_id,
        exclude_break_id=exclude_break_id,
    )
    if not break_schedule:
        return

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=(
            f"Cannot assign a subject during school break "
            f"({break_schedule.start_time.strftime('%H:%M')}-{break_schedule.end_time.strftime('%H:%M')})"
        )
    )


def _ensure_break_schedule_has_no_subject_overlap(
    db: Session,
    school_id: int,
    academic_year: str,
    semester: int,
    day_of_week,
    start_time,
    end_time,
    classroom_id: Optional[int] = None,
):
    existing_schedule_query = _build_period_overlap_query(
        db,
        school_id=school_id,
        day_of_week=day_of_week,
        start_time=start_time,
        end_time=end_time,
        academic_year=academic_year,
        semester=semester,
    )

    if classroom_id is not None:
        existing_schedule_query = existing_schedule_query.filter(
            or_(
                SubjectSchedule.classroom_id.is_(None),
                SubjectSchedule.classroom_id == classroom_id,
            )
        )

    existing_schedule = existing_schedule_query.first()

    if not existing_schedule:
        return

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Break time overlaps with an existing scheduled subject"
    )


def _validate_break_within_operating_hours(
    db: Session,
    school_id: int,
    day_of_week,
    start_time,
    end_time,
):
    day_window = _get_day_schedule_window(
        db,
        school_id=school_id,
        day_of_week=day_of_week,
    )

    if not day_window:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No operating hours defined for day {day_of_week}"
        )

    if start_time < day_window["start_time"] or end_time > day_window["end_time"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Break schedule ({start_time}-{end_time}) must be within school operating hours "
                f"({day_window['start_time']}-{day_window['end_time']})"
            )
        )


def _validate_break_classroom_scope(
    db: Session,
    school_id: int,
    academic_year: Optional[str],
    semester: Optional[int],
    classroom_id: Optional[int],
) -> Optional[Classroom]:
    if classroom_id is None:
        return None

    classroom = db.query(Classroom).filter(
        Classroom.id == classroom_id,
        Classroom.school_id == school_id,
    ).first()
    if not classroom:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Classroom not found or not in your school",
        )

    if academic_year is not None and str(classroom.academic_year) != str(academic_year):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Break classroom must belong to the selected academic year",
        )

    if semester is not None and int(classroom.semester) != int(semester):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Break classroom must belong to the selected semester",
        )

    return classroom


def _resolve_student_classroom_ids(
    db: Session,
    student_id: int,
    school_id: int,
    academic_year: Optional[str] = None,
    semester: Optional[int] = None,
) -> List[int]:
    from models.classroom import Classroom as ClassroomModel, ClassroomStudent as ClassroomStudentModel

    query = db.query(
        ClassroomStudentModel.classroom_id,
        ClassroomStudentModel.is_active,
        ClassroomStudentModel.updated_at,
    ).join(
        ClassroomModel,
        ClassroomStudentModel.classroom_id == ClassroomModel.id,
    ).filter(
        ClassroomStudentModel.student_id == student_id,
        ClassroomModel.school_id == school_id,
    )

    if academic_year is not None:
        query = query.filter(ClassroomModel.academic_year == academic_year)
    if semester is not None:
        query = query.filter(ClassroomModel.semester == semester)

    rows = query.order_by(
        ClassroomStudentModel.is_active.desc(),
        ClassroomStudentModel.updated_at.desc(),
        ClassroomStudentModel.id.desc(),
    ).all()

    classroom_ids = []
    seen_ids = set()
    for classroom_id, _is_active, _updated_at in rows:
        if classroom_id in seen_ids:
            continue
        seen_ids.add(classroom_id)
        classroom_ids.append(classroom_id)

    return classroom_ids


def _build_student_schedule_responses(
    db: Session,
    student_id: int,
    school_id: int,
    academic_year: Optional[str] = None,
    semester: Optional[int] = None,
) -> List[StudentScheduleResponse]:
    from models.classroom_subject import ClassroomSubject as ClassroomSubjectModel

    classroom_ids = _resolve_student_classroom_ids(
        db,
        student_id=student_id,
        school_id=school_id,
        academic_year=academic_year,
        semester=semester,
    )

    direct_subject_query = db.query(SubjectStudent.subject_id).join(
        Subject,
        SubjectStudent.subject_id == Subject.id,
    ).filter(
        SubjectStudent.student_id == student_id,
        Subject.school_id == school_id,
    )
    if academic_year is not None:
        direct_subject_query = direct_subject_query.filter(Subject.academic_year == academic_year)
    if semester is not None:
        direct_subject_query = direct_subject_query.filter(Subject.semester == semester)
    direct_subject_ids = {row[0] for row in direct_subject_query.all()}

    classroom_subject_ids = set()
    if classroom_ids:
        classroom_subject_query = db.query(ClassroomSubjectModel.subject_id).join(
            Subject,
            ClassroomSubjectModel.subject_id == Subject.id,
        ).filter(
            ClassroomSubjectModel.classroom_id.in_(classroom_ids),
            Subject.school_id == school_id,
        )
        if academic_year is not None:
            classroom_subject_query = classroom_subject_query.filter(Subject.academic_year == academic_year)
        if semester is not None:
            classroom_subject_query = classroom_subject_query.filter(Subject.semester == semester)
        classroom_subject_ids = {row[0] for row in classroom_subject_query.all()}

    scheduled_classroom_subject_ids = set()
    if classroom_ids:
        scheduled_subject_query = db.query(SubjectSchedule.subject_id).join(
            Subject,
            SubjectSchedule.subject_id == Subject.id,
        ).filter(
            SubjectSchedule.classroom_id.in_(classroom_ids),
            Subject.school_id == school_id,
        )
        if academic_year is not None:
            scheduled_subject_query = scheduled_subject_query.filter(Subject.academic_year == academic_year)
        if semester is not None:
            scheduled_subject_query = scheduled_subject_query.filter(Subject.semester == semester)
        scheduled_classroom_subject_ids = {row[0] for row in scheduled_subject_query.distinct().all()}

    subject_ids = list(direct_subject_ids | classroom_subject_ids | scheduled_classroom_subject_ids)
    result = []

    if subject_ids:
        schedule_query = db.query(SubjectSchedule).options(
            joinedload(SubjectSchedule.subject),
            joinedload(SubjectSchedule.schedule_slot),
            joinedload(SubjectSchedule.teacher),
            joinedload(SubjectSchedule.classroom),
        ).join(
            Subject,
            SubjectSchedule.subject_id == Subject.id,
        ).filter(
            SubjectSchedule.subject_id.in_(subject_ids),
            Subject.school_id == school_id,
        )

        if academic_year is not None:
            schedule_query = schedule_query.filter(Subject.academic_year == academic_year)
        if semester is not None:
            schedule_query = schedule_query.filter(Subject.semester == semester)

        if classroom_ids:
            schedule_query = schedule_query.filter(
                or_(
                    SubjectSchedule.classroom_id.is_(None),
                    SubjectSchedule.classroom_id.in_(classroom_ids),
                )
            )
        else:
            schedule_query = schedule_query.filter(SubjectSchedule.classroom_id.is_(None))

        schedules = schedule_query.all()

        for schedule in schedules:
            teacher_name = None
            if schedule.teacher is not None:
                teacher_name = getattr(schedule.teacher, 'full_name', None) or getattr(schedule.teacher, 'username', None)

            day_of_week = schedule.day_of_week or (schedule.schedule_slot.day_of_week if schedule.schedule_slot else None)
            start_time = schedule.start_time or (schedule.schedule_slot.start_time if schedule.schedule_slot else None)
            end_time = schedule.end_time or (schedule.schedule_slot.end_time if schedule.schedule_slot else None)

            result.append(StudentScheduleResponse(
                id=schedule.id,
                subject_id=schedule.subject_id,
                subject_name=schedule.subject.name if schedule.subject else None,
                subject_code=schedule.subject.code if schedule.subject else None,
                teacher_name=teacher_name,
                day_of_week=str(day_of_week) if day_of_week is not None else None,
                start_time=start_time,
                end_time=end_time,
                note=None,
                is_break=False,
                scope_label=None,
            ))

    break_query = db.query(BreakSchedule).filter(BreakSchedule.school_id == school_id)
    if academic_year is not None:
        break_query = break_query.filter(BreakSchedule.academic_year == academic_year)
    if semester is not None:
        break_query = break_query.filter(BreakSchedule.semester == semester)
    if classroom_ids:
        break_query = break_query.filter(
            or_(
                BreakSchedule.classroom_id.is_(None),
                BreakSchedule.classroom_id.in_(classroom_ids),
            )
        )
    else:
        break_query = break_query.filter(BreakSchedule.classroom_id.is_(None))

    for break_schedule in break_query.all():
        result.append(_build_student_break_schedule_response(break_schedule))

    def sort_key(item: StudentScheduleResponse):
        try:
            day_value = int(item.day_of_week) if item.day_of_week is not None else 99
        except (TypeError, ValueError):
            day_value = 99
        return (day_value, str(item.start_time or ''))

    result.sort(key=sort_key)
    return result


@router.get("/tracking/admin", response_model=List[DailySubjectTrackingResponse])
def get_admin_daily_tracking(
    tracking_date: date = Query(..., alias="date"),
    academic_year: Optional[str] = Query(None),
    semester: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can access tracking management",
        )

    holiday = _get_school_holiday(db, current_user.school_id, tracking_date)
    if holiday is not None:
        return [
            _build_holiday_tracking_response(
                holiday,
                tracking_date,
                academic_year=academic_year,
                semester=semester,
                can_edit=True,
            )
        ]

    schedules = _get_admin_tracking_schedules(
        db,
        school_id=current_user.school_id,
        tracking_date=tracking_date,
        academic_year=academic_year,
        semester=semester,
    )
    break_schedules = _get_tracking_break_schedules(
        db,
        school_id=current_user.school_id,
        tracking_date=tracking_date,
        academic_year=academic_year,
        semester=semester,
    )

    items = _build_daily_tracking_list(
        db,
        schedules,
        current_user.school_id,
        tracking_date,
        can_edit=True,
    )
    items.extend(
        _build_daily_break_tracking_list(
            db,
            break_schedules,
            current_user.school_id,
            tracking_date,
            can_edit=True,
        )
    )
    items.sort(key=lambda item: (item.classroom_name or '', str(item.scheduled_start_time or ''), item.subject_name or ''))
    return items


@router.put("/tracking/bulk", response_model=List[DailySubjectTrackingResponse])
def bulk_upsert_admin_daily_tracking(
    payload: DailySubjectTrackingBulkUpsert,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can update daily tracking",
        )

    if not payload.updates:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one tracking update is required",
        )

    for update in payload.updates:
        if update.subject_schedule_id is None and update.break_schedule_id is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Each bulk tracking update must target a subject schedule or a break schedule",
            )
        if update.subject_schedule_id is not None and update.break_schedule_id is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Each bulk tracking update can target only one schedule item",
            )

    deduplicated_schedule_ids = list(dict.fromkeys(
        update.subject_schedule_id for update in payload.updates if update.subject_schedule_id is not None
    ))
    deduplicated_break_ids = list(dict.fromkeys(
        update.break_schedule_id for update in payload.updates if update.break_schedule_id is not None
    ))

    schedules = _get_admin_tracking_schedule_by_ids(db, current_user.school_id, deduplicated_schedule_ids)
    schedule_map = {schedule.id: schedule for schedule in schedules}
    break_schedules = _get_admin_break_schedule_by_ids(db, current_user.school_id, deduplicated_break_ids)
    break_schedule_map = {break_schedule.id: break_schedule for break_schedule in break_schedules}

    missing_schedule_ids = [schedule_id for schedule_id in deduplicated_schedule_ids if schedule_id not in schedule_map]
    if missing_schedule_ids:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Scheduled subject not found: {missing_schedule_ids[0]}",
        )

    missing_break_ids = [break_id for break_id in deduplicated_break_ids if break_id not in break_schedule_map]
    if missing_break_ids:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Break schedule not found: {missing_break_ids[0]}",
        )

    responses = []
    for update in payload.updates:
        resolved_tracking_date = update.tracking_date or payload.tracking_date
        if resolved_tracking_date is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="tracking_date is required for each bulk tracking update",
            )

        _ensure_not_school_holiday(db, current_user.school_id, resolved_tracking_date)

        normalized_update = DailySubjectTrackingUpsert(
            tracking_date=resolved_tracking_date,
            actual_start_time=update.actual_start_time,
            actual_end_time=update.actual_end_time,
            is_skipped=update.is_skipped,
            note=update.note,
        )

        _validate_tracking_payload(normalized_update)
        if update.break_schedule_id is not None:
            responses.append(
                _upsert_tracking_row_for_break_schedule(
                    db,
                    break_schedule_map[update.break_schedule_id],
                    current_user.school_id,
                    current_user.id,
                    normalized_update,
                )
            )
        else:
            responses.append(
                _upsert_tracking_row_for_schedule(
                    db,
                    schedule_map[update.subject_schedule_id],
                    current_user.school_id,
                    current_user.id,
                    normalized_update,
                )
            )

    db.commit()
    responses.sort(key=lambda item: (item.classroom_name or '', str(item.scheduled_start_time or ''), item.subject_name or ''))
    return responses


@router.put("/tracking/{subject_schedule_id}", response_model=DailySubjectTrackingResponse)
def upsert_admin_daily_tracking(
    subject_schedule_id: int,
    payload: DailySubjectTrackingUpsert,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can update daily tracking",
        )

    _validate_tracking_payload(payload)
    _ensure_not_school_holiday(db, current_user.school_id, payload.tracking_date)

    schedule = _get_admin_tracking_schedule_by_ids(
        db,
        current_user.school_id,
        [subject_schedule_id],
    )
    schedule = schedule[0] if schedule else None

    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scheduled subject not found",
        )

    response = _upsert_tracking_row_for_schedule(
        db,
        schedule,
        current_user.school_id,
        current_user.id,
        payload,
    )
    db.commit()

    return response


@router.get("/tracking/teacher", response_model=List[DailySubjectTrackingResponse])
def get_teacher_daily_tracking(
    tracking_date: date = Query(..., alias="date"),
    academic_year: Optional[str] = Query(None),
    semester: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "teacher":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers can access this endpoint",
        )

    holiday = _get_school_holiday(db, current_user.school_id, tracking_date)
    if holiday is not None:
        return [
            _build_holiday_tracking_response(
                holiday,
                tracking_date,
                academic_year=academic_year,
                semester=semester,
                can_edit=False,
            )
        ]

    schedules = _get_teacher_tracking_schedules(
        db,
        teacher_id=current_user.id,
        school_id=current_user.school_id,
        tracking_date=tracking_date,
        academic_year=academic_year,
        semester=semester,
    )
    teacher_classroom_ids = sorted({
        schedule.classroom_id for schedule in schedules if schedule.classroom_id is not None
    })
    break_schedules = _get_tracking_break_schedules(
        db,
        school_id=current_user.school_id,
        tracking_date=tracking_date,
        academic_year=academic_year,
        semester=semester,
        classroom_ids=teacher_classroom_ids,
        global_only_when_no_classrooms=True,
    )
    break_schedules = _filter_teacher_actual_break_schedules(schedules, break_schedules)

    items = _build_daily_tracking_list(
        db,
        schedules,
        current_user.school_id,
        tracking_date,
        can_edit=False,
    )
    items.extend(
        _build_daily_break_tracking_list(
            db,
            break_schedules,
            current_user.school_id,
            tracking_date,
            can_edit=False,
        )
    )
    items.sort(key=lambda item: (item.classroom_name or '', str(item.scheduled_start_time or ''), item.subject_name or ''))
    return items


@router.get("/tracking/student", response_model=List[DailySubjectTrackingResponse])
def get_student_daily_tracking(
    tracking_date: date = Query(..., alias="date"),
    academic_year: Optional[str] = Query(None),
    semester: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students can access this endpoint",
        )

    holiday = _get_school_holiday(db, current_user.school_id, tracking_date)
    if holiday is not None:
        return [
            _build_holiday_tracking_response(
                holiday,
                tracking_date,
                academic_year=academic_year,
                semester=semester,
                can_edit=False,
            )
        ]

    schedules = _get_student_tracking_schedules(
        db,
        student_id=current_user.id,
        school_id=current_user.school_id,
        tracking_date=tracking_date,
        academic_year=academic_year,
        semester=semester,
    )
    classroom_ids = _resolve_student_classroom_ids(
        db,
        student_id=current_user.id,
        school_id=current_user.school_id,
        academic_year=academic_year,
        semester=semester,
    )
    break_schedules = _get_tracking_break_schedules(
        db,
        school_id=current_user.school_id,
        tracking_date=tracking_date,
        academic_year=academic_year,
        semester=semester,
        classroom_ids=classroom_ids,
        global_only_when_no_classrooms=True,
    )

    items = _build_daily_tracking_list(
        db,
        schedules,
        current_user.school_id,
        tracking_date,
        can_edit=False,
    )
    items.extend(
        _build_daily_break_tracking_list(
            db,
            break_schedules,
            current_user.school_id,
            tracking_date,
            can_edit=False,
        )
    )
    items.sort(key=lambda item: (item.classroom_name or '', str(item.scheduled_start_time or ''), item.subject_name or ''))
    return items

# Admin endpoints - Create, Read, Update, Delete schedule slots
@router.post("/slots", response_model=ScheduleSlotSchema)
def create_schedule_slot(
    schedule_slot: ScheduleSlotCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify user is admin
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can create schedule slots"
        )
    
    # Check for time conflicts
    dow = str(schedule_slot.day_of_week)
    existing_slot = db.query(ScheduleSlot).filter(
        ScheduleSlot.school_id == current_user.school_id,
        ScheduleSlot.day_of_week == dow,
        ScheduleSlot.start_time < schedule_slot.end_time,
        ScheduleSlot.end_time > schedule_slot.start_time
    ).first()
    
    if existing_slot:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Time slot conflicts with existing schedule"
        )

    if schedule_slot.is_break:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Breaks must be created from the schedule assignments flow"
        )
    
    slot_data = schedule_slot.dict()
    slot_data['day_of_week'] = str(slot_data.get('day_of_week'))
    slot_data['is_break'] = False
    db_schedule_slot = ScheduleSlot(
        **slot_data,
        school_id=current_user.school_id,
        created_by=current_user.id
    )
    db.add(db_schedule_slot)
    db.commit()
    db.refresh(db_schedule_slot)
    return db_schedule_slot

@router.get("/slots", response_model=List[ScheduleSlotSchema])
def get_schedule_slots(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    slots = db.query(ScheduleSlot).filter(
        ScheduleSlot.school_id == current_user.school_id,
        ScheduleSlot.is_break == False,
    ).order_by(ScheduleSlot.day_of_week, ScheduleSlot.start_time).all()
    return slots

@router.put("/slots/{slot_id}", response_model=ScheduleSlotSchema)
def update_schedule_slot(
    slot_id: int,
    schedule_slot: ScheduleSlotUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can update schedule slots"
        )
    
    db_slot = db.query(ScheduleSlot).filter(
        ScheduleSlot.id == slot_id,
        ScheduleSlot.school_id == current_user.school_id
    ).first()
    
    if not db_slot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Schedule slot not found"
        )
    
    # Check for time conflicts (excluding current slot)
    existing_slot = db.query(ScheduleSlot).filter(
        ScheduleSlot.school_id == current_user.school_id,
        ScheduleSlot.id != slot_id,
        ScheduleSlot.day_of_week == str(schedule_slot.day_of_week),
        ScheduleSlot.start_time < schedule_slot.end_time,
        ScheduleSlot.end_time > schedule_slot.start_time
    ).first()
    
    if existing_slot:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Time slot conflicts with existing schedule"
        )

    if schedule_slot.is_break:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Breaks must be created from the schedule assignments flow"
        )
    
    for key, value in schedule_slot.dict().items():
        if key == 'day_of_week':
            value = str(value)
        if key == 'is_break':
            value = False
        setattr(db_slot, key, value)
    
    db.commit()
    db.refresh(db_slot)
    return db_slot

@router.delete("/slots/{slot_id}")
def delete_schedule_slot(
    slot_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can delete schedule slots"
        )
    
    db_slot = db.query(ScheduleSlot).filter(
        ScheduleSlot.id == slot_id,
        ScheduleSlot.school_id == current_user.school_id
    ).first()
    
    if not db_slot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Schedule slot not found"
        )
    
    db.delete(db_slot)
    db.commit()
    return {"message": "Schedule slot deleted successfully"}

# Teacher endpoints - Assign subjects to schedule slots
@router.post("/assign", response_model=SubjectScheduleSchema)
def assign_subject_to_schedule(
    assignment: SubjectScheduleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "teacher":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers can assign subjects to schedule"
        )
    
    # Validate subject_id is not null and exists
    if not assignment.subject_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Subject ID is required"
        )
    
    # Verify the subject belongs to the teacher (legacy teacher_id OR subject_teachers)
    subject = db.query(Subject).filter(Subject.id == assignment.subject_id).first()
    if not subject:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subject not found"
        )
    
    is_authorized = False
    if subject.teacher_id == current_user.id:
        is_authorized = True
    else:
        from models.schedule import SubjectSchedule
        if db.query(SubjectSchedule).filter_by(subject_id=subject.id, teacher_id=current_user.id).first():
            is_authorized = True
            
    if not is_authorized:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subject not assigned to you"
        )
    
    # Validate time slot is within school operating hours
    if assignment.schedule_slot_id:
        # If schedule_slot_id is provided, validate against it
        schedule_slot = db.query(ScheduleSlot).filter(
            ScheduleSlot.id == assignment.schedule_slot_id,
            ScheduleSlot.school_id == current_user.school_id
        ).first()
        
        if not schedule_slot:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Schedule slot not found"
            )

        if schedule_slot.is_break:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot assign a subject directly to a school break"
            )
        
        # Check if the subject time fits within the operating hours
        if (assignment.start_time < schedule_slot.start_time or 
            assignment.end_time > schedule_slot.end_time or
            str(assignment.day_of_week) != str(schedule_slot.day_of_week)):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Subject schedule must be within school operating hours"
            )
    else:
        # If no schedule_slot_id, validate against the day's non-break teaching window.
        day_window = _get_day_schedule_window(
            db,
            school_id=current_user.school_id,
            day_of_week=assignment.day_of_week,
        )

        if not day_window:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"No operating hours defined for day {assignment.day_of_week}"
            )
        
        # Check if the subject time fits within the operating hours
        if (assignment.start_time < day_window["start_time"] or 
            assignment.end_time > day_window["end_time"]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Subject schedule ({assignment.start_time}-{assignment.end_time}) "
                    f"must be within school operating hours ({day_window['start_time']}-{day_window['end_time']})"
                )
            )

        schedule_slot = None

    _ensure_no_term_break_overlap(
        db,
        school_id=current_user.school_id,
        academic_year=subject.academic_year,
        semester=subject.semester,
        day_of_week=assignment.day_of_week,
        start_time=assignment.start_time,
        end_time=assignment.end_time,
        classroom_id=assignment.classroom_id,
    )
    
    # Check for time conflicts with other subjects on the same day
    # Same teacher cannot have overlapping schedules at the same time (even across different classrooms)
    existing_schedule = _build_period_overlap_query(
        db,
        school_id=current_user.school_id,
        day_of_week=assignment.day_of_week,
        start_time=assignment.start_time,
        end_time=assignment.end_time,
        academic_year=subject.academic_year,
        semester=subject.semester,
    ).filter(
        SubjectSchedule.teacher_id == current_user.id
    ).first()
    
    if existing_schedule:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Teacher cannot have overlapping schedules at the same time"
        )
    
    # Check if same time slot has a subject in the same classroom already (only one subject per timeslot per classroom)
    if assignment.classroom_id:
        existing_subject_in_classroom = _build_period_overlap_query(
            db,
            school_id=current_user.school_id,
            day_of_week=assignment.day_of_week,
            start_time=assignment.start_time,
            end_time=assignment.end_time,
            academic_year=subject.academic_year,
            semester=subject.semester,
        ).filter(
            SubjectSchedule.classroom_id == assignment.classroom_id
        ).first()
        
        if existing_subject_in_classroom:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This classroom already has a subject scheduled at this time"
            )
    
    try:
        # Determine schedule_slot_id - use provided one or find appropriate one
        final_schedule_slot_id = assignment.schedule_slot_id
        if not final_schedule_slot_id and schedule_slot:
            final_schedule_slot_id = schedule_slot.id
        
        # If classroom_id is provided, validate teacher teaches that classroom
        if assignment.classroom_id:
            from models.classroom import Classroom
            classroom = db.query(Classroom).filter(
                Classroom.id == assignment.classroom_id,
                Classroom.school_id == current_user.school_id
            ).first()
            
            if not classroom:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Classroom not found or not in your school"
                )
        
        db_assignment = SubjectSchedule(
            subject_id=assignment.subject_id,
            schedule_slot_id=final_schedule_slot_id,  # Can be None for custom schedules
            teacher_id=current_user.id,
            classroom_id=assignment.classroom_id,  # Optional: specific classroom only
            day_of_week=str(assignment.day_of_week),
            start_time=assignment.start_time,
            end_time=assignment.end_time
        )
        db.add(db_assignment)
        db.commit()
        db.refresh(db_assignment)
        
        return _build_subject_schedule_response(db_assignment, teacher_name_override=current_user.full_name)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create schedule assignment: {str(e)}"
        )


@router.get("/teacher", response_model=List[SubjectScheduleSchema])
def get_teacher_schedules(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    academic_year: Optional[str] = Query(None),
    semester: Optional[int] = Query(None),
    tracking_date: Optional[date] = Query(None, alias="date"),
):
    if current_user.role != "teacher":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers can access this endpoint"
        )

    query = db.query(SubjectSchedule).options(
        joinedload(SubjectSchedule.subject),
        joinedload(SubjectSchedule.schedule_slot),
        joinedload(SubjectSchedule.classroom)
    ).join(SubjectSchedule.subject).filter(
        SubjectSchedule.teacher_id == current_user.id
    )
    if academic_year:
        query = query.filter(Subject.academic_year == academic_year)
    if semester is not None:
        query = query.filter(Subject.semester == semester)

    teacher_subject_schedules = query.all()
    schedules = [
        _build_subject_schedule_response(schedule, teacher_name_override=current_user.full_name)
        for schedule in teacher_subject_schedules
    ]

    teacher_classroom_ids = sorted({
        schedule.classroom_id for schedule in teacher_subject_schedules if schedule.classroom_id is not None
    })

    break_query = db.query(BreakSchedule).options(
        joinedload(BreakSchedule.classroom)
    ).filter(BreakSchedule.school_id == current_user.school_id)
    if academic_year:
        break_query = break_query.filter(BreakSchedule.academic_year == academic_year)
    if semester is not None:
        break_query = break_query.filter(BreakSchedule.semester == semester)
    if teacher_classroom_ids:
        break_query = break_query.filter(
            or_(
                BreakSchedule.classroom_id.is_(None),
                BreakSchedule.classroom_id.in_(teacher_classroom_ids),
            )
        )
    else:
        break_query = break_query.filter(BreakSchedule.classroom_id.is_(None))

    if tracking_date is not None:
        target_day = _date_to_schedule_day(tracking_date)
        day_teacher_schedules = [
            schedule for schedule in teacher_subject_schedules
            if _get_schedule_day_value(schedule) == target_day
        ]

        raw_break_schedules = break_query.all()
        day_break_schedules = _filter_teacher_actual_break_schedules(
            day_teacher_schedules,
            [break_schedule for break_schedule in raw_break_schedules if str(break_schedule.day_of_week) == target_day],
        )
        break_schedules_to_render = [
            break_schedule for break_schedule in raw_break_schedules
            if str(break_schedule.day_of_week) != target_day
        ] + day_break_schedules
        schedules.extend(_build_break_schedule_response(break_schedule) for break_schedule in break_schedules_to_render)

        free_period_slots = db.query(ScheduleSlot).filter(
            ScheduleSlot.school_id == current_user.school_id,
            ScheduleSlot.is_break == False,
            ScheduleSlot.day_of_week == target_day,
        ).order_by(ScheduleSlot.start_time, ScheduleSlot.end_time).all()

        for slot in free_period_slots:
            is_occupied_by_schedule = any(
                _time_ranges_overlap(
                    slot.start_time,
                    slot.end_time,
                    _get_schedule_start_time(schedule),
                    _get_schedule_end_time(schedule),
                )
                for schedule in day_teacher_schedules
            )
            is_occupied_by_break = any(
                _time_ranges_overlap(
                    slot.start_time,
                    slot.end_time,
                    break_schedule.start_time,
                    break_schedule.end_time,
                )
                for break_schedule in day_break_schedules
            )
            if is_occupied_by_schedule or is_occupied_by_break:
                continue

            schedules.append(
                _build_free_period_schedule_response(
                    slot,
                    academic_year=academic_year,
                    semester=semester,
                )
            )
    else:
        schedules.extend(_build_break_schedule_response(break_schedule) for break_schedule in break_query.all())

    schedules.sort(key=lambda item: (int(item.day_of_week) if str(item.day_of_week).isdigit() else 99, str(item.start_time or '')))
    return schedules


@router.get('/student', response_model=List[StudentScheduleResponse])
def get_student_schedule_current(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    academic_year: Optional[str] = Query(None),
    semester: Optional[int] = Query(None)
):
    """Return schedule entries for the currently authenticated student."""
    if current_user.role != 'student':
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Only students can access this endpoint')

    return _build_student_schedule_responses(
        db,
        student_id=current_user.id,
        school_id=current_user.school_id,
        academic_year=academic_year,
        semester=semester,
    )

@router.put("/assign/{assignment_id}", response_model=SubjectScheduleSchema)
def update_subject_schedule(
    assignment_id: int,
    assignment: SubjectScheduleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Allow teachers to edit their own assignments, or admins to edit assignments in their school
    if current_user.role not in ("teacher", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers or admins can update schedule assignments"
        )
    
    if current_user.role == 'teacher':
        db_assignment = db.query(SubjectSchedule).filter(
            SubjectSchedule.id == assignment_id,
            SubjectSchedule.teacher_id == current_user.id
        ).first()
    else:
        # admin: load assignment by id, ensure it belongs to the admin's school
        db_assignment = db.query(SubjectSchedule).join(Subject).filter(
            SubjectSchedule.id == assignment_id,
            Subject.school_id == current_user.school_id
        ).first()
    
    if not db_assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Schedule assignment not found"
        )
    
    # Validate subject_id is not null and exists
    if not assignment.subject_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Subject ID is required"
        )
    
    # Verify the subject belongs to the teacher when current_user is teacher,
    # or belongs to the same school when current_user is admin
    if current_user.role == 'teacher':
        subject = db.query(Subject).filter(
            Subject.id == assignment.subject_id,
            Subject.teacher_id == current_user.id
        ).first()
        if not subject:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Subject not found or not assigned to you"
            )
    else:
        subject = db.query(Subject).filter(
            Subject.id == assignment.subject_id,
            Subject.school_id == current_user.school_id
        ).first()
        if not subject:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Subject not found in your school"
            )
    
    # Validate time slot is within school operating hours
    if assignment.schedule_slot_id:
        schedule_slot = db.query(ScheduleSlot).filter(
            ScheduleSlot.id == assignment.schedule_slot_id,
            ScheduleSlot.school_id == current_user.school_id
        ).first()
        
        if not schedule_slot:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Schedule slot not found"
            )

        if schedule_slot.is_break:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot assign a subject directly to a school break"
            )
        
        if (assignment.start_time < schedule_slot.start_time or 
            assignment.end_time > schedule_slot.end_time or
            str(assignment.day_of_week) != str(schedule_slot.day_of_week)):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Subject schedule must be within school operating hours"
            )
    else:
        day_window = _get_day_schedule_window(
            db,
            school_id=current_user.school_id,
            day_of_week=assignment.day_of_week,
        )

        if not day_window:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"No operating hours defined for day {assignment.day_of_week}"
            )
        
        if (assignment.start_time < day_window["start_time"] or 
            assignment.end_time > day_window["end_time"]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Subject schedule ({assignment.start_time}-{assignment.end_time}) "
                    f"must be within school operating hours ({day_window['start_time']}-{day_window['end_time']})"
                )
            )

        schedule_slot = None

    _ensure_no_term_break_overlap(
        db,
        school_id=current_user.school_id,
        academic_year=subject.academic_year,
        semester=subject.semester,
        day_of_week=assignment.day_of_week,
        start_time=assignment.start_time,
        end_time=assignment.end_time,
        classroom_id=assignment.classroom_id,
    )
    
    # Check for time conflicts with other subjects on the same day (excluding current assignment)
    # Same teacher cannot have overlapping schedules at the same time (even across different classrooms)
    existing_schedule = _build_period_overlap_query(
        db,
        school_id=current_user.school_id,
        day_of_week=assignment.day_of_week,
        start_time=assignment.start_time,
        end_time=assignment.end_time,
        academic_year=subject.academic_year,
        semester=subject.semester,
    ).filter(
        SubjectSchedule.id != assignment_id,
        SubjectSchedule.teacher_id == db_assignment.teacher_id,
    ).first()
    
    if existing_schedule:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Teacher cannot have overlapping schedules at the same time"
        )
    
    # Check if same time slot has a subject in the same classroom already (only one subject per timeslot per classroom)
    if assignment.classroom_id:
        existing_subject_in_classroom = _build_period_overlap_query(
            db,
            school_id=current_user.school_id,
            day_of_week=assignment.day_of_week,
            start_time=assignment.start_time,
            end_time=assignment.end_time,
            academic_year=subject.academic_year,
            semester=subject.semester,
        ).filter(
            SubjectSchedule.id != assignment_id,
            SubjectSchedule.classroom_id == assignment.classroom_id,
        ).first()
        
        if existing_subject_in_classroom:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This classroom already has a subject scheduled at this time"
            )
    
    try:
        # If classroom_id is provided, validate teacher teaches that classroom
        if assignment.classroom_id:
            from models.classroom import Classroom
            classroom = db.query(Classroom).filter(
                Classroom.id == assignment.classroom_id,
                Classroom.school_id == current_user.school_id
            ).first()
            
            if not classroom:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Classroom not found or not in your school"
                )
        
        # Update assignment fields
        db_assignment.subject_id = assignment.subject_id
        db_assignment.schedule_slot_id = assignment.schedule_slot_id
        db_assignment.classroom_id = assignment.classroom_id
        db_assignment.day_of_week = str(assignment.day_of_week)
        db_assignment.start_time = assignment.start_time
        db_assignment.end_time = assignment.end_time
        
        db.commit()
        db.refresh(db_assignment)
        
        return _build_subject_schedule_response(db_assignment)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update schedule assignment: {str(e)}"
        )

@router.delete("/assign/{assignment_id}")
def delete_subject_schedule(
    assignment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Allow teachers to delete their own assignments or admins to delete assignments in their school
    if current_user.role not in ("teacher", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers or admins can delete schedule assignments"
        )
    
    if current_user.role == 'teacher':
        db_assignment = db.query(SubjectSchedule).filter(
            SubjectSchedule.id == assignment_id,
            SubjectSchedule.teacher_id == current_user.id
        ).first()
    else:
        # admin: delete any assignment that belongs to the admin's school
        db_assignment = db.query(SubjectSchedule).join(Subject).filter(
            SubjectSchedule.id == assignment_id,
            Subject.school_id == current_user.school_id
        ).first()
    
    if not db_assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Schedule assignment not found"
        )
    
    db.delete(db_assignment)
    db.commit()
    return {"message": "Schedule assignment deleted successfully"}

@router.get("/assignments", response_model=List[SubjectScheduleSchema])
def get_school_assignments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    academic_year: Optional[str] = Query(None),
    semester: Optional[int] = Query(None)
):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can access school assignments"
        )

    query = db.query(SubjectSchedule).options(
        joinedload(SubjectSchedule.subject),
        joinedload(SubjectSchedule.schedule_slot),
        joinedload(SubjectSchedule.teacher)
    ).join(SubjectSchedule.subject).filter(
        Subject.school_id == current_user.school_id
    )
    if academic_year:
        query = query.filter(Subject.academic_year == academic_year)
    if semester is not None:
        query = query.filter(Subject.semester == semester)

    schedules = [_build_subject_schedule_response(schedule) for schedule in query.all()]

    break_query = db.query(BreakSchedule).options(
        joinedload(BreakSchedule.classroom)
    ).filter(BreakSchedule.school_id == current_user.school_id)
    if academic_year:
        break_query = break_query.filter(BreakSchedule.academic_year == academic_year)
    if semester is not None:
        break_query = break_query.filter(BreakSchedule.semester == semester)

    schedules.extend(_build_break_schedule_response(break_schedule) for break_schedule in break_query.all())
    schedules.sort(key=lambda item: (int(item.day_of_week) if str(item.day_of_week).isdigit() else 99, str(item.start_time or '')))
    return schedules

# Admin endpoints - Assign schedules to teachers and students
@router.post("/assign_admin", response_model=SubjectScheduleSchema)
def admin_assign_schedule_to_teacher(
    assignment: SubjectScheduleCreate,
    teacher_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Admin endpoint to assign a schedule to a teacher"""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can assign schedules"
        )
    
    # Verify teacher exists and belongs to same school
    teacher = db.query(User).filter(
        User.id == teacher_id,
        User.role == "teacher",
        User.school_id == current_user.school_id
    ).first()
    
    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Teacher not found or not in your school"
        )
    
    # Validate subject_id is not null and exists
    if not assignment.subject_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Subject ID is required"
        )
    
    # Verify the subject belongs to the teacher or is available to assign
    subject = db.query(Subject).filter(
        Subject.id == assignment.subject_id,
        Subject.school_id == current_user.school_id
    ).first()
    
    if not subject:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subject not found in your school"
        )

    if assignment.schedule_slot_id:
        schedule_slot = db.query(ScheduleSlot).filter(
            ScheduleSlot.id == assignment.schedule_slot_id,
            ScheduleSlot.school_id == current_user.school_id
        ).first()

        if not schedule_slot:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Schedule slot not found"
            )

        if schedule_slot.is_break:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot assign a subject directly to a school break"
            )

    _ensure_no_term_break_overlap(
        db,
        school_id=current_user.school_id,
        academic_year=subject.academic_year,
        semester=subject.semester,
        day_of_week=assignment.day_of_week,
        start_time=assignment.start_time,
        end_time=assignment.end_time,
        classroom_id=assignment.classroom_id,
    )
    
    # Check for time conflicts with other subjects on the same day
    # Same teacher cannot have overlapping schedules at the same time (even across different classrooms)
    existing_schedule = _build_period_overlap_query(
        db,
        school_id=current_user.school_id,
        day_of_week=assignment.day_of_week,
        start_time=assignment.start_time,
        end_time=assignment.end_time,
        academic_year=subject.academic_year,
        semester=subject.semester,
    ).filter(
        SubjectSchedule.teacher_id == teacher_id
    ).first()
    
    if existing_schedule:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Teacher cannot have overlapping schedules at the same time"
        )
    
    # Check if same time slot has a subject in the same classroom already (only one subject per timeslot per classroom)
    if assignment.classroom_id:
        existing_subject_in_classroom = _build_period_overlap_query(
            db,
            school_id=current_user.school_id,
            day_of_week=assignment.day_of_week,
            start_time=assignment.start_time,
            end_time=assignment.end_time,
            academic_year=subject.academic_year,
            semester=subject.semester,
        ).filter(
            SubjectSchedule.classroom_id == assignment.classroom_id
        ).first()
        
        if existing_subject_in_classroom:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This classroom already has a subject scheduled at this time"
            )
    
    try:
        # Determine schedule_slot_id if provided
        final_schedule_slot_id = assignment.schedule_slot_id
        
        # If classroom_id is provided, validate it exists
        if assignment.classroom_id:
            from models.classroom import Classroom
            classroom = db.query(Classroom).filter(
                Classroom.id == assignment.classroom_id,
                Classroom.school_id == current_user.school_id
            ).first()
            
            if not classroom:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Classroom not found or not in your school"
                )
        
        db_assignment = SubjectSchedule(
            subject_id=assignment.subject_id,
            schedule_slot_id=final_schedule_slot_id,
            teacher_id=teacher_id,  # Assign to specified teacher
            classroom_id=assignment.classroom_id,
            day_of_week=str(assignment.day_of_week),
            start_time=assignment.start_time,
            end_time=assignment.end_time
        )
        db.add(db_assignment)
        db.commit()
        db.refresh(db_assignment)
        
        return _build_subject_schedule_response(db_assignment)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to assign schedule: {str(e)}"
        )


@router.post("/breaks", response_model=BreakScheduleSchema, status_code=status.HTTP_201_CREATED)
def create_break_schedule(
    break_schedule: BreakScheduleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can create break schedules"
        )

    _validate_break_classroom_scope(
        db,
        school_id=current_user.school_id,
        academic_year=break_schedule.academic_year,
        semester=break_schedule.semester,
        classroom_id=break_schedule.classroom_id,
    )

    _validate_break_within_operating_hours(
        db,
        school_id=current_user.school_id,
        day_of_week=break_schedule.day_of_week,
        start_time=break_schedule.start_time,
        end_time=break_schedule.end_time,
    )
    _ensure_break_schedule_has_no_subject_overlap(
        db,
        school_id=current_user.school_id,
        academic_year=break_schedule.academic_year,
        semester=break_schedule.semester,
        day_of_week=break_schedule.day_of_week,
        start_time=break_schedule.start_time,
        end_time=break_schedule.end_time,
        classroom_id=break_schedule.classroom_id,
    )

    existing_break = _build_break_overlap_query(
        db,
        school_id=current_user.school_id,
        academic_year=break_schedule.academic_year,
        semester=break_schedule.semester,
        day_of_week=break_schedule.day_of_week,
        start_time=break_schedule.start_time,
        end_time=break_schedule.end_time,
        classroom_id=break_schedule.classroom_id,
    )
    if existing_break:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Break time conflicts with an existing break schedule"
        )

    payload = break_schedule.dict()
    payload['day_of_week'] = str(payload.get('day_of_week'))
    db_break_schedule = BreakSchedule(
        **payload,
        school_id=current_user.school_id,
        created_by=current_user.id,
    )
    db.add(db_break_schedule)
    db.commit()
    db.refresh(db_break_schedule)
    return _build_break_api_response(db_break_schedule)


@router.put("/breaks/{break_id}", response_model=BreakScheduleSchema)
def update_break_schedule(
    break_id: int,
    break_schedule: BreakScheduleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can update break schedules"
        )

    db_break_schedule = db.query(BreakSchedule).filter(
        BreakSchedule.id == break_id,
        BreakSchedule.school_id == current_user.school_id,
    ).first()
    if not db_break_schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Break schedule not found"
        )

    _validate_break_classroom_scope(
        db,
        school_id=current_user.school_id,
        academic_year=break_schedule.academic_year,
        semester=break_schedule.semester,
        classroom_id=break_schedule.classroom_id,
    )

    _validate_break_within_operating_hours(
        db,
        school_id=current_user.school_id,
        day_of_week=break_schedule.day_of_week,
        start_time=break_schedule.start_time,
        end_time=break_schedule.end_time,
    )
    _ensure_break_schedule_has_no_subject_overlap(
        db,
        school_id=current_user.school_id,
        academic_year=break_schedule.academic_year,
        semester=break_schedule.semester,
        day_of_week=break_schedule.day_of_week,
        start_time=break_schedule.start_time,
        end_time=break_schedule.end_time,
        classroom_id=break_schedule.classroom_id,
    )

    existing_break = _build_break_overlap_query(
        db,
        school_id=current_user.school_id,
        academic_year=break_schedule.academic_year,
        semester=break_schedule.semester,
        day_of_week=break_schedule.day_of_week,
        start_time=break_schedule.start_time,
        end_time=break_schedule.end_time,
        classroom_id=break_schedule.classroom_id,
        exclude_break_id=break_id,
    )
    if existing_break:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Break time conflicts with an existing break schedule"
        )

    for key, value in break_schedule.dict().items():
        if key == 'day_of_week':
            value = str(value)
        setattr(db_break_schedule, key, value)

    db.commit()
    db.refresh(db_break_schedule)
    return _build_break_api_response(db_break_schedule)


@router.delete("/breaks/{break_id}")
def delete_break_schedule(
    break_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can delete break schedules"
        )

    db_break_schedule = db.query(BreakSchedule).filter(
        BreakSchedule.id == break_id,
        BreakSchedule.school_id == current_user.school_id,
    ).first()
    if not db_break_schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Break schedule not found"
        )

    db.delete(db_break_schedule)
    db.commit()
    return {"message": "Break schedule deleted successfully"}

@router.post("/assign_student", response_model=dict)
def admin_assign_schedule_to_student(
    subject_id: int,
    student_id: int,
    classroom_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Admin endpoint to enroll a student in a subject (connects them to its schedule)"""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can assign student schedules"
        )
    
    # Verify student exists and belongs to same school
    student = db.query(User).filter(
        User.id == student_id,
        User.role == "student",
        User.school_id == current_user.school_id
    ).first()
    
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found or not in your school"
        )
    
    # Verify subject exists
    subject = db.query(Subject).filter(
        Subject.id == subject_id,
        Subject.school_id == current_user.school_id
    ).first()
    
    if not subject:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subject not found in your school"
        )
    
    # Verify classroom exists
    from models.classroom import Classroom
    classroom = db.query(Classroom).filter(
        Classroom.id == classroom_id,
        Classroom.school_id == current_user.school_id
    ).first()
    
    if not classroom:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Classroom not found or not in your school"
        )
    
    # Verify student is in the classroom
    from models.classroom import ClassroomStudent
    student_in_classroom = db.query(ClassroomStudent).filter(
        ClassroomStudent.student_id == student_id,
        ClassroomStudent.classroom_id == classroom_id,
        ClassroomStudent.is_active == True
    ).first()
    
    if not student_in_classroom:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Student is not enrolled in the specified classroom"
        )
    
    try:
        # Check if student is already enrolled in this subject
        from models.subject_student import SubjectStudent
        existing_enrollment = db.query(SubjectStudent).filter(
            SubjectStudent.student_id == student_id,
            SubjectStudent.subject_id == subject_id
        ).first()
        
        if existing_enrollment:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Student is already enrolled in this subject"
            )
        
        # Create subject-student enrollment
        enrollment = SubjectStudent(
            student_id=student_id,
            subject_id=subject_id
        )
        db.add(enrollment)
        db.commit()
        
        return {
            "message": "Student enrolled in subject successfully",
            "student_id": student_id,
            "subject_id": subject_id,
            "subject_name": subject.name,
            "student_name": student.full_name,
            "classroom_name": classroom.name
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to enroll student in subject: {str(e)}"
        )