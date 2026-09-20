import json
import re
from collections import Counter

from .nlp_service import extract_skills


STOP_WORDS = {
    "the",
    "and",
    "for",
    "with",
    "from",
    "into",
    "this",
    "that",
    "your",
    "will",
    "have",
    "must",
    "should",
    "about",
    "using",
    "across",
    "through",
    "within",
    "their",
    "where",
    "work",
    "role",
    "responsibilities",
    "requirements",
    "description",
    "title",
    "candidate",
    "experience",
    "years",
    "skills",
    "team",
    "strong",
    "excellent",
    "including",
    "related",
    "preferred",
    "ability",
    "able",
    "highly",
    "technical",
    "junior",
    "senior",
    "mid",
    "lead",
    "developer",
    "engineer",
    "manager",
}


def normalize_skill_name(value: str | None) -> str:
    if not value:
        return ""
    return re.sub(r"[^a-z0-9+#. ]", " ", value.lower()).strip()


def parse_job_description(description: str, title: str | None = None, company: str | None = None, location: str | None = None) -> dict:
    raw_text = (description or "").strip()
    if not raw_text:
        raise ValueError("Job description is required.")

    job_title = extract_job_title(raw_text, title)
    skills = extract_skills(raw_text)
    keywords = extract_keywords(raw_text, skills)
    experience = extract_experience(raw_text)
    education = extract_education(raw_text)
    clean_text = re.sub(r"\s+", " ", raw_text)

    return {
        "title": job_title,
        "company": company,
        "location": location,
        "skills": skills,
        "keywords": keywords,
        "experience": experience,
        "education": education,
        "description": clean_text,
        "job_text": clean_text,
    }


def extract_job_title(text: str, fallback: str | None = None) -> str | None:
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    if fallback and fallback.strip():
        return fallback.strip()

    for line in lines[:10]:
        cleaned = re.sub(r"^(job title|role|position)\s*[:\-]?\s*", "", line, flags=re.IGNORECASE)
        cleaned = cleaned.strip(" -")
        if not cleaned:
            continue
        if len(cleaned.split()) <= 12 and not re.search(r"(description|requirements|responsibilities)", cleaned, flags=re.IGNORECASE):
            return cleaned

    first_line = lines[0] if lines else ""
    return first_line or None


def extract_keywords(text: str, skills: list[str] | None = None) -> list[str]:
    tokens = re.findall(r"[a-zA-Z][a-zA-Z+#.]{2,}", text.lower())
    filtered = [
        token.strip(".-")
        for token in tokens
        if token not in STOP_WORDS and len(token) > 2 and not re.search(r"\d", token)
    ]
    counts = Counter(filtered)
    ranked = [word for word, _ in counts.most_common(12)]

    if skills:
        for skill in skills:
            normalized = normalize_skill_name(skill)
            if normalized and normalized not in ranked:
                ranked.append(normalized)

    return [word for word in ranked if word][:12]


def extract_experience(text: str) -> str | None:
    match = re.search(r"(\d+(?:\.\d+)?)\s*(?:\+)?\s*(?:years?|yrs?|yr)", text, flags=re.IGNORECASE)
    if not match:
        return None
    return f"{match.group(1)}+ years" if "+" in match.group(0).lower() else f"{match.group(1)} years"


def extract_education(text: str) -> str | None:
    lowered = text.lower()
    if "phd" in lowered or "doctorate" in lowered:
        return "PhD or equivalent"
    if "master" in lowered:
        return "Master's degree"
    if "bachelor" in lowered or "bsc" in lowered or "ba" in lowered or "degree" in lowered:
        return "Bachelor's degree"
    if "diploma" in lowered:
        return "Diploma"
    return None


def score_candidate_match(candidate: object, job_profile: object) -> dict:
    cand_dict = serialize_candidate(candidate) if not isinstance(candidate, dict) else candidate
    job_dict = serialize_job_profile(job_profile) if not isinstance(job_profile, dict) else job_profile

    candidate_skills = {normalize_skill_name(skill) for skill in cand_dict.get("skills", []) if normalize_skill_name(skill)}
    job_skills = {normalize_skill_name(skill) for skill in job_dict.get("skills", []) if normalize_skill_name(skill)}

    matched_skills = sorted(job_skills.intersection(candidate_skills))
    missing_skills = sorted(job_skills.difference(candidate_skills))
    skill_match_score = round((len(matched_skills) / len(job_skills) * 100), 2) if job_skills else 0.0

    text_similarity = calculate_tfidf_cosine_similarity(
        candidate.get("resume_text") or " ",
        job_profile.get("job_text") or " ",
    )

    experience_score = calculate_experience_score(candidate.get("experience", ""), job_profile.get("experience", ""))
    education_score = calculate_education_score(candidate.get("education", ""), job_profile.get("education", ""))

    ats_score = (
        (skill_match_score * 0.40)
        + (text_similarity * 0.30)
        + (experience_score * 0.20)
        + (education_score * 0.10)
    )

    return {
        "candidate_id": candidate.get("id"),
        "candidate_name": candidate.get("name"),
        "candidate_email": candidate.get("email"),
        "candidate_phone": candidate.get("phone"),
        "candidate_skills": candidate.get("skills", []),
        "matched_skills": matched_skills,
        "missing_skills": missing_skills,
        "skill_match_score": round(skill_match_score, 2),
        "text_similarity": round(text_similarity, 4),
        "experience_score": round(experience_score, 2),
        "education_score": round(education_score, 2),
        "ats_score": round(ats_score, 2),
        "experience_summary": candidate.get("experience"),
        "education_summary": candidate.get("education"),
    }


