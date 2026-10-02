from sqlalchemy import Column, Integer, String, Text, Float, ForeignKey
from sqlalchemy.orm import relationship
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    resume_text = Column(Text, nullable=True)


class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(String, unique=True, index=True)
    title = Column(String, index=True)
    company = Column(String, index=True)
    location = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    url = Column(String, nullable=True)
    source = Column(String, nullable=True)
    posted_at = Column(String, nullable=True)
    employment_type = Column(String, nullable=True)
    experience_required = Column(String, nullable=True)
    experience_months = Column(Integer, nullable=True)
    enrichment_status = Column(String, default="pending", index=True)
    enrichment_error = Column(Text, nullable=True)
    enriched_at = Column(String, nullable=True)
    match_percentage = Column(Float, nullable=True)
    resume_feedback = Column(Text, nullable=True)

    missing_skills = relationship(
        "MissingSkill",
        back_populates="job",
        cascade="all, delete-orphan",
    )


class MissingSkill(Base):
    __tablename__ = "missing_skills"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=True)
    skill_name = Column(String, index=True)
    resource_url = Column(String, nullable=True)

    job = relationship("Job", back_populates="missing_skills")
