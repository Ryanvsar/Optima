import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getMySessions } from '../api/client'
import Navbar from '../components/Navbar'
import './Dashboard.css'

/* ── Employer Dashboard ── */
const scoreTiers = [
  { range: '90-100%', label: 'Exceptional', color: '#00d4ff', action: 'Immediate outreach recommended. Top 5% of candidates.' },
  { range: '80-89%', label: 'Excellent', color: '#34d399', action: 'High-priority candidate. Strong domain knowledge, clear communicator.' },
  { range: '65-79%', label: 'Strong', color: '#a78bfa', action: 'Primary talent pool. Competent and job-ready. Good hire with cultural fit.' },
  { range: '50-64%', label: 'Developing', color: '#fbbf24', action: 'Consider for junior roles or positions with mentorship structures.' },
  { range: '30-49%', label: 'Needs Work', color: '#fb923c', action: 'Not recommended for mid/senior roles. May warrant entry-level screening.' },
  { range: '0-29%', label: 'Insufficient', color: '#ff4d6a', action: 'Not recommended for outreach at this stage.' },
]

function EmployerDashboard({ user }) {
  const navigate = useNavigate()

  return (
    <div className="dash dash-wide">
      <div className="dash-header">
        <h1>Welcome, <span className="gradient-text">{user?.name}</span></h1>
        <p>Your command center for evaluating and connecting with top talent.</p>
      </div>

      {/* Quick actions */}
      <div className="quick-actions">
        <button className="quick-card" onClick={() => navigate('/company/jobs')}>
          <div className="quick-card-icon">📋</div>
          <div className="quick-card-text">
            <strong>Manage Job Postings</strong>
            <span>Post new roles and view applicants</span>
          </div>
          <span className="quick-card-arrow">→</span>
        </button>
        <button className="quick-card" onClick={() => navigate('/company/profile')}>
          <div className="quick-card-icon">🏢</div>
          <div className="quick-card-text">
            <strong>Company Profile</strong>
            <span>Update your company details</span>
          </div>
          <span className="quick-card-arrow">→</span>
        </button>
      </div>

      {/* Quick score reference */}
      <div className="dash-card">
        <div className="card-header-row">
          <h2>Candidate Score Guide</h2>
          <button className="btn-ghost-sm" onClick={() => navigate('/rubric')}>View full methodology</button>
        </div>
        <p>Quick reference for interpreting candidate interview scores and match scores.</p>

        <div className="rubric-tiers-compact">
          {scoreTiers.map((t, i) => (
            <div className="tier-row" key={i}>
              <span className="tier-badge" style={{ color: t.color, borderColor: t.color + '30', background: t.color + '0a' }}>
                {t.range}
              </span>
              <div className="tier-info">
                <strong style={{ color: t.color }}>{t.label}</strong>
                <span>{t.action}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* How matching works summary */}
      <div className="dash-card">
        <h2>How candidates are matched to your jobs</h2>
        <p>When a candidate completes a connecting interview, AI scores them across four weighted dimensions:</p>

        <div className="match-summary-grid">
          <div className="match-summary-item">
            <span className="match-pct">40%</span>
            <div>
              <strong>Interview Performance</strong>
              <span>Quality and depth of interview answers</span>
            </div>
          </div>
          <div className="match-summary-item">
            <span className="match-pct">35%</span>
            <div>
              <strong>Answer Relevance</strong>
              <span>Answers vs. your job description</span>
            </div>
          </div>
          <div className="match-summary-item">
            <span className="match-pct">10%</span>
            <div>
              <strong>Profile Skills</strong>
              <span>Candidate skills vs. required skills</span>
            </div>
          </div>
          <div className="match-summary-item">
            <span className="match-pct">15%</span>
            <div>
              <strong>Resume ATS</strong>
              <span>Resume relevance to job requirements</span>
            </div>
          </div>
          <div className="match-summary-item">
            <span className="match-pct match-pct-bonus">+</span>
            <div>
              <strong>Role Preference Alignment</strong>
              <span>Candidates who list your role type as a preferred position are ranked higher in your applicant list</span>
            </div>
          </div>
          <div className="match-summary-item">
            <span className="match-pct match-pct-bonus">+</span>
            <div>
              <strong>Interview Recency</strong>
              <span>Connecting interviews from the past 7 days are prioritized, ensuring you see candidates at their current readiness level</span>
            </div>
          </div>
        </div>

        <p className="rubric-note-compact">
          <strong>Tip:</strong> The more detailed your job description and required skills, the more accurate the matching.
          Focus on candidates with <strong>65%+ match scores</strong> — these are strong fits worth contacting.
        </p>
      </div>
    </div>
  )
}

/* ── Candidate Dashboard ── */
function CandidateDashboard({ user }) {
  const navigate = useNavigate()
  const [sessions, setSessions] = useState([])

  useEffect(() => {
    getMySessions().then(setSessions).catch(() => {})
  }, [])

  const recentMockSessions = sessions
    .filter((s) => s.status === 'completed' && s.session_type === 'mock')
    .slice(0, 3)

  const scoreColor = (s) => {
    if (s >= 80) return '#34d399'
    if (s >= 65) return '#a78bfa'
    if (s >= 50) return '#fbbf24'
    if (s >= 30) return '#fb923c'
    return '#ff4d6a'
  }

  return (
    <div className="dash">
      <div className="dash-header">
        <h1>Welcome back, <span className="gradient-text">{user?.name}</span></h1>
        <p>Browse jobs, practice with mock interviews, and track your connections.</p>
      </div>

      {/* Quick actions */}
      <div className="quick-actions">
        <button className="quick-card" onClick={() => navigate('/job-postings')}>
          <div className="quick-card-icon">🔍</div>
          <div className="quick-card-text">
            <strong>Browse Job Postings</strong>
            <span>Find roles and save favourites</span>
          </div>
          <span className="quick-card-arrow">→</span>
        </button>
        <button className="quick-card" onClick={() => navigate('/interview-hub')}>
          <div className="quick-card-icon">📊</div>
          <div className="quick-card-text">
            <strong>Interview Hub</strong>
            <span>Track connections and mock interviews</span>
          </div>
          <span className="quick-card-arrow">→</span>
        </button>
        <button className="quick-card" onClick={() => navigate('/profile')}>
          <div className="quick-card-icon">👤</div>
          <div className="quick-card-text">
            <strong>My Profile</strong>
            <span>Update resume, skills &amp; preferences</span>
          </div>
          <span className="quick-card-arrow">→</span>
        </button>
      </div>

      {/* Recent mock sessions */}
      {recentMockSessions.length > 0 && (
        <div className="dash-card">
          <div className="card-header-row">
            <h2>Recent Mock Interviews</h2>
            <button className="btn-ghost-sm" onClick={() => navigate('/interview-hub')}>
              View all
            </button>
          </div>
          <div className="sessions-list">
            {recentMockSessions.map((s) => (
              <div
                key={s.id}
                className="session-row"
                onClick={() => navigate(`/results/${s.id}`)}
              >
                <div className="session-info">
                  <span className="session-title">{s.job_title}</span>
                  <span className="session-industry">{s.industry}</span>
                </div>
                <div className="session-meta">
                  <span className="session-grade">
                    Score:{' '}
                    <strong style={{ color: scoreColor(s.overall_score || 0) }}>
                      {Math.round(s.overall_score || 0)}%
                    </strong>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Main Dashboard ── */
export default function Dashboard() {
  const { user } = useAuth()

  return (
    <div className="site">
      <div className="noise-overlay" />
      <div className="aurora">
        <div className="aurora-blob a1" />
        <div className="aurora-blob a2" />
      </div>
      <Navbar />

      {user?.role === 'company' ? (
        <EmployerDashboard user={user} />
      ) : (
        <CandidateDashboard user={user} />
      )}
    </div>
  )
}