def calculate_tfidf_cosine_similarity(resume_text: str, job_text: str) -> float:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity

    if not resume_text.strip() or not job_text.strip():
        return 0.0

    vectorizer = TfidfVectorizer(stop_words="english")
    documents = [resume_text, job_text]
    tfidf_matrix = vectorizer.fit_transform(documents)
    similarity = cosine_similarity(tfidf_matrix[0], tfidf_matrix[1])[0][0]
    return max(0.0, min(float(similarity), 1.0)) * 100.0


def calculate_experience_score(candidate_experience: str | None, job_experience: str | None) -> float:
    candidate_years = extract_numeric_years(candidate_experience)
    job_years = extract_numeric_years(job_experience)

    if not job_years and not candidate_years:
        return 50.0 if candidate_experience else 0.0
    if not job_years:
        return 100.0 if candidate_experience else 0.0
    if candidate_years >= job_years:
        return 100.0
    if candidate_years == 0:
        return 0.0
    return round((candidate_years / job_years) * 100.0, 2)


def calculate_education_score(candidate_education: str | None, job_education: str | None) -> float:
    if not job_education:
        return 100.0
    if not candidate_education:
        return 0.0

    job_level = normalize_education(job_education)
    candidate_level = normalize_education(candidate_education)
    score_map = {
        "phd": 4,
        "master": 3,
        "bachelor": 2,
        "diploma": 1,
    }

    if job_level not in score_map or candidate_level not in score_map:
        return 100.0 if candidate_education and job_education else 0.0

    if score_map[candidate_level] >= score_map[job_level]:
        return 100.0
    if score_map[candidate_level] + 1 >= score_map[job_level]:
        return 75.0
    return 50.0


def normalize_education(value: str) -> str:
    lowered = (value or "").lower()
    if "phd" in lowered or "doctorate" in lowered:
        return "phd"
    if "master" in lowered:
        return "master"
    if "bachelor" in lowered or "degree" in lowered or "bsc" in lowered or "ba" in lowered:
        return "bachelor"
    if "diploma" in lowered:
        return "diploma"
    return ""


def extract_numeric_years(value: str | None) -> float:
    if not value:
        return 0.0
    numbers = re.findall(r"(\d+(?:\.\d+)?)", value)
    if not numbers:
        return 0.0
    return max(float(num) for num in numbers)


def serialize_job_profile(job_profile: object) -> dict:
    return {
        "id": job_profile.id,
        "title": job_profile.title,
        "company": job_profile.company,
        "location": job_profile.location,
        "skills": job_profile.skills or [],
        "experience": job_profile.experience,
        "education": job_profile.education,
        "keywords": job_profile.keywords or [],
        "description": job_profile.description,
        "job_text": job_profile.job_text,
    }


def serialize_candidate(candidate: object) -> dict:
    if isinstance(candidate, dict):
        return {
            "id": candidate.get("id"),
            "name": candidate.get("name"),
            "email": candidate.get("email"),
            "phone": candidate.get("phone"),
            "education": candidate.get("education"),
            "experience": candidate.get("experience"),
            "skills": candidate.get("skills") or [],
            "resume_path": candidate.get("resume_path"),
            "resume_text": candidate.get("resume_text"),
        }
    return {
        "id": getattr(candidate, "id", None),
        "name": getattr(candidate, "name", None),
        "email": getattr(candidate, "email", None),
        "phone": getattr(candidate, "phone", None),
        "education": getattr(candidate, "education", None),
        "experience": getattr(candidate, "experience", None),
        "skills": getattr(candidate, "skills", None) or [],
        "resume_path": getattr(candidate, "resume_path", None),
        "resume_text": getattr(candidate, "resume_text", None),
    }



def rank_candidates_for_job(job_profile: object, candidates: list[object]) -> list[dict]:
    ranked = []
    job_data = serialize_job_profile(job_profile)
    for candidate in candidates:
        candidate_data = serialize_candidate(candidate)
        result = score_candidate_match(candidate_data, job_data)
        result["rank"] = 0
        ranked.append(result)

    ranked.sort(key=lambda item: item["ats_score"], reverse=True)
    for index, result in enumerate(ranked, start=1):
        result["rank"] = index
    return ranked
