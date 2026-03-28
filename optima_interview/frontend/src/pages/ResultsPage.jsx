import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getResults } from '../api/client'
import Navbar from '../components/Navbar'
import './ResultsPage.css'

export default function ResultsPage() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getResults(sessionId)
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [sessionId])

  if (loading) {
    return (
      <div className="site">
        <div className="noise-overlay" />
        <div className="aurora"><div className="aurora-blob a1" /><div className="aurora-blob a2" /></div>
        <Navbar />
        <div className="results-loading">
          <div className="loader" />
          <h2>Loading results...</h2>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="site">
        <div className="noise-overlay" />
        <Navbar />
        <div className="results-loading">
          <h2>Could not load results</h2>
          <p>{error}</p>
          <button className="btn-primary" onClick={() => navigate('/dashboard')}>
            Back to Dashboard <span className="btn-shimmer" />
          </button>
        </div>
      </div>
    )
  }

  const scoreColor = (s) => {
    if (s >= 80) return '#34d399'
    if (s >= 60) return '#fbbf24'
    if (s >= 40) return '#fb923c'
    return '#ff4d6a'
  }

  // ── Connecting interview: hide Q&A ──────────────────────────────────────────
  if (data.session_type === 'connecting') {
    return (
      <div className="site">
        <div className="noise-overlay" />
        <div className="aurora"><div className="aurora-blob a1" /><div className="aurora-blob a2" /></div>
        <Navbar />
        <div className="results-loading">
          <div className="connecting-done-icon">✓</div>
          <h2>Interview Complete</h2>
          <p className="connecting-done-text">
            Your answers have been submitted and you've been matched with relevant companies.
            Check your Interview Hub to see your connections and application statuses.
          </p>
          <div className="connecting-done-actions">
            <button className="btn-primary" onClick={() => navigate('/interview-hub')}>
              View Interview Hub <span className="btn-shimmer" />
            </button>
            <button className="btn-ghost" onClick={() => navigate('/job-postings')}>
              Browse More Jobs
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Mock interview: full Q&A breakdown ──────────────────────────────────────
  return (
    <div className="site">
      <div className="noise-overlay" />
      <div className="aurora"><div className="aurora-blob a1" /><div className="aurora-blob a2" /></div>
      <Navbar />

      <div className="results">
        {/* Header */}
        <div className="results-header">
          <div>
            <h1>Interview Results</h1>
            <p>{data.job_title} — {data.industry}</p>
          </div>
          <div className="overall-score" style={{ '--sc': scoreColor(data.overall_score || 0) }}>
            <span className="score-num">{Math.round(data.overall_score || 0)}</span>
            <span className="score-label">Overall</span>
          </div>
        </div>

        {/* Questions breakdown */}
        <div className="results-questions">
          {data.questions.map((q, i) => (
            <div className="result-card" key={q.id}>
              <div className="result-top">
                <div className="result-q-meta">
                  <span className="result-q-num">Q{i + 1}</span>
                  <span className={`q-type ${q.question_type}`}>
                    {q.question_type === 'code' ? 'Technical' : 'Verbal'}
                  </span>
                </div>
                {q.score != null && (
                  <span className="result-score" style={{ color: scoreColor(q.score) }}>
                    {Math.round(q.score)}%
                  </span>
                )}
              </div>

              <h3 className="result-question">{q.question_text}</h3>

              {q.user_answer && (
                <div className="result-answer">
                  <span className="result-label">Your Answer</span>
                  <p>{q.user_answer}</p>
                </div>
              )}

              {q.feedback && (
                <div className="result-feedback">
                  <span className="result-label">Feedback</span>
                  <p>{q.feedback}</p>
                </div>
              )}

              {q.key_points_hit && q.key_points_hit.length > 0 && (
                <div className="result-points">
                  <span className="result-label">Key Points Covered</span>
                  <div className="points-list">
                    {q.key_points_hit.map((p, j) => (
                      <span className="point-tag hit" key={j}>{p}</span>
                    ))}
                  </div>
                </div>
              )}

              {q.key_points && q.key_points.length > 0 && (
                <div className="result-points">
                  <span className="result-label">Expected Key Points</span>
                  <div className="points-list">
                    {q.key_points.map((p, j) => {
                      const isHit = q.key_points_hit?.includes(p)
                      return (
                        <span className={`point-tag ${isHit ? 'hit' : 'miss'}`} key={j}>
                          {p}
                        </span>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="results-actions">
          <button className="btn-primary" onClick={() => navigate('/dashboard')}>
            Back to Dashboard <span className="btn-shimmer" />
          </button>
        </div>
      </div>
    </div>
  )
}
