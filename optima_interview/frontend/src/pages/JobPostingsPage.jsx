import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  listJobs, getFavourites, addFavourite, removeFavourite,
  canStartConnecting, getIndustries, getRolesForIndustry,
} from '../api/client'
import Navbar from '../components/Navbar'
import './JobPostingsPage.css'

const LOCATION_TYPES = [
  { value: 'any', label: 'Any' },
  { value: 'onsite', label: 'Onsite' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'remote', label: 'Remote' },
]
const HOURS_TYPES = [
  { value: 'any', label: 'Any' },
  { value: 'full_time', label: 'Full Time' },
  { value: 'part_time', label: 'Part Time' },
  { value: 'contract', label: 'Contract' },
]
const LEVELS = [
  { value: '', label: 'Any Level' },
  { value: 'internship', label: 'Internship' },
  { value: 'entry', label: 'Entry Level' },
  { value: 'senior', label: 'Senior' },
]

function formatSalary(min, max) {
  if (!min && !max) return null
  const fmt = (n) => n >= 1000 ? `$${(n / 1000).toFixed(0)}k` : `$${n}`
  if (min && max) return `${fmt(min)} – ${fmt(max)}`
  if (min) return `${fmt(min)}+`
  return `Up to ${fmt(max)}`
}

function formatHours(h) {
  if (!h) return null
  return { full_time: 'Full Time', part_time: 'Part Time', contract: 'Contract' }[h] || h
}

function JobCard({ job, isFavourited, onToggleFavourite, onMockInterview, onSelect }) {
  const salary = formatSalary(job.salary_min, job.salary_max)
  const hours = formatHours(job.hours_type)

  return (
    <div className="job-card" onClick={() => onSelect(job)} style={{ cursor: 'pointer' }}>
      <div className="job-card-top">
        <div className="job-card-company">{job.company_name || 'Company'}</div>
        <button
          className={`heart-btn ${isFavourited ? 'active' : ''}`}
          onClick={(e) => { e.stopPropagation(); onToggleFavourite(job) }}
          title={isFavourited ? 'Remove from favourites' : 'Add to favourites'}
        >
          {isFavourited ? '♥' : '♡'}
        </button>
      </div>

      <h3 className="job-card-title">{job.title}</h3>

      <div className="job-card-badges">
        {job.location_type && (
          <span className={`badge badge-location badge-${job.location_type}`}>
            {job.location_type.charAt(0).toUpperCase() + job.location_type.slice(1)}
          </span>
        )}
        {hours && <span className="badge badge-hours">{hours}</span>}
        {job.job_level && (
          <span className="badge badge-level">
            {{ internship: 'Internship', entry: 'Entry Level', senior: 'Senior' }[job.job_level] || job.job_level}
          </span>
        )}
        {salary && <span className="badge badge-salary">{salary}</span>}
      </div>

      {job.required_skills?.length > 0 && (
        <div className="job-card-skills">
          {job.required_skills.slice(0, 5).map((s, i) => (
            <span className="skill-chip" key={i}>{s}</span>
          ))}
          {job.required_skills.length > 5 && (
            <span className="skill-chip skill-more">+{job.required_skills.length - 5}</span>
          )}
        </div>
      )}

      {job.description && (
        <p className="job-card-desc">
          {job.description.length > 120 ? job.description.slice(0, 120) + '…' : job.description}
        </p>
      )}

      <div className="job-card-actions">
        <button
          className="btn-ghost-sm"
          onClick={(e) => { e.stopPropagation(); onMockInterview(job) }}
        >
          Practice Interview
        </button>
      </div>
    </div>
  )
}

