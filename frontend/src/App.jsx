import { useEffect, useMemo, useState } from 'react'
import './App.css'
import Navbar from './components/Navbar'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import CandidateDashboard from './pages/candidate/CandidateDashboard'
import CandidateResumePage from './pages/candidate/CandidateResumePage'
import CandidateProfilePage from './pages/candidate/CandidateProfilePage'
import AvailableJobsPage from './pages/candidate/AvailableJobsPage'
import CandidateApplicationsPage from './pages/candidate/CandidateApplicationsPage'
import RecruiterDashboard from './pages/recruiter/RecruiterDashboard'
import CreateJobPage from './pages/recruiter/CreateJobPage'
import MyJobListingsPage from './pages/recruiter/MyJobListingsPage'
import CandidatesListPage from './pages/recruiter/CandidatesListPage'
import CandidateRankingPage from './pages/recruiter/CandidateRankingPage'

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
  const [route, setRoute] = useState(() => window.location.pathname)
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY))
  const [user, setUser] = useState(getInitialUser)

  const isAuthenticated = Boolean(token && user)
  const userRole = user?.role || 'candidate'

  function navigate(nextRoute) {
    window.history.pushState({}, '', nextRoute)
    setRoute(nextRoute.split('?')[0])
  }

  useEffect(() => {
    const handlePopState = () => setRoute(window.location.pathname)
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // Access control & Role route guards
  useEffect(() => {
    const currentPath = window.location.pathname

    // If not authenticated, protect non-public pages
    if (!isAuthenticated) {
      if (currentPath !== '/login' && currentPath !== '/register') {
        navigate('/login')
      }
      return
    }

    // Redirect root or legacy dashboard to role-specific dashboard
    if (currentPath === '/' || currentPath === '/dashboard' || currentPath === '/profile' || currentPath === '/resume') {
      if (userRole === 'recruiter') {
        navigate('/recruiter/dashboard')
      } else {
        navigate('/candidate/dashboard')
      }
      return
    }

    // Role-based protection: Candidate accessing Recruiter route
    if (userRole === 'candidate' && currentPath.startsWith('/recruiter')) {
      navigate('/candidate/dashboard')
      return
    }

    // Role-based protection: Recruiter accessing Candidate route
    if (userRole === 'recruiter' && currentPath.startsWith('/candidate')) {
      navigate('/recruiter/dashboard')
      return
    }
  }, [route, isAuthenticated, userRole])

  const auth = useMemo(
    () => ({
      async register(values) {
        const response = await fetch(`${API_URL}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        })
        const data = await response.json().catch(() => ({}))
        if (!response.ok) {
          throw new Error(data.detail || 'Registration failed.')
        }
        return data
      },
      async login(values) {
        const response = await fetch(`${API_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        })
        const data = await response.json().catch(() => ({}))
        if (!response.ok) {
          throw new Error(data.detail || 'Invalid email or password.')
        }

        localStorage.setItem(TOKEN_KEY, data.access_token)
        localStorage.setItem(USER_KEY, JSON.stringify(data.user))
        setToken(data.access_token)
        setUser(data.user)
        return data.user
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

  let pageContent = null

  if (!isAuthenticated) {
    if (route === '/register') {
      pageContent = <RegisterPage auth={auth} navigate={navigate} />
    } else {
      pageContent = <LoginPage auth={auth} navigate={navigate} />
    }
  } else if (userRole === 'candidate') {
    switch (route) {
      case '/candidate/resume':
        pageContent = <CandidateResumePage token={token} navigate={navigate} />
        break
      case '/candidate/profile':
        pageContent = <CandidateProfilePage user={user} token={token} navigate={navigate} />
        break
      case '/candidate/jobs':
        pageContent = <AvailableJobsPage token={token} navigate={navigate} />
        break
      case '/candidate/applications':
        pageContent = <CandidateApplicationsPage token={token} navigate={navigate} />
        break
      case '/candidate/dashboard':
      default:
        pageContent = <CandidateDashboard user={user} token={token} navigate={navigate} />
        break
    }
  } else if (userRole === 'recruiter') {
    switch (route) {
      case '/recruiter/jobs/create':
        pageContent = <CreateJobPage token={token} navigate={navigate} />
        break
      case '/recruiter/jobs':
        pageContent = <MyJobListingsPage token={token} navigate={navigate} />
        break
      case '/recruiter/candidates':
        pageContent = <CandidatesListPage token={token} />
        break
      case '/recruiter/ranking':
        pageContent = <CandidateRankingPage token={token} navigate={navigate} />
        break
      case '/recruiter/dashboard':
      default:
        pageContent = <RecruiterDashboard user={user} token={token} navigate={navigate} />
        break
    }
  }

  return (
    <div className="app-shell">
      <Navbar
        user={user}
        isAuthenticated={isAuthenticated}
        currentRoute={route}
        navigate={navigate}
        logout={auth.logout}
      />
      <main className="main-content">{pageContent}</main>
    </div>
  )
}

export default App
