import os
import json
import re
from typing import List, Dict, Any, Optional

import anthropic
from question_bank import get_industry_context, is_technical_role

_client = None


def get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            raise RuntimeError("ANTHROPIC_API_KEY environment variable not set")
        _client = anthropic.Anthropic(api_key=api_key)
    return _client


def _strip_fences(raw: str) -> str:
    raw = re.sub(r"^```(?:json)?\s*", "", raw.strip())
    raw = re.sub(r"\s*```$", "", raw)
    return raw


def generate_mock_questions(job_title: str, industry: str) -> List[Dict[str, Any]]:
    """
    Generate PRACTICE interview questions for a mock interview.
    6 questions for non-technical roles, 8 for technical roles (includes 2 code questions).
    Questions are varied practice-style, distinct from formal connecting interview questions.
    """
    context = get_industry_context(industry)
    verbal_topics = context["verbal_topics"]
    code_topics = context["code_topics"]
    technical = is_technical_role(job_title) or context.get("has_technical", False)

    if technical and code_topics:
        num_code = min(2, len(code_topics))
        num_verbal = 6  # 6 verbal + 2 code = 8 total
    else:
        num_code = 0
        num_verbal = 6

    total_count = num_verbal + num_code

    verbal_topics_str = "\n".join(f"- {t}" for t in verbal_topics[:num_verbal])
    code_section = ""
    if num_code > 0:
        code_section = "\n\nTECHNICAL / CODE QUESTIONS — generate exactly {} question(s):\n{}".format(
            num_code,
            "\n".join(f"- {t}" for t in code_topics[:num_code]),
        )

    prompt = f"""You are an expert interview coach. Generate exactly {total_count} PRACTICE interview questions for someone preparing to interview for a {job_title} role in {industry}.

These are MOCK/PRACTICE questions — they should be slightly easier or similar in difficulty to a real interview but must NOT be the same questions that would appear in a formal hiring assessment. You may include one generic opener such as "Tell me about yourself" or "Walk me through your background."

VERBAL / BEHAVIORAL QUESTIONS — generate exactly {num_verbal} question(s) covering varied topics from:
{verbal_topics_str}{code_section}

Rules:
- Questions should feel like realistic practice — approachable but meaningful
- Each question must include 3-5 "key_points" that a strong answer should cover
- Return ONLY valid JSON — no markdown, no explanation, just the JSON array

Output format (strict JSON array):
[
  {{
    "question_text": "...",
    "question_type": "verbal",
    "key_points": ["point 1", "point 2", "point 3"]
  }},
  {{
    "question_text": "...",
    "question_type": "code",
    "key_points": ["point 1", "point 2"]
  }}
]

Generate exactly {total_count} questions now:"""

    client = get_client()
    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2048,
        messages=[{"role": "user", "content": prompt}],
    )

    raw = _strip_fences(message.content[0].text)
    questions = json.loads(raw)

    return [
        {
            "question_text": q.get("question_text", ""),
            "question_type": q.get("question_type", "verbal"),
            "key_points": q.get("key_points", []),
        }
        for q in questions[:total_count]
    ]


