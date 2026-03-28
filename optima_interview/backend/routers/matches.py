from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
import models
import schemas
import auth as auth_utils

router = APIRouter(prefix="/matches", tags=["matches"])


@router.get("/", response_model=List[schemas.MatchOut])
def company_matches(
    job_id: int = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.require_company),
):
    """
    Returns top candidates matched to this company's job postings,
    ranked by match_score descending.
    """
    query = (
        db.query(models.Match)
        .join(models.JobPosting, models.Match.job_id == models.JobPosting.id)
        .filter(models.JobPosting.company_user_id == current_user.id)
    )

    if job_id:
        query = query.filter(models.Match.job_id == job_id)

    matches = (
        query.order_by(models.Match.match_score.desc())
        .limit(limit)
        .all()
    )

    result = []
    for m in matches:
        out = schemas.MatchOut.model_validate(m)
        out.candidate_name = m.candidate.name if m.candidate else None
        out.candidate_email = m.candidate.email if m.candidate else None
        out.job_title = m.job.title if m.job else None
        out.industry = m.job.industry if m.job else None
        result.append(out)
    return result


@router.get("/mine", response_model=List[schemas.MatchOut])
def candidate_matches(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.require_candidate),
):
    """
    Returns companies that have matched with this candidate.
    """
    matches = (
        db.query(models.Match)
        .filter(models.Match.candidate_user_id == current_user.id)
        .order_by(models.Match.match_score.desc())
        .all()
    )

    result = []
    for m in matches:
        out = schemas.MatchOut.model_validate(m)
        out.job_title = m.job.title if m.job else None
        out.industry = m.job.industry if m.job else None
        # Don't expose company email to candidate — just company name via job
        out.candidate_name = current_user.name
        result.append(out)
    return result


@router.patch("/{match_id}/status")
def update_match_status(
    match_id: int,
    new_status: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.require_company),
):
    """Allow companies to mark a match as viewed or contacted."""
    if new_status not in ("pending", "viewed", "contacted"):
        raise HTTPException(status_code=400, detail="Invalid status")

    match = db.query(models.Match).filter(models.Match.id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    # Verify this match belongs to one of the company's jobs
    job = db.query(models.JobPosting).filter(
        models.JobPosting.id == match.job_id,
        models.JobPosting.company_user_id == current_user.id,
    ).first()
    if not job:
        raise HTTPException(status_code=403, detail="Access denied")

    match.status = new_status
    db.commit()
    return {"ok": True, "status": new_status}
