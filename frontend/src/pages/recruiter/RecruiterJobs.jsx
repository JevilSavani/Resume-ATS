import { useEffect, useState } from 'react'

export default function RecruiterJobs({ token, navigate }) {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [updatingId, setUpdatingId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8002'

  useEffect(() => {
    loadJobs()
  }, [token])

  async function loadJobs() {
    if (!token) return
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`${API_URL}/recruiter/jobs`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        const data = await response.json()
        setJobs(Array.isArray(data) ? data : [])
      } else {
        // Fallback to my-jobs
        const fbRes = await fetch(`${API_URL}/jobs/my-jobs`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (fbRes.ok) {
          const fbData = await fbRes.json()
          setJobs(Array.isArray(fbData) ? fbData : [])
        } else {
          setError('Could not load job listings.')
        }
      }
    } catch {
      setError('Network error while loading job listings.')
    } finally {
      setLoading(false)
    }
  }

  async function handleToggleStatus(job) {
    const currentStatus = (job.status || 'active').toLowerCase()
    const nextStatus = currentStatus === 'active' ? 'closed' : 'active'

    setUpdatingId(job.id)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`${API_URL}/recruiter/jobs/${job.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: nextStatus }),
      })

      if (response.ok) {
        setJobs((prev) =>
          prev.map((j) => (j.id === job.id ? { ...j, status: nextStatus } : j))
        )
        setSuccess(`Job "${job.title}" marked as ${nextStatus.toUpperCase()}.`)
      } else {
        const errData = await response.json().catch(() => ({}))
        setError(errData.detail || 'Could not update job status.')
      }
    } catch {
      setError('Network error updating job status.')
    } finally {
      setUpdatingId(null)
    }
  }

  async function handleDeleteJob(jobId) {
    if (!window.confirm('Are you sure you want to delete this job opening? This will also remove all associated applications.')) {
      return
    }

    setDeletingId(jobId)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`${API_URL}/recruiter/jobs/${jobId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        setJobs((prev) => prev.filter((j) => j.id !== jobId))
        setSuccess('Job opening deleted successfully.')
      } else {
        const errData = await response.json().catch(() => ({}))
        setError(errData.detail || 'Could not delete job.')
      }
    } catch {
      setError('Network error while deleting job.')
    } finally {
      setDeletingId(null)
    }
  }

  const filteredJobs = jobs.filter((job) => {
    const q = searchQuery.toLowerCase()
    const matchesQuery =
      !q ||
      job.title?.toLowerCase().includes(q) ||
      (job.company_name || job.company)?.toLowerCase().includes(q) ||
      (job.required_skills || job.skills || []).some((s) => s.toLowerCase().includes(q))

    const jStatus = (job.status || 'active').toLowerCase()
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && jStatus === 'active') ||
      (statusFilter === 'closed' && jStatus === 'closed')

    return matchesQuery && matchesStatus
  })

  return (
    <div className="dashboard-container">
      <div className="page-header">
        <div>
          <span className="eyebrow">Recruiter Management</span>
          <h1>My Job Postings</h1>
          <p className="lead">
            Manage your openings, view applicants, toggle status, or run candidate ranking.
          </p>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="primary-action compact"
            onClick={() => navigate('/recruiter/jobs/create')}
          >
            + Create New Job
          </button>
        </div>
      </div>

      {error && <div className="alert error-alert">{error}</div>}
      {success && <div className="alert success-alert">{success}</div>}

      {/* Filter and Search Bar */}
      <div className="search-box-row" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <input
          type="text"
          className="search-input"
          style={{ flex: 1, minWidth: '240px' }}
          placeholder="Filter by title, company, or required skill..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            type="button"
            className={`nav-btn ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            All ({jobs.length})
          </button>
          <button
            type="button"
            className={`nav-btn ${statusFilter === 'active' ? 'active' : ''}`}
            onClick={() => setStatusFilter('active')}
          >
            Active ({jobs.filter((j) => (j.status || 'active').toLowerCase() === 'active').length})
          </button>
          <button
            type="button"
            className={`nav-btn ${statusFilter === 'closed' ? 'active' : ''}`}
            onClick={() => setStatusFilter('closed')}
          >
            Closed ({jobs.filter((j) => (j.status || 'active').toLowerCase() === 'closed').length})
          </button>
        </div>

        {searchQuery && (
          <button
            type="button"
            className="clear-search-btn"
            onClick={() => setSearchQuery('')}
          >
            Clear
          </button>
        )}
      </div>

      {loading ? (
        <div className="card-box">
          <p className="muted-text">Loading job listings...</p>
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="empty-sub-state card-box">
          <span className="empty-icon">💼</span>
          <h3>No job postings found</h3>
          <p className="muted-text">
            {searchQuery || statusFilter !== 'all'
              ? 'No jobs match your current search or status filter.'
              : 'You have not created any job listings yet.'}
          </p>
          <button
            type="button"
            className="primary-action compact"
            onClick={() => navigate('/recruiter/jobs/create')}
          >
            Post a Job Now
          </button>
        </div>
      ) : (
        <div className="job-listings-grid">
          {filteredJobs.map((job) => {
            const isActive = (job.status || 'active').toLowerCase() === 'active'
            const appCount = job.applicant_count || 0

            return (
              <article key={job.id} className="job-card recruiter-job-card">
                <div className="job-card-header">
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <h3 className="job-title" style={{ margin: 0 }}>
                        {job.title || 'Untitled Position'}
                      </h3>
                      <span
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
                    <p className="job-company">
                      {job.company_name || job.company || 'Company'} • 📍 {job.location || 'Remote'}
                    </p>
                  </div>

                  <div className="job-card-actions">
                    <button
                      type="button"
                      className="delete-icon-btn"
                      title="Delete Job"
                      onClick={() => handleDeleteJob(job.id)}
                      disabled={deletingId === job.id}
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                <div className="job-meta-row" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', margin: '8px 0' }}>
                  <span className="meta-tag">💼 {job.employment_type || 'Full-time'}</span>
                  {job.minimum_experience && (
                    <span className="meta-tag">⏳ {job.minimum_experience}</span>
                  )}
                  {job.education_requirement && (
                    <span className="meta-tag">🎓 {job.education_requirement}</span>
                  )}
                  {job.salary && (
                    <span className="meta-tag">💵 {job.salary}</span>
                  )}
                  <span
                    className="meta-tag"
                    style={{
                      background: appCount > 0 ? '#eff6ff' : '#f8fafc',
                      color: appCount > 0 ? '#1d4ed8' : '#64748b',
                      fontWeight: 700,
                    }}
                  >
                    👥 {appCount} {appCount === 1 ? 'Applicant' : 'Applicants'}
                  </span>
                </div>

                {(job.required_skills || job.skills || []).length > 0 && (
                  <div className="job-skills-section">
                    <span className="job-skills-label">Required Skills:</span>
                    <div className="skill-list compact-skills">
                      {(job.required_skills || job.skills || []).map((skill) => (
                        <span key={skill} className="skill-pill">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="job-card-footer" style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      className="primary-action compact"
                      onClick={() => navigate(`/recruiter/applicants?job_id=${job.id}`)}
                    >
                      View Applicants ({appCount})
                    </button>
                    <button
                      type="button"
                      className="secondary-action compact highlight-action"
                      onClick={() => navigate(`/recruiter/ranking?job_id=${job.id}`)}
                    >
                      ⚡ Rank
                    </button>
                  </div>

                  <button
                    type="button"
                    className="secondary-action compact"
                    onClick={() => handleToggleStatus(job)}
                    disabled={updatingId === job.id}
                    title="Toggle between Active and Closed"
                  >
                    {updatingId === job.id ? 'Updating...' : isActive ? 'Close Opening' : 'Reactivate'}
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
