import { useEffect, useState } from 'react'

export default function CandidateDashboard({ user, token, navigate }) {
  const [candidate, setCandidate] = useState(null)
  const [applications, setApplications] = useState([])
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8002'

  useEffect(() => {
    async function loadData() {
      if (!token) return
      setLoading(true)
      setError('')

      try {
        const headers = { Authorization: `Bearer ${token}` }

        const [candRes, appsRes, jobsRes] = await Promise.allSettled([
          fetch(`${API_URL}/resumes/me`, { headers }),
          fetch(`${API_URL}/applications/my-applications`, { headers }),
          fetch(`${API_URL}/jobs/profiles`, { headers }),
        ])

        if (candRes.status === 'fulfilled' && candRes.value.ok) {
          const candData = await candRes.value.json()
          setCandidate(candData)
        }

        if (appsRes.status === 'fulfilled' && appsRes.value.ok) {
          const appsData = await appsRes.value.json()
          setApplications(Array.isArray(appsData) ? appsData : [])
        }

        if (jobsRes.status === 'fulfilled' && jobsRes.value.ok) {
          const jobsData = await jobsRes.value.json()
          setJobs(Array.isArray(jobsData) ? jobsData : [])
        }
      } catch (err) {
        setError('Failed to load dashboard data.')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [token, API_URL])

  return (
    <div className="dashboard-container">
      <div className="page-header">
        <div>
          <span className="eyebrow">Candidate Portal</span>
          <h1>Welcome, {user?.name || 'Candidate'}</h1>
          <p className="lead">
            Manage your resume, review your extracted skills, check ATS scores, and apply for open positions.
          </p>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="primary-action compact"
            onClick={() => navigate('/candidate/resume')}
          >
            {candidate ? 'Update Resume' : 'Upload Resume'}
          </button>
          <button
            type="button"
            className="secondary-action compact"
            onClick={() => navigate('/candidate/jobs')}
          >
            Browse Jobs
          </button>
        </div>
      </div>

      {error && <div className="alert error-alert">{error}</div>}

      {/* Overview Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-icon">📄</span>
          <div className="stat-info">
            <span className="stat-label">Resume Status</span>
            <strong className={`stat-value ${candidate ? 'text-success' : 'text-warning'}`}>
              {candidate ? 'Uploaded & Parsed' : 'Not Uploaded'}
            </strong>
          </div>
        </div>

        <div className="stat-card">
          <span className="stat-icon">🎯</span>
          <div className="stat-info">
            <span className="stat-label">Identified Skills</span>
            <strong className="stat-value">{candidate?.skills?.length || 0} Skills</strong>
          </div>
        </div>

        <div className="stat-card">
          <span className="stat-icon">📬</span>
          <div className="stat-info">
            <span className="stat-label">Submitted Applications</span>
            <strong className="stat-value">{applications.length}</strong>
          </div>
        </div>

        <div className="stat-card">
          <span className="stat-icon">💼</span>
          <div className="stat-info">
            <span className="stat-label">Available Jobs</span>
            <strong className="stat-value">{jobs.length}</strong>
          </div>
        </div>
      </div>

      {/* Resume Prompt if not uploaded */}
      {!candidate && !loading && (
        <div className="callout-card">
          <div className="callout-content">
            <h3>Upload your resume to unlock AI matching</h3>
            <p>
              Our NLP pipeline extracts your technical skills, experience, and education to match you directly against active job descriptions with instant ATS scoring.
            </p>
          </div>
          <button
            type="button"
            className="primary-action compact"
            onClick={() => navigate('/candidate/resume')}
          >
            Upload Resume PDF
          </button>
        </div>
      )}

      <div className="dashboard-grid-two-col">
        {/* Profile / Skills Preview */}
        <div className="card-box">
          <div className="card-box-header">
            <h3>Profile Summary</h3>
            <button
              type="button"
              className="link-btn"
              onClick={() => navigate('/candidate/profile')}
            >
              View Full Profile &rarr;
            </button>
          </div>
          {candidate ? (
            <div className="card-box-body">
              <div className="detail-item">
                <span className="detail-label">Name</span>
                <strong>{candidate.name || user.name}</strong>
              </div>
              <div className="detail-item">
                <span className="detail-label">Email</span>
                <strong>{candidate.email || user.email}</strong>
              </div>
              {candidate.phone && (
                <div className="detail-item">
                  <span className="detail-label">Phone</span>
                  <strong>{candidate.phone}</strong>
                </div>
              )}
              <div className="detail-item">
                <span className="detail-label">Skills</span>
                {candidate.skills?.length > 0 ? (
                  <div className="skill-list compact-skills">
                    {candidate.skills.slice(0, 10).map((skill) => (
                      <span key={skill} className="skill-pill">{skill}</span>
                    ))}
                    {candidate.skills.length > 10 && (
                      <span className="skill-pill more">+{candidate.skills.length - 10} more</span>
                    )}
                  </div>
                ) : (
                  <p className="muted-text">No skills extracted yet</p>
                )}
              </div>
            </div>
          ) : (
            <p className="muted-text padding-box">
              No profile found. Please upload your resume to generate your candidate profile.
            </p>
          )}
        </div>

        {/* Recent Applications */}
        <div className="card-box">
          <div className="card-box-header">
            <h3>My Recent Applications</h3>
            <button
              type="button"
              className="link-btn"
              onClick={() => navigate('/candidate/applications')}
            >
              View All ({applications.length}) &rarr;
            </button>
          </div>
          <div className="card-box-body">
            {applications.length > 0 ? (
              <ul className="simple-app-list">
                {applications.slice(0, 4).map((app) => (
                  <li key={app.id} className="simple-app-item">
                    <div>
                      <strong>{app.job?.title || 'Job Opening'}</strong>
                      <p className="muted-text">{app.job?.company || 'Company'} • {app.job?.location || 'Remote'}</p>
                    </div>
                    <span className={`status-pill ${app.status.toLowerCase()}`}>
                      {app.status}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty-sub-state">
                <p className="muted-text">You haven't applied to any jobs yet.</p>
                <button
                  type="button"
                  className="secondary-action compact"
                  onClick={() => navigate('/candidate/jobs')}
                >
                  Explore Openings
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
