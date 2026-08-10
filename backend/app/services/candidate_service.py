from sqlalchemy import text
from sqlalchemy.orm import Session


def create_candidate(db: Session, parsed_resume: dict) -> dict:
    result = db.execute(
        text(
            """
            INSERT INTO candidates
                (name, email, phone, education, experience, resume_path, resume_text)
            VALUES
                (:name, :email, :phone, :education, :experience, :resume_path, :resume_text)
            RETURNING id, name, email, phone, education, experience
            """
        ),
        {
            "name": parsed_resume.get("name"),
            "email": parsed_resume.get("email"),
            "phone": parsed_resume.get("phone"),
            "education": parsed_resume.get("education"),
            "experience": parsed_resume.get("experience"),
            "resume_path": parsed_resume.get("resume_path"),
            "resume_text": parsed_resume.get("resume_text"),
        },
    )
    db.commit()
    candidate = dict(result.mappings().one())
    candidate["skills"] = parsed_resume.get("skills", [])
    return candidate
