import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import init_db
from routers import auth, interviews, jobs, matches, profile, favourites, applications, tts

# ALLOWED_ORIGINS: comma-separated list of frontend origins, or "*" for local dev.
# In production set this env var to your Vercel frontend URL, e.g.:
#   ALLOWED_ORIGINS=https://optima-frontend.vercel.app
_raw_origins = os.getenv("ALLOWED_ORIGINS", "*")
if _raw_origins.strip() == "*":
    allow_origins = ["*"]
    allow_credentials = False
else:
    allow_origins = [o.strip() for o in _raw_origins.split(",")]
    allow_credentials = True


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
    allow_origins=allow_origins,
    allow_credentials=allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

# NOTE: /uploads StaticFiles mount removed — file uploads are served via Vercel Blob CDN

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
