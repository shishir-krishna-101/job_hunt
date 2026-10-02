from fastapi import FastAPI, Depends, UploadFile, File
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
        db.commit()
        return {"status": "success", "message": "Resume uploaded"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/api/jobs/fetch")
def fetch_jobs(query: str, location: str = "India", db: Session = Depends(get_db)):
    jobs = job_crawler.fetch_jobs_from_api(query, location)
    return jobs

@app.post("/api/resume/analyze")
def analyze_resume_endpoint(req: AnalyzeRequest, db: Session = Depends(get_db)):
    result = ai_service.analyze_job_match(req.resume, req.jd)
    
    # Store missing skills in DB
    if "missing_skills" in result and isinstance(result["missing_skills"], list):
        for skill in result["missing_skills"]:
            # Check if skill exists (simplified logic)
            existing = db.query(models.MissingSkill).filter(models.MissingSkill.skill_name == skill).first()
            if not existing:
                new_skill = models.MissingSkill(skill_name=skill, resource_url=f"https://www.google.com/search?q=learn+{skill}")
                db.add(new_skill)
        db.commit()

    return result

@app.get("/api/explore")
def get_explore_skills(db: Session = Depends(get_db)):
    skills = db.query(models.MissingSkill).all()
    return skills
