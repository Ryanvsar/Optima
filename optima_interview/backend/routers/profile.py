import os
import shutil
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

from database import get_db
import models
import schemas
import auth as auth_utils

router = APIRouter(prefix="/profile", tags=["profile"])

UPLOAD_DIR = Path(__file__).parent.parent / "uploads"
AVATAR_DIR = UPLOAD_DIR / "avatars"
RESUME_DIR = UPLOAD_DIR / "resumes"

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
ALLOWED_RESUME_TYPES = {"application/pdf"}


def _extract_resume_text(file_path: Path, content_type: str) -> str:
    """Extract text from an uploaded resume file."""
    if content_type == "text/plain":
        return file_path.read_text(encoding="utf-8", errors="replace")

    if content_type == "application/pdf":
        try:
            import pdfplumber
            with pdfplumber.open(str(file_path)) as pdf:
                return "\n".join(page.extract_text() or "" for page in pdf.pages)
        except ImportError:
            return ""
        except Exception:
            return ""

    if "wordprocessingml" in content_type:
        try:
            from docx import Document
            doc = Document(str(file_path))
            return "\n".join(p.text for p in doc.paragraphs)
        except ImportError:
            return ""
        except Exception:
            return ""

    return ""


@router.get("/me", response_model=schemas.UserProfileOut)
def get_my_profile(
    current_user: models.User = Depends(auth_utils.get_current_user),
):
    return schemas.UserProfileOut.model_validate(current_user)


@router.patch("/me", response_model=schemas.UserProfileOut)
def update_my_profile(
    payload: schemas.UserProfileUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user),
):
    updates = payload.model_dump(exclude_unset=True)

    if "desired_roles" in updates and updates["desired_roles"] is not None:
        if len(updates["desired_roles"]) > 5:
            raise HTTPException(status_code=400, detail="Maximum 5 desired roles allowed")

    for field, value in updates.items():
        setattr(current_user, field, value)

    db.commit()
    db.refresh(current_user)
    return schemas.UserProfileOut.model_validate(current_user)


@router.post("/avatar", response_model=schemas.UserProfileOut)
def upload_avatar(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user),
):
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, WebP, or GIF images are allowed")

    AVATAR_DIR.mkdir(parents=True, exist_ok=True)

    # Remove old avatar if exists
    if current_user.profile_picture_url:
        old_path = UPLOAD_DIR / current_user.profile_picture_url.lstrip("/uploads/").lstrip("uploads/")
        if old_path.exists():
            old_path.unlink()

    ext = Path(file.filename).suffix or ".jpg"
    filename = f"avatar_{current_user.id}{ext}"
    file_path = AVATAR_DIR / filename

    with file_path.open("wb") as f:
        shutil.copyfileobj(file.file, f)

    current_user.profile_picture_url = f"/uploads/avatars/{filename}"
    db.commit()
    db.refresh(current_user)
    return schemas.UserProfileOut.model_validate(current_user)


@router.post("/resume", response_model=schemas.UserProfileOut)
def upload_resume(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user),
):
    if file.content_type not in ALLOWED_RESUME_TYPES:
        raise HTTPException(status_code=400, detail="Only PDF resumes are allowed")

    RESUME_DIR.mkdir(parents=True, exist_ok=True)

    ext = Path(file.filename).suffix or ".pdf"
    filename = f"resume_{current_user.id}{ext}"
    file_path = RESUME_DIR / filename

    with file_path.open("wb") as f:
        shutil.copyfileobj(file.file, f)

    resume_text = _extract_resume_text(file_path, file.content_type)

    current_user.resume_filename = f"/uploads/resumes/{filename}"
    current_user.resume_text = resume_text
    db.commit()
    db.refresh(current_user)
    return schemas.UserProfileOut.model_validate(current_user)


@router.get("/{user_id}", response_model=schemas.UserProfileOut)
def get_candidate_profile(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.require_company),
):
    """Company-only: retrieve a candidate's full profile."""
    candidate = db.query(models.User).filter(
        models.User.id == user_id,
        models.User.role == "candidate",
    ).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return schemas.UserProfileOut.model_validate(candidate)