def generate_connecting_questions(
    favourite_jobs: List[Dict],
    candidate_profile: Dict,
) -> List[Dict[str, Any]]:
    """
    Generate exactly 8 FORMAL interview questions for a connecting interview.
    Employer-specific questions are highest priority (rephrased slightly).
    Remaining slots filled with tailored questions across all favourite roles.

    favourite_jobs: list of {title, description, required_skills, specific_questions, company_name}
    candidate_profile: {skills, desired_roles}
    """
    total_count = 8

    job_titles = list({j["title"] for j in favourite_jobs})
    industries = list({j.get("industry", "") for j in favourite_jobs if j.get("industry")})

    # Collect all employer-specified questions
    employer_questions = []
    for job in favourite_jobs:
        for q in (job.get("specific_questions") or []):
            if q and q.strip():
                employer_questions.append(f'[From {job["company_name"]} - {job["title"]}] {q}')

    employer_section = ""
    if employer_questions:
        employer_section = """
EMPLOYER-SPECIFIED QUESTIONS (HIGHEST PRIORITY — include as many as possible up to the total limit, rephrase slightly while keeping the exact same meaning and intent):
{}
""".format("\n".join(f"- {q}" for q in employer_questions))

    candidate_skills = ", ".join(candidate_profile.get("skills") or []) or "not specified"

    prompt = f"""You are an expert hiring interviewer. Generate exactly {total_count} FORMAL interview questions for a candidate who is applying for these roles: {", ".join(job_titles)}.

These are REAL interview questions used for actual hiring decisions. They must be more rigorous than practice questions and should thoroughly assess the candidate's fit for these specific roles.
{employer_section}
CANDIDATE PROFILE:
- Skills: {candidate_skills}
- Target Roles: {", ".join(job_titles)}

Instructions:
1. If employer-specified questions are provided above, include as many as possible (rephrased slightly) in RANDOM order mixed with the other questions.
2. Fill remaining question slots with tailored behavioral, situational, and technical questions for the listed roles.
3. Include one generic opener such as "Tell me about yourself and why you're interested in these roles."
4. Questions should be challenging and appropriate for formal hiring assessment.
5. Each question must include 3-5 "key_points" that a strong answer should cover.
6. Return ONLY valid JSON — no markdown, no explanation.

Output format (strict JSON array):
[
  {{
    "question_text": "...",
    "question_type": "verbal",
    "key_points": ["point 1", "point 2", "point 3"]
  }}
]

Generate exactly {total_count} questions now:"""

    client = get_client()
    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2048,
        messages=[{"role": "user", "content": prompt}],
    )

    raw = _strip_fences(message.content[0].text)
    questions = json.loads(raw)

    return [
        {
            "question_text": q.get("question_text", ""),
            "question_type": q.get("question_type", "verbal"),
            "key_points": q.get("key_points", []),
        }
        for q in questions[:total_count]
    ]


def grade_answer(
    question_text: str,
    question_type: str,
    key_points: List[str],
    user_answer: str,
) -> Dict[str, Any]:
    """
    Grade a candidate's answer to an interview question.
    Returns: {"score": float, "feedback": str, "key_points_hit": [str]}
    """
    if not user_answer or len(user_answer.strip()) < 10:
        return {
            "score": 0.0,
            "feedback": "No answer provided or answer was too short.",
            "key_points_hit": [],
        }

    key_points_str = "\n".join(f"- {p}" for p in key_points)
    question_label = "technical/code" if question_type == "code" else "verbal/behavioral"

    prompt = f"""You are an expert interview evaluator. Grade the following candidate answer.

QUESTION ({question_label}):
{question_text}

EXPECTED KEY POINTS:
{key_points_str}

CANDIDATE'S ANSWER:
{user_answer}

SCORING CRITERIA:
1. Key Points Coverage (50%): How many expected key points did the candidate address?
2. Depth of Understanding (30%): Does the answer demonstrate solid understanding of the topic?
3. Answer Quality (20%):
   - Under 30 words: penalise (insufficient detail)
   - Over 400 words: minor penalise (unfocused)
   - Ideal range: 80-250 words

SCORE BANDS — use these as your calibration guide:
- 90-100: Covers all key points with strong depth and clear communication
- 82-90: Covers most key points with good understanding — this is the target range for solid answers
- 72-82: Covers several key points but missing depth or some important areas
- 55-72: Covers only a few key points or lacks substance
- Below 55: Very incomplete or off-topic

A candidate who addresses most expected key points and demonstrates genuine understanding SHOULD score in the 82-90 range. Do not anchor low — reward what the candidate got right.

Return ONLY valid JSON:
{{
  "score": <0-100>,
  "feedback": "<2-4 sentences of constructive feedback>",
  "key_points_hit": ["<covered point 1>", "<covered point 2>"]
}}"""

    client = get_client()
    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=512,
        messages=[{"role": "user", "content": prompt}],
    )

    raw = _strip_fences(message.content[0].text)
    result = json.loads(raw)

    return {
        "score": float(result.get("score", 0)),
        "feedback": result.get("feedback", ""),
        "key_points_hit": result.get("key_points_hit", []),
    }


