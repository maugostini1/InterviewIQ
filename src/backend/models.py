# models.py
from sqlalchemy import Column, String, Integer, Float, Text, ForeignKey, DateTime, Time, Date
from sqlalchemy.orm import declarative_base, relationship
import uuid
from datetime import datetime

Base = declarative_base()

def gen_id():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"
    user_id = Column(String, primary_key=True, default=gen_id)
    f_name = Column(String, nullable=False)
    l_name = Column(String, nullable=False)
    password_hash = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)

    profile = relationship("Profile", back_populates="user", uselist=False)
    interviews = relationship("Interview", back_populates="user")


class Profile(Base):
    __tablename__ = "profiles"
    profile_id = Column(String, primary_key=True, default=gen_id)
    user_id = Column(String, ForeignKey("users.user_id"), unique=True, nullable=False)
    career_field = Column(String)
    target_job = Column(String)
    resume_file = Column(String)  # store a file path, not the raw file

    user = relationship("User", back_populates="profile")


class Interview(Base):
    __tablename__ = "interviews"
    session_id = Column(String, primary_key=True, default=gen_id)
    user_id = Column(String, ForeignKey("users.user_id"), nullable=False)
    date = Column(Date)
    time = Column(Time)
    score = Column(Float)
    interview_type = Column(String)

    user = relationship("User", back_populates="interviews")
    questions = relationship("Question", back_populates="interview")


class Question(Base):
    __tablename__ = "questions"
    question_id = Column(String, primary_key=True, default=gen_id)
    session_id = Column(String, ForeignKey("interviews.session_id"), nullable=False)
    question_text = Column(Text, nullable=False)
    question_type = Column(String)

    interview = relationship("Interview", back_populates="questions")
    answers = relationship("Answer", back_populates="question")


class Answer(Base):
    __tablename__ = "answers"
    answer_id = Column(String, primary_key=True, default=gen_id)
    question_id = Column(String, ForeignKey("questions.question_id"), nullable=False)
    user_id = Column(String, ForeignKey("users.user_id"), nullable=False)
    response = Column(Text)
    response_time = Column(DateTime, default=datetime.utcnow)

    question = relationship("Question", back_populates="answers")
    feedback = relationship("Feedback", back_populates="answer", uselist=False)


class Feedback(Base):
    __tablename__ = "feedback"
    feedback_id = Column(String, primary_key=True, default=gen_id)
    answer_id = Column(String, ForeignKey("answers.answer_id"), unique=True, nullable=False)
    star_score = Column(Integer)
    missing_info = Column(Text)
    suggested_answer = Column(Text)

    answer = relationship("Answer", back_populates="feedback")