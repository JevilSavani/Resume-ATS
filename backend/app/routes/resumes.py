from pathlib import Path
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import jwt
from jwt import PyJWTError
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.auth.security import get_current_user
from app.config.settings import settings
from app.database.session import get_db
from app.models.user import User
from app.schemas.candidate import CandidateResponse, ResumeParseResponse
from app.services.candidate_service import (
    create_candidate,
    get_candidate_by_id,
    get_candidate_by_user_id,
    list_candidates,
)
from app.services.resume_parser import parse_resume

router = APIRouter(prefix="/resumes", tags=["Resumes"])
optional_bearer = HTTPBearer(auto_error=False)

UPLOAD_DIR = Path(__file__).resolve().parents[2] / "uploads"


def get_optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(optional_bearer),
    db: Session = Depends(get_db),
) -> User | None:
    if not credentials or credentials.scheme.lower() != "bearer":
        return None
    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.secret_key,
            algorithms=[settings.jwt_algorithm],
        )
        user_id = UUID(payload.get("sub"))
        return db.get(User, user_id)
    except (PyJWTError, TypeError, ValueError):
        return None


@router.post("/parse", response_model=ResumeParseResponse)
async def parse_uploaded_resume(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    optional_user: User | None = Depends(get_optional_user),
):
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No file uploaded.",
        )

    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please upload a PDF resume.",
        )

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    saved_path = UPLOAD_DIR / f"{uuid4().hex}_{Path(file.filename).name}"

    try:
        file_content = await file.read()
        if not file_content:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded PDF is empty.",
            )

        saved_path.write_bytes(file_content)
        parsed_resume = parse_resume(saved_path)

        user_id = optional_user.id if optional_user else None
        candidate = create_candidate(db, parsed_resume, user_id=user_id)

    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not save parsed candidate to the database.",
        ) from exc
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not parse the uploaded PDF resume.",
        ) from exc

    return {
        "message": "Resume parsed successfully",
        "candidate": candidate,
    }


@router.get("/me", response_model=CandidateResponse)
def get_my_candidate_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    candidate = get_candidate_by_user_id(db, current_user.id)
    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No resume profile found for this account. Please upload your resume first.",
        )
    return candidate


@router.get("/all", response_model=list[CandidateResponse])
def get_all_candidates(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return list_candidates(db)


@router.get("/candidate/{candidate_id}", response_model=CandidateResponse)
def get_candidate_details(
    candidate_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    candidate = get_candidate_by_id(db, candidate_id)
    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate not found.",
        )
    return candidate