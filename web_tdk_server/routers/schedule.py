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
    
    slot_data = schedule_slot.dict()
    slot_data['day_of_week'] = str(slot_data.get('day_of_week'))
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
        ScheduleSlot.day_of_week == str(schedule_slot.day_of_week),
        ScheduleSlot.start_time < schedule_slot.end_time,
        ScheduleSlot.end_time > schedule_slot.start_time
    ).first()
    
    if existing_slot:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Time slot conflicts with existing schedule"
        )
    
    for key, value in schedule_slot.dict().items():
        if key == 'day_of_week':
            value = str(value)
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
                ScheduleSlot.day_of_week == str(assignment.day_of_week)
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
    # Same teacher cannot have overlapping schedules at the same time (even across different classrooms)
    existing_schedule = db.query(SubjectSchedule).filter(
        SubjectSchedule.day_of_week == str(assignment.day_of_week),
        SubjectSchedule.start_time < assignment.end_time,
        SubjectSchedule.end_time > assignment.start_time,
        SubjectSchedule.teacher_id == current_user.id
    ).first()
    
    if existing_schedule:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Teacher cannot have overlapping schedules at the same time"
        )
    
    # Check if same time slot has a subject in the same classroom already (only one subject per timeslot per classroom)
    if assignment.classroom_id:
        existing_subject_in_classroom = db.query(SubjectSchedule).filter(
            SubjectSchedule.classroom_id == assignment.classroom_id,
            SubjectSchedule.day_of_week == str(assignment.day_of_week),
            SubjectSchedule.start_time < assignment.end_time,
            SubjectSchedule.end_time > assignment.start_time
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
        
        # Return the created assignment with proper schema
        return SubjectScheduleSchema(
            id=db_assignment.id,
            subject_id=db_assignment.subject_id,
            schedule_slot_id=db_assignment.schedule_slot_id,
            teacher_id=db_assignment.teacher_id,
            classroom_id=db_assignment.classroom_id,
            day_of_week=db_assignment.day_of_week,
            start_time=db_assignment.start_time,
            end_time=db_assignment.end_time,
            subject_name=subject.name if subject else None,
            teacher_name=current_user.full_name,
            classroom_name=db_assignment.classroom.name if db_assignment.classroom else None
        )
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
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "teacher":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers can access this endpoint"
        )
    
    schedules = db.query(SubjectSchedule).options(
        joinedload(SubjectSchedule.subject),
        joinedload(SubjectSchedule.schedule_slot),
        joinedload(SubjectSchedule.classroom)
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
            classroom_id=schedule.classroom_id,
            day_of_week=schedule.day_of_week,
            start_time=schedule.start_time,
            end_time=schedule.end_time,
            subject_name=schedule.subject.name if schedule.subject else None,
            teacher_name=current_user.full_name,
            classroom_name=schedule.classroom.name if schedule.classroom else None
        ))
    
    return result