function JobDetailModal({ job, isFavourited, onToggleFavourite, onMockInterview, onClose }) {
  const salary = formatSalary(job.salary_min, job.salary_max)
  const hours = formatHours(job.hours_type)
  const levelLabel = { internship: 'Internship', entry: 'Entry Level', senior: 'Senior' }[job.job_level] || job.job_level

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="job-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="jdm-header">
          <div>
            <div className="jdm-company">{job.company_name || 'Company'}</div>
            <h2 className="jdm-title">{job.title}</h2>
          </div>
          <div className="jdm-header-right">
            <button
              className={`heart-btn ${isFavourited ? 'active' : ''}`}
              onClick={() => onToggleFavourite(job)}
              title={isFavourited ? 'Remove from favourites' : 'Add to favourites'}
            >
              {isFavourited ? '♥' : '♡'}
            </button>
            <button className="modal-close" onClick={onClose}>×</button>
          </div>
        </div>

        <div className="jdm-badges">
          {job.location_type && (
            <span className={`badge badge-location badge-${job.location_type}`}>
              {job.location_type.charAt(0).toUpperCase() + job.location_type.slice(1)}
            </span>
          )}
          {hours && <span className="badge badge-hours">{hours}</span>}
          {levelLabel && <span className="badge badge-level">{levelLabel}</span>}
          {salary && <span className="badge badge-salary">{salary}</span>}
        </div>

        <div className="jdm-body">
          <div className="jdm-details-row">
            {job.start_date && (
              <div className="jdm-detail-item">
                <span className="jdm-detail-label">Start Date</span>
                <span className="jdm-detail-value">{job.start_date}</span>
              </div>
            )}
            {job.work_term && (
              <div className="jdm-detail-item">
                <span className="jdm-detail-label">Duration</span>
                <span className="jdm-detail-value">{job.work_term} months</span>
              </div>
            )}
            {job.location && (
              <div className="jdm-detail-item">
                <span className="jdm-detail-label">Location</span>
                <span className="jdm-detail-value">{job.location}</span>
              </div>
            )}
            {salary && (
              <div className="jdm-detail-item">
                <span className="jdm-detail-label">Compensation</span>
                <span className="jdm-detail-value">{salary}</span>
              </div>
            )}
          </div>

          {job.description && (
            <div className="jdm-section">
              <h4 className="jdm-section-title">About the Role</h4>
              <p className="jdm-description">{job.description}</p>
            </div>
          )}

          {job.responsibilities && (
            <div className="jdm-section">
              <h4 className="jdm-section-title">Responsibilities</h4>
              <p className="jdm-description">{job.responsibilities}</p>
            </div>
          )}

          {job.required_skills?.length > 0 && (
            <div className="jdm-section">
              <h4 className="jdm-section-title">Required Skills</h4>
              <div className="jdm-skills">
                {job.required_skills.map((s, i) => (
                  <span className="skill-chip" key={i}>{s}</span>
                ))}
              </div>
            </div>
          )}

          {(job.education_required || job.experience_required || job.certifications_required) && (
            <div className="jdm-section">
              <h4 className="jdm-section-title">Requirements</h4>
              <div className="jdm-req-list">
                {job.education_required && (
                  <div className="jdm-req-item">
                    <span className="jdm-req-label">Education</span>
                    <span className="jdm-req-value">{job.education_required}</span>
                  </div>
                )}
                {job.experience_required && (
                  <div className="jdm-req-item">
                    <span className="jdm-req-label">Experience</span>
                    <span className="jdm-req-value">{job.experience_required}</span>
                  </div>
                )}
                {job.certifications_required && (
                  <div className="jdm-req-item">
                    <span className="jdm-req-label">Certifications</span>
                    <span className="jdm-req-value">{job.certifications_required}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="jdm-actions">
          <button className="btn-ghost-sm" onClick={() => { onMockInterview(job); onClose() }}>
            Practice Interview
          </button>
          <button
            className={`btn-primary ${isFavourited ? 'btn-unfav' : ''}`}
            onClick={() => onToggleFavourite(job)}
          >
            {isFavourited ? 'Unfavourite' : '♡  Save to Favourites'}
            <span className="btn-shimmer" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default function JobPostingsPage() {
  const navigate = useNavigate()

  const [view, setView] = useState('browse') // 'browse' | 'favourites'
  const [jobs, setJobs] = useState([])
  const [favourites, setFavourites] = useState([])
  const [favouriteIds, setFavouriteIds] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')

  const [filters, setFilters] = useState({
    location_type: 'any',
    hours_type: 'any',
    job_level: '',
    salary_min: '',
    salary_max: '',
    start_date: '',
    work_term: '',
  })

  // Job detail modal
  const [selectedJob, setSelectedJob] = useState(null)

  // Mock interview modal state
  const [showMockModal, setShowMockModal] = useState(false)
  const [mockIndustry, setMockIndustry] = useState('')
  const [mockRole, setMockRole] = useState('')
  const [industries, setIndustries] = useState([])
  const [roles, setRoles] = useState([])
  const [prefilledJob, setPrefilledJob] = useState(null)

  // Connecting interview availability
  const [connectAvail, setConnectAvail] = useState(null)

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  useEffect(() => {
    getIndustries().then(setIndustries).catch(() => {})
    Promise.all([
      listJobs(filters),
      getFavourites(),
      canStartConnecting(),
    ]).then(([jobData, favData, avail]) => {
      setJobs(jobData)
      setFavourites(favData)
      setFavouriteIds(new Set(favData.map((f) => f.job_id)))
      setConnectAvail(avail)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  // Reload jobs when filters change
  useEffect(() => {
    setLoading(true)
    listJobs(filters).then(setJobs).catch(() => {}).finally(() => setLoading(false))
  }, [filters])

  // Load roles when mock industry changes
  useEffect(() => {
    if (!mockIndustry) { setRoles([]); setMockRole(''); return }
    getRolesForIndustry(mockIndustry).then(setRoles).catch(() => setRoles([]))
    setMockRole('')
  }, [mockIndustry])

  const handleToggleFavourite = async (job) => {
    if (favouriteIds.has(job.id)) {
      try {
        await removeFavourite(job.id)
        setFavouriteIds((prev) => { const s = new Set(prev); s.delete(job.id); return s })
        setFavourites((prev) => prev.filter((f) => f.job_id !== job.id))
      } catch (err) {
        showToast(err.message)
      }
    } else {
      if (favouriteIds.size >= 10) {
        showToast('Maximum 10 favourites reached. Remove one before adding another.')
        return
      }
      try {
        const fav = await addFavourite(job.id)
        setFavouriteIds((prev) => new Set([...prev, job.id]))
        setFavourites((prev) => [...prev, fav])
      } catch (err) {
        showToast(err.message)
      }
    }
  }

  const handleMockInterview = (job) => {
    setPrefilledJob(job)
    setMockIndustry(job.industry || '')
    setMockRole(job.title || '')
    setShowMockModal(true)
  }

  const startMock = () => {
    if (!mockIndustry || !mockRole) return
    setShowMockModal(false)
    navigate('/interview', { state: { jobTitle: mockRole, industry: mockIndustry, sessionType: 'mock' } })
  }

  const startConnecting = () => {
    if (!connectAvail?.can_connect) return
    const ids = Array.from(favouriteIds)
    navigate('/interview', { state: { sessionType: 'connecting', favouriteJobIds: ids } })
  }

  const setFilter = (key) => (val) => setFilters((f) => ({ ...f, [key]: val }))

  const nextAvailableDate = connectAvail?.next_available
    ? new Date(connectAvail.next_available).toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' })
    : null

  return (
    <div className="site">
      <div className="noise-overlay" />
      <div className="aurora"><div className="aurora-blob a1" /><div className="aurora-blob a2" /></div>
      <Navbar />

      {toast && <div className="jp-toast">{toast}</div>}

      <div className="jp-page">
        <div className="jp-header">
          <h1>Job Postings</h1>
          <p>Browse open positions and save up to 10 to your favourites.</p>
        </div>

        {/* View Toggle */}
        <div className="jp-view-toggle">
          <button className={`jp-view-btn ${view === 'browse' ? 'active' : ''}`} onClick={() => setView('browse')}>
            Browse Jobs
          </button>
          <button className={`jp-view-btn ${view === 'favourites' ? 'active' : ''}`} onClick={() => setView('favourites')}>
            My Favourites
            <span className="fav-count-badge">{favouriteIds.size}/10</span>
          </button>
        </div>

        {/* ── BROWSE VIEW ── */}
        {view === 'browse' && (
          <>
            <div className="jp-filters">
              <div className="filter-group">
                <span className="filter-label">Location</span>
                <div className="filter-toggles">
                  {LOCATION_TYPES.map((lt) => (
                    <button
                      key={lt.value}
                      className={`filter-btn ${filters.location_type === lt.value ? 'active' : ''}`}
                      onClick={() => setFilter('location_type')(lt.value)}
                    >
                      {lt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="filter-group">
                <span className="filter-label">Hours</span>
                <div className="filter-toggles">
                  {HOURS_TYPES.map((ht) => (
                    <button
                      key={ht.value}
                      className={`filter-btn ${filters.hours_type === ht.value ? 'active' : ''}`}
                      onClick={() => setFilter('hours_type')(ht.value)}
                    >
                      {ht.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="filter-group">
                <span className="filter-label">Level</span>
                <div className="filter-toggles">
                  {LEVELS.map((l) => (
                    <button
                      key={l.value}
                      className={`filter-btn ${filters.job_level === l.value ? 'active' : ''}`}
                      onClick={() => setFilter('job_level')(l.value)}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="filter-group filter-salary">
                <span className="filter-label">Salary ($)</span>
                <div className="salary-inputs">
                  <input
                    type="number"
                    className="salary-input"
                    placeholder="Min"
                    value={filters.salary_min}
                    onChange={(e) => setFilter('salary_min')(e.target.value)}
                  />
                  <span className="salary-dash">–</span>
                  <input
                    type="number"
                    className="salary-input"
                    placeholder="Max"
                    value={filters.salary_max}
                    onChange={(e) => setFilter('salary_max')(e.target.value)}
                  />
                </div>
              </div>

              <div className="filter-group filter-text-pair">
                <div className="filter-text-item">
                  <span className="filter-label">Start Date</span>
                  <input
                    type="text"
                    className="filter-text-input"
                    placeholder="e.g. May 2026"
                    value={filters.start_date}
                    onChange={(e) => setFilter('start_date')(e.target.value)}
                  />
                </div>
                <div className="filter-text-item">
                  <span className="filter-label">Length (Months)</span>
                  <input
                    type="number"
                    min="1"
                    className="filter-text-input"
                    placeholder="e.g. 4"
                    value={filters.work_term}
                    onChange={(e) => setFilter('work_term')(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {loading ? (
              <div className="jp-loading">Loading jobs…</div>
            ) : jobs.length === 0 ? (
              <div className="jp-empty">No jobs found matching your filters.</div>
            ) : (
              <div className="jobs-grid">
                {jobs.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    isFavourited={favouriteIds.has(job.id)}
                    onToggleFavourite={handleToggleFavourite}
                    onMockInterview={handleMockInterview}
                    onSelect={setSelectedJob}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* ── FAVOURITES VIEW ── */}
        {view === 'favourites' && (
          <div className="fav-view">
            {favourites.length === 0 ? (
              <div className="jp-empty">
                You haven't favourited any jobs yet. Browse jobs and click the ♡ to add them here.
              </div>
            ) : (
              <div className="fav-list">
                {favourites.map((fav) => (
                  <div className="fav-card" key={fav.id}>
                    <div className="fav-card-info">
                      <div className="fav-card-company">{fav.company_name || 'Company'}</div>
                      <div className="fav-card-title">{fav.job_title}</div>
                      <div className="fav-card-meta">
                        {fav.location_type && <span className={`badge badge-location badge-${fav.location_type}`}>{fav.location_type}</span>}
                        {fav.hours_type && <span className="badge badge-hours">{formatHours(fav.hours_type)}</span>}
                        {fav.salary_min || fav.salary_max ? <span className="badge badge-salary">{formatSalary(fav.salary_min, fav.salary_max)}</span> : null}
                      </div>
                    </div>
                    <button
                      className="fav-remove-btn"
                      onClick={() => handleToggleFavourite({ id: fav.job_id, title: fav.job_title, industry: fav.industry })}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Interview action buttons — always shown at bottom */}
            <div className="fav-interview-bar">
              <div className="fav-interview-bar-left">
                {!connectAvail?.can_connect && nextAvailableDate && (
                  <span className="connect-cooldown">Connecting available again: {nextAvailableDate}</span>
                )}
                {favouriteIds.size === 0 && connectAvail?.can_connect && (
                  <span className="connect-hint">Add jobs to your favourites to enable connecting interviews</span>
                )}
              </div>
              <div className="fav-interview-btns">
                <button
                  className={`btn-interview btn-connect ${!connectAvail?.can_connect || favouriteIds.size === 0 ? 'disabled' : ''}`}
                  onClick={startConnecting}
                  disabled={!connectAvail?.can_connect || favouriteIds.size === 0}
                >
                  Start Connecting Interview
                  <span className="btn-shimmer" />
                </button>
                <button
                  className="btn-interview btn-mock"
                  onClick={() => { setPrefilledJob(null); setMockIndustry(''); setMockRole(''); setShowMockModal(true) }}
                >
                  Start Mock Interview
                  <span className="btn-shimmer" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Job Detail Modal ── */}
      {selectedJob && (
        <JobDetailModal
          job={selectedJob}
          isFavourited={favouriteIds.has(selectedJob.id)}
          onToggleFavourite={(job) => { handleToggleFavourite(job) }}
          onMockInterview={handleMockInterview}
          onClose={() => setSelectedJob(null)}
        />
      )}

      {/* ── Mock Interview Modal ── */}
      {showMockModal && (
        <div className="modal-overlay" onClick={() => setShowMockModal(false)}>
          <div className="mock-modal" onClick={(e) => e.stopPropagation()}>
            <div className="mock-modal-header">
              <h2>Start Mock Interview</h2>
              <button className="modal-close" onClick={() => setShowMockModal(false)}>×</button>
            </div>
            <p className="mock-modal-desc">Select an industry and job title to get tailored practice questions.</p>

            <div className="mock-modal-form">
              <label className="form-label">
                <span>Industry</span>
                <select
                  className="form-input form-select"
                  value={mockIndustry}
                  onChange={(e) => setMockIndustry(e.target.value)}
                >
                  <option value="">Select an industry…</option>
                  {industries.map((ind) => (
                    <option key={ind} value={ind}>{ind}</option>
                  ))}
                </select>
              </label>

              <label className="form-label">
                <span>Job Title</span>
                <select
                  className="form-input form-select"
                  value={mockRole}
                  onChange={(e) => setMockRole(e.target.value)}
                  disabled={!mockIndustry}
                >
                  <option value="">
                    {mockIndustry ? 'Select a job title…' : 'Select an industry first'}
                  </option>
                  {roles.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mock-modal-actions">
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
