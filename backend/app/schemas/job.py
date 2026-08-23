from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class JobProfileCreateRequest(BaseModel):
    title: str | None = None
    company: str | None = None
    location: str | None = None
    description: str


class JobProfileResponse(BaseModel):
    id: UUID
    user_id: UUID | None = None
    title: str | None = None
    company: str | None = None
    location: str | None = None
    skills: list[str] = []
    experience: str | None = None
    education: str | None = None
    keywords: list[str] = []
    description: str | None = None
    job_text: str | None = None
    created_at: datetime | None = None
    model_config = ConfigDict(from_attributes=True)


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
