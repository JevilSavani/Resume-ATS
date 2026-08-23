export default function CandidateModal({ candidate, onClose }) {
  if (!candidate) return null

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <span className="modal-eyebrow">Candidate Profile</span>
            <h2>{candidate.candidate_name || candidate.name || 'Candidate Details'}</h2>
            <p className="modal-contact">
              {candidate.candidate_email || candidate.email || 'No email provided'} • {candidate.candidate_phone || candidate.phone || 'No phone provided'}
            </p>
          </div>
          <button type="button" className="close-btn" onClick={onClose} aria-label="Close modal">
            &times;
          </button>
        </div>

        {candidate.ats_score !== undefined && (
          <div className="modal-score-section">
            <div className="score-main-badge">
              <span className="score-main-value">{candidate.ats_score.toFixed(1)}%</span>
              <span className="score-main-label">ATS Match Score</span>
            </div>
            <div className="modal-metrics-grid">
              <div className="metric-chip">
                <span>Skill Match</span>
                <strong>{candidate.skill_match_score?.toFixed(1) ?? '0.0'}%</strong>
              </div>
              <div className="metric-chip">
                <span>Text Similarity</span>
                <strong>{candidate.text_similarity?.toFixed(1) ?? '0.0'}%</strong>
              </div>
              <div className="metric-chip">
                <span>Experience Match</span>
                <strong>{candidate.experience_score?.toFixed(1) ?? '0.0'}%</strong>
              </div>
              <div className="metric-chip">
                <span>Education Match</span>
                <strong>{candidate.education_score?.toFixed(1) ?? '0.0'}%</strong>
              </div>
            </div>
          </div>
        )}

        <div className="modal-body">
          {candidate.matched_skills && candidate.matched_skills.length > 0 && (
            <div className="modal-section">
              <h3>Matched Skills ({candidate.matched_skills.length})</h3>
              <div className="skill-list matched">
                {candidate.matched_skills.map((skill) => (
                  <span key={skill} className="skill-pill matched-pill">{skill}</span>
                ))}
              </div>
            </div>
          )}

          {candidate.missing_skills && candidate.missing_skills.length > 0 && (
            <div className="modal-section">
              <h3>Missing Skills ({candidate.missing_skills.length})</h3>
              <div className="skill-list missing">
                {candidate.missing_skills.map((skill) => (
                  <span key={skill} className="skill-pill missing-pill">{skill}</span>
                ))}
              </div>
            </div>
          )}

          {candidate.skills && candidate.skills.length > 0 && !candidate.matched_skills && (
            <div className="modal-section">
              <h3>Skills</h3>
              <div className="skill-list">
                {candidate.skills.map((skill) => (
                  <span key={skill} className="skill-pill">{skill}</span>
                ))}
              </div>
            </div>
          )}

          {(candidate.experience_summary || candidate.experience) && (
            <div className="modal-section">
              <h3>Experience</h3>
              <div className="section-content-box">
                <p>{candidate.experience_summary || candidate.experience}</p>
              </div>
            </div>
          )}

          {(candidate.education_summary || candidate.education) && (
            <div className="modal-section">
              <h3>Education</h3>
              <div className="section-content-box">
                <p>{candidate.education_summary || candidate.education}</p>
              </div>
            </div>
          )}

          {candidate.resume_text && (
            <div className="modal-section">
              <h3>Extracted Resume Text</h3>
              <div className="section-content-box text-preview">
                <pre>{candidate.resume_text.slice(0, 1500)}{candidate.resume_text.length > 1500 ? '...' : ''}</pre>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="secondary-action compact" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
