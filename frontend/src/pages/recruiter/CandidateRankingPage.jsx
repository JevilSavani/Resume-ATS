import { useEffect, useState } from 'react'
import CandidateModal from '../../components/CandidateModal'

export default function CandidateRankingPage({ token, navigate }) {
  const [jobs, setJobs] = useState([])
  const [selectedJobId, setSelectedJobId] = useState('')
  const [rankingData, setRankingData] = useState(null)
  const [loadingJobs, setLoadingJobs] = useState(true)
  const [rankingLoading, setRankingLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedCandidate, setSelectedCandidate] = useState(null)

  const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8002'

  // Read job_id from URL query if present
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const urlJobId = params.get('job_id')

    async function loadJobs() {
      if (!token) return
      setLoadingJobs(true)
      try {
        const response = await fetch(`${API_URL}/jobs/profiles`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (response.ok) {
          const data = await response.json()
          const jobList = Array.isArray(data) ? data : []
          setJobs(jobList)

          if (urlJobId && jobList.some((j) => j.id === urlJobId)) {
            setSelectedJobId(urlJobId)
            fetchRankings(urlJobId)
          } else if (jobList.length > 0) {
            setSelectedJobId(jobList[0].id)
            fetchRankings(jobList[0].id)
          }
        } else {
          setError('Could not load jobs for ranking.')
        }
      } catch {
        setError('Network error loading jobs.')
      } finally {
        setLoadingJobs(false)
      }
    }

    loadJobs()
  }, [token, API_URL])

  async function fetchRankings(jobId) {
    if (!jobId || !token) return
    setRankingLoading(true)
    setError('')
    setRankingData(null)

    try {
      const response = await fetch(`${API_URL}/jobs/rank?job_id=${encodeURIComponent(jobId)}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.detail || 'Could not rank candidates.')
      }

      setRankingData(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setRankingLoading(false)
    }
  }

  function handleJobChange(jobId) {
    setSelectedJobId(jobId)
    window.history.replaceState({}, '', `/recruiter/ranking?job_id=${jobId}`)
    fetchRankings(jobId)
  }

  const selectedJob = jobs.find((j) => j.id === selectedJobId)

  return (
    <div className="dashboard-container">
      <div className="page-header">
        <div>
          <span className="eyebrow">AI Matching & Ranking Engine</span>
          <h1>Candidate Ranking</h1>
          <p className="lead">
            Compare candidate resumes against job requirements using TF-IDF, Cosine Similarity, Skill overlap, Experience, and Education weights.
          </p>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="secondary-action compact"
            onClick={() => navigate('/recruiter/jobs/create')}
          >
            + Create New Job
          </button>
        </div>
      </div>

      {error && <div className="alert error-alert">{error}</div>}

      {/* Job Selector Bar */}
      <div className="card-box ranking-job-selector">
        <div className="job-select-row">
          <label htmlFor="ranking-job-select" className="job-select-label">
            <strong>Select Target Job Profile:</strong>
          </label>
          {loadingJobs ? (
            <span className="muted-text">Loading jobs...</span>
          ) : jobs.length === 0 ? (
            <span className="muted-text">No job profiles found. Create a job first.</span>
          ) : (
            <div className="select-wrapper">
              <select
                id="ranking-job-select"
                value={selectedJobId}
                onChange={(e) => handleJobChange(e.target.value)}
                className="job-dropdown"
              >
                {jobs.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.title || 'Untitled Job'} — {job.company || 'Company'} ({job.location || 'Remote'})
                  </option>
                ))}
              </select>
            </div>
          )}

          {selectedJobId && (
            <button
              type="button"
              className="primary-action compact highlight-action"
              onClick={() => fetchRankings(selectedJobId)}
              disabled={rankingLoading}
            >
              {rankingLoading ? 'Calculating ATS Scores...' : '🔄 Re-Rank Candidates'}
            </button>
          )}
        </div>

        {/* Selected Job Requirements Summary */}
        {selectedJob && (
          <div className="selected-job-summary">
            <div className="summary-meta-row">
              <span><strong>Company:</strong> {selectedJob.company || 'Not specified'}</span>
              <span><strong>Location:</strong> {selectedJob.location || 'Remote'}</span>
              {selectedJob.experience && (
                <span><strong>Required Exp:</strong> {selectedJob.experience}</span>
              )}
              {selectedJob.education && (
                <span><strong>Required Edu:</strong> {selectedJob.education}</span>
              )}
            </div>
            {selectedJob.skills && selectedJob.skills.length > 0 && (
              <div className="summary-skills-row">
                <span className="summary-skills-label">Target Skills:</span>
                <div className="skill-list compact-skills">
                  {selectedJob.skills.map((skill) => (
                    <span key={skill} className="skill-pill">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Candidate Ranking Table */}
      <div className="card-box">
        <div className="card-box-header">
          <div className="ranking-table-header">
            <h3>Ranked Candidates</h3>
            {rankingData?.rankings && (
              <span className="badge-count">
                {rankingData.rankings.length} Candidates Evaluated
              </span>
            )}
          </div>
        </div>

        <div className="card-box-body">
          {rankingLoading ? (
            <div className="ranking-loading-state">
              <span className="loading-spinner">⚡</span>
              <p>Analyzing resumes with TF-IDF Vectorizer and scoring candidate match...</p>
            </div>
          ) : !rankingData || rankingData.rankings.length === 0 ? (
            <div className="empty-sub-state">
              <span className="empty-icon">📊</span>
              <h3>No candidates evaluated yet</h3>
              <p className="muted-text">
                {jobs.length === 0
                  ? 'Create a job description first to start ranking candidates.'
                  : 'No candidate resumes found in the system to rank against this job.'}
              </p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="ats-table ranking-table">
                <thead>
                  <tr>
                    <th style={{ width: '60px' }}>Rank</th>
                    <th>Candidate Name</th>
                    <th>Email</th>
                    <th>Candidate Skills</th>
                    <th style={{ width: '130px' }}>Match Score</th>
                    <th>Matched Skills</th>
                    <th>Missing Skills</th>
                    <th style={{ width: '100px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rankingData.rankings.map((c) => {
                    const score = c.ats_score
                    let scoreClass = 'score-high'
                    if (score < 50) scoreClass = 'score-low'
                    else if (score < 75) scoreClass = 'score-mid'

                    return (
                      <tr key={c.candidate_id} className={`ranking-row rank-${c.rank}`}>
                        <td className="rank-cell">
                          <span className={`rank-badge rank-${c.rank <= 3 ? c.rank : 'other'}`}>
                            #{c.rank}
                          </span>
                        </td>
                        <td className="candidate-name-cell">
                          <strong>{c.candidate_name || 'Candidate'}</strong>
                        </td>
                        <td className="candidate-email-cell">
                          {c.candidate_email || '—'}
                        </td>
                        <td className="candidate-skills-cell">
                          {c.candidate_skills && c.candidate_skills.length > 0 ? (
                            <div className="skill-list table-skills">
                              {c.candidate_skills.slice(0, 3).map((s) => (
                                <span key={s} className="skill-pill-sm">{s}</span>
                              ))}
                              {c.candidate_skills.length > 3 && (
                                <span className="skill-pill-sm more">+{c.candidate_skills.length - 3}</span>
                              )}
                            </div>
                          ) : (
                            <span className="muted-text">—</span>
                          )}
                        </td>
                        <td className="score-cell">
                          <div className={`score-badge ${scoreClass}`}>
                            <strong>{score.toFixed(1)}%</strong>
                          </div>
                        </td>
                        <td className="matched-skills-cell">
                          {c.matched_skills && c.matched_skills.length > 0 ? (
                            <div className="skill-list table-skills">
                              {c.matched_skills.map((s) => (
                                <span key={s} className="skill-pill-sm matched-pill">{s}</span>
                              ))}
                            </div>
                          ) : (
                            <span className="muted-text">None</span>
                          )}
                        </td>
                        <td className="missing-skills-cell">
                          {c.missing_skills && c.missing_skills.length > 0 ? (
                            <div className="skill-list table-skills">
                              {c.missing_skills.slice(0, 4).map((s) => (
                                <span key={s} className="skill-pill-sm missing-pill">{s}</span>
                              ))}
                              {c.missing_skills.length > 4 && (
                                <span className="skill-pill-sm more">+{c.missing_skills.length - 4}</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-success">None</span>
                          )}
                        </td>
                        <td className="action-cell">
                          <button
                            type="button"
                            className="secondary-action compact table-view-btn"
                            onClick={() => setSelectedCandidate(c)}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {selectedCandidate && (
        <CandidateModal
          candidate={selectedCandidate}
          onClose={() => setSelectedCandidate(null)}
        />
      )}
    </div>
  )
}
