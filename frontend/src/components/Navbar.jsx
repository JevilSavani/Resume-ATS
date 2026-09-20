export default function Navbar({ user, isAuthenticated, currentRoute, navigate, logout }) {
  const isCandidate = user?.role === 'candidate'
  const isRecruiter = user?.role === 'recruiter'

  return (
    <header className="topbar">
      <div className="brand-section">
        <button
          type="button"
          className="brand"
          onClick={() => {
            if (!isAuthenticated) navigate('/login')
            else if (isCandidate) navigate('/candidate/dashboard')
            else navigate('/recruiter/dashboard')
          }}
        >
          <span className="brand-logo">📄</span>
          <span className="brand-text">Resume ATS</span>
        </button>
        {isAuthenticated && user && (
          <span className={`role-badge ${user.role}`}>
            {user.role === 'candidate' ? '👤 Candidate' : '💼 Recruiter'}
          </span>
        )}
      </div>

      <nav aria-label="Primary navigation" className="nav-links">
        {isAuthenticated ? (
          <>
            {isCandidate && (
              <>
                <button
                  type="button"
                  className={`nav-btn ${currentRoute === '/candidate/dashboard' ? 'active' : ''}`}
                  onClick={() => navigate('/candidate/dashboard')}
                >
                  Dashboard
                </button>
                <button
                  type="button"
                  className={`nav-btn ${currentRoute === '/candidate/resume' ? 'active' : ''}`}
                  onClick={() => navigate('/candidate/resume')}
                >
                  Upload Resume
                </button>
                <button
                  type="button"
                  className={`nav-btn ${currentRoute === '/candidate/profile' ? 'active' : ''}`}
                  onClick={() => navigate('/candidate/profile')}
                >
                  My Profile
                </button>
                <button
                  type="button"
                  className={`nav-btn ${currentRoute === '/candidate/jobs' ? 'active' : ''}`}
                  onClick={() => navigate('/candidate/jobs')}
                >
                  Available Jobs
                </button>
                <button
                  type="button"
                  className={`nav-btn ${currentRoute === '/candidate/applications' ? 'active' : ''}`}
                  onClick={() => navigate('/candidate/applications')}
                >
                  My Applications
                </button>
              </>
            )}

            {isRecruiter && (
              <>
                <button
                  type="button"
                  className={`nav-btn ${currentRoute === '/recruiter/dashboard' ? 'active' : ''}`}
                  onClick={() => navigate('/recruiter/dashboard')}
                >
                  Dashboard
                </button>
                <button
                  type="button"
                  className={`nav-btn ${currentRoute === '/recruiter/jobs' ? 'active' : ''}`}
                  onClick={() => navigate('/recruiter/jobs')}
                >
                  Jobs
                </button>
                <button
                  type="button"
                  className={`nav-btn ${currentRoute === '/recruiter/jobs/create' ? 'active' : ''}`}
                  onClick={() => navigate('/recruiter/jobs/create')}
                >
                  + Create Job
                </button>
                <button
                  type="button"
                  className={`nav-btn ${currentRoute === '/recruiter/applicants' ? 'active' : ''}`}
                  onClick={() => navigate('/recruiter/applicants')}
                >
                  Applicants
                </button>
                <button
                  type="button"
                  className={`nav-btn highlight ${currentRoute === '/recruiter/ranking' ? 'active' : ''}`}
                  onClick={() => navigate('/recruiter/ranking')}
                >
                  ⚡ Candidate Ranking
                </button>
              </>
            )}

            <div className="nav-user-cluster">
              <span className="user-email-tag" title={user?.email}>
                {user?.name || user?.email}
              </span>
              <button type="button" className="logout-btn" onClick={logout}>
                Logout
              </button>
            </div>
          </>
        ) : (
          <div className="auth-nav-buttons">
            <button
              type="button"
              className={`nav-btn ${currentRoute === '/login' ? 'active' : ''}`}
              onClick={() => navigate('/login')}
            >
              Login
            </button>
            <button
              type="button"
              className={`primary-action compact ${currentRoute === '/register' ? 'active' : ''}`}
              onClick={() => navigate('/register')}
            >
              Register
            </button>
          </div>
        )}
      </nav>
    </header>
  )
}
