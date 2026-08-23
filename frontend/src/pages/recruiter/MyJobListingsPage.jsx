import { useEffect, useState } from 'react'

export default function MyJobListingsPage({ token, navigate }) {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [deletingId, setDeletingId] = useState(null)

  const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8002'

  useEffect(() => {
    loadMyJobs()
  }, [token])

  async function loadMyJobs() {
    if (!token) return
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`${API_URL}/jobs/my-jobs`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        const data = await response.json()
        setJobs(Array.isArray(data) ? data : [])
      } else {
        setError('Could not load your job listings.')
      }
    } catch {
      setError('Network error loading job listings.')
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteJob(jobId) {
    if (!window.confirm('Are you sure you want to delete this job listing?')) {
      return
    }

    setDeletingId(jobId)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`${API_URL}/jobs/profiles/${jobId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        setSuccess('Job listing deleted successfully.')
        setJobs((prev) => prev.filter((j) => j.id !== jobId))
      } else {
        const data = await response.json().catch(() => ({}))
        setError(data.detail || 'Could not delete job.')
      }
    } catch {
      setError('Network error deleting job.')
    } finally {
      setDeletingId(null)
    }
  }

  const filteredJobs = jobs.filter((job) => {
    const q = searchQuery.toLowerCase()
    return (
      !q ||
      job.title?.toLowerCase().includes(q) ||
      job.company?.toLowerCase().includes(q) ||
      job.skills?.some((s) => s.toLowerCase().includes(q))
    )
  })

  return (
    <div className="dashboard-container">
      <div className="page-header">
        <div>
          <span className="eyebrow">Recruiter Management</span>
          <h1>My Job Listings</h1>
          <p className="lead">
            Manage your created job profiles. Select any job to run automated ATS candidate ranking.
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

      <div className="search-box-row">
        <input
          type="text"
          className="search-input"
          placeholder="Filter jobs by title, company, or required skill..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
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
          <h3>No job listings found</h3>
          <p className="muted-text">
            {searchQuery
              ? `No jobs matched your filter "${searchQuery}".`
              : "You haven't posted any jobs yet."}
          </p>
          <button
            type="button"
            className="primary-action compact"
            onClick={() => navigate('/recruiter/jobs/create')}
          >
            Create Job Now
          </button>
        </div>
      ) : (
        <div className="job-listings-grid">
          {filteredJobs.map((job) => (
            <article key={job.id} className="job-card recruiter-job-card">
              <div className="job-card-header">
                <div>
                  <h3 className="job-title">{job.title || 'Untitled Position'}</h3>
                  <p className="job-company">
                    {job.company || 'Company'} • 📍 {job.location || 'Remote'}
                  </p>
                </div>
                <div className="job-card-actions">
                  <button
                    type="button"
                    className="primary-action compact highlight-action"
                    onClick={() => navigate(`/recruiter/ranking?job_id=${job.id}`)}
                  >
                    ⚡ Rank Candidates
                  </button>
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

              <div className="job-meta-row">
                {job.experience && (
                  <span className="meta-tag">💼 Exp: {job.experience}</span>
                )}
                {job.education && (
                  <span className="meta-tag">🎓 Edu: {job.education}</span>
                )}
              </div>

              {job.skills && job.skills.length > 0 && (
                <div className="job-skills-section">
                  <span className="job-skills-label">Required Skills:</span>
                  <div className="skill-list compact-skills">
                    {job.skills.map((skill) => (
                      <span key={skill} className="skill-pill">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="job-card-footer">
                <p className="desc-snippet">{job.description?.slice(0, 180)}...</p>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
