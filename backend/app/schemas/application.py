from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from .candidate import CandidateResponse
from .job import JobProfileResponse


class ApplicationCreateRequest(BaseModel):
    job_id: UUID


class ApplicationResponse(BaseModel):
    id: UUID
    user_id: UUID
    candidate_id: UUID | None = None
    job_id: UUID
    status: str = "Applied"
    created_at: datetime
    job: JobProfileResponse | None = None
    candidate: CandidateResponse | None = None

    model_config = ConfigDict(from_attributes=True)
