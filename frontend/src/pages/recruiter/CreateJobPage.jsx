import { useState } from 'react'

export default function CreateJobPage({ token, navigate }) {
  const [values, setValues] = useState({
    title: '',
    company: '',
    location: '',
    description: '',
  })
  const [createdJob, setCreatedJob] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8002'

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSuccess('')
    setCreatedJob(null)

    if (!values.description.trim()) {
      setError('Please provide the full Job Description text.')
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`${API_URL}/jobs/parse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(values),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.detail || 'Could not parse and save the job description.')
      }

      setCreatedJob(data)
      setSuccess('Job profile successfully created and parsed with NLP!')
      setValues({ title: '', company: '', location: '', description: '' })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="dashboard-container">
      <div className="page-header">
        <div>
          <span className="eyebrow">Recruiter Management</span>
          <h1>Create & Parse Job Description</h1>
          <p className="lead">
            Input a new job description. Our NLP pipeline will extract required skills, keywords, experience, and education levels for ATS candidate ranking.
          </p>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="secondary-action compact"
            onClick={() => navigate('/recruiter/jobs')}
          >
            My Job Listings
          </button>
        </div>
      </div>

      {error && <div className="alert error-alert">{error}</div>}
      {success && <div className="alert success-alert">{success}</div>}

      <div className="two-column-layout">
        {/* Form */}
        <div className="card-box">
          <div className="card-box-header">
            <h3>Job Description Form</h3>
          </div>
          <form className="create-job-form" onSubmit={handleSubmit}>
            <label className="field">
              <span>Job Title</span>
              <input
                type="text"
                value={values.title}
                onChange={(e) => setValues({ ...values, title: e.target.value })}
                placeholder="e.g. Senior Python / Full Stack Developer"
                required
              />
            </label>

            <div className="form-row-two-col">
              <label className="field">
                <span>Company</span>
                <input
                  type="text"
                  value={values.company}
                  onChange={(e) => setValues({ ...values, company: e.target.value })}
                  placeholder="e.g. TechCorp Labs"
                />
              </label>

              <label className="field">
                <span>Location</span>
                <input
                  type="text"
                  value={values.location}
                  onChange={(e) => setValues({ ...values, location: e.target.value })}
                  placeholder="e.g. Remote / New York, NY"
                />
              </label>
            </div>

            <label className="field">
              <span>Full Job Description (Paste JD Text)</span>
              <textarea
                rows={12}
                value={values.description}
                onChange={(e) => setValues({ ...values, description: e.target.value })}
                placeholder="Paste the full job description here (responsibilities, requirements, technical skills, years of experience, qualifications)..."
                required
              />
            </label>

            <button
              type="submit"
              className="primary-action full-width"
              disabled={loading}
            >
              {loading ? 'Parsing JD & Extracting Skills with NLP...' : 'Save & Parse Job Profile'}
            </button>
          </form>
        </div>

        {/* Parsed Result Preview */}
        <div className="card-box">
          <div className="card-box-header">
            <h3>Parsed Job Profile Preview</h3>
          </div>
          <div className="card-box-body">
            {createdJob ? (
              <div className="parsed-summary">
                <div className="profile-detail-grid">
                  <div className="detail-item">
                    <span className="detail-label">Title</span>
                    <strong>{createdJob.title || 'Untitled'}</strong>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Company</span>
                    <strong>{createdJob.company || 'Not specified'}</strong>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Location</span>
                    <strong>{createdJob.location || 'Not specified'}</strong>
                  </div>
                </div>

                <div className="detail-item">
                  <span className="detail-label">Required Experience</span>
                  <strong>{createdJob.experience || 'Not detected'}</strong>
                </div>

                <div className="detail-item">
                  <span className="detail-label">Required Education</span>
                  <strong>{createdJob.education || 'Not detected'}</strong>
                </div>

                <div className="detail-item">
                  <span className="detail-label">Extracted Skills ({createdJob.skills?.length || 0})</span>
                  {createdJob.skills?.length > 0 ? (
                    <div className="skill-list">
                      {createdJob.skills.map((skill) => (
                        <span key={skill} className="skill-pill">
                          {skill}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="muted-text">No technical skills detected</p>
                  )}
                </div>

                {createdJob.keywords?.length > 0 && (
                  <div className="detail-item">
                    <span className="detail-label">Important Keywords</span>
                    <div className="skill-list compact-skills">
                      {createdJob.keywords.map((kw) => (
                        <span key={kw} className="skill-pill secondary-pill">
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="parsed-result-actions">
                  <button
                    type="button"
                    className="primary-action compact"
                    onClick={() => navigate(`/recruiter/ranking?job_id=${createdJob.id}`)}
                  >
                    ⚡ Rank Candidates for This Job
                  </button>
                  <button
                    type="button"
                    className="secondary-action compact"
                    onClick={() => navigate('/recruiter/jobs')}
                  >
                    View All Listings
                  </button>
                </div>
              </div>
            ) : (
              <div className="empty-sub-state">
                <span className="empty-icon">📝</span>
                <p>No job parsed yet in this session.</p>
                <p className="muted-text">
                  Fill in the form on the left and click "Save & Parse Job Profile" to see the extracted requirements.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
