import json
import os

from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.8-flash")

if not GEMINI_API_KEY:
    raise RuntimeError("GEMINI_API_KEY is not configured. Add it to backend/.env.")

client = genai.Client(api_key=GEMINI_API_KEY)


def _generate(prompt: str, json_response: bool = False) -> str:
    config = types.GenerateContentConfig(
        temperature=0.2,
        response_mime_type="application/json" if json_response else "text/plain",
    )
    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=prompt,
        config=config,
    )
    text = (response.text or "").strip()
    if not text:
        raise RuntimeError("Gemini returned an empty response.")
    return text


def analyze_job_match(resume_text: str, job_description: str):
    """Compare a resume with a job description and return structured match data."""
    prompt = f"""
You are an expert technical recruiter. Compare the resume against the job description.

Return ONLY valid JSON with exactly these fields:
{{
  "match_percentage": 85.5,
  "resume_feedback": "Specific, actionable feedback for improving the resume for this role.",
  "missing_skills": ["Kubernetes", "AWS"]
}}

Rules:
- match_percentage must be a number from 0 to 100.
- missing_skills must be a JSON array of concise skills or technologies that the JD requires but the resume does not demonstrate clearly.
- Do not invent experience for the candidate.
- Keep resume_feedback concise and actionable.

RESUME:
{resume_text}

JOB DESCRIPTION:
{job_description}
"""
    raw_text = _generate(prompt, json_response=True)
    try:
        result = json.loads(raw_text)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"Gemini returned invalid JSON: {raw_text[:500]}") from exc

    if not isinstance(result, dict):
        raise RuntimeError("Gemini returned an unexpected response format.")

    result["match_percentage"] = max(
        0, min(100, float(result.get("match_percentage", 0)))
    )
    result["resume_feedback"] = str(result.get("resume_feedback", ""))
    result["missing_skills"] = (
        result.get("missing_skills", [])
        if isinstance(result.get("missing_skills", []), list)
        else []
    )
    return result


def generate_ats_resume(resume_text: str, job_description: str):
    prompt = f"""
You are an expert technical recruiter and resume writer.
Rewrite the resume to be ATS-friendly and tailored strictly to the job description.
Do not invent experience, employers, projects, metrics, or qualifications.
Return the optimized resume in Markdown.

RESUME:
{resume_text}

JOB DESCRIPTION:
{job_description}
"""
    return _generate(prompt)


def generate_cover_letter(resume_text: str, job_description: str, company_name: str):
    prompt = f"""
Write a professional, concise cover letter for an applicant applying to {company_name}.
Use only experience supported by the resume. Align it with the job description.
Return the cover letter in Markdown.

RESUME:
{resume_text}

JOB DESCRIPTION:
{job_description}
"""
    return _generate(prompt)
