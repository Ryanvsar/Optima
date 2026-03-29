import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getApplicantsForJob, updateApplicationStatus, getJob } from '../api/client'
import Navbar from '../components/Navbar'
import './CompanyApplicants.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const resolveUrl = (url) => {
  if (!url) return null
  return url.startsWith('http') ? url : `${API}${url}`
}

function scoreColor(score) {
  if (score >= 80) return 'score-green'
  if (score >= 65) return 'score-yellow'
  return 'score-red'
}

function statusLabel(s) {
  return { applied: 'Applied', viewed: 'Viewed', contacted: 'Contacted', withdrawn: 'Withdrawn' }[s] || s
}

function ScoreBar({ label, pct, value, color }) {
  return (
    <div className="score-bar-row">
      <div className="score-bar-header">
        <span className="score-bar-label">{label}</span>
        <div className="score-bar-right">
          <span className="score-bar-pct">{pct}%</span>
          <span className="score-bar-val">{value != null ? `${Math.round(value)}` : '—'}</span>
        </div>
      </div>
      <div className="score-bar-track">
        <div
          className="score-bar-fill"
          style={{ width: `${value ?? 0}%`, background: color }}
        />
      </div>
    </div>
  )
}

export default function CompanyApplicants() {
  const { jobId } = useParams()
  const navigate = useNavigate()

  const [job, setJob] = useState(null)
  const [applicants, setApplicants] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [statusUpdating, setStatusUpdating] = useState(false)
  const [showResume, setShowResume] = useState(false)
  const [showCover, setShowCover] = useState(false)

  useEffect(() => {
    Promise.all([getApplicantsForJob(jobId), getJob(jobId)])
      .then(([apps, j]) => {
        setApplicants(apps)
        setJob(j)
        if (apps.length > 0) setSelected(apps[0])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [jobId])

  const handleSelectApplicant = (app) => {
    setSelected(app)
    setShowResume(false)
    setShowCover(false)
  }

  const handleStatusChange = async (newStatus) => {
    if (!selected || statusUpdating) return
    setStatusUpdating(true)
    try {
      await updateApplicationStatus(selected.application_id, newStatus)
      const updated = { ...selected, status: newStatus }
      setSelected(updated)
      setApplicants((prev) => prev.map((a) => a.application_id === selected.application_id ? updated : a))
    } catch {
      // ignore
    } finally {
      setStatusUpdating(false)
    }
  }

  const avatarSrc = (app) => resolveUrl(app.candidate_profile_picture_url)

  return (
    <div className="site">
      <div className="noise-overlay" />
      <div className="aurora">
        <div className="aurora-blob a1" />
        <div className="aurora-blob a2" />
      </div>
      <Navbar />

      <div className="ca-page">
        {/* Breadcrumb */}
        <div className="ca-breadcrumb">
          <button className="breadcrumb-btn" onClick={() => navigate('/company/jobs')}>
            ← Job Postings
          </button>
          {job && (
            <>
              <span className="breadcrumb-sep">/</span>
              <span className="breadcrumb-current">{job.title}</span>
            </>
          )}
        </div>

        <div className="ca-header">
          <h1>{job?.title || 'Applicants'}</h1>
          <p>{applicants.length} applicant{applicants.length !== 1 ? 's' : ''} — sorted by match score</p>
        </div>

        {loading ? (
          <div className="ca-loading">Loading applicants…</div>
        ) : applicants.length === 0 ? (
          <div className="ca-empty">No applicants yet for this position.</div>
        ) : (
          <div className="ca-split">
            {/* ── Left: Applicant List ── */}
            <div className="ca-list">
              {applicants.map((app) => {
                const src = avatarSrc(app)
                const initials = app.candidate_name
                  ?.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '?'
                return (
                  <button
                    key={app.application_id}
                    className={`ca-list-item ${selected?.application_id === app.application_id ? 'selected' : ''}`}
                    onClick={() => handleSelectApplicant(app)}
                  >
                    <div className="ca-list-avatar">
                      {src
                        ? <img src={src} alt={app.candidate_name} className="ca-avatar-img" />
                        : <div className="ca-avatar-placeholder">{initials}</div>
                      }
                    </div>
                    <div className="ca-list-info">
                      <div className="ca-list-name">{app.candidate_name}</div>
                      <div className="ca-list-meta">
                        <span className={`status-chip status-${app.status}`}>
                          {statusLabel(app.status)}
                        </span>
                      </div>
                    </div>
                    <span className={`score-badge ${scoreColor(app.match_score)}`}>
                      {Math.round(app.match_score)}%
                    </span>
                  </button>
                )
              })}
            </div>

            {/* ── Right: Detail Panel ── */}
            {selected && (
              <div className="ca-detail">
                {/* Header */}
                <div className="ca-detail-header">
                  <div className="ca-detail-avatar-row">
                    {avatarSrc(selected) ? (
                      <img src={avatarSrc(selected)} alt={selected.candidate_name} className="ca-detail-avatar" />
                    ) : (
                      <div className="ca-detail-avatar-placeholder">
                        {selected.candidate_name?.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '?'}
                      </div>
                    )}
                    <div>
                      <div className="ca-detail-name">{selected.candidate_name}</div>
                      <div className="ca-detail-sub">
                        {selected.location && <span>{selected.location}</span>}
                        {selected.age && <span>{selected.age} yrs</span>}
                      </div>
                    </div>
                  </div>

                  {/* Contact */}
                  <div className="ca-contact-row">
                    {selected.candidate_email && (
                      <a href={`mailto:${selected.candidate_email}`} className="ca-contact-btn">
                        ✉ Email
                      </a>
                    )}
                    {selected.candidate_phone && (
                      <a href={`tel:${selected.candidate_phone}`} className="ca-contact-btn">
                        📞 Call
                      </a>
                    )}
                  </div>
                </div>

                {/* Skills */}
                {selected.skills?.length > 0 && (
                  <div className="ca-section">
                    <div className="ca-section-title">Skills</div>
                    <div className="ca-skills">
                      {selected.skills.map((s, i) => (
                        <span className="skill-chip" key={i}>{s}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Resume */}
                <div className="ca-section">
                  <div className="ca-section-header">
                    <div className="ca-section-title">Resume</div>
                    <span className={`resume-chip ${selected.resume_is_tailored ? 'chip-tailored' : 'chip-default'}`}>
                      {selected.resume_is_tailored ? 'Tailored Resume' : 'Default Resume'}
                    </span>
                  </div>
                  {(() => {
                    const pdfUrl = selected.resume_is_tailored
                      ? resolveUrl(selected.tailored_resume_filename)
                      : resolveUrl(selected.candidate_resume_filename)
                    return pdfUrl ? (
                      <embed src={pdfUrl} type="application/pdf" className="ca-resume-embed" />
                    ) : selected.candidate_resume_text ? (
                      <>
                        <button className="ca-toggle-btn" onClick={() => setShowResume((v) => !v)}>
                          {showResume ? 'Collapse Resume' : 'View Resume Text'}
                        </button>
                        {showResume && <div className="ca-text-box">{selected.candidate_resume_text}</div>}
                      </>
                    ) : (
                      <p className="ca-no-content">No resume provided.</p>
                    )
                  })()}
                </div>

                {/* Cover Letter */}
                {(selected.cover_letter_filename || selected.cover_letter_text) && (
                  <div className="ca-section">
                    <div className="ca-section-title">Cover Letter</div>
                    {selected.cover_letter_filename ? (
                      <embed src={resolveUrl(selected.cover_letter_filename)} type="application/pdf" className="ca-resume-embed" />
                    ) : (
                      <>
                        <button className="ca-toggle-btn" onClick={() => setShowCover((v) => !v)}>
                          {showCover ? 'Collapse' : 'View Cover Letter Text'}
                        </button>
                        {showCover && <div className="ca-text-box">{selected.cover_letter_text}</div>}
                      </>
                    )}
                  </div>
                )}

                {/* Score Breakdown */}
                <div className="ca-section">
                  <div className="ca-section-header">
                    <div className="ca-section-title">Match Score Breakdown</div>
                    <span className={`score-badge score-badge-lg ${scoreColor(selected.match_score)}`}>
                      {Math.round(selected.match_score)}%
                    </span>
                  </div>
                  <div className="ca-score-bars">
                    <ScoreBar
                      label="Interview Performance"
                      pct={40}
                      value={selected.interview_performance_score}
                      color="var(--cyan)"
                    />
                    <ScoreBar
                      label="Answer Relevance"
                      pct={35}
                      value={selected.answer_relevance_score}
                      color="#a78bfa"
                    />
                    <ScoreBar
                      label="Profile Skills"
                      pct={10}
                      value={selected.profile_skills_score}
                      color="#fbbf24"
                    />
                    <ScoreBar
                      label="Resume ATS"
                      pct={15}
                      value={selected.ats_score}
                      color="#34d399"
                    />
                  </div>
                </div>

                {/* Status */}
                <div className="ca-section ca-status-section">
                  <div className="ca-section-title">Application Status</div>
                  <div className="ca-status-row">
                    <span className={`status-chip status-${selected.status}`}>
                      {statusLabel(selected.status)}
                    </span>
                    {selected.status !== 'withdrawn' && (
                      <div className="ca-status-actions">
                        {selected.status !== 'viewed' && selected.status !== 'contacted' && (
                          <button
                            className="btn-ghost-sm"
                            onClick={() => handleStatusChange('viewed')}
                            disabled={statusUpdating}
                          >
                            Mark as Viewed
                          </button>
                        )}
                        {selected.status !== 'contacted' && (
                          <button
                            className="btn-primary-sm"
                            onClick={() => handleStatusChange('contacted')}
                            disabled={statusUpdating}
                          >
                            Mark as Contacted
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
