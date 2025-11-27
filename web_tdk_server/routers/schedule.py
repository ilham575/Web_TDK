from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List
from database.connection import get_db
from models.schedule import ScheduleSlot, SubjectSchedule
from models.subject import Subject
from models.user import User
from models.subject_student import SubjectStudent
from schemas.schedule import (
    ScheduleSlot as ScheduleSlotSchema,
    ScheduleSlotCreate,
    ScheduleSlotUpdate,
    SubjectSchedule as SubjectScheduleSchema,
    SubjectScheduleCreate,
    StudentScheduleResponse
)
from utils.security import get_current_user

router = APIRouter(prefix="/schedule", tags=["schedule"])

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
    existing_slot = db.query(ScheduleSlot).filter(
        ScheduleSlot.school_id == current_user.school_id,
        ScheduleSlot.day_of_week == schedule_slot.day_of_week,
        ScheduleSlot.start_time < schedule_slot.end_time,
        ScheduleSlot.end_time > schedule_slot.start_time
    ).first()
    
    if existing_slot:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Time slot conflicts with existing schedule"
        )
    
    db_schedule_slot = ScheduleSlot(
        **schedule_slot.dict(),
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
        ScheduleSlot.school_id == current_user.school_id
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
        ScheduleSlot.day_of_week == schedule_slot.day_of_week,
        ScheduleSlot.start_time < schedule_slot.end_time,
        ScheduleSlot.end_time > schedule_slot.start_time
    ).first()
    
    if existing_slot:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Time slot conflicts with existing schedule"
        )
    
    for key, value in schedule_slot.dict().items():
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
    
    # Verify the subject belongs to the teacher
    subject = db.query(Subject).filter(
        Subject.id == assignment.subject_id,
        Subject.teacher_id == current_user.id
    ).first()
    
    if not subject:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subject not found or not assigned to you"
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
        
        # Check if the subject time fits within the operating hours
        if (assignment.start_time < schedule_slot.start_time or 
            assignment.end_time > schedule_slot.end_time or
            str(assignment.day_of_week) != str(schedule_slot.day_of_week)):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Subject schedule must be within school operating hours"
            )
    else:
        # If no schedule_slot_id, find operating hours for the day
        schedule_slot = db.query(ScheduleSlot).filter(
            ScheduleSlot.school_id == current_user.school_id,
            ScheduleSlot.day_of_week == assignment.day_of_week
        ).first()
        
        if not schedule_slot:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"No operating hours defined for day {assignment.day_of_week}"
            )
        
        # Check if the subject time fits within the operating hours
        if (assignment.start_time < schedule_slot.start_time or 
            assignment.end_time > schedule_slot.end_time):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Subject schedule ({assignment.start_time}-{assignment.end_time}) must be within school operating hours ({schedule_slot.start_time}-{schedule_slot.end_time})"
            )
    
    # Check for time conflicts with other subjects on the same day
    existing_schedule = db.query(SubjectSchedule).filter(
        SubjectSchedule.day_of_week == assignment.day_of_week,
        SubjectSchedule.start_time < assignment.end_time,
        SubjectSchedule.end_time > assignment.start_time,
        SubjectSchedule.teacher_id == current_user.id
    ).first()
    
    if existing_schedule:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Time slot conflicts with another subject schedule"
        )
    
    try:
        # Determine schedule_slot_id - use provided one or find appropriate one
        final_schedule_slot_id = assignment.schedule_slot_id
        if not final_schedule_slot_id and schedule_slot:
            final_schedule_slot_id = schedule_slot.id
        
        db_assignment = SubjectSchedule(
            subject_id=assignment.subject_id,
            schedule_slot_id=final_schedule_slot_id,  # Can be None for custom schedules
            teacher_id=current_user.id,
            day_of_week=assignment.day_of_week,
            start_time=assignment.start_time,
            end_time=assignment.end_time
        )
        db.add(db_assignment)
        db.commit()
        db.refresh(db_assignment)
        
        # Return the created assignment with proper schema
        return SubjectScheduleSchema(
            id=db_assignment.id,
            subject_id=db_assignment.subject_id,
            schedule_slot_id=db_assignment.schedule_slot_id,
            teacher_id=db_assignment.teacher_id,
            day_of_week=db_assignment.day_of_week,
            start_time=db_assignment.start_time,
            end_time=db_assignment.end_time,
            subject_name=subject.name if subject else None,
            teacher_name=current_user.full_name
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create schedule assignment: {str(e)}"
        )

