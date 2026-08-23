import { useState } from 'react'

export default function RegisterPage({ auth, navigate }) {
  const [values, setValues] = useState({
    name: '',
    email: '',
    password: '',
    role: 'candidate',
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      await auth.register(values)
      setSuccess(`Account registered as ${values.role.toUpperCase()}! Redirecting to login...`)
      setTimeout(() => navigate('/login'), 1000)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="auth-layout">
      <div className="auth-intro">
        <p className="eyebrow">AI Resume ATS</p>
        <h1>Create Account</h1>
        <p className="lead">
          Join Resume ATS as a Candidate to upload your resume and apply for jobs, or as a Recruiter to post openings and rank top talent with AI.
        </p>

        <div className="role-explainer-cards">
          <div className={`role-explainer ${values.role === 'candidate' ? 'active' : ''}`}>
            <strong>Candidate Role</strong>
            <p>Upload PDF resumes, view parsed skills/education, check ATS match scores, and apply for open positions.</p>
          </div>
          <div className={`role-explainer ${values.role === 'recruiter' ? 'active' : ''}`}>
            <strong>Recruiter Role</strong>
            <p>Create job descriptions, extract skill requirements, view candidate pool, and run automated ATS candidate rankings.</p>
          </div>
        </div>
      </div>

      <form className="auth-panel" onSubmit={handleSubmit}>
        <div className="auth-panel-header">
          <h2>Get Started</h2>
          <p>Select your role and create your account</p>
        </div>

        <div className="field">
          <span>Select Account Type</span>
          <div className="role-selector-pills">
            <button
              type="button"
              className={`role-pill-btn ${values.role === 'candidate' ? 'selected' : ''}`}
              onClick={() => setValues({ ...values, role: 'candidate' })}
            >
              <span className="role-pill-icon">👤</span>
              <div className="role-pill-text">
                <strong>Candidate</strong>
                <small>Looking for jobs</small>
              </div>
            </button>
            <button
              type="button"
              className={`role-pill-btn ${values.role === 'recruiter' ? 'selected' : ''}`}
              onClick={() => setValues({ ...values, role: 'recruiter' })}
            >
              <span className="role-pill-icon">💼</span>
              <div className="role-pill-text">
                <strong>Recruiter</strong>
                <small>Hiring candidates</small>
              </div>
            </button>
          </div>
        </div>

        <label className="field">
          <span>Full Name</span>
          <input
            type="text"
            value={values.name}
            onChange={(e) => setValues({ ...values, name: e.target.value })}
            placeholder="John Doe"
            required
          />
        </label>

        <label className="field">
          <span>Email Address</span>
          <input
            type="email"
            value={values.email}
            onChange={(e) => setValues({ ...values, email: e.target.value })}
            placeholder="you@example.com"
            required
          />
        </label>

        <label className="field">
          <span>Password (min 8 characters)</span>
          <input
            type="password"
            value={values.password}
            onChange={(e) => setValues({ ...values, password: e.target.value })}
            placeholder="••••••••"
            minLength={8}
            required
          />
        </label>

        {error && <div className="alert error-alert">{error}</div>}
        {success && <div className="alert success-alert">{success}</div>}

        <button type="submit" className="primary-action full-width" disabled={loading}>
          {loading ? 'Creating Account...' : `Register as ${values.role === 'candidate' ? 'Candidate' : 'Recruiter'}`}
        </button>

        <p className="switch-copy">
          Already registered?{' '}
          <button type="button" className="link-button" onClick={() => navigate('/login')}>
            Sign In
          </button>
        </p>
      </form>
    </section>
  )
}
