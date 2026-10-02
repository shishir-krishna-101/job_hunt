from fastapi import FastAPI, Depends, UploadFile, File
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
import models
from database import engine, get_db
import ai_service
import job_crawler
import PyPDF2
from docx import Document
import io

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Job Hunt AI API")

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
            text = "\n".join(paragraph.text for paragraph in document.paragraphs if paragraph.text.strip())
        else:
            return {"status": "error", "message": "Unsupported resume format. Please upload PDF or DOCX."}
            
        user = db.query(models.User).first()
        if not user:
            user = models.User(resume_text=text)
            db.add(user)
        else:
            user.resume_text = text
        if not text.strip():
            return {"status": "error", "message": "No readable text was extracted from the resume."}

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
    return {
        "uploaded": bool(text),
        "characters_extracted": len(text),
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
def stream_jobs(query: str, location: str = "India", country: str = "in", date_posted: str = "all", roles: str | None = None):
    selected_roles = [item.strip() for item in roles.split("|") if item.strip()] if roles else None
    return StreamingResponse(job_crawler.stream_jobs_from_api(query=query, location=location, country=country, date_posted=date_posted, roles=selected_roles), media_type="application/x-ndjson", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})

@app.post("/api/resume/analyze")
def analyze_resume_endpoint(req: AnalyzeRequest, db: Session = Depends(get_db)):
    if not req.resume.strip():
        return {"error": "Resume text is empty. Upload a readable PDF/DOCX or paste your resume."}
    if not req.jd.strip():
        return {"error": "Job description is empty. Paste the target job description first."}

    try:
        result = ai_service.analyze_job_match(req.resume, req.jd)

        # Store missing skills in DB
        if "missing_skills" in result and isinstance(result["missing_skills"], list):
            for skill in result["missing_skills"]:
                existing = db.query(models.MissingSkill).filter(
                    models.MissingSkill.skill_name == skill
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
        return {
            "error": "AI analysis failed.",
            "details": str(e),
        }

@app.get("/api/explore")
def get_explore_skills(db: Session = Depends(get_db)):
    skills = db.query(models.MissingSkill).all()
    return skills
