import { useEffect, useState } from 'react'

export default function CandidateProfilePage({ user, token, navigate }) {
  const [candidate, setCandidate] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showRawText, setShowRawText] = useState(false)

  const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8002'

  useEffect(() => {
    async function fetchProfile() {
      if (!token) return
      setLoading(true)
      try {
        const response = await fetch(`${API_URL}/resumes/me`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (response.ok) {
          const data = await response.json()
          setCandidate(data)
        } else {
          setCandidate(null)
        }
      } catch {
        setError('Failed to fetch candidate profile.')
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [token, API_URL])

  return (
    <div className="dashboard-container">
      <div className="page-header">
        <div>
          <span className="eyebrow">Candidate Profile</span>
          <h1>My Profile & Extracted Data</h1>
          <p className="lead">
            Review your candidate profile extracted from your resume. Recruiters see these skills and experience when ranking candidates.
          </p>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="secondary-action compact"
            onClick={() => navigate('/candidate/resume')}
          >
            {candidate ? 'Re-upload Resume' : 'Upload Resume'}
          </button>
          <button
            type="button"
            className="primary-action compact"
            onClick={() => navigate('/candidate/jobs')}
          >
            Explore Jobs
          </button>
        </div>
      </div>

      {error && <div className="alert error-alert">{error}</div>}

      {loading ? (
        <div className="card-box">
          <p className="muted-text">Loading profile data...</p>
        </div>
      ) : !candidate ? (
        <div className="callout-card">
          <div className="callout-content">
            <h3>No profile created yet</h3>
            <p>You need to upload your PDF resume first to generate your candidate profile.</p>
          </div>
          <button
            type="button"
            className="primary-action compact"
            onClick={() => navigate('/candidate/resume')}
          >
            Upload Resume Now
          </button>
        </div>
      ) : (
        <div className="profile-layout-grid">
          {/* Main Profile Info */}
          <div className="card-box">
            <div className="card-box-header">
              <h3>Personal Information</h3>
            </div>
            <div className="card-box-body">
              <div className="profile-detail-grid">
                <div className="detail-item">
                  <span className="detail-label">Full Name</span>
                  <strong>{candidate.name || user?.name || 'Not provided'}</strong>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Email Address</span>
                  <strong>{candidate.email || user?.email || 'Not provided'}</strong>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Phone Number</span>
                  <strong>{candidate.phone || 'Not detected in resume'}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Extracted Skills */}
          <div className="card-box">
            <div className="card-box-header">
              <h3>Technical Skills ({candidate.skills?.length || 0})</h3>
            </div>
            <div className="card-box-body">
              {candidate.skills && candidate.skills.length > 0 ? (
                <div className="skill-list">
                  {candidate.skills.map((skill) => (
                    <span key={skill} className="skill-pill">
                      {skill}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="muted-text">No technical skills detected from resume.</p>
              )}
            </div>
          </div>

          {/* Education */}
          <div className="card-box">
            <div className="card-box-header">
              <h3>Education</h3>
            </div>
            <div className="card-box-body">
              {candidate.education ? (
                <div className="section-content-box">
                  <p>{candidate.education}</p>
                </div>
              ) : (
                <p className="muted-text">No education section detected.</p>
              )}
            </div>
          </div>

          {/* Experience */}
          <div className="card-box">
            <div className="card-box-header">
              <h3>Work Experience</h3>
            </div>
            <div className="card-box-body">
              {candidate.experience ? (
                <div className="section-content-box">
                  <p>{candidate.experience}</p>
                </div>
              ) : (
                <p className="muted-text">No experience section detected.</p>
              )}
            </div>
          </div>

          {/* Raw Text Toggle */}
          {candidate.resume_text && (
            <div className="card-box full-span">
              <div className="card-box-header">
                <h3>Extracted Plain Text</h3>
                <button
                  type="button"
                  className="link-btn"
                  onClick={() => setShowRawText(!showRawText)}
                >
                  {showRawText ? 'Hide Text' : 'Show Extracted Text'}
                </button>
              </div>
              {showRawText && (
                <div className="card-box-body">
                  <div className="section-content-box text-preview">
                    <pre>{candidate.resume_text}</pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
