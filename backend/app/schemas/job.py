from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class JobProfileCreateRequest(BaseModel):
    title: str | None = None
    company: str | None = None
    company_name: str | None = None
    location: str | None = None
    description: str
    required_skills: list[str] = []
    preferred_skills: list[str] = []
    education_requirement: str | None = None
    minimum_experience: str | None = None
    employment_type: str | None = "Full-time"
    salary: str | None = None
    status: str = "active"


class JobCreateRequest(BaseModel):
    title: str
    company_name: str | None = None
    company: str | None = None
    location: str | None = None
    description: str
    required_skills: list[str] = []
    skills: list[str] = []
    preferred_skills: list[str] = []
    education_requirement: str | None = None
    education: str | None = None
    minimum_experience: str | None = None
    experience: str | None = None
    employment_type: str | None = "Full-time"
    salary: str | None = None
    status: str = "active"


class JobUpdateRequest(BaseModel):
    title: str | None = None
    company_name: str | None = None
    company: str | None = None
    location: str | None = None
    description: str | None = None
    required_skills: list[str] | None = None
    skills: list[str] | None = None
    preferred_skills: list[str] | None = None
    education_requirement: str | None = None
    education: str | None = None
    minimum_experience: str | None = None
    experience: str | None = None
    employment_type: str | None = None
    salary: str | None = None
    status: str | None = None


class JobProfileResponse(BaseModel):
    id: UUID
    user_id: UUID | None = None
    title: str | None = None
    company: str | None = None
    company_name: str | None = None
    location: str | None = None
    skills: list[str] = []
    required_skills: list[str] = []
    preferred_skills: list[str] = []
    experience: str | None = None
    minimum_experience: str | None = None
    education: str | None = None
    education_requirement: str | None = None
    keywords: list[str] = []
    description: str | None = None
    job_text: str | None = None
    employment_type: str | None = "Full-time"
    salary: str | None = None
    status: str = "active"
    created_at: datetime | None = None
    updated_at: datetime | None = None
    applicant_count: int = 0
    model_config = ConfigDict(from_attributes=True)


class RecruiterDashboardResponse(BaseModel):
    total_jobs: int
    active_jobs: int
    total_applicants: int
    recent_jobs: list[JobProfileResponse]


class RecruiterApplicantItem(BaseModel):
    id: UUID
    candidate_id: UUID | None = None
    job_id: UUID
    job_title: str | None = None
    candidate_name: str | None = None
    candidate_email: str | None = None
    candidate_phone: str | None = None
    candidate_skills: list[str] = []
    candidate_education: str | None = None
    candidate_experience: str | None = None
    status: str = "Applied"
    applied_at: datetime
    ats_score: str = "Not evaluated"


class ApplicationStatusUpdate(BaseModel):
    status: str


class JobRankingRequest(BaseModel):
    candidate_ids: list[UUID] | None = None


class CandidateRankingResult(BaseModel):
    candidate_id: UUID
    candidate_name: str | None = None
    candidate_email: str | None = None
    candidate_phone: str | None = None
    candidate_skills: list[str] = []
    ats_score: float
    skill_match_score: float
    text_similarity: float
    experience_score: float
    education_score: float
    matched_skills: list[str] = []
    missing_skills: list[str] = []
    experience_summary: str | None = None
    education_summary: str | None = None
    rank: int


class JobRankingResponse(BaseModel):
    job_profile: JobProfileResponse
    rankings: list[CandidateRankingResult]
