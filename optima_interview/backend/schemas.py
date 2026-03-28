from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, field_validator


# ── Auth ──────────────────────────────────────────────────────────────────────

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    role: str  # "candidate" | "company"

    # Candidate fields
    first_name: Optional[str] = None
    last_name: Optional[str] = None

    # Company fields
    company_name: Optional[str] = None
    location: Optional[str] = None

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v

    @field_validator("email")
    @classmethod
    def email_lowercase(cls, v: str) -> str:
        return v.lower().strip()


class UserLogin(BaseModel):
    email: EmailStr
    password: str

    @field_validator("email")
    @classmethod
    def email_lowercase(cls, v: str) -> str:
        return v.lower().strip()


class UserOut(BaseModel):
    id: int
    email: str
    name: str
    role: str
    created_at: datetime

    class Config:
        from_attributes = True


class UserProfileOut(BaseModel):
    id: int
    email: str
    name: str
    role: str
    created_at: datetime

    # Contact
    phone_number: Optional[str] = None
    profile_picture_url: Optional[str] = None

    # About
    age: Optional[int] = None
    sex: Optional[str] = None
    gender: Optional[str] = None
    ethnicity: Optional[str] = None
    disabilities: Optional[str] = None

    # Resume
    resume_text: Optional[str] = None
    resume_filename: Optional[str] = None

    # Preferences
    skills: Optional[List[str]] = None
    desired_roles: Optional[List[str]] = None
    location: Optional[str] = None
    distance_km: Optional[int] = None
    work_type: Optional[str] = None
    pay_min: Optional[int] = None
    pay_max: Optional[int] = None
    hours_type: Optional[str] = None
    level: Optional[str] = None
    start_date: Optional[str] = None
    work_term: Optional[str] = None

    # Company
    company_description: Optional[str] = None
    company_locations: Optional[List[str]] = None

    class Config:
        from_attributes = True


class UserProfileUpdate(BaseModel):
    phone_number: Optional[str] = None
    age: Optional[int] = None
    sex: Optional[str] = None
    gender: Optional[str] = None
    ethnicity: Optional[str] = None
    disabilities: Optional[str] = None
    resume_text: Optional[str] = None
    skills: Optional[List[str]] = None
    desired_roles: Optional[List[str]] = None
    location: Optional[str] = None
    distance_km: Optional[int] = None
    work_type: Optional[str] = None
    pay_min: Optional[int] = None
    pay_max: Optional[int] = None
    hours_type: Optional[str] = None
    level: Optional[str] = None
    start_date: Optional[str] = None
    work_term: Optional[str] = None
    company_description: Optional[str] = None
    company_locations: Optional[List[str]] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserProfileOut


# ── Interviews ────────────────────────────────────────────────────────────────

class InterviewStart(BaseModel):
    job_title: Optional[str] = None
    industry: Optional[str] = None
    session_type: str = "mock"                    # "mock" | "connecting"
    favourite_job_ids: Optional[List[int]] = []   # used for connecting type


class QuestionOut(BaseModel):
    id: int
    question_text: str
    question_type: str  # "verbal" | "code"
    question_order: int

    class Config:
        from_attributes = True


class InterviewStartResponse(BaseModel):
    session_id: int
    job_title: str
    industry: str
    session_type: str
    questions: List[QuestionOut]


class AnswerSubmit(BaseModel):
    question_id: int
    answer: str


class InterviewSubmit(BaseModel):
    answers: List[AnswerSubmit]


class QuestionResult(BaseModel):
    id: int
    question_text: str
    question_type: str
    user_answer: Optional[str]
    score: Optional[float]
    feedback: Optional[str]
    key_points: Optional[List[str]]
    key_points_hit: Optional[List[str]]
    question_order: int

    class Config:
        from_attributes = True


class InterviewResultResponse(BaseModel):
    session_id: int
    job_title: str
    industry: str
    session_type: str
    overall_score: Optional[float]
    status: str
    created_at: datetime
    completed_at: Optional[datetime]
    questions: List[QuestionResult]

    class Config:
        from_attributes = True


class SessionSummary(BaseModel):
    id: int
    job_title: str
    industry: str
    overall_score: Optional[float]
    status: str
    session_type: str
    created_at: datetime

    class Config:
        from_attributes = True


class ConnectAvailability(BaseModel):
    can_connect: bool
    next_available: Optional[str] = None   # ISO datetime string


# ── Jobs ──────────────────────────────────────────────────────────────────────

