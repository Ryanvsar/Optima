import os
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from database import init_db
from routers import auth, interviews, jobs, matches, profile, favourites, applications, tts

UPLOAD_DIR = Path(__file__).parent / "uploads"

# Create upload directories eagerly so StaticFiles mount succeeds at import time
(UPLOAD_DIR / "avatars").mkdir(parents=True, exist_ok=True)
(UPLOAD_DIR / "resumes").mkdir(parents=True, exist_ok=True)
(UPLOAD_DIR / "applications").mkdir(parents=True, exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="NEXUS Interview API",
    description="AI-powered interview and job matching platform",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded files (avatars, resumes)
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

app.include_router(auth.router)
app.include_router(interviews.router)
app.include_router(jobs.router)
app.include_router(matches.router)
app.include_router(profile.router)
app.include_router(favourites.router)
app.include_router(applications.router)
app.include_router(tts.router)


@app.get("/", tags=["health"])
def root():
    return {"status": "ok", "service": "NEXUS Interview API v2"}


@app.get("/health", tags=["health"])
def health():
    return {"status": "ok"}
