from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from urllib.parse import urlparse

from fastapi import FastAPI, Depends, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
import models
from database import engine, get_db, SessionLocal
import ai_service
import job_crawler
import tavily_service
import PyPDF2
from docx import Document
import io
import json

models.Base.metadata.create_all(bind=engine)

# Apply additive migrations to an existing local SQLite database.
from database import ensure_schema
ensure_schema()

app = FastAPI(title="Job Hunt AI API")
ENRICHMENT_EXECUTOR = ThreadPoolExecutor(max_workers=3)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AnalyzeRequest(BaseModel):
    resume: str
    jd: str


def _location(job: dict) -> str:
    parts = [
        job.get("job_city"),
        job.get("job_state"),
        job.get("job_country"),
    ]
    return ", ".join(str(part) for part in parts if part)


def _source(url: str | None) -> str | None:
    if not url:
        return None
    try:
        return urlparse(url).netloc
    except Exception:
        return None


def _upsert_job(db: Session, data: dict) -> models.Job | None:
    external_id = data.get("job_id") or data.get("job_apply_link")
    if not external_id:
        return None

    job = db.query(models.Job).filter(models.Job.job_id == external_id).first()
    if not job:
        job = models.Job(job_id=external_id)
        db.add(job)

    job.title = data.get("job_title") or job.title or "Untitled role"
    job.company = data.get("employer_name") or job.company or "Company"
    job.location = _location(data) or job.location
    job.url = data.get("job_apply_link") or job.url
    job.source = _source(job.url) or job.source
    job.posted_at = data.get("job_posted_at_datetime_utc") or job.posted_at
    job.employment_type = (
        data.get("job_employment_type")
        or (data.get("job_employment_types") or [None])[0]
        or job.employment_type
    )

    required = data.get("job_required_experience") or {}
    months = required.get("required_experience_in_months")
    job.experience_months = months if isinstance(months, int) else job.experience_months
    if required.get("no_experience_required"):
        job.experience_required = "No experience required"
    elif isinstance(months, int):
        job.experience_required = f"{max(1, round(months / 12))}+ years"
    elif required.get("experience_mentioned"):
        job.experience_required = "Experience required"

    provider_description = data.get("job_description")
    if provider_description and (
        not job.description or len(provider_description) > len(job.description)
    ):
        job.description = provider_description

    if not job.enrichment_status:
        job.enrichment_status = "pending"

    db.commit()
    db.refresh(job)
    return job


def _serialize_job(job: models.Job) -> dict:
    return {
        "db_id": job.id,
        "job_id": job.job_id,
        "job_title": job.title,
        "employer_name": job.company,
        "job_city": job.location,
        "job_apply_link": job.url,
        "job_posted_at_datetime_utc": job.posted_at,
        "job_description": job.description,
        "job_employment_type": job.employment_type,
        "job_required_experience": {
            "required_experience_in_months": job.experience_months,
            "experience_mentioned": bool(job.experience_required),
            "no_experience_required": job.experience_required == "No experience required",
        },
        "source": job.source,
        "enrichment_status": job.enrichment_status or "pending",
        "enriched_at": job.enriched_at,
        "match_percentage": job.match_percentage,
        "resume_feedback": job.resume_feedback,
    }


@app.get("/")
def read_root():
    return {"message": "Job Hunt AI Backend is running"}


@app.post("/api/resume/upload")
async def upload_resume_file(file: UploadFile = File(...), db: Session = Depends(get_db)):
    try:
        content = await file.read()
        text = ""
        filename = (file.filename or "").lower()

        if filename.endswith(".pdf"):
            reader = PyPDF2.PdfReader(io.BytesIO(content))
            for page in reader.pages:
                text += (page.extract_text() or "") + "\n"
        elif filename.endswith(".docx"):
            document = Document(io.BytesIO(content))
            text = "\n".join(
                paragraph.text for paragraph in document.paragraphs if paragraph.text.strip()
            )
        else:
            return {
                "status": "error",
                "message": "Unsupported resume format. Please upload PDF or DOCX.",
            }

        if not text.strip():
            return {
                "status": "error",
                "message": "No readable text was extracted from the resume.",
            }

        user = db.query(models.User).first()
        if not user:
            user = models.User(resume_text=text)
            db.add(user)
        else:
            user.resume_text = text

        db.commit()
        return {
            "status": "success",
            "message": "Resume uploaded and parsed successfully",
            "filename": file.filename,
            "characters_extracted": len(text),
            "resume_text": text,
        }
    except Exception as e:
        db.rollback()
        return {"status": "error", "message": f"Resume processing failed: {str(e)}"}


@app.get("/api/resume/status")
def resume_status(db: Session = Depends(get_db)):
    user = db.query(models.User).first()
    text = (user.resume_text or "").strip() if user else ""
    return {"uploaded": bool(text), "characters_extracted": len(text)}


@app.get("/api/resume")
def get_resume(db: Session = Depends(get_db)):
    user = db.query(models.User).first()
    return {
        "uploaded": bool(user and (user.resume_text or "").strip()),
        "resume_text": user.resume_text if user else "",
    }


@app.get("/api/jobs/fetch")
def fetch_jobs(
    query: str,
    location: str = "India",
    country: str = "in",
    date_posted: str = "all",
    roles: str | None = None,
    db: Session = Depends(get_db),
):
    try:
        selected_roles = [item.strip() for item in roles.split("|") if item.strip()] if roles else None
        return job_crawler.fetch_jobs_from_api(
            query=query,
            location=location,
            country=country,
            date_posted=date_posted,
            roles=selected_roles,
        )
    except Exception as e:
        return {"status": "error", "message": str(e), "data": []}


