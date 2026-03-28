import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getMyJobs, getPastJobs, createJob, updateJob, getIndustries,
} from '../api/client'
import Navbar from '../components/Navbar'
import './CompanyJobs.css'

const LOCATION_TYPES = ['Onsite', 'Hybrid', 'Remote']
const HOURS_TYPES = [
  { value: 'full_time', label: 'Full Time' },
  { value: 'part_time', label: 'Part Time' },
  { value: 'contract', label: 'Contract' },
]
const JOB_LEVELS = [
  { value: 'internship', label: 'Internship' },
  { value: 'entry', label: 'Entry Level' },
  { value: 'senior', label: 'Senior' },
]

// ── Tag Input ─────────────────────────────────────────────────────────────────
function TagInput({ tags, onChange, placeholder }) {
  const [input, setInput] = useState('')

  const addTag = (val) => {
    const trimmed = val.trim()
    if (!trimmed || tags.includes(trimmed)) return
    onChange([...tags, trimmed])
    setInput('')
  }

  const removeTag = (tag) => onChange(tags.filter((t) => t !== tag))

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(input)
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      removeTag(tags[tags.length - 1])
    }
  }

  return (
    <div className="tag-list">
      {tags.map((tag) => (
        <span className="tag-chip" key={tag}>
          {tag}
          <button className="tag-remove" onClick={() => removeTag(tag)} type="button">×</button>
        </span>
      ))}
      <input
        className="tag-text-input"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => input && addTag(input)}
        placeholder={tags.length === 0 ? placeholder : ''}
      />
    </div>
  )
}

