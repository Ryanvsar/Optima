from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, JSON, UniqueConstraint
from sqlalchemy.orm import relationship
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False)  # "candidate" | "company"
    created_at = Column(DateTime, default=datetime.utcnow)

    # Contact
    phone_number = Column(String, nullable=True)
    profile_picture_url = Column(String, nullable=True)  # path under uploads/avatars/

    # About (candidate)
    age = Column(Integer, nullable=True)
    sex = Column(String, nullable=True)          # "Male"|"Female"|"Intersex"|"Prefer not to say"
    gender = Column(String, nullable=True)
    ethnicity = Column(String, nullable=True)
    disabilities = Column(String, nullable=True)

    # Resume (candidate)
    resume_text = Column(Text, nullable=True)
    resume_filename = Column(String, nullable=True)  # path under uploads/resumes/

    # Work preferences (candidate)
    skills = Column(JSON, nullable=True)          # List[str]
    desired_roles = Column(JSON, nullable=True)   # List[str], max 5
    location = Column(String, nullable=True)
    distance_km = Column(Integer, nullable=True)
    work_type = Column(String, nullable=True)     # "onsite"|"hybrid"|"remote"|"any"
    pay_min = Column(Integer, nullable=True)
    pay_max = Column(Integer, nullable=True)
    hours_type = Column(String, nullable=True)    # "full_time"|"part_time"|"contract"|"any"
    level = Column(String, nullable=True)         # "internship"|"entry"|"senior" or null
    start_date = Column(String, nullable=True)    # ISO date string
    work_term = Column(String, nullable=True)     # e.g. "4 months", "Permanent"

    # Company fields
    company_description = Column(Text, nullable=True)
    company_locations = Column(JSON, nullable=True)   # List[str]

    sessions = relationship("InterviewSession", back_populates="user")
    job_postings = relationship("JobPosting", back_populates="company")
    matches = relationship("Match", back_populates="candidate")
    favourites = relationship("Favourite", back_populates="candidate",
                              foreign_keys="Favourite.candidate_user_id")
    applications = relationship("Application", back_populates="candidate",
                                foreign_keys="Application.candidate_user_id")


class InterviewSession(Base):
    __tablename__ = "interview_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    job_title = Column(String, nullable=False)
    industry = Column(String, nullable=False)
    overall_score = Column(Float, nullable=True)
    status = Column(String, default="in_progress")  # "in_progress" | "completed"
    session_type = Column(String, default="mock")    # "mock" | "connecting"
    connecting_week = Column(String, nullable=True)  # "2026-W12" for rate-limit
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="sessions")
    questions = relationship("InterviewQuestion", back_populates="session",
                             order_by="InterviewQuestion.id")
    matches = relationship("Match", back_populates="session")
    applications = relationship("Application", back_populates="session")


class InterviewQuestion(Base):
    __tablename__ = "interview_questions"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("interview_sessions.id"), nullable=False)
    question_text = Column(Text, nullable=False)
    question_type = Column(String, nullable=False)  # "verbal" | "code"
    key_points = Column(JSON, nullable=True)        # list of expected key points
    user_answer = Column(Text, nullable=True)
    score = Column(Float, nullable=True)            # 0-100
    feedback = Column(Text, nullable=True)
    key_points_hit = Column(JSON, nullable=True)    # list of points the user covered
    question_order = Column(Integer, nullable=False, default=0)

    session = relationship("InterviewSession", back_populates="questions")


class JobPosting(Base):
    __tablename__ = "job_postings"

    id = Column(Integer, primary_key=True, index=True)
    company_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    industry = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    required_skills = Column(JSON, nullable=True)       # List[str]
    location_type = Column(String, default="hybrid")    # "remote" | "hybrid" | "onsite"
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    deactivated_at = Column(DateTime, nullable=True)

    # Extended fields
    responsibilities = Column(Text, nullable=True)
    education_required = Column(String, nullable=True)
    experience_required = Column(String, nullable=True)
    certifications_required = Column(String, nullable=True)
    salary_min = Column(Integer, nullable=True)
    salary_max = Column(Integer, nullable=True)
    hours_type = Column(String, nullable=True)          # "full_time"|"part_time"|"contract"
    job_level = Column(String, nullable=True)           # "internship"|"entry"|"senior"
    specific_questions = Column(JSON, nullable=True)    # List[str], max 5
    start_date = Column(String, nullable=True)          # e.g. "May 2026", "ASAP"
    work_term = Column(String, nullable=True)           # e.g. "4 months", "Permanent"

    company = relationship("User", back_populates="job_postings")
    matches = relationship("Match", back_populates="job")
    favourited_by = relationship("Favourite", back_populates="job")
    applications = relationship("Application", back_populates="job")


class Match(Base):
    __tablename__ = "matches"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("job_postings.id"), nullable=False)
    candidate_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    session_id = Column(Integer, ForeignKey("interview_sessions.id"), nullable=False)
    match_score = Column(Float, nullable=False)         # AI-computed composite score (0-100)
    reasoning = Column(Text, nullable=True)
    status = Column(String, default="pending")          # "pending"|"viewed"|"contacted"
    created_at = Column(DateTime, default=datetime.utcnow)

    # Score breakdown components
    interview_performance_score = Column(Float, nullable=True)   # 40% weight
    answer_relevance_score = Column(Float, nullable=True)        # 35% weight
    profile_skills_score = Column(Float, nullable=True)          # 10% weight
    ats_score = Column(Float, nullable=True)                     # 15% weight

    # Application data
    withdrawn = Column(Boolean, default=False)
    tailored_resume_text = Column(Text, nullable=True)
    cover_letter_text = Column(Text, nullable=True)

    job = relationship("JobPosting", back_populates="matches")
    candidate = relationship("User", back_populates="matches")
    session = relationship("InterviewSession", back_populates="matches")


class Favourite(Base):
    __tablename__ = "favourites"

    id = Column(Integer, primary_key=True, index=True)
    candidate_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    job_id = Column(Integer, ForeignKey("job_postings.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (UniqueConstraint("candidate_user_id", "job_id", name="uq_favourite"),)

    candidate = relationship("User", back_populates="favourites",
                             foreign_keys=[candidate_user_id])
    job = relationship("JobPosting", back_populates="favourited_by")


class Application(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)
    candidate_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    job_id = Column(Integer, ForeignKey("job_postings.id"), nullable=False)
    session_id = Column(Integer, ForeignKey("interview_sessions.id"), nullable=False)
    match_score = Column(Float, nullable=False)

    # Score breakdown
    interview_performance_score = Column(Float, nullable=True)
    answer_relevance_score = Column(Float, nullable=True)
    profile_skills_score = Column(Float, nullable=True)
    ats_score = Column(Float, nullable=True)

    # Application content
    tailored_resume_text = Column(Text, nullable=True)
    tailored_resume_filename = Column(String, nullable=True)
    cover_letter_text = Column(Text, nullable=True)
    cover_letter_filename = Column(String, nullable=True)
    status = Column(String, default="applied")   # "applied"|"viewed"|"contacted"|"withdrawn"
    reasoning = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    candidate = relationship("User", back_populates="applications",
                             foreign_keys=[candidate_user_id])
    job = relationship("JobPosting", back_populates="applications")
    session = relationship("InterviewSession", back_populates="applications")
