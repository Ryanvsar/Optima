import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getMyApplications,
  getMySessions,
  withdrawApplication,
  uploadTailoredResume,
  uploadCoverLetter,
  canStartConnecting,
  getIndustries,
  getRolesForIndustry,
  getFavourites,
} from '../api/client'
import Navbar from '../components/Navbar'
import './InterviewHub.css'

function scoreColor(score) {
  if (score >= 80) return 'score-green'
  if (score >= 65) return 'score-yellow'
  return 'score-red'
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-CA', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  })
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// ── PDF Upload Panel ───────────────────────────────────────────────────────────
function PdfUploadPanel({ label, existingFilename, applicationId, uploadFn, onSaved }) {
  const [open, setOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [error, setError] = useState('')
  const fileRef = useRef(null)

  const existingUrl = existingFilename ? `${API_BASE}${existingFilename}` : null
  const displayUrl = previewUrl || existingUrl

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.type !== 'application/pdf') { setError('Please upload a PDF file.'); return }
    setError('')
    const localUrl = URL.createObjectURL(file)
    setPreviewUrl(localUrl)
    setUploading(true)
    try {
      const updated = await uploadFn(applicationId, file)
      onSaved(updated)
    } catch (err) {
      setError(err.message)
      setPreviewUrl(null)
      URL.revokeObjectURL(localUrl)
    } finally {
      setUploading(false)
    }
  }

  const hasFile = !!displayUrl

  return (
    <div className="inline-editor">
      <div className="inline-editor-toggle-row">
        <button className="inline-editor-toggle" onClick={() => setOpen((o) => !o)}>
          {hasFile ? `${open ? 'Hide' : 'View'} ${label}` : `Add ${label}`}
        </button>
        <button
          className="inline-upload-btn"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? 'Uploading…' : hasFile ? 'Replace PDF' : 'Upload PDF'}
        </button>
        <input ref={fileRef} type="file" accept=".pdf" style={{ display: 'none' }} onChange={handleFile} />
      </div>
      {error && <p className="inline-error">{error}</p>}
      {open && displayUrl && (
        <div className="inline-editor-body">
          <embed src={displayUrl} type="application/pdf" className="inline-pdf-embed" />
        </div>
      )}
    </div>
  )
}

