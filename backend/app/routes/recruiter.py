from datetime import datetime, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.auth.security import require_recruiter
from app.database.session import get_db
from app.models.application import Application
from app.models.job_profile import JobProfile
from app.models.user import User
from app.schemas.candidate import CandidateResponse
from app.schemas.job import (
    ApplicationStatusUpdate,
    JobCreateRequest,
    JobProfileResponse,
    JobUpdateRequest,
    RecruiterApplicantItem,
    RecruiterDashboardResponse,
)
from app.services.application_service import (
    get_recruiter_dashboard_stats,
    get_recruiter_job_applications,
    update_application_status,
    verify_recruiter_can_view_candidate,
)
from app.services.nlp_service import extract_skills

router = APIRouter(prefix="/recruiter", tags=["Recruiter"])


def _hydrate_job_response(job: JobProfile, applicant_count: int = 0) -> JobProfileResponse:
    company = job.company_name or job.company
    skills = job.required_skills if (job.required_skills and len(job.required_skills) > 0) else (job.skills or [])
    return JobProfileResponse(
        id=job.id,
        user_id=job.user_id,
        title=job.title,
        company=company,
        company_name=company,
        location=job.location,
        skills=skills,
        required_skills=skills,
        preferred_skills=job.preferred_skills or [],
        experience=job.minimum_experience or job.experience,
        minimum_experience=job.minimum_experience or job.experience,
        education=job.education_requirement or job.education,
        education_requirement=job.education_requirement or job.education,
        keywords=job.keywords or [],
        description=job.description,
        job_text=job.job_text,
        employment_type=job.employment_type or "Full-time",
        salary=job.salary,
        status=job.status or "active",
        created_at=job.created_at,
        updated_at=getattr(job, "updated_at", job.created_at),
        applicant_count=applicant_count,
    )


@router.get("/dashboard", response_model=RecruiterDashboardResponse)
def get_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_recruiter),
):
    stats = get_recruiter_dashboard_stats(db, current_user.id)
    return RecruiterDashboardResponse(
        total_jobs=stats["total_jobs"],
        active_jobs=stats["active_jobs"],
        total_applicants=stats["total_applicants"],
        recent_jobs=[_hydrate_job_response(j, getattr(j, "applicant_count", 0)) for j in stats["recent_jobs"]],
    )


@router.get("/jobs", response_model=list[JobProfileResponse])
def list_recruiter_jobs(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_recruiter),
):
    jobs = (
        db.query(JobProfile)
        .filter(JobProfile.user_id == current_user.id)
        .order_by(JobProfile.created_at.desc())
        .all()
    )

    job_ids = [j.id for j in jobs]
    applicant_counts = {}
    if job_ids:
        counts = (
            db.query(Application.job_id, func.count(Application.id))
            .filter(Application.job_id.in_(job_ids))
            .group_by(Application.job_id)
            .all()
        )
        applicant_counts = {job_id: count for job_id, count in counts}

    return [_hydrate_job_response(j, applicant_counts.get(j.id, 0)) for j in jobs]


@router.post("/jobs/extract-skills")
def extract_skills_only(
    payload: dict,
    current_user: User = Depends(require_recruiter),
):
    """
    Pure NLP extraction endpoint: analyzes text WITHOUT saving to the database.
    Prevents unintended database row creation while editing the form.
    """
    description = (payload.get("description") or "").strip()
    if not description:
        return {"skills": [], "experience": None, "education": None, "keywords": []}

    from app.services.job_service import parse_job_description
    parsed = parse_job_description(
        description,
        title=payload.get("title"),
        company=payload.get("company_name") or payload.get("company"),
        location=payload.get("location"),
    )
    return {
        "skills": parsed.get("skills", []),
        "experience": parsed.get("experience"),
        "education": parsed.get("education"),
        "keywords": parsed.get("keywords", []),
    }


@router.post("/jobs", response_model=JobProfileResponse, status_code=status.HTTP_201_CREATED)
def create_job(
    payload: JobCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_recruiter),
):
    title = payload.title.strip()
    if not title:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Job title is required.")

    company = (payload.company_name or payload.company or "").strip()
    if not company:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Company name is required.")

    description = payload.description.strip()
    if not description:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Job description is required.")

    # Idempotency / Duplicate protection: Check if identical job was created within the last 10 seconds
    recent_threshold = datetime.utcnow() - timedelta(seconds=10)
    existing_duplicate = (
        db.query(JobProfile)
        .filter(
            JobProfile.user_id == current_user.id,
            JobProfile.title == title,
            JobProfile.company == company,
            JobProfile.description == description,
            JobProfile.created_at >= recent_threshold,
        )
        .order_by(JobProfile.created_at.desc())
        .first()
    )
    if existing_duplicate:
        count = db.query(func.count(Application.id)).filter(Application.job_id == existing_duplicate.id).scalar() or 0
        return _hydrate_job_response(existing_duplicate, applicant_count=count)

    # Skills: use provided required_skills, or fallback to skills, or auto-extract with NLP
    skills = payload.required_skills or payload.skills or []
    if not skills:
        skills = extract_skills(description)

    job_status = (payload.status or "active").strip().lower()
    if job_status not in {"active", "closed"}:
        job_status = "active"

    experience = payload.minimum_experience or payload.experience
    education = payload.education_requirement or payload.education

    job = JobProfile(
        user_id=current_user.id,
        title=title,
        company=company,
        company_name=company,
        location=payload.location.strip() if payload.location else None,
        description=description,
        job_text=description,
        skills=skills,
        required_skills=skills,
        preferred_skills=payload.preferred_skills or [],
        experience=experience,
        minimum_experience=experience,
        education=education,
        education_requirement=education,
        keywords=skills,
        employment_type=payload.employment_type or "Full-time",
        salary=payload.salary,
        status=job_status,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )

    db.add(job)
    try:
        db.commit()
        db.refresh(job)
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not save job profile.",
        ) from exc

    return _hydrate_job_response(job, applicant_count=0)


