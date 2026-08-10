import { useEffect, useMemo, useState } from 'react'
import './App.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8002'
const TOKEN_KEY = 'resume_ats_token'
const USER_KEY = 'resume_ats_user'

function getInitialUser() {
  const savedUser = localStorage.getItem(USER_KEY)
  if (!savedUser) return null

  try {
    return JSON.parse(savedUser)
  } catch {
    localStorage.removeItem(USER_KEY)
    return null
  }
}

function App() {
  const [route, setRoute] = useState(window.location.pathname)
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY))
  const [user, setUser] = useState(getInitialUser)

  const isAuthenticated = Boolean(token && user)
  const protectedRoute = route === '/dashboard' || route === '/profile' || route === '/resume'

  useEffect(() => {
    const handlePopState = () => setRoute(window.location.pathname)
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    if (protectedRoute && !isAuthenticated) {
      navigate('/login')
    }
  }, [protectedRoute, isAuthenticated])

  const auth = useMemo(
    () => ({
      async register(values) {
        return request('/auth/register', {
          method: 'POST',
          body: JSON.stringify(values),
        })
      },
      async login(values) {
        const data = await request('/auth/login', {
          method: 'POST',
          body: JSON.stringify(values),
        })
        localStorage.setItem(TOKEN_KEY, data.access_token)
        localStorage.setItem(USER_KEY, JSON.stringify(data.user))
        setToken(data.access_token)
        setUser(data.user)
        navigate('/dashboard')
      },
      logout() {
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(USER_KEY)
        setToken(null)
        setUser(null)
        navigate('/login')
      },
    }),
    [],
  )

  function navigate(nextRoute) {
    window.history.pushState({}, '', nextRoute)
    setRoute(nextRoute)
  }

  let page
  if (route === '/register') {
    page = <RegisterPage auth={auth} navigate={navigate} />
  } else if (route === '/dashboard' && isAuthenticated) {
    page = <Dashboard user={user} token={token} logout={auth.logout} navigate={navigate} />
  } else if (route === '/resume' && isAuthenticated) {
    page = <ResumeUploadPage token={token} navigate={navigate} />
  } else {
    page = <LoginPage auth={auth} navigate={navigate} />
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <button type="button" className="brand" onClick={() => navigate(isAuthenticated ? '/dashboard' : '/login')}>
          Resume ATS
        </button>
        <nav aria-label="Primary navigation">
          {isAuthenticated ? (
            <>
              <button type="button" onClick={() => navigate('/dashboard')}>
                Dashboard
              </button>
              <button type="button" onClick={() => navigate('/resume')}>
                Upload Resume
              </button>
              <button type="button" onClick={auth.logout}>
                Logout
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => navigate('/login')}>
                Login
              </button>
              <button type="button" onClick={() => navigate('/register')}>
                Register
              </button>
            </>
          )}
        </nav>
      </header>
      {page}
    </main>
  )
}

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.detail || 'Something went wrong. Please try again.')
  }
  return data
}

async function uploadResume(file, token) {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(`${API_URL}/resumes/parse`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.detail || 'Could not parse this resume.')
  }
  return data
}

function LoginPage({ auth, navigate }) {
  const [values, setValues] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      await auth.login(values)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="auth-layout">
      <AuthIntro title="Welcome back" text="Sign in to continue screening resumes and tracking candidate fit." />
      <form className="auth-panel" onSubmit={handleSubmit}>
        <h1>Login</h1>
        <Field label="Email" type="email" value={values.email} onChange={(email) => setValues({ ...values, email })} />
        <Field
          label="Password"
          type="password"
          value={values.password}
          onChange={(password) => setValues({ ...values, password })}
        />
        {error && <p className="error">{error}</p>}
        <button type="submit" className="primary-action" disabled={loading}>
          {loading ? 'Signing in...' : 'Login'}
        </button>
        <p className="switch-copy">
          New here?{' '}
          <button type="button" className="link-button" onClick={() => navigate('/register')}>
            Create an account
          </button>
        </p>
      </form>
    </section>
  )
}

function RegisterPage({ auth, navigate }) {
  const [values, setValues] = useState({ name: '', email: '', password: '' })
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
      setSuccess('Registration successful. Redirecting to login...')
      setTimeout(() => navigate('/login'), 700)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="auth-layout">
      <AuthIntro title="Create your account" text="Register once, then use your token-backed session across protected pages." />
      <form className="auth-panel" onSubmit={handleSubmit}>
        <h1>Register</h1>
        <Field label="Name" value={values.name} onChange={(name) => setValues({ ...values, name })} />
        <Field label="Email" type="email" value={values.email} onChange={(email) => setValues({ ...values, email })} />
        <Field
          label="Password"
          type="password"
          value={values.password}
          onChange={(password) => setValues({ ...values, password })}
        />
        {error && <p className="error">{error}</p>}
        {success && <p className="success">{success}</p>}
        <button type="submit" className="primary-action" disabled={loading}>
          {loading ? 'Creating account...' : 'Register'}
        </button>
        <p className="switch-copy">
          Already registered?{' '}
          <button type="button" className="link-button" onClick={() => navigate('/login')}>
            Login
          </button>
        </p>
      </form>
    </section>
  )
}