// ── Application Card ──────────────────────────────────────────────────────────
function ApplicationCard({ app, onWithdraw }) {
  const [confirmWithdraw, setConfirmWithdraw] = useState(false)
  const [withdrawing, setWithdrawing] = useState(false)
  const [localApp, setLocalApp] = useState(app)

  const handleWithdraw = async () => {
    setWithdrawing(true)
    try {
      await withdrawApplication(app.id)
      onWithdraw(app.id)
    } catch {
      setWithdrawing(false)
      setConfirmWithdraw(false)
    }
  }

  const handleSaved = (updated) => {
    setLocalApp((prev) => ({
      ...prev,
      tailored_resume_filename: updated.tailored_resume_filename ?? prev.tailored_resume_filename,
      cover_letter_filename: updated.cover_letter_filename ?? prev.cover_letter_filename,
    }))
  }

  return (
    <div className="app-card">
      <div className="app-card-header">
        <div className="app-card-company">{localApp.company_name || 'Company'}</div>
        <div className="app-card-right">
          <span className={`score-badge ${scoreColor(localApp.match_score)}`}>
            {Math.round(localApp.match_score)}%
          </span>
          <span className={`status-chip status-${localApp.status}`}>
            {localApp.status.charAt(0).toUpperCase() + localApp.status.slice(1)}
          </span>
        </div>
      </div>

      <div className="app-card-title">{localApp.job_title}</div>

      <div className="app-card-resume-row">
        {localApp.tailored_resume_filename
          ? <span className="resume-status-chip chip-tailored">Tailored Resume</span>
          : <span className="resume-status-chip chip-default">Default Resume</span>
        }
        {localApp.cover_letter_filename && (
          <span className="resume-status-chip chip-tailored">Cover Letter</span>
        )}
      </div>

      <div className="app-card-editors">
        <PdfUploadPanel
          label="Tailored Resume"
          existingFilename={localApp.tailored_resume_filename}
          applicationId={localApp.id}
          uploadFn={uploadTailoredResume}
          onSaved={handleSaved}
        />
        <PdfUploadPanel
          label="Cover Letter"
          existingFilename={localApp.cover_letter_filename}
          applicationId={localApp.id}
          uploadFn={uploadCoverLetter}
          onSaved={handleSaved}
        />
      </div>

      <div className="app-card-footer">
        {!confirmWithdraw ? (
          <button className="withdraw-btn" onClick={() => setConfirmWithdraw(true)}>
            Withdraw
          </button>
        ) : (
          <div className="withdraw-confirm">
            <span className="withdraw-confirm-text">Are you sure?</span>
            <button className="withdraw-btn" onClick={handleWithdraw} disabled={withdrawing}>
              {withdrawing ? 'Withdrawing…' : 'Yes, withdraw'}
            </button>
            <button className="btn-ghost-sm" onClick={() => setConfirmWithdraw(false)}>Cancel</button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Session Row (past connecting / mock) ──────────────────────────────────────
function ConnectingSessionRow({ session, applications }) {
  const [open, setOpen] = useState(false)

  const scopeLabel = (() => {
    const titles = applications?.map((a) => a.job_title).filter(Boolean) || []
    if (titles.length === 0) return 'Connecting Interview'
    const first = titles[0]
    return titles.length > 1 ? `${first} + ${titles.length - 1} more` : first
  })()

  const avgScore = applications?.length
    ? Math.round(applications.reduce((s, a) => s + (a.match_score || 0), 0) / applications.length)
    : null

  return (
    <div className="session-row">
      <div className="session-row-main" onClick={() => setOpen((o) => !o)}>
        <div className="session-row-info">
          <span className="session-date">{formatDate(session.created_at)}</span>
          <span className="session-scope">{scopeLabel}</span>
        </div>
        <div className="session-row-right">
          {avgScore !== null && (
            <span className={`score-badge ${scoreColor(avgScore)}`}>{avgScore}%</span>
          )}
          <span className="session-expand-icon">{open ? '▲' : '▼'}</span>
        </div>
      </div>

      {open && (
        <div className="session-row-detail">
          {!applications || applications.length === 0 ? (
            <p className="session-no-apps">No connections from this session.</p>
          ) : (
            applications.map((a) => (
              <div className="session-app-row" key={a.id}>
                <div className="session-app-company">{a.company_name || 'Company'}</div>
                <div className="session-app-title">{a.job_title}</div>
                <span className={`score-badge ${scoreColor(a.match_score)}`}>
                  {Math.round(a.match_score)}%
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function InterviewHub() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('connecting')

  const [applications, setApplications] = useState([])
  const [sessions, setSessions] = useState([])
  const [sessionApps, setSessionApps] = useState({}) // sessionId → [ApplicationOut]
  const [loading, setLoading] = useState(true)
  const [favouriteIds, setFavouriteIds] = useState([])
  const [connectAvail, setConnectAvail] = useState(null)

  // Mock modal
  const [showMockModal, setShowMockModal] = useState(false)
  const [mockIndustry, setMockIndustry] = useState('')
  const [mockRole, setMockRole] = useState('')
  const [industries, setIndustries] = useState([])
  const [roles, setRoles] = useState([])

  // Connecting warning
  const [showConnectWarning, setShowConnectWarning] = useState(false)

  useEffect(() => {
    Promise.all([
      getMyApplications(),
      getMySessions(),
      canStartConnecting(),
      getIndustries(),
      getFavourites(),
    ])
      .then(([apps, sess, avail, indData, favs]) => {
        setApplications(apps)
        setSessions(sess)
        setConnectAvail(avail)
        setIndustries(indData)
        setFavouriteIds(favs.map((f) => f.job_id))

        // Group applications by session_id
        const bySession = {}
        apps.forEach((a) => {
          if (a.session_id) {
            if (!bySession[a.session_id]) bySession[a.session_id] = []
            bySession[a.session_id].push(a)
          }
        })
        setSessionApps(bySession)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!mockIndustry) { setRoles([]); setMockRole(''); return }
    getRolesForIndustry(mockIndustry).then(setRoles).catch(() => setRoles([]))
    setMockRole('')
  }, [mockIndustry])

  const startMock = () => {
    if (!mockIndustry || !mockRole) return
    setShowMockModal(false)
    navigate('/interview', { state: { jobTitle: mockRole, industry: mockIndustry, sessionType: 'mock' } })
  }

  const handleConnectClick = () => {
    if (!connectAvail?.can_connect || favouriteIds.length === 0) return
    setShowConnectWarning(true)
  }

  const confirmConnecting = () => {
    setShowConnectWarning(false)
    navigate('/interview', { state: { sessionType: 'connecting', favouriteJobIds: favouriteIds } })
  }

  const canConnect = connectAvail?.can_connect && favouriteIds.length > 0
  const nextAvailableDate = connectAvail?.next_available
    ? new Date(connectAvail.next_available).toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' })
    : null

  const activeApplications = applications.filter((a) => a.status !== 'withdrawn')
  const connectingSessions = sessions.filter((s) => s.session_type === 'connecting')
  const mockSessions = sessions.filter((s) => s.session_type === 'mock').slice(0, 10)

  const handleWithdraw = (appId) => {
    setApplications((prev) => prev.map((a) => a.id === appId ? { ...a, status: 'withdrawn' } : a))
  }

  return (
    <div className="site">
      <div className="noise-overlay" />
      <div className="aurora">
        <div className="aurora-blob a1" />
        <div className="aurora-blob a2" />
      </div>
      <Navbar />

      <div className="hub-page">
        <div className="hub-header">
          <h1>Interview Hub</h1>
          <p>Track your connecting interviews, applications, and mock interview history.</p>
        </div>

        <div className="hub-tabs">
          <button
            className={`hub-tab ${tab === 'connecting' ? 'active' : ''}`}
            onClick={() => setTab('connecting')}
          >
            Connecting
            {activeApplications.length > 0 && (
              <span className="hub-tab-badge">{activeApplications.length}</span>
            )}
          </button>
          <button
            className={`hub-tab ${tab === 'mock' ? 'active' : ''}`}
            onClick={() => setTab('mock')}
          >
            Mock Interviews
          </button>
        </div>

        {loading ? (
          <div className="hub-loading">Loading…</div>
        ) : (
          <>
            {/* ── CONNECTING TAB ── */}
            {tab === 'connecting' && (
              <div className="hub-content">
                {/* Start button at top */}
                <div className="hub-tab-action">
                  <button
                    className={`btn-interview-hub btn-connect-hub ${!canConnect ? 'disabled' : ''}`}
                    onClick={handleConnectClick}
                    disabled={!canConnect}
                  >
                    Start Connecting Interview
                    <span className="btn-shimmer" />
                  </button>
                  {!connectAvail?.can_connect && nextAvailableDate && (
                    <span className="hub-cooldown">Available again: {nextAvailableDate}</span>
                  )}
                  {connectAvail?.can_connect && favouriteIds.length === 0 && (
                    <span className="hub-cooldown">
                      <button className="link-btn" onClick={() => navigate('/job-postings')}>Add favourites</button>
                      {' '}on the Job Postings page first
                    </span>
                  )}
                </div>

                {/* Active Applications */}
                <section className="hub-section">
                  <div className="hub-section-header">
                    <h2>Active Connections</h2>
                    <span className="hub-section-count">{activeApplications.length}</span>
                  </div>

                  {activeApplications.length === 0 ? (
                    <div className="hub-empty">
                      <p>No active connections yet.</p>
                      <p className="hub-empty-hint">Complete a connecting interview to get matched with companies.</p>
                    </div>
                  ) : (
                    <div className="apps-grid">
                      {activeApplications.map((app) => (
                        <ApplicationCard key={app.id} app={app} onWithdraw={handleWithdraw} />
                      ))}
                    </div>
                  )}
                </section>

                {/* Past Connecting Sessions */}
                <section className="hub-section">
                  <div className="hub-section-header">
                    <h2>Past Connecting Interviews</h2>
                    <span className="hub-section-count">{connectingSessions.length}</span>
                  </div>

                  {connectingSessions.length === 0 ? (
                    <div className="hub-empty"><p>No connecting interviews yet.</p></div>
                  ) : (
                    <div className="sessions-list">
                      {connectingSessions.map((s) => (
                        <ConnectingSessionRow key={s.id} session={s} applications={sessionApps[s.id] || []} />
                      ))}
                    </div>
                  )}
                </section>
              </div>
            )}

            {/* ── MOCK TAB ── */}
            {tab === 'mock' && (
              <div className="hub-content">
                {/* Start button at top */}
                <div className="hub-tab-action">
                  <button
                    className="btn-interview-hub btn-mock-hub"
                    onClick={() => { setMockIndustry(''); setMockRole(''); setShowMockModal(true) }}
                  >
                    Start Mock Interview
                    <span className="btn-shimmer" />
                  </button>
                </div>

                <section className="hub-section">
                  <div className="hub-section-header">
                    <h2>Recent Mock Interviews</h2>
                    <span className="hub-section-count">{mockSessions.length}</span>
                  </div>

                  {mockSessions.length === 0 ? (
                    <div className="hub-empty"><p>No mock interviews yet.</p></div>
                  ) : (
                    <div className="sessions-list">
                      {mockSessions.map((s) => (
                        <div
                          key={s.id}
                          className="session-row session-row-clickable"
                          onClick={() => navigate(`/results/${s.id}`)}
                        >
                          <div className="session-row-main">
                            <div className="session-row-info">
                              <span className="session-date">{formatDate(s.created_at)}</span>
                              <span className="session-scope">
                                {s.job_title || 'Mock Interview'}
                                {s.industry ? ` — ${s.industry}` : ''}
                              </span>
                            </div>
                            <div className="session-row-right">
                              {s.score != null && (
                                <span className={`score-badge ${scoreColor(s.score)}`}>
                                  {Math.round(s.score)}%
                                </span>
                              )}
                              <span className="session-expand-icon">→</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            )}
          </>
        )}

        {/* ── Bottom action bar ── */}
        <div className="hub-bottom-bar">
          <button
            className="btn-interview-hub btn-mock-hub"
            onClick={() => { setMockIndustry(''); setMockRole(''); setShowMockModal(true) }}
          >
            Start Mock Interview
            <span className="btn-shimmer" />
          </button>
          <button
            className={`btn-interview-hub btn-connect-hub ${!canConnect ? 'disabled' : ''}`}
            onClick={handleConnectClick}
            disabled={!canConnect}
          >
            Start Connecting Interview
            <span className="btn-shimmer" />
          </button>
        </div>
      </div>

      {/* ── Connecting Warning Modal ── */}
      {showConnectWarning && (
        <div className="modal-overlay" onClick={() => setShowConnectWarning(false)}>
          <div className="hub-modal" onClick={(e) => e.stopPropagation()}>
            <div className="hub-modal-icon">⚠</div>
            <h2>One connecting interview per week</h2>
            <p>You can only complete one connecting interview per week. Your answers are submitted directly to companies and cannot be reviewed afterward.</p>
            <p>Are you sure you want to proceed?</p>
            <div className="hub-modal-actions">
              <button className="btn-ghost-sm" onClick={() => setShowConnectWarning(false)}>Cancel</button>
              <button className="btn-interview-hub btn-connect-hub" style={{ padding: '10px 20px', fontSize: '14px' }} onClick={confirmConnecting}>
                Yes, proceed
                <span className="btn-shimmer" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Mock Interview Modal ── */}
      {showMockModal && (
        <div className="modal-overlay" onClick={() => setShowMockModal(false)}>
          <div className="hub-modal" onClick={(e) => e.stopPropagation()}>
            <div className="hub-modal-header">
              <h2>Start Mock Interview</h2>
              <button className="modal-close" onClick={() => setShowMockModal(false)}>×</button>
            </div>
            <p className="hub-modal-desc">Select an industry and job title to get tailored practice questions.</p>

            <div className="hub-modal-form">
              <label className="form-label">
                <span>Industry</span>
                <select className="form-input form-select" value={mockIndustry} onChange={(e) => setMockIndustry(e.target.value)}>
                  <option value="">Select an industry…</option>
                  {industries.map((ind) => (
                    <option key={ind} value={ind}>{ind}</option>
                  ))}
                </select>
              </label>
              <label className="form-label">
                <span>Job Title</span>
                <select className="form-input form-select" value={mockRole} onChange={(e) => setMockRole(e.target.value)} disabled={!mockIndustry}>
                  <option value="">{mockIndustry ? 'Select a job title…' : 'Select an industry first'}</option>
                  {roles.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="hub-modal-actions">
              <button className="btn-ghost-sm" onClick={() => setShowMockModal(false)}>Cancel</button>
              <button
                className="btn-primary"
                onClick={startMock}
                disabled={!mockIndustry || !mockRole}
              >
                Start Interview
                <span className="btn-shimmer" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
