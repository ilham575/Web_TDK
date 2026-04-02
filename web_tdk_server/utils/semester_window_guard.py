from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from models.semester_period import SemesterPeriod as SemesterPeriodModel


def _academic_year_matches(left: Optional[str], right: Optional[str]) -> bool:
    if not left or not right:
        return False
    left_value = str(left).strip()
    right_value = str(right).strip()
    return left_value == right_value or left_value.endswith(right_value) or right_value.endswith(left_value)


def _to_utc_if_naive(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value


def get_period_for_term(
    db: Session,
    *,
    school_id: int,
    academic_year: str,
    semester: int,
) -> Optional[SemesterPeriodModel]:
    periods = db.query(SemesterPeriodModel).filter(
        SemesterPeriodModel.school_id == school_id,
        SemesterPeriodModel.semester == int(semester),
    ).all()

    for period in periods:
        if _academic_year_matches(getattr(period, "academic_year", None), academic_year):
            return period

    return None


def enforce_admin_time_window(
    db: Session,
    *,
    school_id: Optional[int],
    academic_year: Optional[str],
    semester: Optional[int],
    action_label: str,
) -> SemesterPeriodModel:
    if not school_id or not academic_year or semester is None:
        raise HTTPException(
            status_code=403,
            detail=f"ไม่สามารถ{action_label}ได้ เพราะข้อมูลปีการศึกษา/ภาคเรียนไม่ครบถ้วน",
        )

    period = get_period_for_term(
        db,
        school_id=school_id,
        academic_year=str(academic_year),
        semester=int(semester),
    )

    if not period:
        raise HTTPException(
            status_code=403,
            detail=f"ไม่สามารถ{action_label}ได้ เนื่องจากแอดมินยังไม่ได้ตั้งช่วงเวลาสำหรับปีการศึกษา/ภาคเรียนนี้",
        )

    if period.start_date is None or period.end_date is None:
        raise HTTPException(
            status_code=403,
            detail=f"ไม่สามารถ{action_label}ได้ เนื่องจากแอดมินยังตั้งวันเริ่มต้น/สิ้นสุดไม่ครบ",
        )

    now = datetime.now(timezone.utc)
    start_at = _to_utc_if_naive(period.start_date)
    end_at = _to_utc_if_naive(period.end_date)

    if now < start_at:
        raise HTTPException(
            status_code=403,
            detail=f"ยังไม่ถึงช่วงเวลาที่แอดมินอนุญาตให้{action_label}",
        )

    if now > end_at:
        raise HTTPException(
            status_code=403,
            detail=f"เลยช่วงเวลาที่แอดมินอนุญาตให้{action_label}",
        )

    return period
