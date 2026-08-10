from pydantic import BaseModel


class CandidateProfile(BaseModel):
    id: str | int | None = None
    name: str | None = None
    email: str | None = None
    phone: str | None = None
    education: str | None = None
    experience: str | None = None
    skills: list[str] = []


class ResumeParseResponse(BaseModel):
    message: str
    candidate: CandidateProfile
