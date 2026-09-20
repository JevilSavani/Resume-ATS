import json
from uuid import UUID
from sqlalchemy.orm import Session

from app.models.candidate import Candidate


def create_candidate(db: Session, parsed_resume: dict, user_id: UUID | None = None) -> Candidate:
    skills = parsed_resume.get("skills") or []
    if isinstance(skills, str):
        try:
            skills = json.loads(skills)
        except Exception:
            skills = [s.strip() for s in skills.split(",") if s.strip()]

    if user_id:
        existing = (
            db.query(Candidate)
            .filter(Candidate.user_id == user_id)
            .order_by(Candidate.created_at.desc())
            .first()
        )

        if existing:
            existing.name = parsed_resume.get("name")
            existing.email = parsed_resume.get("email")
            existing.phone = parsed_resume.get("phone")
            existing.education = parsed_resume.get("education")
            existing.experience = parsed_resume.get("experience")
            existing.skills = skills
            existing.resume_path = parsed_resume.get("resume_path")
            existing.resume_text = parsed_resume.get("resume_text")
            db.commit()
            db.refresh(existing)
            return existing

    candidate = Candidate(
        user_id=user_id,
        name=parsed_resume.get("name"),
        email=parsed_resume.get("email"),
        phone=parsed_resume.get("phone"),
        education=parsed_resume.get("education"),
        experience=parsed_resume.get("experience"),
        skills=skills,
        resume_path=parsed_resume.get("resume_path"),
        resume_text=parsed_resume.get("resume_text"),
    )
    db.add(candidate)
    db.commit()
    db.refresh(candidate)
    return candidate


def get_candidate_by_user_id(db: Session, user_id: UUID) -> Candidate | None:
    return (
        db.query(Candidate)
        .filter(Candidate.user_id == user_id)
        .order_by(Candidate.created_at.desc())
        .first()
    )


def get_candidate_by_id(db: Session, candidate_id: UUID) -> Candidate | None:
    return (
        db.query(Candidate)
        .filter(Candidate.id == candidate_id)
        .first()
    )


def list_candidates(db: Session) -> list[Candidate]:
    return (
        db.query(Candidate)
        .order_by(Candidate.created_at.desc())
        .all()
    )