class JobCreate(BaseModel):
    title: str
    industry: str
    description: Optional[str] = ""
    required_skills: Optional[List[str]] = []
    location_type: Optional[str] = "hybrid"
    responsibilities: Optional[str] = None
    education_required: Optional[str] = None
    experience_required: Optional[str] = None
    certifications_required: Optional[str] = None
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    hours_type: Optional[str] = None
    job_level: Optional[str] = None
    specific_questions: Optional[List[str]] = []
    start_date: Optional[str] = None
    work_term: Optional[str] = None


class JobOut(BaseModel):
    id: int
    company_user_id: int
    title: str
    industry: str
    description: Optional[str] = ""
    required_skills: Optional[List[str]]
    location_type: str
    is_active: bool
    created_at: datetime
    company_name: Optional[str] = None

    # Extended fields
    responsibilities: Optional[str] = None
    education_required: Optional[str] = None
    experience_required: Optional[str] = None
    certifications_required: Optional[str] = None
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    hours_type: Optional[str] = None
    job_level: Optional[str] = None
    specific_questions: Optional[List[str]] = None
    start_date: Optional[str] = None
    work_term: Optional[str] = None

    # Computed applicant counts (populated at query time)
    candidate_count_65: Optional[int] = None
    candidate_count_80: Optional[int] = None

    class Config:
        from_attributes = True


class JobUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    required_skills: Optional[List[str]] = None
    location_type: Optional[str] = None
    is_active: Optional[bool] = None
    responsibilities: Optional[str] = None
    education_required: Optional[str] = None
    experience_required: Optional[str] = None
    certifications_required: Optional[str] = None
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    hours_type: Optional[str] = None
    job_level: Optional[str] = None
    specific_questions: Optional[List[str]] = None
    start_date: Optional[str] = None
    work_term: Optional[str] = None


# ── Favourites ────────────────────────────────────────────────────────────────

class FavouriteOut(BaseModel):
    id: int
    job_id: int
    created_at: datetime
    job_title: Optional[str] = None
    company_name: Optional[str] = None
    industry: Optional[str] = None
    location_type: Optional[str] = None
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    hours_type: Optional[str] = None
    job_level: Optional[str] = None

    class Config:
        from_attributes = True


# ── Applications ──────────────────────────────────────────────────────────────

class ApplicationOut(BaseModel):
    id: int
    job_id: int
    session_id: int
    match_score: float
    interview_performance_score: Optional[float] = None
    answer_relevance_score: Optional[float] = None
    profile_skills_score: Optional[float] = None
    ats_score: Optional[float] = None
    tailored_resume_text: Optional[str] = None
    tailored_resume_filename: Optional[str] = None
    cover_letter_text: Optional[str] = None
    cover_letter_filename: Optional[str] = None
    status: str
    reasoning: Optional[str] = None
    created_at: datetime
    job_title: Optional[str] = None
    company_name: Optional[str] = None
    industry: Optional[str] = None

    class Config:
        from_attributes = True


class ApplicationUpdate(BaseModel):
    tailored_resume_text: Optional[str] = None
    cover_letter_text: Optional[str] = None


class ApplicantDetail(BaseModel):
    """Full applicant info returned to companies."""
    application_id: int
    match_score: float
    interview_performance_score: Optional[float] = None
    answer_relevance_score: Optional[float] = None
    profile_skills_score: Optional[float] = None
    ats_score: Optional[float] = None
    status: str
    reasoning: Optional[str] = None
    tailored_resume_text: Optional[str] = None
    tailored_resume_filename: Optional[str] = None
    cover_letter_text: Optional[str] = None
    cover_letter_filename: Optional[str] = None
    resume_is_tailored: bool

    # Candidate profile info
    candidate_id: int
    candidate_name: str
    candidate_email: str
    candidate_phone: Optional[str] = None
    candidate_location: Optional[str] = None
    candidate_age: Optional[int] = None
    candidate_profile_picture_url: Optional[str] = None
    candidate_skills: Optional[List[str]] = None
    candidate_resume_text: Optional[str] = None
    candidate_resume_filename: Optional[str] = None

    class Config:
        from_attributes = True


# ── Matches ───────────────────────────────────────────────────────────────────

class MatchOut(BaseModel):
    id: int
    job_id: int
    candidate_user_id: int
    session_id: int
    match_score: float
    reasoning: Optional[str] = None
    status: str
    created_at: datetime
    candidate_name: Optional[str] = None
    candidate_email: Optional[str] = None
    job_title: Optional[str] = None
    industry: Optional[str] = None

    class Config:
        from_attributes = True
