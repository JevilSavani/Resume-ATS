from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class CandidateResponse(BaseModel):
    id: UUID
    user_id: UUID | None = None

    name: str | None = None
    email: str | None = None
    phone: str | None = None

    education: str | None = None
    experience: str | None = None

    skills: list[str] = []
    resume_path: str | None = None
    resume_text: str | None = None
    created_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class ResumeParseResponse(BaseModel):
    message: str
    candidate: CandidateResponse