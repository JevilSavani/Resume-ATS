import { useRef, useState } from 'react'

export default function CreateJob({ token, navigate }) {
  const [values, setValues] = useState({
    title: '',
    company_name: '',
    location: '',
    employment_type: 'Full-time',
    minimum_experience: '',
    education_requirement: '',
    required_skills: '',
    preferred_skills: '',
    salary: '',
    status: 'active',
    description: '',
  })
  const [createdJob, setCreatedJob] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const isSubmittingRef = useRef(false)
  const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8002'

  // Helper to trigger NLP parsing on the JD description to auto-fill fields WITHOUT saving to DB
  async function handleAutoExtract() {
    if (!values.description.trim()) {
      setError('Please paste the job description text first to run NLP extraction.')
      return
    }

    setError('')
    setExtracting(true)

    try {
      const response = await fetch(`${API_URL}/recruiter/jobs/extract-skills`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: values.title || '',
          company_name: values.company_name || '',
          location: values.location || '',
          description: values.description,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        const extractedSkills = data.skills?.join(', ') || ''
        setValues((prev) => ({
          ...prev,
          required_skills: prev.required_skills ? `${prev.required_skills}, ${extractedSkills}` : extractedSkills,
          minimum_experience: prev.minimum_experience || data.experience || '',
          education_requirement: prev.education_requirement || data.education || '',
        }))
        setSuccess('Skills and requirements extracted from text (not saved to database until you submit).')
      } else {
        const errData = await response.json().catch(() => ({}))
        setError(errData.detail || 'Could not extract skills with NLP.')
      }
    } catch {
      setError('Network error while running NLP extraction.')
    } finally {
      setExtracting(false)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()

    // Step 2: Strict submission lock — prevents multiple rapid clicks
    if (isSubmittingRef.current || isSubmitting) {
      return
    }

    setError('')
    setSuccess('')
    setCreatedJob(null)

    if (!values.title.trim()) {
      setError('Job title is required.')
      return
    }

    if (!values.company_name.trim()) {
      setError('Company name is required.')
      return
    }

    if (!values.description.trim()) {
      setError('Job description is required.')
      return
    }

    isSubmittingRef.current = true
    setIsSubmitting(true)

    // Parse comma-separated skills
    const requiredSkillsList = values.required_skills
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    const preferredSkillsList = values.preferred_skills
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    try {
      const payload = {
        title: values.title.trim(),
        company_name: values.company_name.trim(),
        location: values.location.trim() || 'Remote',
        employment_type: values.employment_type,
        minimum_experience: values.minimum_experience.trim() || null,
        education_requirement: values.education_requirement.trim() || null,
        required_skills: requiredSkillsList,
        preferred_skills: preferredSkillsList,
        salary: values.salary.trim() || null,
        status: values.status,
        description: values.description.trim(),
      }

      const response = await fetch(`${API_URL}/recruiter/jobs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.detail || 'Failed to create job posting.')
      }

      setCreatedJob(data)
      setSuccess(`Job "${data.title}" successfully created!`)
      setValues({
        title: '',
        company_name: '',
        location: '',
        employment_type: 'Full-time',
        minimum_experience: '',
        education_requirement: '',
        required_skills: '',
        preferred_skills: '',
        salary: '',
        status: 'active',
        description: '',
      })
    } catch (err) {
      setError(err.message)
    } finally {
      isSubmittingRef.current = false
      setIsSubmitting(false)
    }
  }

  return (
    <div className="dashboard-container">
      <div className="page-header">
        <div>
          <span className="eyebrow">Recruiter Management</span>
          <h1>Create Job Opening</h1>
          <p className="lead">
            Post a new job opportunity with skills, qualifications, and employment details.
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
        {/* Form Card */}
        <div className="card-box">
          <div className="card-box-header">
            <h3>Job Details & Requirements</h3>
          </div>
          <form className="create-job-form" onSubmit={handleSubmit} style={{ padding: '20px' }}>
            <label className="field">
              <span>Job Title *</span>
              <input
                type="text"
                value={values.title}
                onChange={(e) => setValues({ ...values, title: e.target.value })}
                placeholder="e.g. Senior Full Stack Engineer"
                required
              />
            </label>

            <div className="form-row-two-col">
              <label className="field">
                <span>Company Name *</span>
                <input
                  type="text"
                  value={values.company_name}
                  onChange={(e) => setValues({ ...values, company_name: e.target.value })}
                  placeholder="e.g. Acme Innovations"
                  required
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

            <div className="form-row-two-col">
              <label className="field">
                <span>Employment Type</span>
                <select
                  value={values.employment_type}
                  onChange={(e) => setValues({ ...values, employment_type: e.target.value })}
                  className="job-dropdown"
                  style={{ padding: '10px' }}
                >
                  <option value="Full-time">Full-time</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Contract">Contract</option>
                  <option value="Internship">Internship</option>
                  <option value="Remote">Remote</option>
                </select>
              </label>

              <label className="field">
                <span>Job Status</span>
                <select
                  value={values.status}
                  onChange={(e) => setValues({ ...values, status: e.target.value })}
                  className="job-dropdown"
                  style={{ padding: '10px' }}
                >
                  <option value="active">Active (Accepting Applications)</option>
                  <option value="closed">Closed</option>
                </select>
              </label>
            </div>

            <div className="form-row-two-col">
              <label className="field">
                <span>Minimum Experience</span>
                <input
                  type="text"
                  value={values.minimum_experience}
                  onChange={(e) => setValues({ ...values, minimum_experience: e.target.value })}
                  placeholder="e.g. 2+ years"
                />
              </label>

              <label className="field">
                <span>Education Requirement</span>
                <input
                  type="text"
                  value={values.education_requirement}
                  onChange={(e) => setValues({ ...values, education_requirement: e.target.value })}
                  placeholder="e.g. Bachelor's in CS or equivalent"
                />
              </label>
            </div>

            <label className="field">
              <span>Optional Salary Range</span>
              <input
                type="text"
                value={values.salary}
                onChange={(e) => setValues({ ...values, salary: e.target.value })}
                placeholder="e.g. $80,000 - $110,000 per year"
              />
            </label>

            <label className="field">
              <span>Required Skills (comma-separated)</span>
              <input
                type="text"
                value={values.required_skills}
                onChange={(e) => setValues({ ...values, required_skills: e.target.value })}
                placeholder="e.g. Python, FastAPI, React, SQL, Docker"
              />
            </label>

            <label className="field">
              <span>Preferred Skills (optional, comma-separated)</span>
              <input
                type="text"
                value={values.preferred_skills}
                onChange={(e) => setValues({ ...values, preferred_skills: e.target.value })}
                placeholder="e.g. AWS, Redis, GraphQL, CI/CD"
              />
            </label>

            <label className="field">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Full Job Description *</span>
                <button
                  type="button"
                  className="link-btn"
                  onClick={handleAutoExtract}
                  disabled={isSubmitting || extracting || !values.description.trim()}
                  style={{ fontSize: '13px' }}
                >
                  {extracting ? 'Extracting with NLP...' : '⚡ Auto-Detect Skills from Text'}
                </button>
              </div>
              <textarea
                rows={10}
                value={values.description}
                onChange={(e) => setValues({ ...values, description: e.target.value })}
                placeholder="Paste the full job description text including responsibilities, requirements, and qualifications..."
                required
              />
            </label>

            <button
              type="submit"
              className="primary-action full-width"
              disabled={isSubmitting}
              style={{ marginTop: '12px' }}
            >
              {isSubmitting ? 'Creating Job Opening...' : '+ Post Job Opening'}
            </button>
          </form>
        </div>

        {/* Preview / Success Card */}
        <div className="card-box">
          <div className="card-box-header">
            <h3>Job Opening Preview</h3>
          </div>
          <div className="card-box-body">
            {createdJob ? (
              <div className="parsed-summary">
                <div className="alert success-alert" style={{ marginBottom: '16px' }}>
                  Job Opening Created Successfully!
                </div>

                <div className="profile-detail-grid">
                  <div className="detail-item">
                    <span className="detail-label">Title</span>
                    <strong>{createdJob.title}</strong>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Company</span>
                    <strong>{createdJob.company_name || createdJob.company}</strong>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Location</span>
                    <strong>{createdJob.location || 'Remote'}</strong>
                  </div>
                </div>

                <div className="detail-item">
                  <span className="detail-label">Type & Salary</span>
                  <p>
                    {createdJob.employment_type || 'Full-time'}{' '}
                    {createdJob.salary ? `• ${createdJob.salary}` : ''}
                  </p>
                </div>

                <div className="detail-item">
                  <span className="detail-label">Status</span>
                  <strong
                    style={{
                      color: (createdJob.status || 'active') === 'active' ? '#059669' : '#dc2626',
                    }}
                  >
                    {(createdJob.status || 'active').toUpperCase()}
                  </strong>
                </div>

                <div className="detail-item">
                  <span className="detail-label">Required Skills</span>
                  <div className="skill-list">
                    {(createdJob.required_skills || createdJob.skills || []).map((skill) => (
                      <span key={skill} className="skill-pill">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="parsed-result-actions" style={{ marginTop: '20px' }}>
                  <button
                    type="button"
                    className="primary-action compact"
                    onClick={() => navigate('/recruiter/jobs')}
                  >
                    Manage My Jobs
                  </button>
                  <button
                    type="button"
                    className="secondary-action compact highlight-action"
                    onClick={() => navigate(`/recruiter/ranking?job_id=${createdJob.id}`)}
                  >
                    ⚡ Rank Candidates
                  </button>
                </div>
              </div>
            ) : (
              <div className="empty-sub-state">
                <span className="empty-icon">📝</span>
                <p>No job created yet in this session.</p>
                <p className="muted-text">
                  Complete the form on the left and submit to publish the job listing.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
