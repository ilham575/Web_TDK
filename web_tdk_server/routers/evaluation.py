from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from database.connection import get_db
from routers.user import get_current_user
from models.evaluation import Evaluation as EvaluationModel, CharacteristicTopic as CharacteristicTopicModel, CharacteristicScore as CharacteristicScoreModel
from models.user import User as UserModel
from models.subject import Subject as SubjectModel
from models.classroom import Classroom as ClassroomModel, ClassroomStudent as ClassroomStudentModel
from schemas.evaluation import EvaluationCreate, EvaluationResponse, EvaluationUpdate, CharacteristicTopicCreate, CharacteristicTopicResponse, EvaluationSummaryResponse
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os

router = APIRouter(prefix="/evaluations", tags=["evaluations"])

@router.post("/", response_model=EvaluationResponse)
async def create_evaluation(
    evaluation: EvaluationCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    # Check if teacher is assigned to the subject
    teacher_subject = db.query(SubjectModel).filter(
        SubjectModel.id == evaluation.subject_id
    ).first()
    if not teacher_subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    # Prevent duplicate evaluation: one student per subject per term only
    query_existing = db.query(EvaluationModel).filter(
        EvaluationModel.student_id == evaluation.student_id,
        EvaluationModel.subject_id == evaluation.subject_id
    )

    if evaluation.academic_year:
        query_existing = query_existing.filter(EvaluationModel.academic_year == evaluation.academic_year)
    if evaluation.semester:
        query_existing = query_existing.filter(EvaluationModel.semester == evaluation.semester)

    existing = query_existing.first()

    if existing:
        raise HTTPException(status_code=400, detail="การประเมินนี้มีอยู่แล้วสำหรับนักเรียนคนนี้ในวิชาและปีการศึกษานี้")

    # Create evaluation
    eval_dict = evaluation.dict(exclude={'characteristic_scores'})
    db_evaluation = EvaluationModel(**eval_dict)
    db.add(db_evaluation)
    db.commit()
    db.refresh(db_evaluation)

    # Add characteristic scores if provided
    if evaluation.characteristic_scores:
        for score in evaluation.characteristic_scores:
            db_score = CharacteristicScoreModel(
                evaluation_id=db_evaluation.id,
                topic_id=score.topic_id,
                rating=score.rating
            )
            db.add(db_score)
        db.commit()
        db.refresh(db_evaluation)

    # Send notification to admin
    await send_admin_notification(db_evaluation, db)

    return db_evaluation

async def send_admin_notification(evaluation: EvaluationModel, db: Session):
    # Get admin users
    admins = db.query(UserModel).filter(UserModel.role == "admin").all()
    if not admins:
        return

    # Get student and subject info
    student = db.query(UserModel).filter(UserModel.id == evaluation.student_id).first()
    subject = db.query(SubjectModel).filter(SubjectModel.id == evaluation.subject_id).first()
    teacher = db.query(UserModel).filter(UserModel.id == evaluation.teacher_id).first()

    if not student or not subject or not teacher:
        return

    subject_name = subject.name
    student_name = student.full_name
    teacher_name = teacher.full_name

    # Email content
    msg = MIMEMultipart()
    msg['Subject'] = f'การประเมินนักเรียนใหม่: {student_name}'
    msg['From'] = os.getenv('EMAIL_USER', 'noreply@school.com')
    msg['To'] = ', '.join([admin.email for admin in admins])

    body = f"""
    มีการประเมินนักเรียนใหม่:

    นักเรียน: {student_name}
    วิชา: {subject_name}
    ครูผู้สอน: {teacher_name}

    การอ่าน: {evaluation.reading}
    การเขียนสื่อความ: {evaluation.writing}
    การคิดวิเคราะห์: {evaluation.analysis}

    เวลา: {evaluation.created_at}
    """

    msg.attach(MIMEText(body, 'plain'))

    try:
        server = smtplib.SMTP(os.getenv('SMTP_SERVER', 'smtp.gmail.com'), int(os.getenv('SMTP_PORT', 587)))
        server.starttls()
        server.login(os.getenv('EMAIL_USER'), os.getenv('EMAIL_PASS'))
        text = msg.as_string()
        server.sendmail(msg['From'], [admin.email for admin in admins], text)
        server.quit()
    except Exception as e:
        print(f"Failed to send email: {e}")

@router.get("/student/{student_id}", response_model=List[EvaluationResponse])
async def get_student_evaluations(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    # Only admin, or teacher who evaluates can see? 
    # Usually admin can see all, teacher can see what they evaluated, student can see their own.
    query = db.query(EvaluationModel).filter(EvaluationModel.student_id == student_id)
    
    if current_user.role == "teacher":
        query = query.filter(EvaluationModel.teacher_id == current_user.id)
    elif current_user.role == "student":
        if current_user.id != student_id:
            raise HTTPException(status_code=403, detail="Not authorized to see other students evaluations")
            
    return query.all()

@router.get("/subject/{subject_id}", response_model=List[EvaluationResponse])
async def get_subject_evaluations(
    subject_id: int,
    academic_year: Optional[str] = None,
    semester: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    if current_user.role not in ["admin", "teacher"]:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    query = db.query(EvaluationModel).options(
        joinedload(EvaluationModel.characteristic_scores).joinedload(CharacteristicScoreModel.topic)
    ).join(
        UserModel, EvaluationModel.student_id == UserModel.id
    ).join(
        SubjectModel, EvaluationModel.subject_id == SubjectModel.id
    ).filter(EvaluationModel.subject_id == subject_id)

    if academic_year:
        query = query.filter(EvaluationModel.academic_year == academic_year)
    if semester:
        query = query.filter(EvaluationModel.semester == semester)
        
    query = query.order_by(EvaluationModel.created_at.desc())
    evaluations = query.all()
    
    # Enrich with classroom info
    for eval in evaluations:
        if eval.student:
            c_student = db.query(ClassroomStudentModel).filter(
                ClassroomStudentModel.student_id == eval.student_id,
                ClassroomStudentModel.is_active == True
            ).first()
            if c_student:
                classroom = db.query(ClassroomModel).filter(ClassroomModel.id == c_student.classroom_id).first()
                if classroom:
                    eval.classroom_id = classroom.id
                    eval.classroom_name = classroom.name
            else:
                eval.classroom_id = None
                eval.classroom_name = None
    
    return evaluations
    
    # Build response with classroom info
    result = []
    for eval in evaluations:
        classroom_info = None
        if eval.student:
            # Find active classroom for this student
            classroom_student = db.query(ClassroomStudentModel).filter(
                ClassroomStudentModel.student_id == eval.student_id,
                ClassroomStudentModel.is_active == True
            ).first()
            if classroom_student:
                classroom = db.query(ClassroomModel).filter(
                    ClassroomModel.id == classroom_student.classroom_id
                ).first()
                if classroom:
                    classroom_info = {
                        'id': classroom.id,
                        'name': classroom.name
                    }
        
        eval_dict = {
            'id': eval.id,
            'student_id': eval.student_id,
            'subject_id': eval.subject_id,
            'teacher_id': eval.teacher_id,
            'reading': eval.reading,
            'writing': eval.writing,
            'analysis': eval.analysis,
            'created_at': eval.created_at,
            'subject_name': eval.subject_name,
            'student_name': eval.student_name,
            'classroom_id': classroom_info['id'] if classroom_info else None,
            'classroom_name': classroom_info['name'] if classroom_info else None,
            'characteristic_scores': [
                {
                    'id': score.id,
                    'topic_id': score.topic_id,
                    'rating': score.rating,
                    'topic_name': score.topic_name
                }
                for score in eval.characteristic_scores
            ]
        }
        result.append(eval_dict)
    
    return result

@router.get("/teacher/{teacher_id}", response_model=List[EvaluationResponse])
async def get_teacher_evaluations(
    teacher_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    if current_user.role != "admin" and current_user.id != teacher_id:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    return db.query(EvaluationModel).filter(EvaluationModel.teacher_id == teacher_id).all()

@router.put("/{evaluation_id}", response_model=EvaluationResponse)
async def update_evaluation(
    evaluation_id: int,
    evaluation_update: EvaluationUpdate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    # Find the evaluation
    db_evaluation = db.query(EvaluationModel).filter(EvaluationModel.id == evaluation_id).first()
    if not db_evaluation:
        raise HTTPException(status_code=404, detail="Evaluation not found")
    
    # Check if user is authorized (teacher who created it or admin)
    if current_user.role != "admin" and current_user.id != db_evaluation.teacher_id:
        raise HTTPException(status_code=403, detail="Not authorized to update this evaluation")
    
    # Update main evaluation fields
    update_data = evaluation_update.dict(exclude_unset=True, exclude={'characteristic_scores'})
    for field, value in update_data.items():
        setattr(db_evaluation, field, value)
    
    # Update characteristic scores if provided
    if evaluation_update.characteristic_scores is not None:
        # Delete existing characteristic scores
        db.query(CharacteristicScoreModel).filter(CharacteristicScoreModel.evaluation_id == evaluation_id).delete()
        
        # Add new characteristic scores
        for score in evaluation_update.characteristic_scores:
            db_score = CharacteristicScoreModel(
                evaluation_id=evaluation_id,
                topic_id=score.topic_id,
                rating=score.rating
            )
            db.add(db_score)
    
    db.commit()
    db.refresh(db_evaluation)
    return db_evaluation

@router.delete("/{evaluation_id}")
async def delete_evaluation(
    evaluation_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    # Find the evaluation
    db_evaluation = db.query(EvaluationModel).filter(EvaluationModel.id == evaluation_id).first()
    if not db_evaluation:
        raise HTTPException(status_code=404, detail="Evaluation not found")
    
    # Check if user is authorized (teacher who created it or admin)
    if current_user.role != "admin" and current_user.id != db_evaluation.teacher_id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this evaluation")
    
    # Delete characteristic scores first
    db.query(CharacteristicScoreModel).filter(CharacteristicScoreModel.evaluation_id == evaluation_id).delete()
    
    # Delete the evaluation
    db.delete(db_evaluation)
    db.commit()
    
    return {"message": "Evaluation deleted successfully"}

# --- Evaluation Summary for Admin ---

@router.get("/summary", response_model=EvaluationSummaryResponse)
async def get_evaluation_summary(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can view evaluation summaries")
    
    # Get all evaluations for the admin's school with subject info
    evaluations = db.query(EvaluationModel).filter(
        EvaluationModel.student.has(school_id=current_user.school_id)
    ).all()
    
    if not evaluations:
        return EvaluationSummaryResponse(
            total_evaluations=0,
            total_students_evaluated=0,
            average_reading_score=0.0,
            average_writing_score=0.0,
            average_analysis_score=0.0,
            characteristic_scores_summary=[],
            subject_summaries=[]
        )
    
    # Calculate overall basic stats
    total_evaluations = len(evaluations)
    unique_students = len(set(e.student_id for e in evaluations))
    
    # Rating to score mapping
    rating_scores = {"excellent": 4, "good": 3, "pass": 2, "fail": 1}
    
    # Calculate overall averages for reading, writing, analysis
    reading_scores = [rating_scores.get(e.reading, 0) for e in evaluations if e.reading in rating_scores]
    writing_scores = [rating_scores.get(e.writing, 0) for e in evaluations if e.writing in rating_scores]
    analysis_scores = [rating_scores.get(e.analysis, 0) for e in evaluations if e.analysis in rating_scores]
    
    avg_reading = sum(reading_scores) / len(reading_scores) if reading_scores else 0.0
    avg_writing = sum(writing_scores) / len(writing_scores) if writing_scores else 0.0
    avg_analysis = sum(analysis_scores) / len(analysis_scores) if analysis_scores else 0.0
    
    # Calculate overall characteristic scores summary
    characteristic_summary = []
    all_characteristic_scores = []
    for evaluation in evaluations:
        all_characteristic_scores.extend(evaluation.characteristic_scores)
    
    if all_characteristic_scores:
        # Group by topic
        topic_scores = {}
        for score in all_characteristic_scores:
            topic_name = score.topic.name if score.topic else "Unknown Topic"
            if topic_name not in topic_scores:
                topic_scores[topic_name] = []
            topic_scores[topic_name].append(rating_scores.get(score.rating, 0))
        
        # Calculate averages for each topic
        for topic_name, scores in topic_scores.items():
            avg_score = sum(scores) / len(scores) if scores else 0.0
            characteristic_summary.append({
                "topic_name": topic_name,
                "average_score": round(avg_score, 2),
                "count": len(scores)
            })
    
    # Calculate subject-wise summaries
    subject_summaries = []
    evaluations_by_subject = {}
    
    # Group evaluations by subject
    for evaluation in evaluations:
        subject_id = evaluation.subject_id
        if subject_id not in evaluations_by_subject:
            evaluations_by_subject[subject_id] = {
                'subject': evaluation.subject,
                'evaluations': []
            }
        evaluations_by_subject[subject_id]['evaluations'].append(evaluation)
    
    # Calculate stats for each subject
    for subject_id, data in evaluations_by_subject.items():
        subject_evaluations = data['evaluations']
        subject = data['subject']
        
        # Basic stats for this subject
        subject_total_evaluations = len(subject_evaluations)
        subject_unique_students = len(set(e.student_id for e in subject_evaluations))
        
        # Calculate averages for reading, writing, analysis for this subject
        subject_reading_scores = [rating_scores.get(e.reading, 0) for e in subject_evaluations if e.reading in rating_scores]
        subject_writing_scores = [rating_scores.get(e.writing, 0) for e in subject_evaluations if e.writing in rating_scores]
        subject_analysis_scores = [rating_scores.get(e.analysis, 0) for e in subject_evaluations if e.analysis in rating_scores]
        
        subject_avg_reading = sum(subject_reading_scores) / len(subject_reading_scores) if subject_reading_scores else 0.0
        subject_avg_writing = sum(subject_writing_scores) / len(subject_writing_scores) if subject_writing_scores else 0.0
        subject_avg_analysis = sum(subject_analysis_scores) / len(subject_analysis_scores) if subject_analysis_scores else 0.0
        
        # Calculate characteristic scores for this subject
        subject_characteristic_summary = []
        subject_characteristic_scores = []
        for evaluation in subject_evaluations:
            subject_characteristic_scores.extend(evaluation.characteristic_scores)
        
        if subject_characteristic_scores:
            # Group by topic for this subject
            subject_topic_scores = {}
            for score in subject_characteristic_scores:
                topic_name = score.topic.name if score.topic else "Unknown Topic"
                if topic_name not in subject_topic_scores:
                    subject_topic_scores[topic_name] = []
                subject_topic_scores[topic_name].append(rating_scores.get(score.rating, 0))
            
            # Calculate averages for each topic in this subject
            for topic_name, scores in subject_topic_scores.items():
                avg_score = sum(scores) / len(scores) if scores else 0.0
                subject_characteristic_summary.append({
                    "topic_name": topic_name,
                    "average_score": round(avg_score, 2),
                    "count": len(scores)
                })
        
        subject_summaries.append({
            "subject_id": subject_id,
            "subject_name": subject.name if subject else "Unknown Subject",
            "total_evaluations": subject_total_evaluations,
            "total_students_evaluated": subject_unique_students,
            "average_reading_score": round(subject_avg_reading, 2),
            "average_writing_score": round(subject_avg_writing, 2),
            "average_analysis_score": round(subject_avg_analysis, 2),
            "characteristic_scores_summary": subject_characteristic_summary
        })
    
    return EvaluationSummaryResponse(
        total_evaluations=total_evaluations,
        total_students_evaluated=unique_students,
        average_reading_score=round(avg_reading, 2),
        average_writing_score=round(avg_writing, 2),
        average_analysis_score=round(avg_analysis, 2),
        characteristic_scores_summary=characteristic_summary,
        subject_summaries=subject_summaries
    )

# --- Characteristic Topics CRUD ---

@router.get("/characteristic-topics", response_model=List[CharacteristicTopicResponse])
@router.get("/characteristic-topics/", response_model=List[CharacteristicTopicResponse])
async def get_characteristic_topics(
    school_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    # Use school_id from query or current_user
    target_school_id = school_id or (current_user.school_id if hasattr(current_user, 'school_id') else None)
    
    if not target_school_id:
        return db.query(CharacteristicTopicModel).filter(CharacteristicTopicModel.is_active == 1).all()
        
    return db.query(CharacteristicTopicModel).filter(
        CharacteristicTopicModel.school_id == target_school_id,
        CharacteristicTopicModel.is_active == 1
    ).all()

@router.post("/characteristic-topics", response_model=CharacteristicTopicResponse)
@router.post("/characteristic-topics/", response_model=CharacteristicTopicResponse)
async def create_characteristic_topic(
    topic: CharacteristicTopicCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can manage evaluation topics")
    
    if not current_user.school_id:
        raise HTTPException(status_code=400, detail="User must belong to a school")

    db_topic = CharacteristicTopicModel(
        name=topic.name,
        school_id=current_user.school_id,
        is_active=1
    )
    db.add(db_topic)
    db.commit()
    db.refresh(db_topic)
    return db_topic

@router.delete("/characteristic-topics/{topic_id}")
async def delete_characteristic_topic(
    topic_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can manage evaluation topics")
        
    db_topic = db.query(CharacteristicTopicModel).filter(
        CharacteristicTopicModel.id == topic_id,
        CharacteristicTopicModel.school_id == current_user.school_id
    ).first()
    
    if not db_topic:
        raise HTTPException(status_code=404, detail="Topic not found")
        
    # Soft delete
    db_topic.is_active = 0
    db.commit()
    return {"message": "Topic deleted successfully"}
