import { useEffect, useState } from 'react'

export default function RecruiterDashboard({ user, token, navigate }) {
  const [stats, setStats] = useState({
    total_jobs: 0,
    active_jobs: 0,
    total_applicants: 0,
    recent_jobs: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8002'

  useEffect(() => {
    async function loadDashboard() {
      if (!token) return
      setLoading(true)
      setError('')

      try {
        const response = await fetch(`${API_URL}/recruiter/dashboard`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (response.ok) {
          const data = await response.json()
          setStats(data)
        } else {
          // Fallback if needed
          const [jobsRes, appsRes] = await Promise.allSettled([
            fetch(`${API_URL}/jobs/my-jobs`, { headers: { Authorization: `Bearer ${token}` } }),
            fetch(`${API_URL}/applications/recruiter/all`, { headers: { Authorization: `Bearer ${token}` } }),
          ])

          const jobsData = jobsRes.status === 'fulfilled' && jobsRes.value.ok ? await jobsRes.value.json() : []
          const appsData = appsRes.status === 'fulfilled' && appsRes.value.ok ? await appsRes.value.json() : []

          const activeCount = jobsData.filter((j) => (j.status || 'active').toLowerCase() === 'active').length
          setStats({
            total_jobs: jobsData.length,
            active_jobs: activeCount,
            total_applicants: appsData.length,
            recent_jobs: jobsData.slice(0, 5),
          })
        }
      } catch (err) {
        setError('Failed to load dashboard metrics. Check server connection.')
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [token, API_URL])

  return (
    <div className="dashboard-container">
      <div className="page-header">
        <div>
          <span className="eyebrow">Recruiter Portal</span>
          <h1>Welcome, {user?.name || 'Recruiter'}</h1>
          <p className="lead">
            Manage your job postings, monitor active applicants, and evaluate candidates.
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

      {/* Metrics Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-icon">💼</span>
          <div className="stat-info">
            <span className="stat-label">Total Jobs</span>
            <strong className="stat-value">{stats.total_jobs}</strong>
          </div>
        </div>

        <div className="stat-card">
          <span className="stat-icon">🟢</span>
          <div className="stat-info">
            <span className="stat-label">Active Jobs</span>
            <strong className="stat-value text-success">{stats.active_jobs}</strong>
          </div>
        </div>

        <div className="stat-card">
          <span className="stat-icon">📬</span>
          <div className="stat-info">
            <span className="stat-label">Total Applicants</span>
            <strong className="stat-value">{stats.total_applicants}</strong>
          </div>
        </div>

        <div className="stat-card">
          <span className="stat-icon">⚡</span>
          <div className="stat-info">
            <span className="stat-label">ATS Match System</span>
            <strong className="stat-value">Ready</strong>
          </div>
        </div>
      </div>

      {/* Navigation Shortcuts */}
      <div className="recruiter-quick-actions">
        <div className="quick-action-card" onClick={() => navigate('/recruiter/jobs/create')}>
          <span className="action-icon">📝</span>
          <div>
            <strong>Create Job</strong>
            <p>Post a new opening with required skills, experience, and job description.</p>
          </div>
        </div>

        <div className="quick-action-card" onClick={() => navigate('/recruiter/jobs')}>
          <span className="action-icon">💼</span>
          <div>
            <strong>Manage Jobs</strong>
            <p>View, edit, activate, or close your existing job listings.</p>
          </div>
        </div>

        <div className="quick-action-card" onClick={() => navigate('/recruiter/applicants')}>
          <span className="action-icon">👥</span>
          <div>
            <strong>View Applicants</strong>
            <p>Review candidate profiles and update application statuses.</p>
          </div>
        </div>

        <div className="quick-action-card highlight-card" onClick={() => navigate('/recruiter/ranking')}>
          <span className="action-icon">🏆</span>
          <div>
            <strong>Candidate Ranking</strong>
            <p>Run ATS scoring and ranking across applicant resumes.</p>
          </div>
        </div>
      </div>

      {/* Recent Jobs Section */}
      <div className="card-box" style={{ marginTop: '24px' }}>
        <div className="card-box-header">
          <h3>Recent Jobs ({stats.recent_jobs?.length || 0})</h3>
          <button
            type="button"
            className="link-btn"
            onClick={() => navigate('/recruiter/jobs')}
          >
            View All Jobs &rarr;
          </button>
        </div>

        <div className="card-box-body">
          {loading ? (
            <p className="muted-text">Loading jobs...</p>
          ) : stats.recent_jobs && stats.recent_jobs.length > 0 ? (
            <div className="recruiter-job-list">
              {stats.recent_jobs.map((job) => {
                const isActive = (job.status || 'active').toLowerCase() === 'active'
                return (
                  <div key={job.id} className="recruiter-job-item">
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <strong>{job.title || 'Untitled Job'}</strong>
                        <span
                          className={`meta-tag ${isActive ? 'status-active-badge' : 'status-closed-badge'}`}
                          style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 700,
                            background: isActive ? '#ecfdf5' : '#f1f5f9',
                            color: isActive ? '#059669' : '#64748b',
                            border: `1px solid ${isActive ? '#a7f3d0' : '#cbd5e1'}`,
                          }}
                        >
                          {isActive ? '● Active' : '○ Closed'}
                        </span>
                      </div>
                      <p className="muted-text" style={{ margin: '4px 0 8px' }}>
                        {job.company_name || job.company || 'Company'} • {job.location || 'Remote'} •{' '}
                        <strong>{job.applicant_count || 0} Applicants</strong>
                      </p>
                      <div className="skill-list compact-skills">
                        {(job.required_skills || job.skills || []).slice(0, 5).map((s) => (
                          <span key={s} className="skill-pill">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="job-action-col" style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        className="secondary-action compact"
                        onClick={() => navigate(`/recruiter/applicants?job_id=${job.id}`)}
                      >
                        View Applicants ({job.applicant_count || 0})
                      </button>
                      <button
                        type="button"
                        className="primary-action compact highlight-action"
                        onClick={() => navigate(`/recruiter/ranking?job_id=${job.id}`)}
                      >
                        ⚡ Rank Candidates
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="empty-sub-state">
              <span className="empty-icon">💼</span>
              <p>No job postings yet.</p>
              <button
                type="button"
                className="primary-action compact"
                onClick={() => navigate('/recruiter/jobs/create')}
              >
                + Post Your First Job
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
