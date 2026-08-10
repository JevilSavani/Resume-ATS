import re

import spacy


SKILL_KEYWORDS = {
    "languages": [
        "python",
        "java",
        "javascript",
        "typescript",
        "c",
        "c++",
        "c#",
        "php",
        "ruby",
        "go",
        "r",
        "sql",
    ],
    "frontend": [
        "html",
        "css",
        "react",
        "redux",
        "vite",
        "tailwind",
        "bootstrap",
    ],
    "backend": [
        "fastapi",
        "flask",
        "django",
        "node.js",
        "express",
        "rest api",
        "api",
    ],
    "database": [
        "postgresql",
        "postgres",
        "mysql",
        "mongodb",
        "supabase",
        "firebase",
    ],
    "ml": [
        "machine learning",
        "nlp",
        "spacy",
        "pandas",
        "numpy",
        "scikit-learn",
    ],
    "tools": [
        "git",
        "github",
        "docker",
        "linux",
        "excel",
        "power bi",
    ],
}

SKILL_NORMALIZATION = {
    "js": "JavaScript",
    "javascript": "JavaScript",
    "ts": "TypeScript",
    "typescript": "TypeScript",
    "py": "Python",
    "python": "Python",
    "postgres": "PostgreSQL",
    "postgresql": "PostgreSQL",
    "node": "Node.js",
    "node.js": "Node.js",
    "react.js": "React",
    "reactjs": "React",
    "rest api": "REST API",
    "api": "API",
    "css": "CSS",
    "excel": "Excel",
    "fastapi": "FastAPI",
    "firebase": "Firebase",
    "flask": "Flask",
    "git": "Git",
    "github": "GitHub",
    "html": "HTML",
    "java": "Java",
    "linux": "Linux",
    "mongodb": "MongoDB",
    "mysql": "MySQL",
    "numpy": "NumPy",
    "pandas": "Pandas",
    "php": "PHP",
    "power bi": "Power BI",
    "react": "React",
    "redux": "Redux",
    "scikit-learn": "Scikit-learn",
    "sklearn": "Scikit-learn",
    "spacy": "spaCy",
    "sql": "SQL",
    "supabase": "Supabase",
    "tailwind": "Tailwind",
    "vite": "Vite",
    "nlp": "NLP",
    "c++": "C++",
    "c#": "C#",
    "c": "C",
    "r": "R",
}

SECTION_HEADINGS = {
    "education": ["education", "academic background", "qualification", "qualifications"],
    "experience": [
        "experience",
        "work experience",
        "professional experience",
        "employment history",
        "internship",
        "internships",
    ],
    "skills": ["skills", "technical skills", "key skills", "technologies"],
}


def load_nlp():
    try:
        return spacy.load("en_core_web_sm")
    except OSError:
        return spacy.blank("en")


NLP = load_nlp()


def extract_name(text: str) -> str | None:
    top_text = "\n".join(text.splitlines()[:12])
    doc = NLP(top_text)
    for entity in doc.ents:
        if entity.label_ == "PERSON" and 2 <= len(entity.text.strip()) <= 80:
            return entity.text.strip()

    for line in top_text.splitlines():
        clean_line = line.strip()
        if not clean_line or "@" in clean_line or re.search(r"\d", clean_line):
            continue
        if clean_line.lower() in {"resume", "curriculum vitae", "cv"}:
            continue
        if len(clean_line.split()) <= 5:
            return clean_line
    return None


def extract_skills(text: str) -> list[str]:
    found: set[str] = set()
    lowered = text.lower()
    skill_terms = {skill for group in SKILL_KEYWORDS.values() for skill in group}
    skill_terms.update(SKILL_NORMALIZATION.keys())

    for skill in skill_terms:
        pattern = r"(?<![a-z0-9+#.])" + re.escape(skill.lower()) + r"(?![a-z0-9+#.])"
        if re.search(pattern, lowered):
            found.add(normalize_skill(skill))

    return sorted(found)


def normalize_skill(skill: str) -> str:
    cleaned = skill.strip().lower()
    return SKILL_NORMALIZATION.get(cleaned, cleaned.title())


def extract_section(text: str, section: str) -> str | None:
    headings = SECTION_HEADINGS[section]
    all_headings = [heading for values in SECTION_HEADINGS.values() for heading in values]
    lines = [line.strip() for line in text.splitlines()]

    start_index = None
    for index, line in enumerate(lines):
        normalized = normalize_heading(line)
        if normalized in headings:
            start_index = index + 1
            break

    if start_index is None:
        return None

    content: list[str] = []
    for line in lines[start_index:]:
        normalized = normalize_heading(line)
        if normalized in all_headings and content:
            break
        if line:
            content.append(line)

    section_text = "\n".join(content).strip()
    return section_text or None


def normalize_heading(line: str) -> str:
    return re.sub(r"[^a-z\s]", "", line.lower()).strip()
