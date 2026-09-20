from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.auth.security import get_current_user, require_recruiter
from app.database.session import get_db
from app.models.candidate import Candidate
from app.models.job_profile import JobProfile
from app.models.user import User
from app.schemas.job import (
    JobCreateRequest,
    JobProfileCreateRequest,
    JobProfileResponse,
    JobRankingResponse,
    JobUpdateRequest,
)
from app.services.job_service import parse_job_description, rank_candidates_for_job

router = APIRouter(prefix="/jobs", tags=["Jobs"])


@router.post("/extract-skills")
def extract_job_skills_only(
    payload: dict,
    current_user: User = Depends(require_recruiter),
):
    """
    Pure NLP extraction endpoint: analyzes text without saving anything to the database.
    """
    description = (payload.get("description") or "").strip()
    if not description:
        return {"skills": [], "experience": None, "education": None, "keywords": []}

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


@router.post("/parse", response_model=JobProfileResponse, status_code=status.HTTP_201_CREATED)
def create_job_profile(
    payload: JobProfileCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_recruiter),
):
    try:
        parsed_job = parse_job_description(
            payload.description,
            title=payload.title,
            company=payload.company or payload.company_name,
            location=payload.location,
        )

        company = parsed_job["company"] or payload.company_name or payload.company
        skills = parsed_job["skills"] or payload.required_skills
        experience = parsed_job["experience"] or payload.minimum_experience
        education = parsed_job["education"] or payload.education_requirement

        # Idempotency / Duplicate protection: Check if identical job was created within the last 10 seconds
        recent_threshold = datetime.utcnow() - timedelta(seconds=10)
        existing_duplicate = (
            db.query(JobProfile)
            .filter(
                JobProfile.user_id == current_user.id,
                JobProfile.title == parsed_job["title"],
                JobProfile.company == company,
                JobProfile.description == parsed_job["description"],
                JobProfile.created_at >= recent_threshold,
            )
            .order_by(JobProfile.created_at.desc())
            .first()
        )
        if existing_duplicate:
            return existing_duplicate

        job = JobProfile(
            user_id=current_user.id,
            title=parsed_job["title"],
            company=company,
            company_name=company,
            location=parsed_job["location"],
            skills=skills,
            required_skills=skills,
            preferred_skills=payload.preferred_skills or [],
            experience=experience,
            minimum_experience=experience,
            education=education,
            education_requirement=education,
            keywords=parsed_job["keywords"],
            description=parsed_job["description"],
            job_text=parsed_job["job_text"],
            employment_type=payload.employment_type or "Full-time",
            salary=payload.salary,
            status=payload.status or "active",
        )
        db.add(job)
        db.commit()
        db.refresh(job)
        return job
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not save the job profile.",
        ) from exc


@router.get("", response_model=list[JobProfileResponse])
@router.get("/profiles", response_model=list[JobProfileResponse])
def list_job_profiles(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    jobs = db.query(JobProfile).order_by(JobProfile.created_at.desc()).all()
    return jobs


@router.get("/available", response_model=list[JobProfileResponse])
def list_available_jobs_for_candidates(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Only active jobs for candidate view
    jobs = (
        db.query(JobProfile)
        .filter(JobProfile.status == "active")
        .order_by(JobProfile.created_at.desc())
        .all()
    )
    return jobs


@router.get("/my-jobs", response_model=list[JobProfileResponse])
def list_my_job_profiles(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_recruiter),
):
    jobs = db.query(JobProfile).filter(JobProfile.user_id == current_user.id).order_by(JobProfile.created_at.desc()).all()
    return jobs


@router.get("/{job_id}", response_model=JobProfileResponse)
@router.get("/profiles/{job_id}", response_model=JobProfileResponse)
def get_job_profile(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    job = db.query(JobProfile).filter(JobProfile.id == job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job profile not found.")
    return job


@router.put("/{job_id}", response_model=JobProfileResponse)
@router.put("/profiles/{job_id}", response_model=JobProfileResponse)
def update_job_profile(
    job_id: str,
    payload: JobUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_recruiter),
):
    job = db.query(JobProfile).filter(JobProfile.id == job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job profile not found.")

    if job.user_id and job.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only edit jobs you created.")

    if payload.title is not None:
        job.title = payload.title
    company = payload.company_name or payload.company
    if company is not None:
        job.company = company
        job.company_name = company
    if payload.location is not None:
        job.location = payload.location
    if payload.description is not None:
        job.description = payload.description
        job.job_text = payload.description
    skills = payload.required_skills or payload.skills
    if skills is not None:
        job.skills = skills
        job.required_skills = skills
    if payload.preferred_skills is not None:
        job.preferred_skills = payload.preferred_skills
    exp = payload.minimum_experience or payload.experience
    if exp is not None:
        job.experience = exp
        job.minimum_experience = exp
    edu = payload.education_requirement or payload.education
    if edu is not None:
        job.education = edu
        job.education_requirement = edu
    if payload.employment_type is not None:
        job.employment_type = payload.employment_type
    if payload.salary is not None:
        job.salary = payload.salary
    if payload.status is not None:
        job.status = payload.status

    try:
        db.commit()
        db.refresh(job)
        return job
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not update job profile.",
        ) from exc


@router.post("/rank", response_model=JobRankingResponse)
def rank_candidates_for_selected_job(
    job_id: str = Query(..., description="Job profile ID to rank against."),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_recruiter),
):
    job = db.query(JobProfile).filter(JobProfile.id == job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job profile not found.")

    candidates = db.query(Candidate).all()
    rankings = rank_candidates_for_job(job, candidates)

    payload = {
        "job_profile": job,
        "rankings": [
            {
                "candidate_id": item["candidate_id"],
                "candidate_name": item["candidate_name"],
                "candidate_email": item.get("candidate_email"),
                "candidate_phone": item.get("candidate_phone"),
                "candidate_skills": item.get("candidate_skills", []),
                "ats_score": item["ats_score"],
                "skill_match_score": item["skill_match_score"],
                "text_similarity": item["text_similarity"],
                "experience_score": item["experience_score"],
                "education_score": item["education_score"],
                "matched_skills": item["matched_skills"],
                "missing_skills": item["missing_skills"],
                "experience_summary": item["experience_summary"],
                "education_summary": item["education_summary"],
                "rank": item["rank"],
            }
            for item in rankings
        ],
    }
    return payload


@router.delete("/profiles/{job_id}", status_code=status.HTTP_200_OK)
def delete_job_profile(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_recruiter),
):
    job = db.query(JobProfile).filter(JobProfile.id == job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job profile not found.")

    if job.user_id and job.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only delete jobs you created.")

    try:
        from app.models.application import Application
        db.query(Application).filter(Application.job_id == job_id).delete(synchronize_session=False)
        db.delete(job)
        db.commit()
        return {"message": "Job profile deleted successfully."}
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not delete the job profile.",
        ) from exc


@router.get("/match-score/{job_id}")
def get_candidate_match_for_job(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.services.candidate_service import get_candidate_by_user_id
    from app.services.job_service import score_candidate_match, serialize_candidate, serialize_job_profile

    job = db.query(JobProfile).filter(JobProfile.id == job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job profile not found.")

    candidate = get_candidate_by_user_id(db, current_user.id)
    if not candidate:
        return {
            "has_resume": False,
            "message": "Upload your resume to see ATS match score.",
            "ats_score": 0.0,
            "matched_skills": [],
            "missing_skills": job.skills or [],
        }

    job_data = serialize_job_profile(job)
    match_result = score_candidate_match(candidate, job_data)
    return {
        "has_resume": True,
        **match_result,
    }
