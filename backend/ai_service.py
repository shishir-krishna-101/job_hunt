import os
import google.generativeai as genai
import json
from dotenv import load_dotenv

load_dotenv()

# Setup the API key
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel('gemini-1.5-flash')

def analyze_job_match(resume_text: str, job_description: str):
    """Compares resume to JD, returns match percentage and missing skills."""
    prompt = f"""
    You are an expert AI recruiter. Compare the following resume with the job description.
    
    Resume:
    {resume_text}
    
    Job Description:
    {job_description}
    
    Return a JSON response strictly in the following format:
    {{
        "match_percentage": 85.5,
        "resume_feedback": "Highlight more of your Python backend experience...",
        "missing_skills": ["Kubernetes", "AWS"]
    }}
    """
    response = model.generate_content(prompt)
    try:
        raw_text = response.text.strip().replace("```json", "").replace("```", "")
        return json.loads(raw_text)
    except Exception as e:
        return {"error": "Failed to parse AI response", "details": str(e)}

def generate_ats_resume(resume_text: str, job_description: str):
    """Rewrites the resume to be ATS-friendly and tailored to the JD."""
    prompt = f"""
    You are an expert technical recruiter and resume writer. 
    Rewrite the following resume to make it highly ATS-friendly and tailored strictly to the job description provided.
    Ensure standard formatting, optimize keywords from the JD, and quantify achievements where possible.
    
    Resume:
    {resume_text}
    
    Job Description:
    {job_description}
    
    Return the fully optimized resume in pure Markdown format.
    """
    response = model.generate_content(prompt)
    return response.text

def generate_cover_letter(resume_text: str, job_description: str, company_name: str):
    """Generates a tailored cover letter."""
    prompt = f"""
    You are an expert career coach. Write a professional, concise, and compelling cover letter 
    for the applicant applying to {company_name} based on their resume and the job description.
    Focus on how their specific past experiences solve the requirements in the JD.
    
    Resume:
    {resume_text}
    
    Job Description:
    {job_description}
    
    Return the cover letter in Markdown format.
    """
    response = model.generate_content(prompt)
    return response.text
