import io
import os
import mimetypes
from pathlib import Path

import httpx
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

from database import get_db
import models
import schemas
import auth as auth_utils

router = APIRouter(prefix="/profile", tags=["profile"])

BLOB_TOKEN = os.getenv("BLOB_READ_WRITE_TOKEN")
BLOB_API_URL = "https://blob.vercel-storage.com"
LOCAL_UPLOAD_DIR = Path(__file__).resolve().parent.parent / "uploads"

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
ALLOWED_RESUME_TYPES = {"application/pdf"}


def _upload_file(file_content: bytes, pathname: str, content_type: str) -> str:
    """Upload bytes to Vercel Blob (production) or local disk (dev). Returns public URL."""
    if BLOB_TOKEN:
        response = httpx.put(
            f"{BLOB_API_URL}/{pathname}",
            content=file_content,
            headers={
                "authorization": f"Bearer {BLOB_TOKEN}",
                "x-api-version": "7",
                "content-type": content_type,
                "x-add-random-suffix": "0",
            },
            timeout=30.0,
        )
        if response.status_code not in (200, 201):
            raise HTTPException(status_code=502, detail=f"Blob upload failed: {response.text}")
        return response.json()["url"]

    # Local fallback for development
    local_path = LOCAL_UPLOAD_DIR / pathname
    local_path.parent.mkdir(parents=True, exist_ok=True)
    local_path.write_bytes(file_content)
    return f"/uploads/{pathname}"


def _delete_file(url: str) -> None:
    """Delete a blob by its public URL, or a local file. Silently ignores errors."""
    if not url:
        return
    # Vercel Blob
    if BLOB_TOKEN and "blob.vercel-storage.com" in url:
        try:
            httpx.delete(
                BLOB_API_URL,
                headers={"authorization": f"Bearer {BLOB_TOKEN}", "x-api-version": "7"},
                params={"url": url},
                timeout=10.0,
            )
        except Exception:
            pass
        return
    # Local file
    if url.startswith("/uploads/"):
        try:
            local_path = LOCAL_UPLOAD_DIR / url.replace("/uploads/", "", 1)
            local_path.unlink(missing_ok=True)
        except Exception:
            pass


def _extract_resume_text(file_content: bytes, content_type: str) -> str:
    """Extract text from resume bytes."""
    if content_type == "text/plain":
        return file_content.decode("utf-8", errors="replace")

    if content_type == "application/pdf":
        try:
            import pdfplumber
            with pdfplumber.open(io.BytesIO(file_content)) as pdf:
                return "\n".join(page.extract_text() or "" for page in pdf.pages)
        except Exception:
            return ""

    if "wordprocessingml" in content_type:
        try:
            from docx import Document
            doc = Document(io.BytesIO(file_content))
            return "\n".join(p.text for p in doc.paragraphs)
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
async def upload_avatar(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user),
):
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, WebP, or GIF images are allowed")

    # Delete old avatar if it exists
    if current_user.profile_picture_url:
        _delete_file(current_user.profile_picture_url)

    ext = mimetypes.guess_extension(file.content_type) or ".jpg"
    if ext in (".jpe", ".jpeg"):
        ext = ".jpg"

    pathname = f"avatars/avatar_{current_user.id}{ext}"
    file_content = await file.read()

    url = _upload_file(file_content, pathname, file.content_type)

    current_user.profile_picture_url = url
    db.commit()
    db.refresh(current_user)
    return schemas.UserProfileOut.model_validate(current_user)


@router.post("/resume", response_model=schemas.UserProfileOut)
async def upload_resume(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user),
):
    if file.content_type not in ALLOWED_RESUME_TYPES:
        raise HTTPException(status_code=400, detail="Only PDF resumes are allowed")

    pathname = f"resumes/resume_{current_user.id}.pdf"
    file_content = await file.read()

    url = _upload_file(file_content, pathname, file.content_type)
    resume_text = _extract_resume_text(file_content, file.content_type)

    current_user.resume_filename = url
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