function Dashboard({ user, token, logout, navigate }) {
  const tokenPreview = `${token.slice(0, 18)}...${token.slice(-8)}`

  return (
    <section className="dashboard">
      <div>
        <p className="eyebrow">Protected dashboard</p>
        <h1>Hello, {user.name}</h1>
        <p className="lead">You are logged in as {user.email}. Resume ATS protected pages can now read your user identity from the JWT.</p>
      </div>
      <div className="status-grid">
        <article>
          <span>User ID</span>
          <strong>{user.id}</strong>
        </article>
        <article>
          <span>Token</span>
          <code>{tokenPreview}</code>
        </article>
      </div>
      <button type="button" className="primary-action compact" onClick={logout}>
        Logout
      </button>
      <button type="button" className="secondary-action compact" onClick={() => navigate('/resume')}>
        Upload a resume
      </button>
    </section>
  )
}

function ResumeUploadPage({ token, navigate }) {
  const [file, setFile] = useState(null)
  const [candidate, setCandidate] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function handleFileChange(event) {
    const selectedFile = event.target.files?.[0]
    setCandidate(null)
    setError('')

    if (!selectedFile) {
      setFile(null)
      return
    }

    if (selectedFile.type !== 'application/pdf' && !selectedFile.name.toLowerCase().endsWith('.pdf')) {
      setFile(null)
      setError('Please select a PDF resume.')
      return
    }

    setFile(selectedFile)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setCandidate(null)

    if (!file) {
      setError('Choose a PDF resume before uploading.')
      return
    }

    setLoading(true)
    try {
      const data = await uploadResume(file, token)
      setCandidate(data.candidate)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="resume-page">
      <div className="resume-header">
        <div>
          <p className="eyebrow">Resume parser</p>
          <h1>Upload PDF Resume</h1>
          <p className="lead">Parse a candidate profile with PDF text extraction, regex, and spaCy-backed rules.</p>
        </div>
        <button type="button" className="secondary-action compact" onClick={() => navigate('/dashboard')}>
          Back to dashboard
        </button>
      </div>

      <form className="upload-panel" onSubmit={handleSubmit}>
        <label className="field">
          <span>PDF Resume</span>
          <input type="file" accept="application/pdf,.pdf" onChange={handleFileChange} />
        </label>
        {file && <p className="file-note">{file.name}</p>}
        {error && <p className="error">{error}</p>}
        <button type="submit" className="primary-action compact" disabled={loading}>
          {loading ? 'Parsing resume...' : 'Upload and parse'}
        </button>
      </form>

      {candidate && <CandidateResult candidate={candidate} />}
    </section>
  )
}

function CandidateResult({ candidate }) {
  return (
    <section className="candidate-result">
      <h2>Parsed Candidate</h2>
      <div className="profile-grid">
        <ProfileItem label="Name" value={candidate.name} />
        <ProfileItem label="Email" value={candidate.email} />
        <ProfileItem label="Phone" value={candidate.phone} />
      </div>
      <ProfileBlock label="Education" value={candidate.education} />
      <ProfileBlock label="Experience" value={candidate.experience} />
      <div className="profile-block">
        <span>Skills</span>
        {candidate.skills?.length ? (
          <div className="skill-list">
            {candidate.skills.map((skill) => (
              <span key={skill}>{skill}</span>
            ))}
          </div>
        ) : (
          <p>Not found</p>
        )}
      </div>
    </section>
  )
}

function ProfileItem({ label, value }) {
  return (
    <article>
      <span>{label}</span>
      <strong>{value || 'Not found'}</strong>
    </article>
  )
}

function ProfileBlock({ label, value }) {
  return (
    <div className="profile-block">
      <span>{label}</span>
      <p>{value || 'Not found'}</p>
    </div>
  )
}

function AuthIntro({ title, text }) {
  return (
    <div className="auth-intro">
      <p className="eyebrow">Resume ATS</p>
      <h1>{title}</h1>
      <p className="lead">{text}</p>
    </div>
  )
}

function Field({ label, type = 'text', value, onChange }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} required />
    </label>
  )
}

export default App