@app.get("/api/jobs/stream")
def stream_jobs(
    query: str,
    location: str = "India",
    country: str = "in",
    date_posted: str = "all",
    roles: str | None = None,
    db: Session = Depends(get_db),
):
    selected_roles = [item.strip() for item in roles.split("|") if item.strip()] if roles else None

    def events():
        for line in job_crawler.stream_jobs_from_api(
            query=query,
            location=location,
            country=country,
            date_posted=date_posted,
            roles=selected_roles,
        ):
            event = json.loads(line)

            if event.get("type") == "jobs":
                stored = []
                for raw_job in event.get("jobs", []):
                    job = _upsert_job(db, raw_job)
                    if not job:
                        continue
                    stored.append(_serialize_job(job))

                    # Enrichment never blocks the streamed job result.
                    if job.enrichment_status in {"pending", "failed", "unavailable"}:
                        ENRICHMENT_EXECUTOR.submit(tavily_service.enrich_job, job.id)

                event["jobs"] = stored

            yield json.dumps(event) + "\n"

    return StreamingResponse(
        events(),
        media_type="application/x-ndjson",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@app.get("/api/jobs/enrichment-status")
def enrichment_status(job_ids: str, db: Session = Depends(get_db)):
    ids = [item.strip() for item in job_ids.split(",") if item.strip()]
    jobs = db.query(models.Job).filter(models.Job.job_id.in_(ids)).all()
    return {
        "jobs": [
            {
                "job_id": job.job_id,
                "status": job.enrichment_status or "pending",
                "enriched_at": job.enriched_at,
                "error": job.enrichment_error,
                "has_description": bool((job.description or "").strip()),
            }
            for job in jobs
        ]
    }


@app.get("/api/jobs/library")
def job_library(
    location: str | None = None,
    min_experience_months: int | None = None,
    max_experience_months: int | None = None,
    posted_after: str | None = None,
    db: Session = Depends(get_db),
):
    query = db.query(models.Job)

    if location:
        query = query.filter(models.Job.location.ilike(f"%{location}%"))
    if min_experience_months is not None:
        query = query.filter(models.Job.experience_months >= min_experience_months)
    if max_experience_months is not None:
        query = query.filter(models.Job.experience_months <= max_experience_months)
    if posted_after:
        query = query.filter(models.Job.posted_at >= posted_after)

    return [_serialize_job(job) for job in query.order_by(models.Job.id.desc()).all()]


@app.get("/api/jobs/{job_id}")
def get_job(job_id: str, db: Session = Depends(get_db)):
    job = db.query(models.Job).filter(models.Job.job_id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    return _serialize_job(job)


@app.post("/api/jobs/{job_id}/analyze")
def analyze_stored_job(job_id: str, db: Session = Depends(get_db)):
    job = db.query(models.Job).filter(models.Job.job_id == job_id).first()
    user = db.query(models.User).first()

    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    if not user or not (user.resume_text or "").strip():
        raise HTTPException(status_code=400, detail="Upload your resume before analyzing a job.")
    if not (job.description or "").strip():
        raise HTTPException(
            status_code=409,
            detail="This job does not have a usable description yet. Wait for JD enrichment and try again.",
        )

    try:
        result = ai_service.analyze_job_match(user.resume_text, job.description)
        job.match_percentage = result.get("match_percentage")
        job.resume_feedback = result.get("resume_feedback", "")

        db.query(models.MissingSkill).filter(
            models.MissingSkill.job_id == job.id
        ).delete()

        for skill in result.get("missing_skills", []):
            db.add(
                models.MissingSkill(
                    job_id=job.id,
                    skill_name=skill,
                    resource_url=f"https://www.google.com/search?q=learn+{skill}",
                )
            )

        db.commit()
        result["job_id"] = job.job_id
        return result
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"AI analysis failed: {exc}") from exc


@app.post("/api/jobs/{job_id}/tailor")
def tailor_stored_job(job_id: str, db: Session = Depends(get_db)):
    job = db.query(models.Job).filter(models.Job.job_id == job_id).first()
    user = db.query(models.User).first()

    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    if not user or not (user.resume_text or "").strip():
        raise HTTPException(status_code=400, detail="Upload your resume before tailoring.")
    if not (job.description or "").strip():
        raise HTTPException(status_code=409, detail="The full job description is not ready yet.")

    try:
        tailored = ai_service.generate_ats_resume(user.resume_text, job.description)
        return {"job_id": job.job_id, "tailored_resume": tailored}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Resume tailoring failed: {exc}") from exc


class AnalyzeRequest(BaseModel):
    resume: str
    jd: str


@app.post("/api/resume/analyze")
def analyze_resume_endpoint(req: AnalyzeRequest, db: Session = Depends(get_db)):
    if not req.resume.strip():
        return {"error": "Resume text is empty. Upload a readable PDF/DOCX or paste your resume."}
    if not req.jd.strip():
        return {"error": "Job description is empty. Paste the target job description first."}

    try:
        result = ai_service.analyze_job_match(req.resume, req.jd)

        if "missing_skills" in result and isinstance(result["missing_skills"], list):
            for skill in result["missing_skills"]:
                existing = db.query(models.MissingSkill).filter(
                    models.MissingSkill.skill_name == skill,
                    models.MissingSkill.job_id.is_(None),
                ).first()
                if not existing:
                    db.add(
                        models.MissingSkill(
                            skill_name=skill,
                            resource_url=f"https://www.google.com/search?q=learn+{skill}",
                        )
                    )
            db.commit()

        return result
    except Exception as e:
        db.rollback()
        return {"error": "AI analysis failed.", "details": str(e)}


@app.get("/api/explore")
def get_explore_skills(db: Session = Depends(get_db)):
    return db.query(models.MissingSkill).all()
