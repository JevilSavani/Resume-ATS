import { useEffect, useState } from 'react'
import CandidateModal from '../../components/CandidateModal'

export default function RecruiterApplicants({ token, navigate }) {
  const [jobs, setJobs] = useState([])
  const [selectedJobId, setSelectedJobId] = useState('')
  const [applicants, setApplicants] = useState([])
  const [loading, setLoading] = useState(true)
  const [updatingAppId, setUpdatingAppId] = useState(null)
  const [selectedCandidate, setSelectedCandidate] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8002'

  // Load jobs list for dropdown and read initial job_id from URL
  useEffect(() => {
    async function loadJobsAndApplicants() {
      if (!token) return
      setLoading(true)
      setError('')

      try {
        const jobsRes = await fetch(`${API_URL}/recruiter/jobs`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        let jobList = []
        if (jobsRes.ok) {
          jobList = await jobsRes.json()
          setJobs(Array.isArray(jobList) ? jobList : [])
        }

        const urlParams = new URLSearchParams(window.location.search)
        const initialJobId = urlParams.get('job_id') || ''

        if (initialJobId && jobList.some((j) => j.id === initialJobId)) {
          setSelectedJobId(initialJobId)
          await fetchApplicants(initialJobId)
        } else {
          await fetchApplicants('')
        }
      } catch {
        setError('Failed to load applicant records.')
      } finally {
        setLoading(false)
      }
    }

    loadJobsAndApplicants()
  }, [token, API_URL])

  async function fetchApplicants(jobId) {
    if (!token) return
    setLoading(true)
    setError('')

    try {
      const url = jobId
        ? `${API_URL}/recruiter/jobs/${jobId}/applicants`
        : `${API_URL}/recruiter/applicants`

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        const data = await response.json()
        setApplicants(Array.isArray(data) ? data : [])
      } else {
        const errData = await response.json().catch(() => ({}))
        setError(errData.detail || 'Could not fetch applicants.')
      }
    } catch {
      setError('Network error while fetching applicants.')
    } finally {
      setLoading(false)
    }
  }

  function handleJobFilterChange(jobId) {
    setSelectedJobId(jobId)
    const newUrl = jobId ? `/recruiter/applicants?job_id=${jobId}` : '/recruiter/applicants'
    window.history.replaceState({}, '', newUrl)
    fetchApplicants(jobId)
  }

  async function handleStatusChange(applicationId, newStatus) {
    setUpdatingAppId(applicationId)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`${API_URL}/recruiter/applications/${applicationId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        setApplicants((prev) =>
          prev.map((app) =>
            app.id === applicationId ? { ...app, status: newStatus } : app
          )
        )
        setSuccess(`Application status updated to "${newStatus}".`)
      } else {
        const errData = await response.json().catch(() => ({}))
        setError(errData.detail || 'Failed to update application status.')
      }
    } catch {
      setError('Network error while updating status.')
    } finally {
      setUpdatingAppId(null)
    }
  }

  async function handleViewCandidateProfile(candidateId) {
    if (!candidateId) return
    setError('')

    try {
      const response = await fetch(`${API_URL}/recruiter/applicants/${candidateId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        const candidateData = await response.json()
        setSelectedCandidate(candidateData)
      } else {
        const errData = await response.json().catch(() => ({}))
        setError(errData.detail || 'Could not view candidate profile.')
      }
    } catch {
      setError('Network error loading candidate profile.')
    }
  }

  const filteredApplicants = applicants.filter((app) => {
    const q = searchQuery.toLowerCase()
    return (
      !q ||
      app.candidate_name?.toLowerCase().includes(q) ||
      app.candidate_email?.toLowerCase().includes(q) ||
      app.job_title?.toLowerCase().includes(q) ||
      (app.candidate_skills || []).some((s) => s.toLowerCase().includes(q))
    )
  })

  return (
    <div className="dashboard-container">
      <div className="page-header">
        <div>
          <span className="eyebrow">Applicant Tracking</span>
          <h1>Job Applicants</h1>
          <p className="lead">
            Review candidate applications, examine qualifications, update statuses, and prepare for ATS matching.
          </p>
        </div>
        <div className="header-actions">
          {selectedJobId && (
            <button
              type="button"
              className="primary-action compact highlight-action"
              onClick={() => navigate(`/recruiter/ranking?job_id=${selectedJobId}`)}
            >
              ⚡ Rank Applicants For This Job
            </button>
          )}
        </div>
      </div>

      {error && <div className="alert error-alert">{error}</div>}
      {success && <div className="alert success-alert">{success}</div>}

      {/* Filter and Job Selection Bar */}
      <div className="card-box" style={{ padding: '16px 20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
          <label htmlFor="applicant-job-filter" style={{ fontWeight: 600, fontSize: '14px' }}>
            Filter by Job Posting:
          </label>
          <div className="select-wrapper" style={{ flex: 1, minWidth: '220px' }}>
            <select
              id="applicant-job-filter"
              value={selectedJobId}
              onChange={(e) => handleJobFilterChange(e.target.value)}
              className="job-dropdown"
            >
              <option value="">All Job Openings ({applicants.length} Total)</option>
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title || 'Untitled'} — {job.company_name || job.company || 'Company'} ({job.applicant_count || 0} applicants)
                </option>
              ))}
            </select>
          </div>

          <input
            type="text"
            className="search-input"
            style={{ width: '280px' }}
            placeholder="Search candidate name, email, or skill..."
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
      </div>

      {/* Applicants Table */}
      <div className="card-box">
        <div className="card-box-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <h3>
              {selectedJobId
                ? `Applicants for: ${jobs.find((j) => j.id === selectedJobId)?.title || 'Selected Job'}`
                : 'All Applicants'}
            </h3>
            <span className="badge-count">{filteredApplicants.length} Applicants</span>
          </div>
        </div>

        <div className="card-box-body">
          {loading ? (
            <p className="muted-text">Loading applicants...</p>
          ) : filteredApplicants.length === 0 ? (
            <div className="empty-sub-state">
              <span className="empty-icon">👥</span>
              <h3>No applicants found</h3>
              <p className="muted-text">
                {selectedJobId
                  ? 'No candidates have applied to this specific job opening yet.'
                  : 'No candidate applications have been submitted to your jobs yet.'}
              </p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="ats-table">
                <thead>
                  <tr>
                    <th>Candidate</th>
                    <th>Job Applied</th>
                    <th>Skills</th>
                    <th>Education & Experience</th>
                    <th>Applied Date</th>
                    <th>ATS Score</th>
                    <th>Application Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredApplicants.map((app) => (
                    <tr key={app.id}>
                      <td>
                        <strong>{app.candidate_name || 'Candidate'}</strong>
                        <div className="muted-text" style={{ fontSize: '12px' }}>
                          {app.candidate_email || 'No email'}
                        </div>
                        {app.candidate_phone && (
                          <div className="muted-text" style={{ fontSize: '11px' }}>
                            📞 {app.candidate_phone}
                          </div>
                        )}
                      </td>

                      <td>
                        <strong>{app.job_title}</strong>
                      </td>

                      <td>
                        <div className="skill-list compact-skills" style={{ maxWidth: '240px' }}>
                          {(app.candidate_skills || []).slice(0, 4).map((s) => (
                            <span key={s} className="skill-pill">
                              {s}
                            </span>
                          ))}
                          {(app.candidate_skills || []).length > 4 && (
                            <span className="skill-pill more">
                              +{app.candidate_skills.length - 4}
                            </span>
                          )}
                        </div>
                      </td>

                      <td style={{ fontSize: '13px', maxWidth: '200px' }}>
                        {app.candidate_education && (
                          <div>🎓 {app.candidate_education}</div>
                        )}
                        {app.candidate_experience && (
                          <div className="muted-text">💼 {app.candidate_experience}</div>
                        )}
                        {!app.candidate_education && !app.candidate_experience && (
                          <span className="muted-text">—</span>
                        )}
                      </td>

                      <td style={{ whiteSpace: 'nowrap', fontSize: '13px' }}>
                        {app.applied_at
                          ? new Date(app.applied_at).toLocaleDateString()
                          : 'Recent'}
                      </td>

                      {/* Explicit ATS Score requirement: display 'Not evaluated' until TF-IDF module is connected */}
                      <td>
                        <span
                          className="meta-tag"
                          style={{
                            background: '#f8fafc',
                            color: '#64748b',
                            border: '1px solid #e2e8f0',
                            fontWeight: 600,
                            padding: '4px 8px',
                          }}
                        >
                          {app.ats_score || 'Not evaluated'}
                        </span>
                      </td>

                      <td>
                        <select
                          value={app.status || 'Applied'}
                          onChange={(e) => handleStatusChange(app.id, e.target.value)}
                          disabled={updatingAppId === app.id}
                          className="job-dropdown"
                          style={{
                            padding: '6px 10px',
                            fontSize: '13px',
                            fontWeight: 600,
                            borderRadius: '6px',
                            background:
                              (app.status || '').toLowerCase() === 'shortlisted'
                                ? '#ecfdf5'
                                : (app.status || '').toLowerCase() === 'rejected'
                                ? '#fef2f2'
                                : (app.status || '').toLowerCase() === 'reviewing'
                                ? '#fef9c3'
                                : '#f1f5f9',
                            color:
                              (app.status || '').toLowerCase() === 'shortlisted'
                                ? '#065f46'
                                : (app.status || '').toLowerCase() === 'rejected'
                                ? '#991b1b'
                                : (app.status || '').toLowerCase() === 'reviewing'
                                ? '#854d0e'
                                : '#334155',
                          }}
                        >
                          <option value="Applied">Applied</option>
                          <option value="Reviewing">Reviewing</option>
                          <option value="Shortlisted">Shortlisted</option>
                          <option value="Rejected">Rejected</option>
                        </select>
                      </td>

                      <td>
                        <button
                          type="button"
                          className="secondary-action compact table-view-btn"
                          onClick={() => handleViewCandidateProfile(app.candidate_id)}
                        >
                          View Profile
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Candidate Profile Modal */}
      {selectedCandidate && (
        <CandidateModal
          candidate={selectedCandidate}
          onClose={() => setSelectedCandidate(null)}
        />
      )}
    </div>
  )
}
