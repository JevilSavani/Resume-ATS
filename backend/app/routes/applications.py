from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.auth.security import get_current_user, require_candidate, require_recruiter
from app.database.session import get_db
from app.models.application import Application
from app.models.candidate import Candidate
from app.models.job_profile import JobProfile
from app.models.user import User
from app.schemas.application import ApplicationCreateRequest, ApplicationResponse
from app.services.candidate_service import get_candidate_by_user_id

router = APIRouter(prefix="/applications", tags=["Applications"])


@router.post("/apply", response_model=ApplicationResponse, status_code=status.HTTP_201_CREATED)
def apply_for_job(
    payload: ApplicationCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_candidate),
):
    job = db.query(JobProfile).filter(JobProfile.id == payload.job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job profile not found.")

    existing_app = (
        db.query(Application)
        .filter(Application.user_id == current_user.id, Application.job_id == payload.job_id)
        .first()
    )
    if existing_app:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already applied for this job.",
        )

    candidate_record = get_candidate_by_user_id(db, current_user.id)
    candidate_id = None
    if candidate_record:
        raw_id = getattr(candidate_record, "id", None) or (candidate_record.get("id") if isinstance(candidate_record, dict) else None)
        candidate_id = UUID(str(raw_id)) if raw_id else None

    application = Application(
        user_id=current_user.id,
        candidate_id=candidate_id,
        job_id=payload.job_id,
        status="Applied",
    )
    db.add(application)
    try:
        db.commit()
        db.refresh(application)
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not submit application.",
        ) from exc

    return ApplicationResponse(
        id=application.id,
        user_id=application.user_id,
        candidate_id=application.candidate_id,
        job_id=application.job_id,
        status=application.status,
        created_at=application.created_at,
        job=job,
        candidate=candidate_record,
    )


@router.get("/my-applications", response_model=list[ApplicationResponse])
def get_my_applications(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_candidate),
):
    apps = (
        db.query(Application)
        .filter(Application.user_id == current_user.id)
        .order_by(Application.created_at.desc())
        .all()
    )
    results = []
    for app in apps:
        job = db.query(JobProfile).filter(JobProfile.id == app.job_id).first()
        candidate = db.query(Candidate).filter(Candidate.id == app.candidate_id).first() if app.candidate_id else None
        results.append(
            ApplicationResponse(
                id=app.id,
                user_id=app.user_id,
                candidate_id=app.candidate_id,
                job_id=app.job_id,
                status=app.status,
                created_at=app.created_at,
                job=job,
                candidate=candidate,
            )
        )
    return results


@router.get("/job/{job_id}", response_model=list[ApplicationResponse])
def get_job_applications(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_recruiter),
):
    job = db.query(JobProfile).filter(JobProfile.id == job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job profile not found.")
    if job.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only view applicants for your own jobs.")

    apps = (
        db.query(Application)
        .filter(Application.job_id == job_id)
        .order_by(Application.created_at.desc())
        .all()
    )
    results = []
    for app in apps:
        candidate = db.query(Candidate).filter(Candidate.id == app.candidate_id).first() if app.candidate_id else None
        results.append(
            ApplicationResponse(
                id=app.id,
                user_id=app.user_id,
                candidate_id=app.candidate_id,
                job_id=app.job_id,
                status=app.status,
                created_at=app.created_at,
                job=job,
                candidate=candidate,
            )
        )
    return results


@router.get("/recruiter/all", response_model=list[ApplicationResponse])
def get_all_recruiter_applications(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_recruiter),
):
    apps = (
        db.query(Application)
        .join(JobProfile, Application.job_id == JobProfile.id)
        .filter(JobProfile.user_id == current_user.id)
        .order_by(Application.created_at.desc())
        .all()
    )
    results = []
    for app in apps:
        job = db.query(JobProfile).filter(JobProfile.id == app.job_id).first()
        candidate = db.query(Candidate).filter(Candidate.id == app.candidate_id).first() if app.candidate_id else None
        results.append(
            ApplicationResponse(
                id=app.id,
                user_id=app.user_id,
                candidate_id=app.candidate_id,
                job_id=app.job_id,
                status=app.status,
                created_at=app.created_at,
                job=job,
                candidate=candidate,
            )
        )
    return results


@router.patch("/{application_id}/status", response_model=ApplicationResponse)
def update_application_status(
    application_id: str,
    status_update: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_recruiter),
):
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found.")

    job = db.query(JobProfile).filter(JobProfile.id == app.job_id).first()
    if not job or job.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only update applications for jobs you own.")

    new_status = status_update.get("status")
    if not new_status:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Status field is required.")

    app.status = new_status
    try:
        db.commit()
        db.refresh(app)
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not update application status.",
        ) from exc

    candidate = db.query(Candidate).filter(Candidate.id == app.candidate_id).first() if app.candidate_id else None
    return ApplicationResponse(
        id=app.id,
        user_id=app.user_id,
        candidate_id=app.candidate_id,
        job_id=app.job_id,
        status=app.status,
        created_at=app.created_at,
        job=job,
        candidate=candidate,
    )