@router.get("/jobs/{job_id}", response_model=JobProfileResponse)
def get_recruiter_job(
    job_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_recruiter),
):
    job = db.query(JobProfile).filter(JobProfile.id == job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job profile not found.")

    if job.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only access jobs you created.")

    count = db.query(func.count(Application.id)).filter(Application.job_id == job_id).scalar() or 0
    return _hydrate_job_response(job, count)


@router.put("/jobs/{job_id}", response_model=JobProfileResponse)
def update_recruiter_job(
    job_id: UUID,
    payload: JobUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_recruiter),
):
    job = db.query(JobProfile).filter(JobProfile.id == job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job profile not found.")

    if job.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only edit jobs you created.")

    if payload.title is not None:
        job.title = payload.title.strip()

    company = payload.company_name if payload.company_name is not None else payload.company
    if company is not None:
        job.company = company.strip()
        job.company_name = company.strip()

    if payload.location is not None:
        job.location = payload.location.strip()

    if payload.description is not None:
        job.description = payload.description.strip()
        job.job_text = payload.description.strip()

    skills = payload.required_skills if payload.required_skills is not None else payload.skills
    if skills is not None:
        job.skills = skills
        job.required_skills = skills

    if payload.preferred_skills is not None:
        job.preferred_skills = payload.preferred_skills

    experience = payload.minimum_experience if payload.minimum_experience is not None else payload.experience
    if experience is not None:
        job.experience = experience
        job.minimum_experience = experience

    education = payload.education_requirement if payload.education_requirement is not None else payload.education
    if education is not None:
        job.education = education
        job.education_requirement = education

    if payload.employment_type is not None:
        job.employment_type = payload.employment_type

    if payload.salary is not None:
        job.salary = payload.salary

    if payload.status is not None:
        status_val = payload.status.strip().lower()
        if status_val in {"active", "closed"}:
            job.status = status_val

    job.updated_at = datetime.utcnow()

    try:
        db.commit()
        db.refresh(job)
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not update job profile.",
        ) from exc

    count = db.query(func.count(Application.id)).filter(Application.job_id == job_id).scalar() or 0
    return _hydrate_job_response(job, count)


@router.delete("/jobs/{job_id}", status_code=status.HTTP_200_OK)
def delete_recruiter_job(
    job_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_recruiter),
):
    job = db.query(JobProfile).filter(JobProfile.id == job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job profile not found.")

    if job.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only delete jobs you created.")

    try:
        db.query(Application).filter(Application.job_id == job_id).delete(synchronize_session=False)
        db.delete(job)
        db.commit()
        return {"message": "Job profile and associated applications deleted successfully."}
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not delete job profile.",
        ) from exc


@router.get("/jobs/{job_id}/applicants", response_model=list[RecruiterApplicantItem])
def get_job_applicants(
    job_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_recruiter),
):
    return get_recruiter_job_applications(db, current_user.id, job_id=job_id)


@router.get("/applicants", response_model=list[RecruiterApplicantItem])
def get_all_applicants(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_recruiter),
):
    return get_recruiter_job_applications(db, current_user.id)


@router.get("/applicants/{candidate_id}", response_model=CandidateResponse)
def get_applicant_profile(
    candidate_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_recruiter),
):
    """
    Step 11 Security Check:
    Recruiters can only view candidate profiles of applicants for THEIR OWN jobs.
    """
    candidate = verify_recruiter_can_view_candidate(db, current_user.id, candidate_id)
    return candidate


@router.patch("/jobs/{job_id}/applications/{application_id}/status")
@router.patch("/applications/{application_id}/status")
def update_applicant_status(
    application_id: UUID,
    payload: ApplicationStatusUpdate,
    job_id: UUID | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_recruiter),
):
    app = update_application_status(db, current_user.id, application_id, payload.status)
    return {
        "id": app.id,
        "status": app.status,
        "message": f"Application status updated to '{app.status}'.",
    }
