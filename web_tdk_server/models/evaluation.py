from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
from database.connection import Base

class Evaluation(Base):
    __tablename__ = "evaluations"
    __table_args__ = (
        UniqueConstraint('student_id', 'subject_id', name='uq_evaluation_student_subject'),
    )

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    teacher_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    reading = Column(String(50), nullable=False)  # excellent, good, pass, fail
    writing = Column(String(50), nullable=False)
    analysis = Column(String(50), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    student = relationship("User", foreign_keys=[student_id])
    subject = relationship("Subject")
    teacher = relationship("User", foreign_keys=[teacher_id])
    characteristic_scores = relationship("CharacteristicScore", back_populates="evaluation", cascade="all, delete-orphan")

    @property
    def subject_name(self):
        return self.subject.name if self.subject else None

    @property
    def student_name(self):
        return self.student.full_name if self.student else None

class CharacteristicTopic(Base):
    __tablename__ = "characteristic_topics"
    id = Column(Integer, primary_key=True, index=True)
    school_id = Column(Integer, ForeignKey("schools.id"), nullable=False)
    name = Column(String(255), nullable=False)
    is_active = Column(Integer, default=1)

class CharacteristicScore(Base):
    __tablename__ = "characteristic_scores"
    id = Column(Integer, primary_key=True, index=True)
    evaluation_id = Column(Integer, ForeignKey("evaluations.id", ondelete="CASCADE"), nullable=False)
    topic_id = Column(Integer, ForeignKey("characteristic_topics.id"), nullable=False)
    rating = Column(String(50), nullable=False)  # excellent, good, pass, fail

    # Relationships
    evaluation = relationship("Evaluation", back_populates="characteristic_scores")
    topic = relationship("CharacteristicTopic")

    @property
    def topic_name(self):
        return self.topic.name if self.topic else None