@router.get('/student', response_model=List[StudentScheduleResponse])
def get_student_schedule_current(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Return schedule entries for the currently authenticated student."""
    if current_user.role != 'student':
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Only students can access this endpoint')

    student_id = current_user.id

    # Student's active classroom
    cs = db.query(SubjectStudent).filter(SubjectStudent.student_id == student_id).all()

    from models.classroom_student import ClassroomStudent as ClassroomStudentModel
    from models.classroom_subject import ClassroomSubject as ClassroomSubjectModel

    classroom_student = db.query(ClassroomStudentModel).filter(
        ClassroomStudentModel.student_id == student_id,
        ClassroomStudentModel.is_active == True
    ).first()
    classroom_id = classroom_student.classroom_id if classroom_student else None

    # Direct enrollments
    enrolled_subject_ids = [r.subject_id for r in db.query(SubjectStudent).filter(SubjectStudent.student_id == student_id).all()]

    # Subjects assigned to classroom
    classroom_subject_ids = []
    if classroom_id:
        classroom_subject_ids = [r.subject_id for r in db.query(ClassroomSubjectModel).filter(ClassroomSubjectModel.classroom_id == classroom_id).all()]

    subject_ids = set(enrolled_subject_ids) | set(classroom_subject_ids)

    if not subject_ids:
        return []

    # Find schedules for these subjects that are global or target the student's classroom
    schedules = db.query(SubjectSchedule).options(joinedload(SubjectSchedule.subject), joinedload(SubjectSchedule.teacher)).filter(
        SubjectSchedule.subject_id.in_(list(subject_ids)),
        ((SubjectSchedule.classroom_id == None) | (SubjectSchedule.classroom_id == classroom_id))
    ).all()

    result = []
    for s in schedules:
        teacher_name = s.teacher.full_name if s.teacher and getattr(s.teacher, 'full_name', None) else (s.teacher.username if s.teacher else 'Unknown')
        # Prefer schedule_slot if present
        if s.schedule_slot:
            day_of_week = s.schedule_slot.day_of_week
            start_time = s.schedule_slot.start_time
            end_time = s.schedule_slot.end_time
        else:
            day_of_week = s.day_of_week
            start_time = s.start_time
            end_time = s.end_time

        result.append(StudentScheduleResponse(
            id=s.id,
            subject_id=s.subject_id,
            subject_name=s.subject.name if s.subject else None,
            subject_code=s.subject.code if s.subject else None,
            teacher_name=teacher_name,
            day_of_week=day_of_week,
            start_time=start_time,
            end_time=end_time
        ))

    # Sort by day then starts
    def sort_key(item):
        dow = item.day_of_week if item.day_of_week is not None else ''
        st = item.start_time if item.start_time is not None else ''
        return (str(dow), str(st))

    result.sort(key=sort_key)
    return result

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
        
        if (assignment.start_time < schedule_slot.start_time or 
            assignment.end_time > schedule_slot.end_time or
            str(assignment.day_of_week) != str(schedule_slot.day_of_week)):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Subject schedule must be within school operating hours"
            )
    else:
        schedule_slot = db.query(ScheduleSlot).filter(
            ScheduleSlot.school_id == current_user.school_id,
            ScheduleSlot.day_of_week == str(assignment.day_of_week)
        ).first()
        
        if not schedule_slot:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"No operating hours defined for day {assignment.day_of_week}"
            )
        
        if (assignment.start_time < schedule_slot.start_time or 
            assignment.end_time > schedule_slot.end_time):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Subject schedule ({assignment.start_time}-{assignment.end_time}) must be within school operating hours ({schedule_slot.start_time}-{schedule_slot.end_time})"
            )
    
    # Check for time conflicts with other subjects on the same day (excluding current assignment)
    # Same teacher cannot have overlapping schedules at the same time (even across different classrooms)
    existing_schedule = db.query(SubjectSchedule).filter(
        SubjectSchedule.id != assignment_id,
        SubjectSchedule.day_of_week == str(assignment.day_of_week),
        SubjectSchedule.start_time < assignment.end_time,
        SubjectSchedule.end_time > assignment.start_time,
        SubjectSchedule.teacher_id == current_user.id
    ).first()
    
    if existing_schedule:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Teacher cannot have overlapping schedules at the same time"
        )
    
    # Check if same time slot has a subject in the same classroom already (only one subject per timeslot per classroom)
    if assignment.classroom_id:
        existing_subject_in_classroom = db.query(SubjectSchedule).filter(
            SubjectSchedule.id != assignment_id,
            SubjectSchedule.classroom_id == assignment.classroom_id,
            SubjectSchedule.day_of_week == str(assignment.day_of_week),
            SubjectSchedule.start_time < assignment.end_time,
            SubjectSchedule.end_time > assignment.start_time
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
        
        # Return the updated assignment with proper schema
        return SubjectScheduleSchema(
            id=db_assignment.id,
            subject_id=db_assignment.subject_id,
            schedule_slot_id=db_assignment.schedule_slot_id,
            teacher_id=db_assignment.teacher_id,
            classroom_id=db_assignment.classroom_id,
            day_of_week=db_assignment.day_of_week,
            start_time=db_assignment.start_time,
            end_time=db_assignment.end_time,
            subject_name=subject.name if subject else None,
            teacher_name=current_user.full_name,
            classroom_name=db_assignment.classroom.name if db_assignment.classroom else None
        )
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
            classroom_id=schedule.classroom_id,
            day_of_week=schedule.day_of_week,
            start_time=schedule.start_time,
            end_time=schedule.end_time,
            subject_name=schedule.subject.name if schedule.subject else None,
            teacher_name=schedule.teacher.full_name if schedule.teacher else None,
            classroom_name=schedule.classroom.name if schedule.classroom else None
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
    
    # Import needed models
    from models.classroom import ClassroomStudent, Classroom
    
    # Get student's current classroom
    student_classroom = db.query(ClassroomStudent).join(
        Classroom, ClassroomStudent.classroom_id == Classroom.id
    ).filter(
        ClassroomStudent.student_id == current_user.id,
        ClassroomStudent.is_active == True
    ).first()
    
    classroom_id = student_classroom.classroom_id if student_classroom else None
    
    # Get all subjects the student is enrolled in
    student_subjects = db.query(SubjectStudent.subject_id).filter(
        SubjectStudent.student_id == current_user.id
    ).subquery()
    
    # Get schedules for those subjects
    # Filter by: (classroom_id matches student's classroom) OR (classroom_id is NULL = applies to all)
    schedules = db.query(SubjectSchedule).options(
        joinedload(SubjectSchedule.subject),
        joinedload(SubjectSchedule.schedule_slot),
        joinedload(SubjectSchedule.teacher)
    ).filter(
        SubjectSchedule.subject_id.in_(student_subjects),
        # Show schedules that either match student's classroom or apply to all classrooms
        (SubjectSchedule.classroom_id == classroom_id) | (SubjectSchedule.classroom_id == None)
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
    
    # Check for time conflicts with other subjects on the same day
    # Same teacher cannot have overlapping schedules at the same time (even across different classrooms)
    existing_schedule = db.query(SubjectSchedule).filter(
        SubjectSchedule.day_of_week == str(assignment.day_of_week),
        SubjectSchedule.start_time < assignment.end_time,
        SubjectSchedule.end_time > assignment.start_time,
        SubjectSchedule.teacher_id == teacher_id
    ).first()
    
    if existing_schedule:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Teacher cannot have overlapping schedules at the same time"
        )
    
    # Check if same time slot has a subject in the same classroom already (only one subject per timeslot per classroom)
    if assignment.classroom_id:
        existing_subject_in_classroom = db.query(SubjectSchedule).filter(
            SubjectSchedule.classroom_id == assignment.classroom_id,
            SubjectSchedule.day_of_week == str(assignment.day_of_week),
            SubjectSchedule.start_time < assignment.end_time,
            SubjectSchedule.end_time > assignment.start_time
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
        
        return SubjectScheduleSchema(
            id=db_assignment.id,
            subject_id=db_assignment.subject_id,
            schedule_slot_id=db_assignment.schedule_slot_id,
            teacher_id=db_assignment.teacher_id,
            classroom_id=db_assignment.classroom_id,
            day_of_week=db_assignment.day_of_week,
            start_time=db_assignment.start_time,
            end_time=db_assignment.end_time,
            subject_name=subject.name,
            teacher_name=teacher.full_name,
            classroom_name=db_assignment.classroom.name if db_assignment.classroom else None
        )
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to assign schedule: {str(e)}"
        )

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