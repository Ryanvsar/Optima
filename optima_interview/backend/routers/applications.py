import shutil
from pathlib import Path
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session

from database import get_db
import models
import schemas
import auth as auth_utils

APP_UPLOAD_DIR = Path(__file__).parent.parent / "uploads" / "applications"

router = APIRouter(prefix="/applications", tags=["applications"])


@router.get("/mine", response_model=List[schemas.ApplicationOut])
def get_my_applications(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.require_candidate),
):
    apps = (
        db.query(models.Application)
        .filter(models.Application.candidate_user_id == current_user.id)
        .order_by(models.Application.created_at.desc())
        .all()
    )
    result = []
    for app in apps:
        out = schemas.ApplicationOut.model_validate(app)
        if app.job:
            out.job_title = app.job.title
            out.company_name = app.job.company.name if app.job.company else None
            out.industry = app.job.industry
        result.append(out)
    return result


@router.get("/mine/session/{session_id}", response_model=List[schemas.ApplicationOut])
def get_applications_for_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.require_candidate),
):
    """Get all applications created from a specific connecting interview session."""
    apps = (
        db.query(models.Application)
        .filter(
            models.Application.candidate_user_id == current_user.id,
            models.Application.session_id == session_id,
        )
        .order_by(models.Application.match_score.desc())
        .all()
    )
    result = []
    for app in apps:
        out = schemas.ApplicationOut.model_validate(app)
        if app.job:
            out.job_title = app.job.title
            out.company_name = app.job.company.name if app.job.company else None
            out.industry = app.job.industry
        result.append(out)
    return result


@router.patch("/{application_id}", response_model=schemas.ApplicationOut)
def update_application(
    application_id: int,
    payload: schemas.ApplicationUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.require_candidate),
):
    app = db.query(models.Application).filter(
        models.Application.id == application_id,
        models.Application.candidate_user_id == current_user.id,
    ).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    if app.status == "withdrawn":
        raise HTTPException(status_code=400, detail="Cannot update a withdrawn application")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(app, field, value)

    db.commit()
    db.refresh(app)
    out = schemas.ApplicationOut.model_validate(app)
    if app.job:
        out.job_title = app.job.title
        out.company_name = app.job.company.name if app.job.company else None
        out.industry = app.job.industry
    return out


@router.post("/{application_id}/withdraw", status_code=status.HTTP_200_OK)
def withdraw_application(
    application_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.require_candidate),
):
    app = db.query(models.Application).filter(
        models.Application.id == application_id,
        models.Application.candidate_user_id == current_user.id,
    ).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    app.status = "withdrawn"
    db.commit()
    return {"ok": True}


@router.get("/for-job/{job_id}", response_model=List[schemas.ApplicantDetail])
def get_applicants_for_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.require_company),
):
    """Company-only: get all applicants for a job posting, sorted by match score."""
    job = db.query(models.JobPosting).filter(
        models.JobPosting.id == job_id,
        models.JobPosting.company_user_id == current_user.id,
    ).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found or access denied")

    apps = (
        db.query(models.Application)
        .filter(
            models.Application.job_id == job_id,
            models.Application.status != "withdrawn",
        )
        .order_by(models.Application.match_score.desc())
        .all()
    )

    result = []
    for app in apps:
        candidate = app.candidate
        if not candidate:
            continue

        has_tailored = bool(app.tailored_resume_text and app.tailored_resume_text.strip())
        resume_text = app.tailored_resume_text if has_tailored else candidate.resume_text

        detail = schemas.ApplicantDetail(
            application_id=app.id,
            match_score=app.match_score,
            interview_performance_score=app.interview_performance_score,
            answer_relevance_score=app.answer_relevance_score,
            profile_skills_score=app.profile_skills_score,
            ats_score=app.ats_score,
            status=app.status,
            reasoning=app.reasoning,
            tailored_resume_text=app.tailored_resume_text,
            tailored_resume_filename=app.tailored_resume_filename,
            cover_letter_text=app.cover_letter_text,
            cover_letter_filename=app.cover_letter_filename,
            resume_is_tailored=has_tailored,
            candidate_id=candidate.id,
            candidate_name=candidate.name,
            candidate_email=candidate.email,
            candidate_phone=candidate.phone_number,
            candidate_location=candidate.location,
            candidate_age=candidate.age,
            candidate_profile_picture_url=candidate.profile_picture_url,
            candidate_skills=candidate.skills,
            candidate_resume_text=resume_text,
            candidate_resume_filename=candidate.resume_filename,
        )
        result.append(detail)
    return result


@router.patch("/{application_id}/status")
def update_application_status(
    application_id: int,
    new_status: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.require_company),
):
    """Company-only: mark application as viewed or contacted."""
    if new_status not in ("viewed", "contacted"):
        raise HTTPException(status_code=400, detail="Status must be 'viewed' or 'contacted'")

    app = (
        db.query(models.Application)
        .join(models.JobPosting, models.Application.job_id == models.JobPosting.id)
        .filter(
            models.Application.id == application_id,
            models.JobPosting.company_user_id == current_user.id,
        )
        .first()
    )
    if not app:
        raise HTTPException(status_code=404, detail="Application not found or access denied")

    app.status = new_status
    db.commit()
    return {"ok": True, "status": new_status}


def _save_application_pdf(file: UploadFile, app_id: int, kind: str) -> str:
    """Save an uploaded PDF for an application, return the URL path."""
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    APP_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"{app_id}_{kind}.pdf"
    dest = APP_UPLOAD_DIR / filename
    with dest.open("wb") as f:
        shutil.copyfileobj(file.file, f)
    return f"/uploads/applications/{filename}"


@router.post("/{application_id}/upload-resume", response_model=schemas.ApplicationOut)
def upload_tailored_resume(
    application_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.require_candidate),
):
    """Candidate: upload a tailored resume PDF for an application."""
    app = db.query(models.Application).filter(
        models.Application.id == application_id,
        models.Application.candidate_user_id == current_user.id,
    ).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    path = _save_application_pdf(file, application_id, "tailored_resume")

    # Extract text for ATS scoring
    try:
        import pdfplumber
        with pdfplumber.open(str(APP_UPLOAD_DIR / f"{application_id}_tailored_resume.pdf")) as pdf:
            text = "\n".join(page.extract_text() or "" for page in pdf.pages)
    except Exception:
        text = None

    app.tailored_resume_filename = path
    if text:
        app.tailored_resume_text = text
    db.commit()
    db.refresh(app)
    out = schemas.ApplicationOut.model_validate(app)
    if app.job:
        out.job_title = app.job.title
        out.company_name = app.job.company.name if app.job.company else None
    return out


@router.post("/{application_id}/upload-cover", response_model=schemas.ApplicationOut)
def upload_cover_letter(
    application_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.require_candidate),
):
    """Candidate: upload a cover letter PDF for an application."""
    app = db.query(models.Application).filter(
        models.Application.id == application_id,
        models.Application.candidate_user_id == current_user.id,
    ).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    path = _save_application_pdf(file, application_id, "cover_letter")

    try:
        import pdfplumber
        with pdfplumber.open(str(APP_UPLOAD_DIR / f"{application_id}_cover_letter.pdf")) as pdf:
            text = "\n".join(page.extract_text() or "" for page in pdf.pages)
    except Exception:
        text = None

    app.cover_letter_filename = path
    if text:
        app.cover_letter_text = text
    db.commit()
    db.refresh(app)
    out = schemas.ApplicationOut.model_validate(app)
    if app.job:
        out.job_title = app.job.title
        out.company_name = app.job.company.name if app.job.company else None
    return out
