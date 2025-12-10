from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from typing import List, Optional
import json

from schemas.homeroom import HomeroomTeacher, HomeroomTeacherCreate, HomeroomTeacherUpdate, HomeroomTeacherWithDetails
from models.homeroom import HomeroomTeacher as HomeroomTeacherModel
from models.user import User as UserModel
from models.classroom import Classroom as ClassroomModel, ClassroomStudent as ClassroomStudentModel
from models.grade import Grade as GradeModel
from models.attendance import Attendance as AttendanceModel
from models.subject import Subject as SubjectModel
from models.subject_student import SubjectStudent as SubjectStudentModel
from database.connection import get_db
from routers.user import get_current_user

router = APIRouter(prefix="/homeroom", tags=["homeroom"])


@router.get("", response_model=List[HomeroomTeacherWithDetails])
@router.get("/", response_model=List[HomeroomTeacherWithDetails])
def get_homeroom_teachers(
    school_id: Optional[int] = None,
    academic_year: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """ดึงรายชื่อครูประจำชั้นทั้งหมด"""
    query = db.query(HomeroomTeacherModel)
    
    # Filter by school_id
    if school_id:
        query = query.filter(HomeroomTeacherModel.school_id == school_id)
    elif current_user.school_id:
        query = query.filter(HomeroomTeacherModel.school_id == current_user.school_id)
    
    # Filter by academic_year if provided
    if academic_year:
        query = query.filter(HomeroomTeacherModel.academic_year == academic_year)
    
    homerooms = query.all()
    
    # Enrich with teacher details and student count
    result = []
    for hr in homerooms:
        teacher = db.query(UserModel).filter(UserModel.id == hr.teacher_id).first()
        
        # Count students in this grade level at this school
        student_count = db.query(UserModel).filter(
            UserModel.role == 'student',
            UserModel.school_id == hr.school_id,
            UserModel.grade_level == hr.grade_level,
            UserModel.is_active == True
        ).count()
        
        result.append(HomeroomTeacherWithDetails(
            id=hr.id,
            teacher_id=hr.teacher_id,
            grade_level=hr.grade_level,
            school_id=hr.school_id,
            academic_year=hr.academic_year,
            created_at=hr.created_at,
            updated_at=hr.updated_at,
            teacher_name=teacher.full_name if teacher else None,
            teacher_email=teacher.email if teacher else None,
            student_count=student_count
        ))
    
    return result


@router.get("/grade-levels")
def get_available_grade_levels(
    school_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """ดึงรายชื่อชั้นเรียนทั้งหมดที่มีในระบบ (จากนักเรียน)"""
    sid = school_id or current_user.school_id
    
    # Get distinct grade levels from students
    grade_levels = db.query(UserModel.grade_level).filter(
        UserModel.role == 'student',
        UserModel.school_id == sid,
        UserModel.grade_level.isnot(None),
        UserModel.grade_level != ''
    ).distinct().all()
    
    return [g[0] for g in grade_levels if g[0]]


@router.get("/{homeroom_id}", response_model=HomeroomTeacherWithDetails)
def get_homeroom_teacher(
    homeroom_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """ดึงข้อมูลครูประจำชั้นตาม ID"""
    hr = db.query(HomeroomTeacherModel).filter(HomeroomTeacherModel.id == homeroom_id).first()
    if not hr:
        raise HTTPException(status_code=404, detail="ไม่พบข้อมูลครูประจำชั้น")
    
    teacher = db.query(UserModel).filter(UserModel.id == hr.teacher_id).first()
    student_count = db.query(UserModel).filter(
        UserModel.role == 'student',
        UserModel.school_id == hr.school_id,
        UserModel.grade_level == hr.grade_level,
        UserModel.is_active == True
    ).count()
    
    return HomeroomTeacherWithDetails(
        id=hr.id,
        teacher_id=hr.teacher_id,
        grade_level=hr.grade_level,
        school_id=hr.school_id,
        academic_year=hr.academic_year,
        created_at=hr.created_at,
        updated_at=hr.updated_at,
        teacher_name=teacher.full_name if teacher else None,
        teacher_email=teacher.email if teacher else None,
        student_count=student_count
    )


@router.post("", response_model=HomeroomTeacher, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=HomeroomTeacher, status_code=status.HTTP_201_CREATED)
def create_homeroom_teacher(
    homeroom: HomeroomTeacherCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Admin-only: กำหนดครูประจำชั้น"""
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="เฉพาะแอดมินเท่านั้นที่สามารถกำหนดครูประจำชั้นได้")
    
    # Verify teacher exists and is a teacher
    teacher = db.query(UserModel).filter(
        UserModel.id == homeroom.teacher_id,
        UserModel.role == 'teacher'
    ).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="ไม่พบครูที่ระบุ หรือผู้ใช้ไม่ได้เป็นครู")
    
    # Check if this teacher is already assigned to another class for this school/year
    existing = db.query(HomeroomTeacherModel).filter(
        HomeroomTeacherModel.teacher_id == homeroom.teacher_id,
        HomeroomTeacherModel.school_id == homeroom.school_id,
        HomeroomTeacherModel.academic_year == homeroom.academic_year
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=400, 
            detail=f"ครูท่านนี้มีการประจำชั้นอยู่แล้ว (ชั้น {existing.grade_level}) ครูสามารถประจำชั้นได้เพียงแค่ 1 ห้องเท่านั้น"
        )
    
    # Create homeroom teacher assignment
    db_homeroom = HomeroomTeacherModel(
        teacher_id=homeroom.teacher_id,
        grade_level=homeroom.grade_level,
        school_id=homeroom.school_id,
        academic_year=homeroom.academic_year
    )
    
    db.add(db_homeroom)
    db.commit()
    db.refresh(db_homeroom)
    
    return db_homeroom


@router.patch("/{homeroom_id}", response_model=HomeroomTeacher)
def update_homeroom_teacher(
    homeroom_id: int,
    homeroom_update: HomeroomTeacherUpdate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Admin-only: แก้ไขครูประจำชั้น"""
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="เฉพาะแอดมินเท่านั้นที่สามารถแก้ไขครูประจำชั้นได้")
    
    hr = db.query(HomeroomTeacherModel).filter(HomeroomTeacherModel.id == homeroom_id).first()
    if not hr:
        raise HTTPException(status_code=404, detail="ไม่พบข้อมูลครูประจำชั้น")
    
    update_data = homeroom_update.dict(exclude_unset=True)
    
    # If changing teacher, verify the new teacher exists
    if 'teacher_id' in update_data:
        teacher = db.query(UserModel).filter(
            UserModel.id == update_data['teacher_id'],
            UserModel.role == 'teacher'
        ).first()
        if not teacher:
            raise HTTPException(status_code=404, detail="ไม่พบครูที่ระบุ หรือผู้ใช้ไม่ได้เป็นครู")
    
    # Check if changing teacher: new teacher must not already be assigned to another class
    if 'teacher_id' in update_data:
        new_teacher_id = update_data['teacher_id']
        existing = db.query(HomeroomTeacherModel).filter(
            HomeroomTeacherModel.teacher_id == new_teacher_id,
            HomeroomTeacherModel.school_id == hr.school_id,
            HomeroomTeacherModel.academic_year == hr.academic_year,
            HomeroomTeacherModel.id != homeroom_id
        ).first()
        
        if existing:
            raise HTTPException(
                status_code=400,
                detail=f"ครูท่านนี้มีการประจำชั้นอยู่แล้ว (ชั้น {existing.grade_level}) ครูสามารถประจำชั้นได้เพียงแค่ 1 ห้องเท่านั้น"
            )
    
    for key, value in update_data.items():
        setattr(hr, key, value)
    
    db.commit()
    db.refresh(hr)
    
    return hr


@router.delete("/{homeroom_id}")
def delete_homeroom_teacher(
    homeroom_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Admin-only: ลบครูประจำชั้น"""
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="เฉพาะแอดมินเท่านั้นที่สามารถลบครูประจำชั้นได้")
    
    hr = db.query(HomeroomTeacherModel).filter(HomeroomTeacherModel.id == homeroom_id).first()
    if not hr:
        raise HTTPException(status_code=404, detail="ไม่พบข้อมูลครูประจำชั้น")
    
    db.delete(hr)
    db.commit()
    
    return {"message": "ลบครูประจำชั้นเรียบร้อยแล้ว"}


@router.get("/by-grade/{grade_level}", response_model=Optional[HomeroomTeacherWithDetails])
def get_homeroom_by_grade(
    grade_level: str,
    school_id: Optional[int] = None,
    academic_year: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """ดึงข้อมูลครูประจำชั้นตามชั้นเรียน"""
    sid = school_id or current_user.school_id
    
    query = db.query(HomeroomTeacherModel).filter(
        HomeroomTeacherModel.grade_level == grade_level,
        HomeroomTeacherModel.school_id == sid
    )
    
    if academic_year:
        query = query.filter(HomeroomTeacherModel.academic_year == academic_year)
    
    hr = query.first()
    
    if not hr:
        return None
    
    teacher = db.query(UserModel).filter(UserModel.id == hr.teacher_id).first()
    student_count = db.query(UserModel).filter(
        UserModel.role == 'student',
        UserModel.school_id == hr.school_id,
        UserModel.grade_level == hr.grade_level,
        UserModel.is_active == True
    ).count()
    
    return HomeroomTeacherWithDetails(
        id=hr.id,
        teacher_id=hr.teacher_id,
        grade_level=hr.grade_level,
        school_id=hr.school_id,
        academic_year=hr.academic_year,
        created_at=hr.created_at,
        updated_at=hr.updated_at,
        teacher_name=teacher.full_name if teacher else None,
        teacher_email=teacher.email if teacher else None,
        student_count=student_count
    )


@router.get("/students/{grade_level}")
def get_students_by_grade(
    grade_level: str,
    school_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """ดึงรายชื่อนักเรียนในชั้นเรียน"""
    sid = school_id or current_user.school_id
    
    students = db.query(UserModel).filter(
        UserModel.role == 'student',
        UserModel.school_id == sid,
        UserModel.grade_level == grade_level,
        UserModel.is_active == True
    ).order_by(UserModel.full_name).all()
    
    return [{
        'id': s.id,
        'username': s.username,
        'full_name': s.full_name,
        'email': s.email,
        'grade_level': s.grade_level
    } for s in students]


@router.get("/my-classrooms/summary")
def get_homeroom_summary(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """ดึงข้อมูลสรุปของนักเรียนในชั้นที่ครูประจำ (คะแนน + การเข้าเรียน จัดกลุ่มตามวิชา)"""
    if current_user.role not in ['teacher', 'admin']:
        raise HTTPException(status_code=403, detail="ต้องเป็นครูหรือแอดมินเท่านั้น")
    
    # Get homeroom assignments for this teacher
    homerooms = db.query(HomeroomTeacherModel).filter(
        HomeroomTeacherModel.teacher_id == current_user.id
    ).all()
    
    if not homerooms:
        return {"classrooms": [], "message": "ไม่พบข้อมูลครูประจำชั้น"}
    
    result = []
    
    for hr in homerooms:
        # Get classrooms for this grade level
        classrooms = db.query(ClassroomModel).filter(
            ClassroomModel.school_id == hr.school_id,
            ClassroomModel.grade_level == hr.grade_level
        ).all()
        
        for classroom in classrooms:
            # Get students in this classroom
            enrollments = db.query(ClassroomStudentModel, UserModel).join(
                UserModel, ClassroomStudentModel.student_id == UserModel.id
            ).filter(
                ClassroomStudentModel.classroom_id == classroom.id,
                ClassroomStudentModel.is_active == True
            ).all()
            
            students_data = []
            for enrollment, student in enrollments:
                # Get grades for this student grouped by subject
                grades_query = db.query(GradeModel, SubjectModel).join(
                    SubjectModel, GradeModel.subject_id == SubjectModel.id
                ).filter(
                    GradeModel.student_id == student.id
                ).all()
                
                grades_by_subject = {}
                for grade, subject in grades_query:
                    if subject.id not in grades_by_subject:
                        grades_by_subject[subject.id] = {
                            'subject_id': subject.id,
                            'subject_name': subject.name,
                            'is_activity': subject.subject_type == 'activity',
                            'credits': subject.credits if hasattr(subject, 'credits') else None,
                            'assignments': [],
                            'total_score': 0,
                            'total_max_score': 0
                        }
                    if grade.grade is not None and grade.max_score:
                        grades_by_subject[subject.id]['assignments'].append({
                            'title': grade.title,
                            'score': float(grade.grade),
                            'max_score': float(grade.max_score)
                        })
                        grades_by_subject[subject.id]['total_score'] += float(grade.grade)
                        grades_by_subject[subject.id]['total_max_score'] += float(grade.max_score)
                
                # Get attendance grouped by subject
                enrolled_subjects = db.query(SubjectStudentModel.subject_id).filter(
                    SubjectStudentModel.student_id == student.id
                ).all()
                enrolled_subject_ids = [s[0] for s in enrolled_subjects]
                
                attendance_by_subject = {}
                if enrolled_subject_ids:
                    for subject_id in enrolled_subject_ids:
                        subject = db.query(SubjectModel).filter(SubjectModel.id == subject_id).first()
                        if not subject:
                            continue
                        
                        attendance_records = db.query(AttendanceModel).filter(
                            AttendanceModel.subject_id == subject_id
                        ).all()
                        
                        subject_attendance = {
                            'subject_id': subject_id,
                            'subject_name': subject.name,
                            'total_days': 0,
                            'present_days': 0,
                            'absent_days': 0,
                            'late_days': 0,
                            'sick_leave_days': 0
                        }
                        
                        for record in attendance_records:
                            try:
                                attendance_data = json.loads(record.present_json) if record.present_json else {}
                                student_id_str = str(student.id)
                                if student_id_str in attendance_data:
                                    status = attendance_data[student_id_str]
                                    subject_attendance['total_days'] += 1
                                    if status == 'present':
                                        subject_attendance['present_days'] += 1
                                    elif status == 'absent':
                                        subject_attendance['absent_days'] += 1
                                    elif status == 'late':
                                        subject_attendance['late_days'] += 1
                                    elif status == 'sick_leave':
                                        subject_attendance['sick_leave_days'] += 1
                            except:
                                pass
                        
                        attendance_by_subject[subject_id] = subject_attendance
                
                # Calculate overall attendance rate
                total_attendance_days = sum(s['total_days'] for s in attendance_by_subject.values())
                total_attendance_present = sum(s['present_days'] for s in attendance_by_subject.values())
                
                students_data.append({
                    'id': student.id,
                    'username': student.username,
                    'full_name': student.full_name,
                    'email': student.email,
                    'grades_by_subject': list(grades_by_subject.values()),
                    'attendance_by_subject': list(attendance_by_subject.values()),
                    'attendance': {
                        'attendance_rate': round((total_attendance_present / total_attendance_days * 100) if total_attendance_days > 0 else 0, 2),
                        'present_days': total_attendance_present,
                        'absent_days': sum(s['absent_days'] for s in attendance_by_subject.values()),
                        'late_days': sum(s['late_days'] for s in attendance_by_subject.values()),
                        'sick_leave_days': sum(s['sick_leave_days'] for s in attendance_by_subject.values())
                    }
                })
            
            result.append({
                'classroom_id': classroom.id,
                'classroom_name': classroom.name,
                'grade_level': classroom.grade_level,
                'student_count': len(students_data),
                'students': students_data
            })
    
    return {"classrooms": result}


@router.get("/my-classrooms/{classroom_id}/students")
def get_homeroom_classroom_students(
    classroom_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """ดึงรายละเอียดนักเรียนในชั้นเรียนที่ครูประจำ"""
    if current_user.role not in ['teacher', 'admin']:
        raise HTTPException(status_code=403, detail="ต้องเป็นครูหรือแอดมินเท่านั้น")
    
    # Verify this teacher is homeroom teacher for this classroom
    classroom = db.query(ClassroomModel).filter(ClassroomModel.id == classroom_id).first()
    if not classroom:
        raise HTTPException(status_code=404, detail="ไม่พบชั้นเรียน")
    
    if current_user.role == 'teacher':
        homeroom = db.query(HomeroomTeacherModel).filter(
            HomeroomTeacherModel.teacher_id == current_user.id,
            HomeroomTeacherModel.grade_level == classroom.grade_level,
            HomeroomTeacherModel.school_id == classroom.school_id
        ).first()
        
        if not homeroom:
            raise HTTPException(status_code=403, detail="คุณไม่ใช่ครูประจำชั้นของห้องเรียนนี้")
    
    # Get students in this classroom
    enrollments = db.query(ClassroomStudentModel, UserModel).join(
        UserModel, ClassroomStudentModel.student_id == UserModel.id
    ).filter(
        ClassroomStudentModel.classroom_id == classroom_id,
        ClassroomStudentModel.is_active == True
    ).all()
    
    students_data = []
    for enrollment, student in enrollments:
        # Get all grades for this student with subject details
        grades = db.query(GradeModel, SubjectModel).join(
            SubjectModel, GradeModel.subject_id == SubjectModel.id
        ).filter(
            GradeModel.student_id == student.id
        ).all()
        
        grades_by_subject = {}
        for grade, subject in grades:
            if subject.id not in grades_by_subject:
                grades_by_subject[subject.id] = {
                    'subject_id': subject.id,
                    'subject_name': subject.name,
                    'is_activity': subject.subject_type == 'activity',
                    'credits': subject.credits if hasattr(subject, 'credits') else None,
                    'assignments': [],
                    'total_score': 0,
                    'total_max_score': 0
                }
            if grade.grade is not None and grade.max_score:
                grades_by_subject[subject.id]['assignments'].append({
                    'title': grade.title,
                    'score': float(grade.grade),
                    'max_score': float(grade.max_score)
                })
                grades_by_subject[subject.id]['total_score'] += float(grade.grade)
                grades_by_subject[subject.id]['total_max_score'] += float(grade.max_score)
        
        # Get attendance
        enrolled_subjects = db.query(SubjectStudentModel.subject_id).filter(
            SubjectStudentModel.student_id == student.id
        ).all()
        enrolled_subject_ids = [s[0] for s in enrolled_subjects]
        
        attendance_by_subject = {}
        if enrolled_subject_ids:
            for subject_id in enrolled_subject_ids:
                subject = db.query(SubjectModel).filter(SubjectModel.id == subject_id).first()
                if not subject:
                    continue
                    
                attendance_records = db.query(AttendanceModel).filter(
                    AttendanceModel.subject_id == subject_id
                ).all()
                
                subject_attendance = {
                    'subject_id': subject_id,
                    'subject_name': subject.name,
                    'total_days': 0,
                    'present_days': 0,
                    'absent_days': 0,
                    'late_days': 0,
                    'sick_leave_days': 0
                }
                
                for record in attendance_records:
                    try:
                        attendance_data = json.loads(record.present_json) if record.present_json else {}
                        student_id_str = str(student.id)
                        if student_id_str in attendance_data:
                            status = attendance_data[student_id_str]
                            subject_attendance['total_days'] += 1
                            if status == 'present':
                                subject_attendance['present_days'] += 1
                            elif status == 'absent':
                                subject_attendance['absent_days'] += 1
                            elif status == 'late':
                                subject_attendance['late_days'] += 1
                            elif status == 'sick_leave':
                                subject_attendance['sick_leave_days'] += 1
                    except:
                        pass
                
                attendance_by_subject[subject_id] = subject_attendance
        
        students_data.append({
            'id': student.id,
            'username': student.username,
            'full_name': student.full_name,
            'email': student.email,
            'grades_by_subject': list(grades_by_subject.values()),
            'attendance_by_subject': list(attendance_by_subject.values())
        })
    
    return {
        'classroom_id': classroom.id,
        'classroom_name': classroom.name,
        'grade_level': classroom.grade_level,
        'students': students_data
    }
