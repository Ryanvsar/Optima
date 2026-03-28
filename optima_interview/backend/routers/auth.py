import os
from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from database import get_db
import models
import schemas
import auth as auth_utils

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=schemas.TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: schemas.UserRegister, db: Session = Depends(get_db)):
    if payload.role not in ("candidate", "company"):
        raise HTTPException(status_code=400, detail="role must be 'candidate' or 'company'")

    email = payload.email.lower().strip()

    if db.query(models.User).filter(models.User.email == email).first():
        raise HTTPException(status_code=409, detail="Email already registered")

    # Build display name based on role
    if payload.role == "candidate":
        if not payload.first_name or not payload.last_name:
            raise HTTPException(status_code=400, detail="first_name and last_name are required for candidates")
        name = f"{payload.first_name.strip()} {payload.last_name.strip()}"
        company_location = None
    else:  # company
        if not payload.company_name:
            raise HTTPException(status_code=400, detail="company_name is required for companies")
        name = payload.company_name.strip()
        company_location = payload.location

    user = models.User(
        email=email,
        name=name,
        password_hash=auth_utils.hash_password(payload.password),
        role=payload.role,
        location=company_location,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = auth_utils.create_access_token(user.id, user.email, user.role)
    return schemas.TokenResponse(
        access_token=token,
        user=schemas.UserProfileOut.model_validate(user),
    )


@router.post("/login", response_model=schemas.TokenResponse)
def login(payload: schemas.UserLogin, db: Session = Depends(get_db)):
    email = payload.email.lower().strip()
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user or not auth_utils.verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = auth_utils.create_access_token(user.id, user.email, user.role)
    return schemas.TokenResponse(
        access_token=token,
        user=schemas.UserProfileOut.model_validate(user),
    )


@router.get("/me", response_model=schemas.UserProfileOut)
def me(current_user: models.User = Depends(auth_utils.get_current_user)):
    return schemas.UserProfileOut.model_validate(current_user)


class DeleteUserPayload(BaseModel):
    email: str


@router.delete("/user", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    payload: DeleteUserPayload,
    x_admin_key: str = Header(default=None),
    db: Session = Depends(get_db),
):
    """Dev-only endpoint: delete a user account by email. Requires X-Admin-Key header."""
    admin_key = os.getenv("ADMIN_KEY")
    if not admin_key or x_admin_key != admin_key:
        raise HTTPException(status_code=403, detail="Forbidden")

    user = db.query(models.User).filter(models.User.email == payload.email.lower().strip()).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    db.delete(user)
    db.commit()
