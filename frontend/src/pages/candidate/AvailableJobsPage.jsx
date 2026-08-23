import { useEffect, useState } from 'react'

export default function AvailableJobsPage({ token, navigate }) {
  const [jobs, setJobs] = useState([])
  const [applications, setApplications] = useState([])
  const [candidateProfile, setCandidateProfile] = useState(null)
  const [matchScores, setMatchScores] = useState({})
  const [loading, setLoading] = useState(true)
  const [applyingJobId, setApplyingJobId] = useState(null)
  const [matchingJobId, setMatchingJobId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedJob, setSelectedJob] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8002'

  useEffect(() => {
    async function loadData() {
      if (!token) return
      setLoading(true)
      setError('')

      try {
        const headers = { Authorization: `Bearer ${token}` }
        const [jobsRes, appsRes, candRes] = await Promise.allSettled([
          fetch(`${API_URL}/jobs/profiles`, { headers }),
          fetch(`${API_URL}/applications/my-applications`, { headers }),
          fetch(`${API_URL}/resumes/me`, { headers }),
        ])

        if (jobsRes.status === 'fulfilled' && jobsRes.value.ok) {
          const jobsData = await jobsRes.value.json()
          setJobs(Array.isArray(jobsData) ? jobsData : [])
        }

        if (appsRes.status === 'fulfilled' && appsRes.value.ok) {
          const appsData = await appsRes.value.json()
          setApplications(Array.isArray(appsData) ? appsData : [])
        }

        if (candRes.status === 'fulfilled' && candRes.value.ok) {
          const candData = await candRes.value.json()
          setCandidateProfile(candData)
        }
      } catch (err) {
        setError('Failed to load available jobs.')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [token, API_URL])

  const appliedJobIds = new Set(applications.map((app) => app.job_id))

  async function handleApply(jobId) {
    if (!token) return
    setError('')
    setSuccess('')
    setApplyingJobId(jobId)

    try {
      const response = await fetch(`${API_URL}/applications/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ job_id: jobId }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.detail || 'Could not submit application.')
      }

      setApplications((prev) => [data, ...prev])
      setSuccess('Application submitted successfully!')
    } catch (err) {
      setError(err.message)
    } finally {
      setApplyingJobId(null)
    }
  }

  async function checkMatchScore(jobId) {
    if (matchScores[jobId]) return
    setMatchingJobId(jobId)

    try {
      const response = await fetch(`${API_URL}/jobs/match-score/${jobId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        const data = await response.json()
        setMatchScores((prev) => ({ ...prev, [jobId]: data }))
      }
    } catch (err) {
      console.error(err)
    } finally {
      setMatchingJobId(null)
    }
  }

  const filteredJobs = jobs.filter((job) => {
    const query = searchQuery.toLowerCase()
    const titleMatch = job.title?.toLowerCase().includes(query)
    const companyMatch = job.company?.toLowerCase().includes(query)
    const locationMatch = job.location?.toLowerCase().includes(query)
    const skillsMatch = job.skills?.some((s) => s.toLowerCase().includes(query))
    return !query || titleMatch || companyMatch || locationMatch || skillsMatch
  })

  return (
    <div className="dashboard-container">
      <div className="page-header">
        <div>
          <span className="eyebrow">Career Opportunities</span>
          <h1>Available Job Listings</h1>
          <p className="lead">
            Explore job openings posted by recruiters. Check your ATS resume match score and apply directly.
          </p>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="secondary-action compact"
            onClick={() => navigate('/candidate/applications')}
          >
            My Applications ({applications.length})
          </button>
        </div>
      </div>

      {!candidateProfile && (
        <div className="callout-card warning-callout">
          <div className="callout-content">
            <strong>Resume not uploaded yet</strong>
            <p>Upload your resume to calculate your instant ATS match score against these job postings.</p>
          </div>
          <button
            type="button"
            className="primary-action compact"
            onClick={() => navigate('/candidate/resume')}
          >
            Upload Resume
          </button>
        </div>
      )}

      {error && <div className="alert error-alert">{error}</div>}
      {success && <div className="alert success-alert">{success}</div>}

      {/* Search Bar */}
      <div className="search-box-row">
        <input
          type="text"
          className="search-input"
          placeholder="Search by job title, company, location, or skill (e.g., Python, React)..."
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
          <p>No job listings found {searchQuery ? `matching "${searchQuery}"` : 'at the moment'}.</p>
          <p className="muted-text">Check back later or adjust your search keywords.</p>
        </div>
      ) : (
        <div className="job-listings-grid">
          {filteredJobs.map((job) => {
            const hasApplied = appliedJobIds.has(job.id)
            const matchInfo = matchScores[job.id]

            return (
              <article key={job.id} className="job-card">
                <div className="job-card-header">
                  <div>
                    <h3 className="job-title">{job.title || 'Untitled Position'}</h3>
                    <p className="job-company">
                      {job.company || 'Company'} • 📍 {job.location || 'Remote'}
                    </p>
                  </div>
                  {hasApplied ? (
                    <span className="status-pill status-applied">✓ Applied</span>
                  ) : (
                    <button
                      type="button"
                      className="primary-action compact"
                      onClick={() => handleApply(job.id)}
                      disabled={applyingJobId === job.id}
                    >
                      {applyingJobId === job.id ? 'Applying...' : 'Apply Now'}
                    </button>
                  )}
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

                {/* ATS Match Score section */}
                {candidateProfile && (
                  <div className="ats-match-box">
                    {matchInfo ? (
                      <div className="ats-match-result">
                        <div className="ats-score-display">
                          <span className="ats-score-num">{matchInfo.ats_score.toFixed(1)}%</span>
                          <span className="ats-score-text">ATS Fit Score</span>
                        </div>
                        {matchInfo.matched_skills?.length > 0 && (
                          <div className="match-breakdown-skills">
                            <span className="match-label">Matched: </span>
                            <span className="text-success">{matchInfo.matched_skills.join(', ')}</span>
                          </div>
                        )}
                        {matchInfo.missing_skills?.length > 0 && (
                          <div className="match-breakdown-skills">
                            <span className="match-label">Missing: </span>
                            <span className="text-warning">{matchInfo.missing_skills.join(', ')}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="ats-calc-btn"
                        onClick={() => checkMatchScore(job.id)}
                        disabled={matchingJobId === job.id}
                      >
                        {matchingJobId === job.id ? 'Calculating Score...' : '⚡ Check My ATS Match Score'}
                      </button>
                    )}
                  </div>
                )}

                <div className="job-card-footer">
                  <button
                    type="button"
                    className="link-btn"
                    onClick={() => setSelectedJob(selectedJob?.id === job.id ? null : job)}
                  >
                    {selectedJob?.id === job.id ? 'Hide Description ▲' : 'View Full Description ▼'}
                  </button>
                </div>

                {selectedJob?.id === job.id && (
                  <div className="job-expanded-desc">
                    <h4>Job Description</h4>
                    <p className="desc-text">{job.description}</p>
                    {job.keywords?.length > 0 && (
                      <div className="keywords-row">
                        <strong>Keywords: </strong>
                        <span>{job.keywords.join(', ')}</span>
                      </div>
                    )}
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
