from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from database import get_db
import models
import schemas
import auth as auth_utils

router = APIRouter(prefix="/favourites", tags=["favourites"])

MAX_FAVOURITES = 10


@router.get("/", response_model=List[schemas.FavouriteOut])
def list_favourites(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.require_candidate),
):
    favs = (
        db.query(models.Favourite)
        .filter(models.Favourite.candidate_user_id == current_user.id)
        .order_by(models.Favourite.created_at.desc())
        .all()
    )
    result = []
    for fav in favs:
        out = schemas.FavouriteOut.model_validate(fav)
        if fav.job:
            out.job_title = fav.job.title
            out.company_name = fav.job.company.name if fav.job.company else None
            out.industry = fav.job.industry
            out.location_type = fav.job.location_type
            out.salary_min = fav.job.salary_min
            out.salary_max = fav.job.salary_max
            out.hours_type = fav.job.hours_type
            out.job_level = fav.job.job_level
        result.append(out)
    return result


@router.post("/{job_id}", response_model=schemas.FavouriteOut, status_code=status.HTTP_201_CREATED)
def add_favourite(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.require_candidate),
):
    # Check job exists
    job = db.query(models.JobPosting).filter(
        models.JobPosting.id == job_id,
        models.JobPosting.is_active == True,
    ).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Check already favourited
    existing = db.query(models.Favourite).filter(
        models.Favourite.candidate_user_id == current_user.id,
        models.Favourite.job_id == job_id,
    ).first()
    if existing:
        out = schemas.FavouriteOut.model_validate(existing)
        out.job_title = job.title
        out.company_name = job.company.name if job.company else None
        out.industry = job.industry
        out.location_type = job.location_type
        out.salary_min = job.salary_min
        out.salary_max = job.salary_max
        out.hours_type = job.hours_type
        out.job_level = job.job_level
        return out

    # Enforce max 10 limit
    count = db.query(models.Favourite).filter(
        models.Favourite.candidate_user_id == current_user.id,
    ).count()
    if count >= MAX_FAVOURITES:
        raise HTTPException(
            status_code=400,
            detail="Maximum 10 favourites reached. Remove one before adding another.",
        )

    fav = models.Favourite(candidate_user_id=current_user.id, job_id=job_id)
    db.add(fav)
    try:
        db.commit()
        db.refresh(fav)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Already favourited")

    out = schemas.FavouriteOut.model_validate(fav)
    out.job_title = job.title
    out.company_name = job.company.name if job.company else None
    out.industry = job.industry
    out.location_type = job.location_type
    out.salary_min = job.salary_min
    out.salary_max = job.salary_max
    out.hours_type = job.hours_type
    out.job_level = job.job_level
    return out


@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_favourite(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.require_candidate),
):
    fav = db.query(models.Favourite).filter(
        models.Favourite.candidate_user_id == current_user.id,
        models.Favourite.job_id == job_id,
    ).first()
    if not fav:
        raise HTTPException(status_code=404, detail="Favourite not found")
    db.delete(fav)
    db.commit()
