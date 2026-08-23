import { useEffect, useState } from 'react'

export default function CandidateResumePage({ token, navigate }) {
  const [file, setFile] = useState(null)
  const [candidate, setCandidate] = useState(null)
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8002'

  useEffect(() => {
    async function loadCurrentResume() {
      if (!token) return
      setFetching(true)
      try {
        const response = await fetch(`${API_URL}/resumes/me`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (response.ok) {
          const data = await response.json()
          setCandidate(data)
        }
      } catch {
        // No resume yet
      } finally {
        setFetching(false)
      }
    }

    loadCurrentResume()
  }, [token, API_URL])

  function handleFileChange(event) {
    const selectedFile = event.target.files?.[0]
    setError('')
    setSuccess('')

    if (!selectedFile) {
      setFile(null)
      return
    }

    if (selectedFile.type !== 'application/pdf' && !selectedFile.name.toLowerCase().endsWith('.pdf')) {
      setFile(null)
      setError('Please select a valid PDF file.')
      return
    }

    setFile(selectedFile)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (!file) {
      setError('Please select a PDF resume file to upload.')
      return
    }

    setLoading(true)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch(`${API_URL}/resumes/parse`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.detail || 'Failed to upload and parse resume.')
      }

      setCandidate(data.candidate)
      setSuccess('Resume uploaded and parsed successfully! Candidate profile updated.')
      setFile(null)
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
          <span className="eyebrow">Resume Management</span>
          <h1>Upload PDF Resume</h1>
          <p className="lead">
            Upload your resume in PDF format. Our NLP engine will extract your contact info, skills, education, and work history.
          </p>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="secondary-action compact"
            onClick={() => navigate('/candidate/profile')}
          >
            My Profile
          </button>
          <button
            type="button"
            className="primary-action compact"
            onClick={() => navigate('/candidate/jobs')}
          >
            Find Matched Jobs
          </button>
        </div>
      </div>

      {error && <div className="alert error-alert">{error}</div>}
      {success && <div className="alert success-alert">{success}</div>}

      <div className="two-column-layout">
        {/* Upload Form */}
        <div className="card-box">
          <div className="card-box-header">
            <h3>{candidate ? 'Upload New Resume Version' : 'Upload Resume'}</h3>
          </div>
          <form className="upload-form" onSubmit={handleSubmit}>
            <div className="file-drop-area">
              <span className="drop-icon">📤</span>
              <p className="drop-title">Select or drag & drop your PDF resume</p>
              <p className="drop-subtitle">Supported format: PDF only</p>
              <input
                type="file"
                accept="application/pdf,.pdf"
                onChange={handleFileChange}
                className="file-input-hidden"
                id="resume-file-input"
              />
              <label htmlFor="resume-file-input" className="secondary-action compact file-choose-label">
                Browse Files
              </label>
            </div>

            {file && (
              <div className="selected-file-badge">
                <span>📎 {file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
                <button type="button" className="remove-file-btn" onClick={() => setFile(null)}>
                  &times;
                </button>
              </div>
            )}

            <button
              type="submit"
              className="primary-action full-width"
              disabled={loading || !file}
            >
              {loading ? 'Extracting & Parsing with NLP...' : 'Upload & Parse Resume'}
            </button>
          </form>
        </div>

        {/* Current Parsed Resume Summary */}
        <div className="card-box">
          <div className="card-box-header">
            <h3>Extracted Resume Profile</h3>
            {candidate && (
              <span className="status-pill status-ready">Active Profile</span>
            )}
          </div>
          <div className="card-box-body">
            {fetching ? (
              <p className="muted-text">Loading profile...</p>
            ) : candidate ? (
              <div className="parsed-summary">
                <div className="profile-detail-grid">
                  <div className="detail-item">
                    <span className="detail-label">Name</span>
                    <strong>{candidate.name || 'Not detected'}</strong>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Email</span>
                    <strong>{candidate.email || 'Not detected'}</strong>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Phone</span>
                    <strong>{candidate.phone || 'Not detected'}</strong>
                  </div>
                </div>

                <div className="detail-item">
                  <span className="detail-label">Extracted Skills ({candidate.skills?.length || 0})</span>
                  {candidate.skills?.length > 0 ? (
                    <div className="skill-list">
                      {candidate.skills.map((skill) => (
                        <span key={skill} className="skill-pill">{skill}</span>
                      ))}
                    </div>
                  ) : (
                    <p className="muted-text">No technical skills detected</p>
                  )}
                </div>

                {candidate.education && (
                  <div className="detail-item">
                    <span className="detail-label">Education</span>
                    <p className="detail-text">{candidate.education}</p>
                  </div>
                )}

                {candidate.experience && (
                  <div className="detail-item">
                    <span className="detail-label">Experience</span>
                    <p className="detail-text">{candidate.experience}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="empty-sub-state">
                <span className="empty-icon">📄</span>
                <p>No resume uploaded yet.</p>
                <p className="muted-text">Upload your PDF resume on the left to extract your profile.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
