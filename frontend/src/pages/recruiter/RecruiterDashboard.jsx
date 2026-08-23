import { useEffect, useState } from 'react'

export default function RecruiterDashboard({ user, token, navigate }) {
  const [myJobs, setMyJobs] = useState([])
  const [candidates, setCandidates] = useState([])
  const [applications, setApplications] = useState([])
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
        const [jobsRes, candRes, appsRes] = await Promise.allSettled([
          fetch(`${API_URL}/jobs/my-jobs`, { headers }),
          fetch(`${API_URL}/resumes/all`, { headers }),
          fetch(`${API_URL}/applications/recruiter/all`, { headers }),
        ])

        if (jobsRes.status === 'fulfilled' && jobsRes.value.ok) {
          const jobsData = await jobsRes.value.json()
          setMyJobs(Array.isArray(jobsData) ? jobsData : [])
        }

        if (candRes.status === 'fulfilled' && candRes.value.ok) {
          const candData = await candRes.value.json()
          setCandidates(Array.isArray(candData) ? candData : [])
        }

        if (appsRes.status === 'fulfilled' && appsRes.value.ok) {
          const appsData = await appsRes.value.json()
          setApplications(Array.isArray(appsData) ? appsData : [])
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
          <span className="eyebrow">Recruiter Dashboard</span>
          <h1>Welcome, {user?.name || 'Recruiter'}</h1>
          <p className="lead">
            Manage your job postings, browse candidate profiles, and run automated ATS scoring & candidate ranking.
          </p>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="primary-action compact"
            onClick={() => navigate('/recruiter/jobs/create')}
          >
            + Create Job
          </button>
          <button
            type="button"
            className="secondary-action compact highlight-action"
            onClick={() => navigate('/recruiter/ranking')}
          >
            ⚡ Rank Candidates
          </button>
        </div>
      </div>

      {error && <div className="alert error-alert">{error}</div>}

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-icon">💼</span>
          <div className="stat-info">
            <span className="stat-label">My Job Listings</span>
            <strong className="stat-value">{myJobs.length}</strong>
          </div>
        </div>

        <div className="stat-card">
          <span className="stat-icon">👥</span>
          <div className="stat-info">
            <span className="stat-label">Total Candidates</span>
            <strong className="stat-value">{candidates.length}</strong>
          </div>
        </div>

        <div className="stat-card">
          <span className="stat-icon">📬</span>
          <div className="stat-info">
            <span className="stat-label">Applications Received</span>
            <strong className="stat-value">{applications.length}</strong>
          </div>
        </div>

        <div className="stat-card">
          <span className="stat-icon">⚡</span>
          <div className="stat-info">
            <span className="stat-label">ATS Match Engine</span>
            <strong className="stat-value text-success">Active</strong>
          </div>
        </div>
      </div>

      {/* Quick Action Shortcuts */}
      <div className="recruiter-quick-actions">
        <div className="quick-action-card" onClick={() => navigate('/recruiter/jobs/create')}>
          <span className="action-icon">📝</span>
          <div>
            <strong>Create Job Description</strong>
            <p>Paste a job description and let spaCy extract key skills & requirements.</p>
          </div>
        </div>
        <div className="quick-action-card highlight-card" onClick={() => navigate('/recruiter/ranking')}>
          <span className="action-icon">🏆</span>
          <div>
            <strong>Candidate Ranking</strong>
            <p>Score & rank candidate resumes against any job profile using TF-IDF & Cosine Similarity.</p>
          </div>
        </div>
        <div className="quick-action-card" onClick={() => navigate('/recruiter/candidates')}>
          <span className="action-icon">🔍</span>
          <div>
            <strong>Browse Candidates</strong>
            <p>Search and filter candidate profiles and view extracted resumes.</p>
          </div>
        </div>
      </div>

      {/* Active Jobs & Recent Applications Grid */}
      <div className="dashboard-grid-two-col">
        {/* Active Job Openings */}
        <div className="card-box">
          <div className="card-box-header">
            <h3>My Active Job Postings</h3>
            <button
              type="button"
              className="link-btn"
              onClick={() => navigate('/recruiter/jobs')}
            >
              View All ({myJobs.length}) &rarr;
            </button>
          </div>
          <div className="card-box-body">
            {loading ? (
              <p className="muted-text">Loading postings...</p>
            ) : myJobs.length > 0 ? (
              <ul className="recruiter-job-list">
                {myJobs.slice(0, 4).map((job) => (
                  <li key={job.id} className="recruiter-job-item">
                    <div>
                      <strong>{job.title || 'Untitled Job'}</strong>
                      <p className="muted-text">{job.company || 'Company'} • {job.location || 'Remote'}</p>
                      <div className="skill-list compact-skills">
                        {job.skills?.slice(0, 4).map((s) => (
                          <span key={s} className="skill-pill">{s}</span>
                        ))}
                      </div>
                    </div>
                    <div className="job-action-col">
                      <button
                        type="button"
                        className="secondary-action compact"
                        onClick={() => navigate(`/recruiter/ranking?job_id=${job.id}`)}
                      >
                        ⚡ Rank Candidates
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty-sub-state">
                <p className="muted-text">No job postings created yet.</p>
                <button
                  type="button"
                  className="primary-action compact"
                  onClick={() => navigate('/recruiter/jobs/create')}
                >
                  Create First Job
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Candidate Pool Preview */}
        <div className="card-box">
          <div className="card-box-header">
            <h3>Candidate Pool ({candidates.length})</h3>
            <button
              type="button"
              className="link-btn"
              onClick={() => navigate('/recruiter/candidates')}
            >
              Explore Pool &rarr;
            </button>
          </div>
          <div className="card-box-body">
            {loading ? (
              <p className="muted-text">Loading candidate pool...</p>
            ) : candidates.length > 0 ? (
              <ul className="simple-cand-list">
                {candidates.slice(0, 4).map((cand) => (
                  <li key={cand.id} className="simple-cand-item">
                    <div className="cand-avatar">
                      {(cand.name || 'C').charAt(0).toUpperCase()}
                    </div>
                    <div className="cand-info">
                      <strong>{cand.name || 'Candidate'}</strong>
                      <p className="muted-text">{cand.email || 'No email'}</p>
                      <div className="skill-list compact-skills">
                        {cand.skills?.slice(0, 3).map((s) => (
                          <span key={s} className="skill-pill">{s}</span>
                        ))}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty-sub-state">
                <p className="muted-text">No candidate resumes uploaded yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
