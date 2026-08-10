from uuid import UUID

from pydantic import BaseModel, ConfigDict


class CandidateResponse(BaseModel):
    id: UUID

    name: str | None = None
    email: str | None = None
    phone: str | None = None

    education: str | None = None
    experience: str | None = None

    skills: list[str] = []

    model_config = ConfigDict(from_attributes=True)


class ResumeParseResponse(BaseModel):
    message: str
    candidate: CandidateResponse