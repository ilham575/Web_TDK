from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone

from database.connection import get_db
from routers.user import get_current_user
from models.user import User as UserModel
from models.semester_period import SemesterPeriod as SemesterPeriodModel
from models.subject import Subject as SubjectModel
from models.schedule import SubjectSchedule as SubjectScheduleModel
from schemas.semester_period import SemesterPeriodCreate, SemesterPeriodUpdate, SemesterPeriodResponse

router = APIRouter(prefix="/semester-periods", tags=["semester_periods"])


def require_admin(current_user: UserModel = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="เฉพาะแอดมินเท่านั้น")
    return current_user


# ============================================================
# Core auto-close / re-open logic (reused by scheduler & API)
# ============================================================

def auto_close_subjects_for_period(period: SemesterPeriodModel, db: Session) -> int:
    """Mark all subject-teacher schedules for this period as ended. Returns count closed."""
    subjects = db.query(SubjectModel).filter(
        SubjectModel.school_id == period.school_id,
        SubjectModel.academic_year == period.academic_year,
        SubjectModel.semester == period.semester,
    ).all()

    closed = 0
    for subject in subjects:
        schedules = db.query(SubjectScheduleModel).filter(
            SubjectScheduleModel.subject_id == subject.id,
            SubjectScheduleModel.is_ended == False,
        ).all()
        for sched in schedules:
            sched.is_ended = True
            closed += 1
        # Also mark subject itself
        if not subject.is_ended:
            subject.is_ended = True
            closed += 1

    period.is_auto_closed = True
    db.commit()
    return closed


def reopen_subjects_for_period(period: SemesterPeriodModel, db: Session) -> int:
    """Re-open all auto-closed subjects for this period. Returns count reopened."""
    subjects = db.query(SubjectModel).filter(
        SubjectModel.school_id == period.school_id,
        SubjectModel.academic_year == period.academic_year,
        SubjectModel.semester == period.semester,
    ).all()

    reopened = 0
    for subject in subjects:
        schedules = db.query(SubjectScheduleModel).filter(
            SubjectScheduleModel.subject_id == subject.id,
            SubjectScheduleModel.is_ended == True,
        ).all()
        for sched in schedules:
            sched.is_ended = False
            reopened += 1
        if subject.is_ended:
            subject.is_ended = False
            reopened += 1

    period.is_auto_closed = False
    db.commit()
    return reopened


def run_auto_close_check(db: Session):
    """
    Called by the background scheduler (and on startup).
    Checks all SemesterPeriods:
      - If end_date has passed and not yet closed → auto-close
      - If end_date is in the future and was previously auto-closed → re-open
    """
    now = datetime.now(timezone.utc)
    periods = db.query(SemesterPeriodModel).filter(
        SemesterPeriodModel.end_date.isnot(None)
    ).all()

    for period in periods:
        end = period.end_date
        # Ensure timezone-aware comparison
        if end.tzinfo is None:
            end = end.replace(tzinfo=timezone.utc)

        if now >= end and not period.is_auto_closed:
            n = auto_close_subjects_for_period(period, db)
            print(f"[AutoClose] Period {period.id} (school={period.school_id} {period.academic_year}/sem{period.semester}): closed {n} items")
        elif now < end and period.is_auto_closed:
            # Period was extended → re-open
            n = reopen_subjects_for_period(period, db)
            print(f"[AutoClose] Period {period.id} extended, re-opened {n} items")


# ============================================================
# Endpoints
# ============================================================

@router.get("", response_model=List[SemesterPeriodResponse])
@router.get("/", response_model=List[SemesterPeriodResponse])
def list_periods(
    school_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    q = db.query(SemesterPeriodModel)
    if school_id:
        q = q.filter(SemesterPeriodModel.school_id == school_id)
    elif current_user.role == "admin" and current_user.school_id:
        q = q.filter(SemesterPeriodModel.school_id == current_user.school_id)
    return q.order_by(SemesterPeriodModel.academic_year.desc(), SemesterPeriodModel.semester).all()


@router.post("", response_model=SemesterPeriodResponse)
@router.post("/", response_model=SemesterPeriodResponse)
def upsert_period(
    data: SemesterPeriodCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_admin),
):
    existing = db.query(SemesterPeriodModel).filter(
        SemesterPeriodModel.school_id == data.school_id,
        SemesterPeriodModel.academic_year == data.academic_year,
        SemesterPeriodModel.semester == data.semester,
    ).first()

    if existing:
        old_end = existing.end_date
        existing.start_date = data.start_date
        existing.end_date = data.end_date
        db.commit()
        db.refresh(existing)
        # If end_date changed, re-run auto-close check immediately
        _check_single_period(existing, old_end, db)
        return existing

    period = SemesterPeriodModel(**data.dict())
    db.add(period)
    db.commit()
    db.refresh(period)
    return period


@router.patch("/{period_id}", response_model=SemesterPeriodResponse)
def update_period(
    period_id: int,
    data: SemesterPeriodUpdate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_admin),
):
    period = db.query(SemesterPeriodModel).filter(SemesterPeriodModel.id == period_id).first()
    if not period:
        raise HTTPException(status_code=404, detail="ไม่พบข้อมูลภาคเรียน")

    old_end = period.end_date
    if data.start_date is not None:
        period.start_date = data.start_date
    if data.end_date is not None:
        period.end_date = data.end_date
    db.commit()
    db.refresh(period)

    # Re-check after update
    _check_single_period(period, old_end, db)
    db.refresh(period)
    return period


@router.delete("/{period_id}")
def delete_period(
    period_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_admin),
):
    period = db.query(SemesterPeriodModel).filter(SemesterPeriodModel.id == period_id).first()
    if not period:
        raise HTTPException(status_code=404, detail="ไม่พบข้อมูลภาคเรียน")
    db.delete(period)
    db.commit()
    return {"detail": "ลบข้อมูลภาคเรียนเรียบร้อย"}


@router.post("/trigger-auto-close")
def trigger_auto_close(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_admin),
):
    """Manually trigger auto-close check for admin's school."""
    run_auto_close_check(db)
    return {"detail": "ตรวจสอบและปิดคอร์สอัตโนมัติเรียบร้อย"}


# ============================================================
# Internal helper
# ============================================================

def _check_single_period(period: SemesterPeriodModel, old_end, db: Session):
    """Re-run close/open logic after a period's end_date changes."""
    now = datetime.now(timezone.utc)
    end = period.end_date
    if end is None:
        return
    if end.tzinfo is None:
        end = end.replace(tzinfo=timezone.utc)

    if now >= end and not period.is_auto_closed:
        auto_close_subjects_for_period(period, db)
    elif now < end and period.is_auto_closed:
        reopen_subjects_for_period(period, db)
