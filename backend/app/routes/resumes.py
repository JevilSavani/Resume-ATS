from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.candidate import ResumeParseResponse
from app.services.candidate_service import create_candidate
from app.services.resume_parser import parse_resume


router = APIRouter(prefix="/resumes", tags=["Resumes"])
UPLOAD_DIR = Path(__file__).resolve().parents[2] / "uploads"


@router.post("/parse", response_model=ResumeParseResponse)
async def parse_uploaded_resume(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please upload a PDF resume.",
        )

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    saved_path = UPLOAD_DIR / f"{uuid4().hex}_{Path(file.filename).name}"

    try:
        saved_path.write_bytes(await file.read())
        parsed_resume = parse_resume(saved_path)
        candidate = create_candidate(db, parsed_resume)
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not save parsed candidate to the database.",
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not parse the uploaded PDF resume.",
        ) from exc

    return {
        "message": "Resume parsed successfully",
        "candidate": candidate,
    }
