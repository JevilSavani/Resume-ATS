"""
Matching Service — Architecture Boundary for ATS Matching & Ranking.
Will handle:
Job Description + Candidate Resume/Profile
    ↓
Text Preprocessing
    ↓
TF-IDF Vectorization
    ↓
Cosine Similarity
    ↓
Weighted ATS Score
    ↓
Candidate Ranking

Note: ATS score is displayed as 'Not evaluated' until this pipeline is active. No fake scoring is performed.
"""

from uuid import UUID
from typing import Any


def calculate_ats_score(candidate_data: dict[str, Any], job_data: dict[str, Any]) -> float | None:
    """
    Placeholder interface for next development phase:
    Returns ATS match score between 0.0 and 100.0, or None if not evaluated.
    """
    return None


def rank_candidates_for_job(job_id: UUID, candidate_ids: list[UUID]) -> list[dict[str, Any]]:
    """
    Placeholder interface for batch ranking candidates for a specific job profile.
    """
    return []
