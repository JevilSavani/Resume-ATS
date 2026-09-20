from datetime import datetime
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.models.application import Application
from app.models.candidate import Candidate
from app.models.job_profile import JobProfile
from app.models.user import User
from app.services.candidate_service import get_candidate_by_user_id


def apply_to_job(db: Session, user_id: UUID, job_id: UUID) -> Application:
    job = db.query(JobProfile).filter(JobProfile.id == job_id).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job profile not found.",
        )

    # Prevent duplicate applications
    existing_app = (
        db.query(Application)
        .filter(Application.user_id == user_id, Application.job_id == job_id)
        .first()
    )
    if existing_app:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already applied for this job.",
        )

    candidate_record = get_candidate_by_user_id(db, user_id)
    candidate_id = None
    if candidate_record:
        raw_id = getattr(candidate_record, "id", None)
        if raw_id:
            candidate_id = UUID(str(raw_id))

    application = Application(
        user_id=user_id,
        candidate_id=candidate_id,
        job_id=job_id,
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

    return application


def get_candidate_applications(db: Session, user_id: UUID) -> list[Application]:
    return (
        db.query(Application)
        .filter(Application.user_id == user_id)
        .order_by(Application.created_at.desc())
        .all()
    )


def get_recruiter_job_applications(
    db: Session, recruiter_id: UUID, job_id: UUID | None = None
) -> list[dict]:
    query = (
        db.query(Application, JobProfile, Candidate)
        .join(JobProfile, Application.job_id == JobProfile.id)
        .outerjoin(Candidate, Application.candidate_id == Candidate.id)
        .filter(JobProfile.user_id == recruiter_id)
    )

    if job_id:
        # Verify job belongs to this recruiter
        target_job = db.query(JobProfile).filter(JobProfile.id == job_id).first()
        if not target_job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Job profile not found.",
            )
        if target_job.user_id != recruiter_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view applicants for your own jobs.",
            )
        query = query.filter(Application.job_id == job_id)

    records = query.order_by(Application.created_at.desc()).all()

    results = []
    for app, job, cand in records:
        # Fallback to User name/email if candidate profile not yet created
        user = db.query(User).filter(User.id == app.user_id).first() if not cand else None
        candidate_name = cand.name if cand and cand.name else (user.name if user else "Candidate")
        candidate_email = cand.email if cand and cand.email else (user.email if user else None)
        candidate_phone = cand.phone if cand else None
        candidate_skills = cand.skills if cand and cand.skills else []
        candidate_education = cand.education if cand else None
        candidate_experience = cand.experience if cand else None

        results.append({
            "id": app.id,
            "candidate_id": app.candidate_id or app.user_id,
            "job_id": app.job_id,
            "job_title": job.title or "Untitled Position",
            "candidate_name": candidate_name,
            "candidate_email": candidate_email,
            "candidate_phone": candidate_phone,
            "candidate_skills": candidate_skills,
            "candidate_education": candidate_education,
            "candidate_experience": candidate_experience,
            "status": app.status,
            "applied_at": app.created_at,
            "ats_score": "Not evaluated",  # Do NOT fake ATS scores
        })

    return results


def update_application_status(
    db: Session, recruiter_id: UUID, application_id: UUID, new_status: str
) -> Application:
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found.",
        )

    job = db.query(JobProfile).filter(JobProfile.id == app.job_id).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Associated job profile not found.",
        )

    if job.user_id != recruiter_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update applications for jobs you own.",
        )

    valid_statuses = {"applied", "reviewing", "shortlisted", "rejected"}
    normalized = new_status.strip().lower()
    if normalized not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status '{new_status}'. Allowed: {', '.join(valid_statuses)}",
        )

    # Format nicely
    status_display_map = {
        "applied": "Applied",
        "reviewing": "Reviewing",
        "shortlisted": "Shortlisted",
        "rejected": "Rejected",
    }
    app.status = status_display_map.get(normalized, new_status)

    try:
        db.commit()
        db.refresh(app)
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not update application status.",
        ) from exc

    return app


def verify_recruiter_can_view_candidate(
    db: Session, recruiter_id: UUID, candidate_id: UUID
) -> Candidate:
    """
    Step 11 & 14 Security:
    Recruiter owns job -> candidate applied to that job -> allow profile access.
    Otherwise return 403.
    """
    # Check if candidate exists
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    user_match = None
    if not candidate:
        # Could be user_id
        candidate = db.query(Candidate).filter(Candidate.user_id == candidate_id).first()

    # Find application to any of this recruiter's jobs
    app_query = (
        db.query(Application)
        .join(JobProfile, Application.job_id == JobProfile.id)
        .filter(JobProfile.user_id == recruiter_id)
    )

    if candidate:
        app_match = app_query.filter(
            (Application.candidate_id == candidate.id) | (Application.user_id == candidate.user_id)
        ).first()
    else:
        app_match = app_query.filter(Application.user_id == candidate_id).first()

    if not app_match:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Candidate has not applied to any of your posted jobs.",
        )

    if not candidate:
        # If candidate hasn't uploaded a resume, create a minimal candidate object from User
        user = db.query(User).filter(User.id == candidate_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Candidate record not found.",
            )
        candidate = Candidate(
            id=user.id,
            user_id=user.id,
            name=user.name,
            email=user.email,
            skills=[],
            education=None,
            experience=None,
            resume_text=None,
            created_at=user.created_at,
        )

    return candidate


def get_recruiter_dashboard_stats(db: Session, recruiter_id: UUID) -> dict:
    jobs = (
        db.query(JobProfile)
        .filter(JobProfile.user_id == recruiter_id)
        .order_by(JobProfile.created_at.desc())
        .all()
    )

    total_jobs = len(jobs)
    active_jobs = sum(1 for j in jobs if (getattr(j, "status", None) or "active").lower() == "active")

    # Total applicants count across recruiter's jobs
    job_ids = [j.id for j in jobs]
    total_applicants = 0
    applicant_counts = {}

    if job_ids:
        counts = (
            db.query(Application.job_id, func.count(Application.id))
            .filter(Application.job_id.in_(job_ids))
            .group_by(Application.job_id)
            .all()
        )
        applicant_counts = {job_id: count for job_id, count in counts}
        total_applicants = sum(applicant_counts.values())

    # Build recent jobs with applicant counts
    recent_jobs = []
    for j in jobs[:5]:
        setattr(j, "applicant_count", applicant_counts.get(j.id, 0))
        setattr(j, "company_name", j.company_name or j.company)
        setattr(j, "required_skills", j.required_skills or j.skills or [])
        recent_jobs.append(j)

    return {
        "total_jobs": total_jobs,
        "active_jobs": active_jobs,
        "total_applicants": total_applicants,
        "recent_jobs": recent_jobs,
    }
