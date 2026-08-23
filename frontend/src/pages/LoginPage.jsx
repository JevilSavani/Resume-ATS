import { useState } from 'react'

export default function LoginPage({ auth, navigate }) {
  const [values, setValues] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const user = await auth.login(values)
      if (user?.role === 'recruiter') {
        navigate('/recruiter/dashboard')
      } else {
        navigate('/candidate/dashboard')
      }
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
        <h1>Welcome Back</h1>
        <p className="lead">
          Sign in to access your role-specific dashboard. Candidates can manage resumes and apply for jobs; Recruiters can post jobs and rank candidates with ATS scoring.
        </p>
        <div className="auth-feature-list">
          <div className="auth-feature-item">
            <span className="feat-icon">📄</span>
            <div>
              <strong>Candidate Portal</strong>
              <p>Upload PDF resumes, extract skills & education, and discover matched job openings.</p>
            </div>
          </div>
          <div className="auth-feature-item">
            <span className="feat-icon">⚡</span>
            <div>
              <strong>Recruiter Portal</strong>
              <p>Parse job descriptions, match talent using TF-IDF & NLP, and rank applicants by ATS score.</p>
            </div>
          </div>
        </div>
      </div>

      <form className="auth-panel" onSubmit={handleSubmit}>
        <div className="auth-panel-header">
          <h2>Sign In</h2>
          <p>Enter your credentials to continue</p>
        </div>

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
          <span>Password</span>
          <input
            type="password"
            value={values.password}
            onChange={(e) => setValues({ ...values, password: e.target.value })}
            placeholder="••••••••"
            required
          />
        </label>

        {error && <div className="alert error-alert">{error}</div>}

        <button type="submit" className="primary-action full-width" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign In'}
        </button>

        <p className="switch-copy">
          Don't have an account?{' '}
          <button type="button" className="link-button" onClick={() => navigate('/register')}>
            Create an account
          </button>
        </p>
      </form>
    </section>
  )
}
