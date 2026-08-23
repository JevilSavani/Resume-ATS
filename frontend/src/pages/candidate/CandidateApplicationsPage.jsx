import { useEffect, useState } from 'react'

export default function CandidateApplicationsPage({ token, navigate }) {
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8002'

  useEffect(() => {
    async function loadApplications() {
      if (!token) return
      setLoading(true)
      try {
        const response = await fetch(`${API_URL}/applications/my-applications`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (response.ok) {
          const data = await response.json()
          setApplications(Array.isArray(data) ? data : [])
        } else {
          setError('Could not load your applications.')
        }
      } catch {
        setError('Network error while loading applications.')
      } finally {
        setLoading(false)
      }
    }

    loadApplications()
  }, [token, API_URL])

  return (
    <div className="dashboard-container">
      <div className="page-header">
        <div>
          <span className="eyebrow">Application Tracking</span>
          <h1>My Submitted Applications</h1>
          <p className="lead">
            Track the status of your applications submitted to recruiters.
          </p>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="primary-action compact"
            onClick={() => navigate('/candidate/jobs')}
          >
            Find More Jobs
          </button>
        </div>
      </div>

      {error && <div className="alert error-alert">{error}</div>}

      {loading ? (
        <div className="card-box">
          <p className="muted-text">Loading applications...</p>
        </div>
      ) : applications.length === 0 ? (
        <div className="empty-sub-state card-box">
          <span className="empty-icon">📬</span>
          <h3>No applications yet</h3>
          <p className="muted-text">You haven't applied to any job postings yet.</p>
          <button
            type="button"
            className="primary-action compact"
            onClick={() => navigate('/candidate/jobs')}
          >
            Explore Available Jobs
          </button>
        </div>
      ) : (
        <div className="card-box">
          <div className="table-responsive">
            <table className="ats-table">
              <thead>
                <tr>
                  <th>Job Title</th>
                  <th>Company</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Applied Date</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((app) => {
                  const dateStr = app.created_at
                    ? new Date(app.created_at).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })
                    : 'Recently'

                  return (
                    <tr key={app.id}>
                      <td>
                        <strong>{app.job?.title || 'Job Opening'}</strong>
                      </td>
                      <td>{app.job?.company || 'Company'}</td>
                      <td>{app.job?.location || 'Remote'}</td>
                      <td>
                        <span className={`status-pill ${app.status.toLowerCase()}`}>
                          {app.status}
                        </span>
                      </td>
                      <td>{dateStr}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
