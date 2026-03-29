from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from database import get_db
import models
import schemas
import auth as auth_utils
import claude_client
from question_bank import SUPPORTED_INDUSTRIES, get_roles_for_industry

router = APIRouter(prefix="/interviews", tags=["interviews"])


@router.get("/can-connect", response_model=schemas.ConnectAvailability)
def can_connect(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.require_candidate),
):
    """Check if the candidate can start a new connecting interview (1 per 7 days)."""
    cutoff = datetime.utcnow() - timedelta(days=7)
    recent = (
        db.query(models.InterviewSession)
        .filter(
            models.InterviewSession.user_id == current_user.id,
            models.InterviewSession.session_type == "connecting",
            models.InterviewSession.created_at >= cutoff,
        )
        .order_by(models.InterviewSession.created_at.desc())
        .first()
    )
    if recent:
        next_available = (recent.created_at + timedelta(days=7)).isoformat()
        return schemas.ConnectAvailability(can_connect=False, next_available=next_available)
    return schemas.ConnectAvailability(can_connect=True)


@router.get("/roles", response_model=List[str])
def list_roles_for_industry(industry: str = Query(...)):
    """Return up to 10 job titles for the given industry (used for mock interview setup)."""
    return get_roles_for_industry(industry)


@router.get("/industries", response_model=List[str])
def list_industries():
    return SUPPORTED_INDUSTRIES


@router.post("/start", response_model=schemas.InterviewStartResponse, status_code=status.HTTP_201_CREATED)
def start_interview(
    payload: schemas.InterviewStart,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.require_candidate),
):
    session_type = payload.session_type or "mock"

    if session_type == "mock":
        # Enforce 3-per-day limit
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        mock_today = (
            db.query(models.InterviewSession)
            .filter(
                models.InterviewSession.user_id == current_user.id,
                models.InterviewSession.session_type == "mock",
                models.InterviewSession.created_at >= today_start,
            )
            .count()
        )
        if mock_today >= 3:
            raise HTTPException(
                status_code=429,
                detail="Daily mock interview limit reached (3 per day). Try again tomorrow.",
            )

    if session_type == "connecting":
        # Enforce 1-per-7-days limit
        cutoff = datetime.utcnow() - timedelta(days=7)
        recent = (
            db.query(models.InterviewSession)
            .filter(
                models.InterviewSession.user_id == current_user.id,
                models.InterviewSession.session_type == "connecting",
                models.InterviewSession.created_at >= cutoff,
            )
            .first()
        )
        if recent:
            next_available = (recent.created_at + timedelta(days=7)).isoformat()
            raise HTTPException(
                status_code=429,
                detail=f"Connecting interview limit reached. Next available: {next_available}",
            )

        # Fetch favourited jobs
        if not payload.favourite_job_ids:
            raise HTTPException(status_code=400, detail="No favourite jobs provided for connecting interview")

        favourite_jobs = (
            db.query(models.JobPosting)
            .filter(
                models.JobPosting.id.in_(payload.favourite_job_ids),
                models.JobPosting.is_active == True,
            )
            .all()
        )
        if not favourite_jobs:
            raise HTTPException(status_code=400, detail="No active jobs found in your favourites")

        # Build job dicts for Claude
        jobs_data = [
            {
                "title": j.title,
                "description": j.description,
                "required_skills": j.required_skills or [],
                "specific_questions": j.specific_questions or [],
                "company_name": j.company.name if j.company else "",
            }
            for j in favourite_jobs
        ]
        candidate_profile = {
            "skills": current_user.skills or [],
            "desired_roles": current_user.desired_roles or [],
        }

        try:
            questions_data = claude_client.generate_connecting_questions(jobs_data, candidate_profile)
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Failed to generate questions: {str(e)}")

        # For connecting sessions, store a representative job title and industry
        job_title = ", ".join(set(j.title for j in favourite_jobs[:3]))
        industry = favourite_jobs[0].industry
        connecting_week = datetime.utcnow().strftime("%Y-W%V")

    else:  # mock
        try:
            questions_data = claude_client.generate_mock_questions(payload.job_title, payload.industry)
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Failed to generate questions: {str(e)}")

        job_title = payload.job_title
        industry = payload.industry
        connecting_week = None

    # Create session
    session = models.InterviewSession(
        user_id=current_user.id,
        job_title=job_title,
        industry=industry,
        status="in_progress",
        session_type=session_type,
        connecting_week=connecting_week,
    )
    db.add(session)
    db.flush()

    # Persist questions
    db_questions = []
    for i, q in enumerate(questions_data):
        question = models.InterviewQuestion(
            session_id=session.id,
            question_text=q["question_text"],
            question_type=q["question_type"],
            key_points=q["key_points"],
            question_order=i,
        )
        db.add(question)
        db_questions.append(question)

    db.commit()
    db.refresh(session)
    for q in db_questions:
        db.refresh(q)

    return schemas.InterviewStartResponse(
        session_id=session.id,
        job_title=session.job_title,
        industry=session.industry,
        session_type=session.session_type,
        questions=[schemas.QuestionOut.model_validate(q) for q in db_questions],
    )


