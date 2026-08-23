import json
from uuid import UUID
from sqlalchemy import text
from sqlalchemy.orm import Session


def create_candidate(db: Session, parsed_resume: dict, user_id: UUID | None = None) -> dict:
    skills = parsed_resume.get("skills", [])
    skills_json = json.dumps(skills)

    if user_id:
        existing = db.execute(
            text("SELECT id FROM candidates WHERE user_id = :user_id ORDER BY created_at DESC LIMIT 1"),
            {"user_id": str(user_id)},
        ).mappings().first()

        if existing:
            result = db.execute(
                text(
                    """
                    UPDATE candidates
                    SET name = :name,
                        email = :email,
                        phone = :phone,
                        education = :education,
                        experience = :experience,
                        skills = :skills::json,
                        resume_path = :resume_path,
                        resume_text = :resume_text
                    WHERE id = :id
                    RETURNING id, user_id, name, email, phone, education, experience, skills, resume_path, resume_text, created_at
                    """
                ),
                {
                    "id": existing["id"],
                    "name": parsed_resume.get("name"),
                    "email": parsed_resume.get("email"),
                    "phone": parsed_resume.get("phone"),
                    "education": parsed_resume.get("education"),
                    "experience": parsed_resume.get("experience"),
                    "skills": skills_json,
                    "resume_path": parsed_resume.get("resume_path"),
                    "resume_text": parsed_resume.get("resume_text"),
                },
            )
            db.commit()
            candidate = dict(result.mappings().one())
            if isinstance(candidate.get("skills"), str):
                candidate["skills"] = json.loads(candidate["skills"])
            candidate["skills"] = candidate.get("skills") or skills
            return candidate

    result = db.execute(
        text(
            """
            INSERT INTO candidates
                (user_id, name, email, phone, education, experience, skills, resume_path, resume_text)
            VALUES
                (:user_id, :name, :email, :phone, :education, :experience, :skills::json, :resume_path, :resume_text)
            RETURNING id, user_id, name, email, phone, education, experience, skills, resume_path, resume_text, created_at
            """
        ),
        {
            "user_id": str(user_id) if user_id else None,
            "name": parsed_resume.get("name"),
            "email": parsed_resume.get("email"),
            "phone": parsed_resume.get("phone"),
            "education": parsed_resume.get("education"),
            "experience": parsed_resume.get("experience"),
            "skills": skills_json,
            "resume_path": parsed_resume.get("resume_path"),
            "resume_text": parsed_resume.get("resume_text"),
        },
    )
    db.commit()
    candidate = dict(result.mappings().one())
    if isinstance(candidate.get("skills"), str):
        candidate["skills"] = json.loads(candidate["skills"])
    candidate["skills"] = candidate.get("skills") or skills
    return candidate


def get_candidate_by_user_id(db: Session, user_id: UUID) -> dict | None:
    result = db.execute(
        text(
            """
            SELECT id, user_id, name, email, phone, education, experience, skills, resume_path, resume_text, created_at
            FROM candidates
            WHERE user_id = :user_id
            ORDER BY created_at DESC
            LIMIT 1
            """
        ),
        {"user_id": str(user_id)},
    )
    row = result.mappings().first()
    if not row:
        return None
    candidate = dict(row)
    if isinstance(candidate.get("skills"), str):
        candidate["skills"] = json.loads(candidate["skills"])
    candidate["skills"] = candidate.get("skills") or []
    return candidate


def get_candidate_by_id(db: Session, candidate_id: UUID) -> dict | None:
    result = db.execute(
        text(
            """
            SELECT id, user_id, name, email, phone, education, experience, skills, resume_path, resume_text, created_at
            FROM candidates
            WHERE id = :candidate_id
            LIMIT 1
            """
        ),
        {"candidate_id": str(candidate_id)},
    )
    row = result.mappings().first()
    if not row:
        return None
    candidate = dict(row)
    if isinstance(candidate.get("skills"), str):
        candidate["skills"] = json.loads(candidate["skills"])
    candidate["skills"] = candidate.get("skills") or []
    return candidate


def list_candidates(db: Session) -> list[dict]:
    result = db.execute(
        text(
            """
            SELECT id, user_id, name, email, phone, education, experience, skills, resume_path, resume_text, created_at
            FROM candidates
            ORDER BY created_at DESC
            """
        )
    )
    rows = result.mappings().all()
    candidates = []
    for row in rows:
        candidate = dict(row)
        if isinstance(candidate.get("skills"), str):
            candidate["skills"] = json.loads(candidate["skills"])
        candidate["skills"] = candidate.get("skills") or []
        candidates.append(candidate)
    return candidates