@router.get("/teacher", response_model=List[SubjectScheduleSchema])
def get_teacher_schedules(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "teacher":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers can access this endpoint"
        )
    
    schedules = db.query(SubjectSchedule).options(
        joinedload(SubjectSchedule.subject),
        joinedload(SubjectSchedule.schedule_slot)
    ).filter(
        SubjectSchedule.teacher_id == current_user.id
    ).all()
    
    result = []
    for schedule in schedules:
        result.append(SubjectScheduleSchema(
            id=schedule.id,
            subject_id=schedule.subject_id,
            schedule_slot_id=schedule.schedule_slot_id,
            teacher_id=schedule.teacher_id,
            day_of_week=schedule.day_of_week,
            start_time=schedule.start_time,
            end_time=schedule.end_time,
            subject_name=schedule.subject.name if schedule.subject else None,
            teacher_name=current_user.full_name
        ))
    
    return result

@router.delete("/assign/{assignment_id}")
def delete_subject_schedule(
    assignment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "teacher":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers can delete schedule assignments"
        )
    
    db_assignment = db.query(SubjectSchedule).filter(
        SubjectSchedule.id == assignment_id,
        SubjectSchedule.teacher_id == current_user.id
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
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can access school assignments"
        )
    
    schedules = db.query(SubjectSchedule).options(
        joinedload(SubjectSchedule.subject),
        joinedload(SubjectSchedule.schedule_slot),
        joinedload(SubjectSchedule.teacher)
    ).filter(
        SubjectSchedule.subject.has(school_id=current_user.school_id)
    ).all()
    
    result = []
    for schedule in schedules:
        result.append(SubjectScheduleSchema(
            id=schedule.id,
            subject_id=schedule.subject_id,
            schedule_slot_id=schedule.schedule_slot_id,
            teacher_id=schedule.teacher_id,
            day_of_week=schedule.day_of_week,
            start_time=schedule.start_time,
            end_time=schedule.end_time,
            subject_name=schedule.subject.name if schedule.subject else None,
            teacher_name=schedule.teacher.full_name if schedule.teacher else None
        ))
    
    return result

# Student endpoint - Get student's schedule
@router.get("/student", response_model=List[StudentScheduleResponse])
def get_student_schedule(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students can access this endpoint"
        )
    
    # Get all subjects the student is enrolled in
    student_subjects = db.query(SubjectStudent.subject_id).filter(
        SubjectStudent.student_id == current_user.id
    ).subquery()
    
    # Get schedules for those subjects
    schedules = db.query(SubjectSchedule).options(
        joinedload(SubjectSchedule.subject),
        joinedload(SubjectSchedule.schedule_slot),
        joinedload(SubjectSchedule.teacher)
    ).filter(
        SubjectSchedule.subject_id.in_(student_subjects)
    ).all()
    
    result = []
    for schedule in schedules:
        result.append(StudentScheduleResponse(
            id=schedule.id,
            subject_id=schedule.subject_id,
            subject_name=schedule.subject.name if schedule.subject else "",
            subject_code=schedule.subject.code if schedule.subject else "",
            teacher_name=schedule.teacher.full_name if schedule.teacher else "",
            day_of_week=schedule.day_of_week,
            start_time=schedule.start_time,
            end_time=schedule.end_time
        ))
    
    return result