def score_candidate_job_match(
    job_title: str,
    job_description: str,
    required_skills: List[str],
    candidate_job_title: str,
    candidate_industry: str,
    qa_pairs: List[Dict[str, str]],
    candidate_skills: Optional[List[str]] = None,
    candidate_resume: Optional[str] = None,
    session_type: str = "mock",
) -> Dict[str, Any]:
    """
    Score how well a candidate fits a specific job posting.

    New 4-component scoring:
    - 40%: Interview performance (weighted toward technical/role-specific questions)
    - 35%: Answer relevance to job description and responsibilities
    - 10%: Profile skills vs required skills
    - 15%: ATS resume score (resume text vs job requirements)

    Returns all sub-scores plus weighted composite match_score.
    """
    skills_str = ", ".join(required_skills) if required_skills else "Not specified"
    qa_str = "\n\n".join(
        f"Q: {qa['question']}\nA: {qa['answer']}" for qa in qa_pairs if qa.get("answer")
    )

    if not qa_str.strip():
        return {
            "match_score": 0.0,
            "interview_performance_score": 0.0,
            "answer_relevance_score": 0.0,
            "profile_skills_score": 0.0,
            "ats_score": 0.0,
            "reasoning": "No answers provided.",
        }

    candidate_skills_str = ", ".join(candidate_skills) if candidate_skills else "Not provided"
    resume_section = f"\nCANDIDATE RESUME:\n{candidate_resume[:2000]}" if candidate_resume else "\nCANDIDATE RESUME: Not provided"

    prompt = f"""You are an expert talent matcher for a hiring platform. Evaluate how well this candidate fits the job posting.

JOB POSTING:
- Title: {job_title}
- Description: {job_description}
- Required Skills: {skills_str}

CANDIDATE:
- Interviewed for: {candidate_job_title} ({candidate_industry})
- Profile Skills: {candidate_skills_str}
{resume_section}

CANDIDATE'S INTERVIEW RESPONSES:
{qa_str}

SCORING CRITERIA (score each component 0-100, then compute weighted composite):

1. INTERVIEW PERFORMANCE (40% weight):
   How well did the candidate perform on the interview questions? Weight technical/role-specific questions more heavily. Strong, detailed answers on relevant topics = high score.

2. ANSWER RELEVANCE (35% weight):
   How directly do the candidate's answers address this specific job's responsibilities and requirements? Are their examples and experience relevant to this role?

3. PROFILE SKILLS MATCH (10% weight):
   How well does the candidate's listed skills ("Profile Skills" above) match the job's required skills? If skills not provided, score = 0.

4. RESUME ATS SCORE (15% weight):
   How well does the candidate's resume content match the job description and required skills? If resume not provided, score = 0.

COMPOSITE: match_score = (interview_performance * 0.40) + (answer_relevance * 0.35) + (profile_skills * 0.10) + (ats_score * 0.15)

Be strict — 80+ is a strong match, below 40 is poor alignment.

Return ONLY valid JSON:
{{
  "match_score": <weighted composite 0-100>,
  "interview_performance_score": <0-100>,
  "answer_relevance_score": <0-100>,
  "profile_skills_score": <0-100>,
  "ats_score": <0-100>,
  "reasoning": "<2-3 sentences explaining the fit>"
}}"""

    client = get_client()
    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=512,
        messages=[{"role": "user", "content": prompt}],
    )

    raw = _strip_fences(message.content[0].text)
    result = json.loads(raw)

    return {
        "match_score": float(result.get("match_score", 0)),
        "interview_performance_score": float(result.get("interview_performance_score", 0)),
        "answer_relevance_score": float(result.get("answer_relevance_score", 0)),
        "profile_skills_score": float(result.get("profile_skills_score", 0)),
        "ats_score": float(result.get("ats_score", 0)),
        "reasoning": result.get("reasoning", ""),
    }
