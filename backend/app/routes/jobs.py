from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.auth.security import get_current_user, require_recruiter
from app.database.session import get_db
from app.models.candidate import Candidate
from app.models.job_profile import JobProfile
from app.models.user import User
from app.schemas.job import JobProfileCreateRequest, JobProfileResponse, JobRankingResponse
from app.services.job_service import parse_job_description, rank_candidates_for_job

router = APIRouter(prefix="/jobs", tags=["Jobs"])


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
            company=payload.company,
            location=payload.location,
        )

        job = JobProfile(
            user_id=current_user.id,
            title=parsed_job["title"],
            company=parsed_job["company"],
            location=parsed_job["location"],
            skills=parsed_job["skills"],
            experience=parsed_job["experience"],
            education=parsed_job["education"],
            keywords=parsed_job["keywords"],
            description=parsed_job["description"],
            job_text=parsed_job["job_text"],
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


@router.get("/profiles", response_model=list[JobProfileResponse])
def list_job_profiles(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    jobs = db.query(JobProfile).order_by(JobProfile.created_at.desc()).all()
    return jobs


@router.get("/my-jobs", response_model=list[JobProfileResponse])
def list_my_job_profiles(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_recruiter),
):
    jobs = db.query(JobProfile).filter(JobProfile.user_id == current_user.id).order_by(JobProfile.created_at.desc()).all()
    return jobs


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