@router.post("/{session_id}/submit", response_model=schemas.InterviewResultResponse)
def submit_interview(
    session_id: int,
    payload: schemas.InterviewSubmit,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.require_candidate),
):
    session = db.query(models.InterviewSession).filter(
        models.InterviewSession.id == session_id,
        models.InterviewSession.user_id == current_user.id,
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found")
    if session.status == "completed":
        raise HTTPException(status_code=409, detail="Interview already submitted")

    answer_map = {a.question_id: a.answer for a in payload.answers}

    questions = (
        db.query(models.InterviewQuestion)
        .filter(models.InterviewQuestion.session_id == session_id)
        .order_by(models.InterviewQuestion.question_order)
        .all()
    )

    total_score = 0.0
    graded_count = 0

    for question in questions:
        answer_text = answer_map.get(question.id, "")
        question.user_answer = answer_text

        try:
            result = claude_client.grade_answer(
                question_text=question.question_text,
                question_type=question.question_type,
                key_points=question.key_points or [],
                user_answer=answer_text,
            )
            question.score = result["score"]
            question.feedback = result["feedback"]
            question.key_points_hit = result["key_points_hit"]
            total_score += result["score"]
            graded_count += 1
        except Exception:
            question.score = 0.0
            question.feedback = "Could not grade this answer."
            question.key_points_hit = []

    overall = round(total_score / graded_count, 1) if graded_count > 0 else 0.0
    session.overall_score = overall
    session.status = "completed"
    session.completed_at = datetime.utcnow()

    db.commit()
    db.refresh(session)

    # Trigger matching after completion
    if session.session_type == "connecting":
        _create_applications(db, session, current_user, payload.answers)
    else:
        _create_matches(db, session, current_user)

    return schemas.InterviewResultResponse(
        session_id=session.id,
        job_title=session.job_title,
        industry=session.industry,
        session_type=session.session_type,
        overall_score=session.overall_score,
        status=session.status,
        created_at=session.created_at,
        completed_at=session.completed_at,
        questions=[schemas.QuestionResult.model_validate(q) for q in questions],
    )


def _create_matches(db: Session, session: models.InterviewSession, candidate: models.User):
    """
    For mock interviews: match against active jobs in the same industry.
    Uses the updated 4-component scoring.
    """
    active_jobs = (
        db.query(models.JobPosting)
        .filter(
            models.JobPosting.industry == session.industry,
            models.JobPosting.is_active == True,
        )
        .all()
    )
    if not active_jobs:
        return

    questions = (
        db.query(models.InterviewQuestion)
        .filter(models.InterviewQuestion.session_id == session.id)
        .order_by(models.InterviewQuestion.question_order)
        .all()
    )
    qa_pairs = [{"question": q.question_text, "answer": q.user_answer or ""} for q in questions]

    for job in active_jobs:
        try:
            result = claude_client.score_candidate_job_match(
                job_title=job.title,
                job_description=job.description,
                required_skills=job.required_skills or [],
                candidate_job_title=session.job_title,
                candidate_industry=session.industry,
                qa_pairs=qa_pairs,
                candidate_skills=candidate.skills or [],
                candidate_resume=candidate.resume_text,
                session_type="mock",
            )
            match_score = result["match_score"]
            reasoning = result["reasoning"]
            ip_score = result.get("interview_performance_score")
            ar_score = result.get("answer_relevance_score")
            ps_score = result.get("profile_skills_score")
            ats = result.get("ats_score")
        except Exception:
            match_score = session.overall_score or 0.0
            reasoning = "Match score based on overall interview performance."
            ip_score = ar_score = ps_score = ats = None

        existing = db.query(models.Match).filter(
            models.Match.job_id == job.id,
            models.Match.candidate_user_id == candidate.id,
        ).first()

        if existing:
            if match_score > existing.match_score:
                existing.match_score = match_score
                existing.reasoning = reasoning
                existing.session_id = session.id
                existing.interview_performance_score = ip_score
                existing.answer_relevance_score = ar_score
                existing.profile_skills_score = ps_score
                existing.ats_score = ats
        else:
            match = models.Match(
                job_id=job.id,
                candidate_user_id=candidate.id,
                session_id=session.id,
                match_score=match_score,
                reasoning=reasoning,
                interview_performance_score=ip_score,
                answer_relevance_score=ar_score,
                profile_skills_score=ps_score,
                ats_score=ats,
            )
            db.add(match)

    db.commit()


def _create_applications(db: Session, session: models.InterviewSession, candidate: models.User, answers):
    """
    For connecting interviews: score against all active jobs in the same industry
    and create Application records for matches scoring >= 40.
    """
    active_jobs = (
        db.query(models.JobPosting)
        .filter(
            models.JobPosting.industry == session.industry,
            models.JobPosting.is_active == True,
        )
        .all()
    )
    if not active_jobs:
        return

    questions = (
        db.query(models.InterviewQuestion)
        .filter(models.InterviewQuestion.session_id == session.id)
        .order_by(models.InterviewQuestion.question_order)
        .all()
    )
    qa_pairs = [{"question": q.question_text, "answer": q.user_answer or ""} for q in questions]

    for job in active_jobs:
        try:
            result = claude_client.score_candidate_job_match(
                job_title=job.title,
                job_description=job.description,
                required_skills=job.required_skills or [],
                candidate_job_title=session.job_title,
                candidate_industry=session.industry,
                qa_pairs=qa_pairs,
                candidate_skills=candidate.skills or [],
                candidate_resume=candidate.resume_text,
                session_type="connecting",
            )
            match_score = result["match_score"]
            reasoning = result["reasoning"]
            ip_score = result.get("interview_performance_score")
            ar_score = result.get("answer_relevance_score")
            ps_score = result.get("profile_skills_score")
            ats = result.get("ats_score")
        except Exception:
            match_score = session.overall_score or 0.0
            reasoning = "Match score based on overall interview performance."
            ip_score = ar_score = ps_score = ats = None

        # Only create application if score warrants it (>= 40%)
        if match_score < 40:
            continue

        existing = (
            db.query(models.Application)
            .filter(
                models.Application.job_id == job.id,
                models.Application.candidate_user_id == candidate.id,
            )
            .first()
        )

        if existing:
            if match_score > existing.match_score:
                existing.match_score = match_score
                existing.reasoning = reasoning
                existing.session_id = session.id
                existing.interview_performance_score = ip_score
                existing.answer_relevance_score = ar_score
                existing.profile_skills_score = ps_score
                existing.ats_score = ats
                if existing.status == "withdrawn":
                    existing.status = "applied"
        else:
            app = models.Application(
                candidate_user_id=candidate.id,
                job_id=job.id,
                session_id=session.id,
                match_score=match_score,
                reasoning=reasoning,
                interview_performance_score=ip_score,
                answer_relevance_score=ar_score,
                profile_skills_score=ps_score,
                ats_score=ats,
            )
            db.add(app)

    db.commit()


@router.get("/{session_id}/results", response_model=schemas.InterviewResultResponse)
def get_results(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user),
):
    session = db.query(models.InterviewSession).filter(
        models.InterviewSession.id == session_id,
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found")

    if current_user.role == "candidate" and session.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    questions = (
        db.query(models.InterviewQuestion)
        .filter(models.InterviewQuestion.session_id == session_id)
        .order_by(models.InterviewQuestion.question_order)
        .all()
    )

    return schemas.InterviewResultResponse(
        session_id=session.id,
        job_title=session.job_title,
        industry=session.industry,
        session_type=session.session_type,
        overall_score=session.overall_score,
        status=session.status,
        created_at=session.created_at,
        completed_at=session.completed_at,
        questions=[schemas.QuestionResult.model_validate(q) for q in questions],
    )


@router.get("/", response_model=List[schemas.SessionSummary])
def list_my_sessions(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.require_candidate),
):
    sessions = (
        db.query(models.InterviewSession)
        .filter(models.InterviewSession.user_id == current_user.id)
        .order_by(models.InterviewSession.created_at.desc())
        .all()
    )
    return [schemas.SessionSummary.model_validate(s) for s in sessions]
