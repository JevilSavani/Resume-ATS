import re
from pathlib import Path

import fitz

from .nlp_service import extract_name, extract_section, extract_skills


EMAIL_PATTERN = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")
PHONE_PATTERN = re.compile(
    r"(?<!\d)(?:\+?\d[\d\s().-]{8,}\d)(?!\d)"
)


def extract_text_from_pdf(file_path: Path) -> str:
    text_parts: list[str] = []
    with fitz.open(file_path) as document:
        for page in document:
            text_parts.append(page.get_text())
    return clean_text("\n".join(text_parts))


def clean_text(text: str) -> str:
    text = text.replace("\x00", " ")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def parse_resume(file_path: Path) -> dict:
    resume_text = extract_text_from_pdf(file_path)
    email_match = EMAIL_PATTERN.search(resume_text)
    phone_match = PHONE_PATTERN.search(resume_text)

    return {
        "name": extract_name(resume_text),
        "email": email_match.group(0).lower() if email_match else None,
        "phone": clean_phone(phone_match.group(0)) if phone_match else None,
        "education": extract_section(resume_text, "education"),
        "experience": extract_section(resume_text, "experience"),
        "skills": extract_skills(resume_text),
        "resume_text": resume_text,
        "resume_path": str(file_path),
    }


def clean_phone(phone: str) -> str:
    return re.sub(r"\s+", " ", phone).strip(" .-")