// ── Job Form Panel ────────────────────────────────────────────────────────────
function JobFormPanel({ industries, onClose, onCreated }) {
  const [form, setForm] = useState({
    title: '',
    industry: '',
    responsibilities: '',
    required_skills: [],
    education_required: '',
    experience_required: '',
    certifications_required: '',
    location_type: '',
    salary_min: '',
    salary_max: '',
    hours_type: '',
    job_level: '',
    specific_questions: [''],
    start_date: '',
    work_term: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const setField = (key) => (val) => setForm((f) => ({ ...f, [key]: val }))

  const setQuestion = (i, val) => {
    const qs = [...form.specific_questions]
    qs[i] = val
    setForm((f) => ({ ...f, specific_questions: qs }))
  }

  const addQuestion = () => {
    if (form.specific_questions.length >= 5) return
    setForm((f) => ({ ...f, specific_questions: [...f.specific_questions, ''] }))
  }

  const removeQuestion = (i) => {
    const qs = form.specific_questions.filter((_, idx) => idx !== i)
    setForm((f) => ({ ...f, specific_questions: qs.length === 0 ? [''] : qs }))
  }

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.industry || !form.location_type) {
      setError('Title, industry and location type are required.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const payload = {
        ...form,
        salary_min: form.salary_min ? parseInt(form.salary_min, 10) : null,
        salary_max: form.salary_max ? parseInt(form.salary_max, 10) : null,
        specific_questions: form.specific_questions.filter((q) => q.trim()),
        location_type: form.location_type.toLowerCase(),
      }
      const job = await createJob(payload)
      onCreated(job)
    } catch (err) {
      setError(err.message || 'Failed to create job.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="job-form-panel">
      <div className="job-form-header">
        <h2>Add Job Posting</h2>
        <button className="panel-close" onClick={onClose}>×</button>
      </div>

      <div className="job-form-body">
        {/* Title + Industry */}
        <div className="form-row-2">
          <label className="form-label">
            <span>Job Title <span className="req">*</span></span>
            <input
              className="form-input"
              value={form.title}
              onChange={(e) => setField('title')(e.target.value)}
              placeholder="e.g. Software Engineer"
            />
          </label>
          <label className="form-label">
            <span>Industry <span className="req">*</span></span>
            <select
              className="form-input form-select"
              value={form.industry}
              onChange={(e) => setField('industry')(e.target.value)}
            >
              <option value="">Select…</option>
              {industries.map((ind) => (
                <option key={ind} value={ind}>{ind}</option>
              ))}
            </select>
          </label>
        </div>

        {/* Responsibilities */}
        <label className="form-label">
          <span>Responsibilities</span>
          <textarea
            className="form-textarea"
            value={form.responsibilities}
            onChange={(e) => setField('responsibilities')(e.target.value)}
            placeholder="Describe the key responsibilities of this role…"
            rows={4}
          />
        </label>

        {/* Skills */}
        <label className="form-label">
          <span>Required Skills</span>
          <TagInput
            tags={form.required_skills}
            onChange={setField('required_skills')}
            placeholder="Type a skill and press Enter…"
          />
        </label>

        {/* Education + Experience */}
        <div className="form-row-2">
          <label className="form-label">
            <span>Education Required</span>
            <select
              className="form-input form-select"
              value={form.education_required}
              onChange={(e) => setField('education_required')(e.target.value)}
            >
              <option value="">No Requirement</option>
              <option value="High School Diploma">High School Diploma</option>
              <option value="Associate's Degree">Associate's Degree</option>
              <option value="Bachelor's Degree">Bachelor's Degree</option>
              <option value="Master's Degree">Master's Degree</option>
              <option value="PhD / Doctorate">PhD / Doctorate</option>
            </select>
          </label>
          <label className="form-label">
            <span>Experience Required</span>
            <input
              className="form-input"
              value={form.experience_required}
              onChange={(e) => setField('experience_required')(e.target.value)}
              placeholder="e.g. 2+ years"
            />
          </label>
        </div>

        {/* Certifications */}
        <label className="form-label">
          <span>Certifications Required</span>
          <input
            className="form-input"
            value={form.certifications_required}
            onChange={(e) => setField('certifications_required')(e.target.value)}
            placeholder="e.g. AWS Certified Developer (Preferred)"
          />
        </label>

        {/* Location Type */}
        <div className="form-label">
          <span>Location Type <span className="req">*</span></span>
          <div className="toggle-group">
            {LOCATION_TYPES.map((lt) => (
              <button
                key={lt}
                type="button"
                className={`toggle-btn ${form.location_type === lt.toLowerCase() ? 'active' : ''}`}
                onClick={() => setField('location_type')(lt.toLowerCase())}
              >
                {lt}
              </button>
            ))}
          </div>
        </div>

        {/* Salary */}
        <div className="form-label">
          <span>Salary Range ($)</span>
          <div className="salary-row">
            <input
              type="number"
              className="form-input salary-input"
              value={form.salary_min}
              onChange={(e) => setField('salary_min')(e.target.value)}
              placeholder="Min"
            />
            <span className="salary-dash">–</span>
            <input
              type="number"
              className="form-input salary-input"
              value={form.salary_max}
              onChange={(e) => setField('salary_max')(e.target.value)}
              placeholder="Max"
            />
          </div>
        </div>

        {/* Hours */}
        <div className="form-label">
          <span>Hours Type</span>
          <div className="toggle-group">
            {HOURS_TYPES.map((ht) => (
              <button
                key={ht.value}
                type="button"
                className={`toggle-btn ${form.hours_type === ht.value ? 'active' : ''}`}
                onClick={() => setField('hours_type')(ht.value)}
              >
                {ht.label}
              </button>
            ))}
          </div>
        </div>

        {/* Job Level */}
        <div className="form-label">
          <span>Job Level</span>
          <div className="toggle-group">
            {JOB_LEVELS.map((jl) => (
              <button
                key={jl.value}
                type="button"
                className={`toggle-btn ${form.job_level === jl.value ? 'active' : ''}`}
                onClick={() => setField('job_level')(form.job_level === jl.value ? '' : jl.value)}
              >
                {jl.label}
              </button>
            ))}
          </div>
        </div>

        {/* Start Date + Work Term */}
        <div className="form-row-pair">
          <label className="form-label">
            <span>Start Date <span className="hint-text">(optional)</span></span>
            <input
              type="date"
              className="form-input"
              value={form.start_date}
              onChange={(e) => setField('start_date')(e.target.value)}
            />
          </label>
          <label className="form-label">
            <span>Work Term (Months) <span className="hint-text">(optional)</span></span>
            <input
              type="number"
              min="1"
              max="60"
              className="form-input"
              value={form.work_term}
              onChange={(e) => setField('work_term')(e.target.value)}
              placeholder="e.g. 4"
            />
          </label>
        </div>

        {/* Specific Questions */}
        <div className="form-label">
          <span>Interview Questions <span className="hint-text">(optional, up to 5)</span></span>
          <div className="questions-list">
            {form.specific_questions.map((q, i) => (
              <div className="question-row" key={i}>
                <input
                  className="form-input"
                  value={q}
                  onChange={(e) => setQuestion(i, e.target.value)}
                  placeholder={`Question ${i + 1}…`}
                />
                <button
                  className="question-remove"
                  onClick={() => removeQuestion(i)}
                  type="button"
                  disabled={form.specific_questions.length === 1}
                >
                  ×
                </button>
              </div>
            ))}
            {form.specific_questions.length < 5 && (
              <button className="add-question-btn" onClick={addQuestion} type="button">
                + Add Question
              </button>
            )}
          </div>
        </div>

        {error && <div className="form-error">{error}</div>}

        <div className="job-form-actions">
          <button className="btn-ghost-sm" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Posting…' : 'Post Job'}
            <span className="btn-shimmer" />
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Job Card ─────────────────────────────────────────────────────────────────
function formatSalary(min, max) {
  if (!min && !max) return null
  const fmt = (n) => n >= 1000 ? `$${(n / 1000).toFixed(0)}k` : `$${n}`
  if (min && max) return `${fmt(min)} – ${fmt(max)}`
  if (min) return `${fmt(min)}+`
  return `Up to ${fmt(max)}`
}

function JobCard({ job, onDeactivate, onReactivate, isPast }) {
  const navigate = useNavigate()
  const salary = formatSalary(job.salary_min, job.salary_max)
  const levelLabels = { internship: 'Internship', entry: 'Entry Level', senior: 'Senior' }
  const [showDetail, setShowDetail] = useState(false)

  return (
    <div className={`cj-card ${isPast ? 'cj-card-past' : ''}`}>
      <div className="cj-card-top">
        <div>
          <div className="cj-card-title">{job.title}</div>
          <div className="cj-card-industry">{job.industry}</div>
        </div>
        <div className="cj-card-badges">
          {job.location_type && (
            <span className={`badge badge-location badge-${job.location_type}`}>
              {job.location_type.charAt(0).toUpperCase() + job.location_type.slice(1)}
            </span>
          )}
          {job.hours_type && (
            <span className="badge badge-hours">
              {{ full_time: 'Full Time', part_time: 'Part Time', contract: 'Contract' }[job.hours_type] || job.hours_type}
            </span>
          )}
          {job.job_level && (
            <span className="badge badge-level">{levelLabels[job.job_level] || job.job_level}</span>
          )}
          {salary && <span className="badge badge-salary">{salary}</span>}
        </div>
      </div>

      {!isPast && (
        <div className="cj-metrics">
          <div className="metric-chip">
            <span className="metric-num">{job.candidate_count_65 ?? 0}</span>
            <span className="metric-label">candidates ≥65%</span>
          </div>
          <div className="metric-chip metric-chip-strong">
            <span className="metric-num">{job.candidate_count_80 ?? 0}</span>
            <span className="metric-label">candidates ≥80%</span>
          </div>
        </div>
      )}

      <div className="cj-card-actions">
        <button className="btn-ghost-sm" onClick={() => setShowDetail(true)}>
          View Posting
        </button>
        {!isPast && (
          <>
            <button
              className="btn-primary-sm"
              onClick={() => navigate(`/company/jobs/${job.id}/applicants`)}
            >
              View Applicants
            </button>
            <button className="btn-ghost-sm deactivate-btn" onClick={() => onDeactivate(job.id)}>
              Deactivate
            </button>
          </>
        )}
        {isPast && (
          <button className="btn-ghost-sm" onClick={() => onReactivate(job.id)}>
            Reactivate
          </button>
        )}
      </div>

      {/* Job detail modal */}
      {showDetail && (
        <div className="modal-overlay" onClick={() => setShowDetail(false)}>
          <div className="job-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="job-detail-header">
              <div>
                <h2>{job.title}</h2>
                <p className="job-detail-industry">{job.industry}</p>
              </div>
              <button className="modal-close-btn" onClick={() => setShowDetail(false)}>×</button>
            </div>
            <div className="job-detail-badges">
              {job.location_type && <span className={`badge badge-location badge-${job.location_type}`}>{job.location_type}</span>}
              {job.hours_type && <span className="badge badge-hours">{{ full_time: 'Full Time', part_time: 'Part Time', contract: 'Contract' }[job.hours_type]}</span>}
              {job.job_level && <span className="badge badge-level">{levelLabels[job.job_level]}</span>}
              {salary && <span className="badge badge-salary">{salary}</span>}
              {job.start_date && <span className="badge badge-meta">Starts: {job.start_date}</span>}
              {job.work_term && <span className="badge badge-meta">{job.work_term} months</span>}
            </div>
            <div className="job-detail-body">
              {job.responsibilities && (
                <div className="job-detail-section">
                  <div className="job-detail-section-title">Responsibilities</div>
                  <p>{job.responsibilities}</p>
                </div>
              )}
              {job.required_skills?.length > 0 && (
                <div className="job-detail-section">
                  <div className="job-detail-section-title">Required Skills</div>
                  <div className="job-detail-skills">
                    {job.required_skills.map((s, i) => <span className="skill-chip" key={i}>{s}</span>)}
                  </div>
                </div>
              )}
              {job.education_required && (
                <div className="job-detail-section">
                  <div className="job-detail-section-title">Education</div>
                  <p>{job.education_required}</p>
                </div>
              )}
              {job.experience_required && (
                <div className="job-detail-section">
                  <div className="job-detail-section-title">Experience</div>
                  <p>{job.experience_required}</p>
                </div>
              )}
              {job.certifications_required && (
                <div className="job-detail-section">
                  <div className="job-detail-section-title">Certifications</div>
                  <p>{job.certifications_required}</p>
                </div>
              )}
              {job.specific_questions?.length > 0 && (
                <div className="job-detail-section">
                  <div className="job-detail-section-title">Interview Questions</div>
                  <ol className="job-detail-questions">
                    {job.specific_questions.map((q, i) => <li key={i}>{q}</li>)}
                  </ol>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function CompanyJobs() {
  const [tab, setTab] = useState('active')
  const [activeJobs, setActiveJobs] = useState([])
  const [pastJobs, setPastJobs] = useState([])
  const [industries, setIndustries] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    getIndustries().then(setIndustries).catch(() => {})
    Promise.all([getMyJobs(), getPastJobs()])
      .then(([active, past]) => {
        setActiveJobs(active)
        setPastJobs(past)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleCreated = (job) => {
    setActiveJobs((prev) => [job, ...prev])
    setShowForm(false)
  }

  const handleDeactivate = async (jobId) => {
    try {
      await updateJob(jobId, { is_active: false })
      const job = activeJobs.find((j) => j.id === jobId)
      setActiveJobs((prev) => prev.filter((j) => j.id !== jobId))
      if (job) setPastJobs((prev) => [{ ...job, is_active: false }, ...prev])
    } catch {
      // ignore
    }
  }

  const handleReactivate = async (jobId) => {
    try {
      await updateJob(jobId, { is_active: true })
      const job = pastJobs.find((j) => j.id === jobId)
      setPastJobs((prev) => prev.filter((j) => j.id !== jobId))
      if (job) setActiveJobs((prev) => [{ ...job, is_active: true }, ...prev])
    } catch {
      // ignore
    }
  }

  return (
    <div className="site">
      <div className="noise-overlay" />
      <div className="aurora">
        <div className="aurora-blob a1" />
        <div className="aurora-blob a2" />
      </div>
      <Navbar />

      <div className="cj-page">
        <div className="cj-header-row">
          <div>
            <h1>Job Postings</h1>
            <p>Manage your active and past job listings.</p>
          </div>
          <button className="btn-primary" onClick={() => setShowForm((v) => !v)}>
            {showForm ? 'Cancel' : '+ Add Job Posting'}
            <span className="btn-shimmer" />
          </button>
        </div>

        {/* Add Job Form */}
        {showForm && (
          <JobFormPanel
            industries={industries}
            onClose={() => setShowForm(false)}
            onCreated={handleCreated}
          />
        )}

        {/* Tabs */}
        <div className="cj-tabs">
          <button
            className={`cj-tab ${tab === 'active' ? 'active' : ''}`}
            onClick={() => setTab('active')}
          >
            Active
            <span className="cj-tab-count">{activeJobs.length}</span>
          </button>
          <button
            className={`cj-tab ${tab === 'past' ? 'active' : ''}`}
            onClick={() => setTab('past')}
          >
            Past / Closed
            <span className="cj-tab-count">{pastJobs.length}</span>
          </button>
        </div>

        {loading ? (
          <div className="cj-loading">Loading jobs…</div>
        ) : (
          <div className="cj-grid">
            {tab === 'active' && (
              activeJobs.length === 0 ? (
                <div className="cj-empty">No active job postings. Add one above.</div>
              ) : (
                activeJobs.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    onDeactivate={handleDeactivate}
                    isPast={false}
                  />
                ))
              )
            )}
            {tab === 'past' && (
              pastJobs.length === 0 ? (
                <div className="cj-empty">No past or closed job postings.</div>
              ) : (
                pastJobs.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    onReactivate={handleReactivate}
                    isPast={true}
                  />
                ))
              )
            )}
          </div>
        )}
      </div>
    </div>
  )
}
