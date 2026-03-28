# NEXUS — AI-Powered Interview Platform

A full-stack platform for AI-driven mock interviews and job matching. Candidates can practice interviews with AI-generated questions and receive graded feedback, while companies can post jobs and match with candidates.

## Features

- **AI Mock Interviews** — Question generation, real-time interview sessions, and automated grading via Claude/OpenAI
- **Job Matching** — Candidates and companies matched by skills and preferences
- **Resume Parsing** — Extract skills automatically from PDF/DOCX resumes
- **Role-Based Access** — Separate flows for candidates and companies
- **Text-to-Speech** — Audio playback for interview questions
- **Application Management** — Apply to jobs, track applications, manage postings

## Tech Stack

| Layer | Technologies |
|---|---|
| Frontend | React 19, React Router v7, Vite |
| Backend | Python, FastAPI, SQLAlchemy |
| Database | SQLite |
| AI | Anthropic Claude API, OpenAI API |
| Auth | JWT (python-jose, passlib/bcrypt) |
| Parsing | pdfplumber, python-docx |

## Project Structure

```
optima_interview/
├── backend/
│   ├── main.py              # FastAPI app entry point
│   ├── models.py            # Database models
│   ├── schemas.py           # Pydantic schemas
│   ├── auth.py              # Auth logic
│   ├── claude_client.py     # AI API integration
│   ├── question_bank.py     # Interview question generation
│   └── routers/             # API route handlers
│       ├── interviews.py
│       ├── jobs.py
│       ├── matches.py
│       ├── applications.py
│       ├── profile.py
│       └── tts.py
└── frontend/
    └── src/
        ├── pages/           # Page components
        ├── components/      # Shared components
        ├── context/         # Auth context
        └── api/             # HTTP client
```

## Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+
- Anthropic and/or OpenAI API keys

### Backend

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env   # fill in your API keys
uvicorn main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend dev server runs on `http://localhost:5173` and proxies API requests to the FastAPI backend at `http://localhost:8000`.

## Environment Variables

Copy `backend/.env.example` to `backend/.env` and set:

| Variable | Description |
|---|---|
| `ANTHROPIC_API_KEY` | Claude API key |
| `OPENAI_API_KEY` | OpenAI API key |
| `SECRET_KEY` | JWT signing secret |
| `ADMIN_KEY` | Admin registration key |
