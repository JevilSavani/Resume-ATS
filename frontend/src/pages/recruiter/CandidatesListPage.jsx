import { useEffect, useState } from 'react'
import CandidateModal from '../../components/CandidateModal'

export default function CandidatesListPage({ token }) {
  const [candidates, setCandidates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCandidate, setSelectedCandidate] = useState(null)

  const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8002'

  useEffect(() => {
    async function loadCandidates() {
      if (!token) return
      setLoading(true)
      setError('')
      try {
        const response = await fetch(`${API_URL}/resumes/all`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (response.ok) {
          const data = await response.json()
          setCandidates(Array.isArray(data) ? data : [])
        } else {
          setError('Could not load candidate pool.')
        }
      } catch {
        setError('Network error loading candidate pool.')
      } finally {
        setLoading(false)
      }
    }

    loadCandidates()
  }, [token, API_URL])

  const filteredCandidates = candidates.filter((c) => {
    const q = searchQuery.toLowerCase()
    return (
      !q ||
      c.name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.skills?.some((s) => s.toLowerCase().includes(q))
    )
  })

  return (
    <div className="dashboard-container">
      <div className="page-header">
        <div>
          <span className="eyebrow">Talent Discovery</span>
          <h1>Candidate Pool Directory</h1>
          <p className="lead">
            Browse all parsed resumes and candidate profiles in the ATS system.
          </p>
        </div>
        <div className="header-actions">
          <span className="badge-count">{candidates.length} Total Candidates</span>
        </div>
      </div>

      {error && <div className="alert error-alert">{error}</div>}

      <div className="search-box-row">
        <input
          type="text"
          className="search-input"
          placeholder="Search by candidate name, email, or skill (e.g., Python, SQL, React)..."
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
          <p className="muted-text">Loading candidates...</p>
        </div>
      ) : filteredCandidates.length === 0 ? (
        <div className="empty-sub-state card-box">
          <span className="empty-icon">👥</span>
          <h3>No candidates found</h3>
          <p className="muted-text">
            {searchQuery
              ? `No candidates matched your search "${searchQuery}".`
              : 'No candidate resumes have been uploaded yet.'}
          </p>
        </div>
      ) : (
        <div className="candidates-grid">
          {filteredCandidates.map((c) => (
            <article key={c.id} className="candidate-card">
              <div className="candidate-card-top">
                <div className="cand-avatar large">
                  {(c.name || 'C').charAt(0).toUpperCase()}
                </div>
                <div className="candidate-card-meta">
                  <h3>{c.name || 'Unnamed Candidate'}</h3>
                  <p className="cand-contact">{c.email || 'No email'} {c.phone ? `• ${c.phone}` : ''}</p>
                </div>
              </div>

              <div className="candidate-card-skills">
                <span className="section-mini-title">Skills ({c.skills?.length || 0}):</span>
                {c.skills && c.skills.length > 0 ? (
                  <div className="skill-list compact-skills">
                    {c.skills.slice(0, 6).map((s) => (
                      <span key={s} className="skill-pill">
                        {s}
                      </span>
                    ))}
                    {c.skills.length > 6 && (
                      <span className="skill-pill more">+{c.skills.length - 6}</span>
                    )}
                  </div>
                ) : (
                  <p className="muted-text">No skills detected</p>
                )}
              </div>

              {c.education && (
                <div className="candidate-card-section">
                  <span className="section-mini-title">Education:</span>
                  <p className="line-clamp-2">{c.education}</p>
                </div>
              )}

              {c.experience && (
                <div className="candidate-card-section">
                  <span className="section-mini-title">Experience:</span>
                  <p className="line-clamp-2">{c.experience}</p>
                </div>
              )}

              <div className="candidate-card-footer">
                <button
                  type="button"
                  className="secondary-action compact full-width"
                  onClick={() => setSelectedCandidate(c)}
                >
                  View Full Profile
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {selectedCandidate && (
        <CandidateModal
          candidate={selectedCandidate}
          onClose={() => setSelectedCandidate(null)}
        />
      )}
    </div>
  )
}
