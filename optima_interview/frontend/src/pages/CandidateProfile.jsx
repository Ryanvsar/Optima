import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { getMyProfile, updateMyProfile, uploadAvatar, uploadResume } from '../api/client'
import Navbar from '../components/Navbar'
import './CandidateProfile.css'

const TABS = ['Contact', 'About', 'Resume & Skills', 'Preferences']

const WORK_TYPES = [
  { value: 'onsite', label: 'Onsite' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'remote', label: 'Remote' },
  { value: 'any', label: 'Any' },
]
const HOURS_TYPES = [
  { value: 'full_time', label: 'Full Time' },
  { value: 'part_time', label: 'Part Time' },
  { value: 'contract', label: 'Contract' },
  { value: 'any', label: 'Any' },
]
const LEVELS = [
  { value: 'internship', label: 'Internship' },
  { value: 'entry', label: 'Entry Level' },
  { value: 'senior', label: 'Senior' },
]

function TagInput({ tags = [], onChange, max, placeholder }) {
  const [input, setInput] = useState('')

  const addTag = () => {
    const val = input.trim()
    if (!val) return
    if (max && tags.length >= max) return
    if (tags.includes(val)) { setInput(''); return }
    onChange([...tags, val])
    setInput('')
  }

  const removeTag = (idx) => onChange(tags.filter((_, i) => i !== idx))

  return (
    <div className="tag-input-wrapper">
      <div className="tag-list">
        {tags.map((t, i) => (
          <span className="tag-chip" key={i}>
            {t}
            <button type="button" className="tag-remove" onClick={() => removeTag(i)}>×</button>
          </span>
        ))}
        {(!max || tags.length < max) && (
          <input
            className="tag-text-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
            placeholder={placeholder || 'Type and press Enter'}
          />
        )}
      </div>
      {max && (
        <span className="tag-count">{tags.length}/{max}</span>
      )}
    </div>
  )
}

export default function CandidateProfile() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState(0)
  const [profile, setProfile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [error, setError] = useState('')
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null)
  const avatarRef = useRef(null)
  const resumeRef = useRef(null)

  useEffect(() => {
    getMyProfile().then((p) => {
      setProfile({
        phone_number: p.phone_number || '',
        age: p.age || '',
        sex: p.sex || '',
        gender: p.gender || '',
        ethnicity: p.ethnicity || '',
        disabilities: p.disabilities || '',
        resume_text: p.resume_text || '',
        resume_filename: p.resume_filename || '',
        skills: p.skills || [],
        desired_roles: p.desired_roles || [],
        location: p.location || '',
        distance_km: p.distance_km || '',
        work_type: p.work_type || '',
        pay_min: p.pay_min || '',
        pay_max: p.pay_max || '',
        pay_any: !p.pay_min && !p.pay_max,
        hours_type: p.hours_type || '',
        level: p.level || '',
        start_date: p.start_date || '',
        work_term: p.work_term || '',
        profile_picture_url: p.profile_picture_url || '',
        email: p.email,
      })
    }).catch(() => setError('Could not load profile'))
  }, [])

  const set = (key) => (val) => setProfile((p) => ({ ...p, [key]: val }))
  const setField = (key) => (e) => setProfile((p) => ({ ...p, [key]: e.target.value }))

  const handleSave = async () => {
    setSaving(true); setError(''); setSaveMsg('')
    try {
      const payload = {
        phone_number: profile.phone_number || null,
        age: profile.age ? parseInt(profile.age) : null,
        sex: profile.sex || null,
        gender: profile.gender || null,
        ethnicity: profile.ethnicity || null,
        disabilities: profile.disabilities || null,
        resume_text: profile.resume_text || null,
        skills: profile.skills.length ? profile.skills : null,
        desired_roles: profile.desired_roles.length ? profile.desired_roles : null,
        location: profile.location || null,
        distance_km: profile.distance_km ? parseInt(profile.distance_km) : null,
        work_type: profile.work_type || null,
        pay_min: (!profile.pay_any && profile.pay_min) ? parseInt(profile.pay_min) : null,
        pay_max: (!profile.pay_any && profile.pay_max) ? parseInt(profile.pay_max) : null,
        hours_type: profile.hours_type || null,
        level: profile.level || null,
        start_date: profile.start_date || null,
        work_term: profile.work_term || null,
      }
      const updated = await updateMyProfile(payload)
      setProfile((prev) => ({
        ...prev,
        phone_number: updated.phone_number || '',
        age: updated.age || '',
        sex: updated.sex || '',
        gender: updated.gender || '',
        ethnicity: updated.ethnicity || '',
        disabilities: updated.disabilities || '',
        skills: updated.skills || [],
        desired_roles: updated.desired_roles || [],
        location: updated.location || '',
        distance_km: updated.distance_km || '',
        work_type: updated.work_type || '',
        pay_min: updated.pay_min || '',
        pay_max: updated.pay_max || '',
        pay_any: !updated.pay_min && !updated.pay_max,
        hours_type: updated.hours_type || '',
        level: updated.level || '',
        start_date: updated.start_date || '',
        work_term: updated.work_term || '',
      }))
      setSaveMsg('Saved successfully')
      setTimeout(() => setSaveMsg(''), 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const updated = await uploadAvatar(file)
      setProfile((p) => ({ ...p, profile_picture_url: updated.profile_picture_url }))
    } catch (err) {
      setError(err.message)
    }
  }

  const handleResumeChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.type !== 'application/pdf') {
      setError('Please upload a PDF file.')
      return
    }
    const localUrl = URL.createObjectURL(file)
    setPdfPreviewUrl(localUrl)
    try {
      const updated = await uploadResume(file)
      setProfile((p) => ({
        ...p,
        resume_filename: updated.resume_filename,
        resume_text: updated.resume_text || p.resume_text,
      }))
      setSaveMsg('Resume uploaded')
      setTimeout(() => setSaveMsg(''), 3000)
    } catch (err) {
      setError(err.message)
      setPdfPreviewUrl(null)
      URL.revokeObjectURL(localUrl)
    }
  }

  const avatarSrc = profile?.profile_picture_url
    ? `http://localhost:8000${profile.profile_picture_url}`
    : null

  const resumeDisplayUrl = pdfPreviewUrl
    || (profile?.resume_filename ? `http://localhost:8000${profile.resume_filename}` : null)

  if (!profile) {
    return (
      <div className="site">
        <div className="noise-overlay" />
        <div className="aurora"><div className="aurora-blob a1" /><div className="aurora-blob a2" /></div>
        <Navbar />
        <div className="profile-loading">Loading profile…</div>
      </div>
    )
  }

  return (
    <div className="site">
      <div className="noise-overlay" />
      <div className="aurora">
        <div className="aurora-blob a1" /><div className="aurora-blob a2" />
      </div>
      <Navbar />

      <div className="profile-page">
        <div className="profile-header">
          <h1>My Profile</h1>
          <p>Keep your profile up to date to improve your compatibility scores.</p>
        </div>

        <div className="profile-tabs">
          {TABS.map((t, i) => (
            <button
              key={i}
              className={`profile-tab ${activeTab === i ? 'active' : ''}`}
              onClick={() => setActiveTab(i)}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="profile-panel">
          {/* ── Tab 0: Contact ── */}
          {activeTab === 0 && (
            <div className="profile-tab-content">
              <div className="avatar-section">
                <div className="avatar-wrap">
                  {avatarSrc
                    ? <img src={avatarSrc} alt="Profile" className="avatar-img" />
                    : <div className="avatar-placeholder">{user?.name?.[0] || '?'}</div>
                  }
                  <button className="avatar-upload-btn" type="button" onClick={() => avatarRef.current?.click()}>
                    Upload Photo
                  </button>
                  <input ref={avatarRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
                </div>
              </div>

              <div className="form-grid">
                <label className="form-label">
                  <span>Email</span>
                  <input type="email" value={profile.email} disabled className="form-input disabled" />
                </label>
                <label className="form-label">
                  <span>Phone Number</span>
                  <input
                    type="tel"
                    value={profile.phone_number}
                    onChange={setField('phone_number')}
                    placeholder="+1 (416) 555-0100"
                    className="form-input"
                  />
                </label>
              </div>
            </div>
          )}

          {/* ── Tab 1: About ── */}
          {activeTab === 1 && (
            <div className="profile-tab-content">
              <p className="tab-note">This information is kept confidential and may be used for anonymized diversity reporting.</p>
              <div className="form-grid">
                <label className="form-label">
                  <span>Age</span>
                  <input
                    type="number"
                    value={profile.age}
                    onChange={setField('age')}
                    placeholder="25"
                    min="16"
                    max="100"
                    className="form-input"
                  />
                </label>
                <label className="form-label">
                  <span>Sex</span>
                  <select value={profile.sex} onChange={setField('sex')} className="form-input form-select">
                    <option value="">Prefer not to say</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Intersex">Intersex</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </label>
                <label className="form-label">
                  <span>Gender Identity</span>
                  <input
                    type="text"
                    value={profile.gender}
                    onChange={setField('gender')}
                    placeholder="e.g. Non-binary, Man, Woman…"
                    className="form-input"
                  />
                </label>
                <label className="form-label">
                  <span>Ethnicity</span>
                  <input
                    type="text"
                    value={profile.ethnicity}
                    onChange={setField('ethnicity')}
                    placeholder="Optional"
                    className="form-input"
                  />
                </label>
                <label className="form-label full-width">
                  <span>Disabilities</span>
                  <input
                    type="text"
                    value={profile.disabilities}
                    onChange={setField('disabilities')}
                    placeholder="Optional — e.g. None, or describe as needed"
                    className="form-input"
                  />
                </label>
              </div>
            </div>
          )}

          {/* ── Tab 2: Resume & Skills ── */}
          {activeTab === 2 && (
            <div className="profile-tab-content">
              <div className="resume-section">
                <div className="resume-header-row">
                  <div>
                    <h3>Resume</h3>
                    <p>Upload a PDF resume. It will be used for ATS scoring when matching you to jobs.</p>
                  </div>
                  <div className="resume-upload-area">
                    <button type="button" className="btn-ghost-sm" onClick={() => resumeRef.current?.click()}>
                      {profile.resume_filename ? 'Replace PDF' : 'Upload PDF'}
                    </button>
                    <input ref={resumeRef} type="file" accept=".pdf" style={{ display: 'none' }} onChange={handleResumeChange} />
                    {profile.resume_filename && (
                      <span className="resume-chip">
                        {profile.resume_filename.split('/').pop().split('_').slice(1).join('_') || profile.resume_filename.split('/').pop()}
                      </span>
                    )}
                  </div>
                </div>
                {resumeDisplayUrl ? (
                  <div className="resume-preview">
                    <embed
                      src={resumeDisplayUrl}
                      type="application/pdf"
                      className="resume-embed"
                    />
                  </div>
                ) : (
                  <div className="resume-empty">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                    </svg>
                    <p>No resume uploaded yet. Click "Upload PDF" to add your resume.</p>
                  </div>
                )}
              </div>

              <div className="skills-section">
                <label className="form-label">
                  <span>Skills <span className="label-hint">— type and press Enter to add</span></span>
                  <TagInput
                    tags={profile.skills}
                    onChange={set('skills')}
                    placeholder="e.g. Python, SQL, React…"
                  />
                </label>
              </div>
            </div>
          )}

          {/* ── Tab 3: Preferences ── */}
          {activeTab === 3 && (
            <div className="profile-tab-content">
              <div className="form-group">
                <label className="form-label">
                  <span>Desired Roles <span className="label-hint">— up to 5 job titles</span></span>
                  <TagInput
                    tags={profile.desired_roles}
                    onChange={set('desired_roles')}
                    max={5}
                    placeholder="e.g. Software Engineer…"
                  />
                </label>
              </div>

              <div className="form-grid">
                <label className="form-label">
                  <span>Location</span>
                  <input
                    type="text"
                    value={profile.location}
                    onChange={setField('location')}
                    placeholder="Toronto, ON"
                    className="form-input"
                  />
                </label>
                <label className="form-label">
                  <span>Distance (km)</span>
                  <input
                    type="number"
                    value={profile.distance_km}
                    onChange={setField('distance_km')}
                    placeholder="50"
                    min="0"
                    className="form-input"
                  />
                </label>
              </div>

              <div className="form-group">
                <span className="form-label-text">Work Type</span>
                <div className="toggle-group">
                  {WORK_TYPES.map((w) => (
                    <button
                      key={w.value}
                      type="button"
                      className={`toggle-btn ${profile.work_type === w.value ? 'active' : ''}`}
                      onClick={() => set('work_type')(profile.work_type === w.value ? '' : w.value)}
                    >
                      {w.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <span className="form-label-text">Pay Range</span>
                <div className="pay-row">
                  <label className="form-label pay-input">
                    <span>Min ($)</span>
                    <input
                      type="number"
                      value={profile.pay_any ? '' : profile.pay_min}
                      onChange={setField('pay_min')}
                      disabled={profile.pay_any}
                      placeholder="50000"
                      className="form-input"
                    />
                  </label>
                  <label className="form-label pay-input">
                    <span>Max ($)</span>
                    <input
                      type="number"
                      value={profile.pay_any ? '' : profile.pay_max}
                      onChange={setField('pay_max')}
                      disabled={profile.pay_any}
                      placeholder="90000"
                      className="form-input"
                    />
                  </label>
                  <label className="any-checkbox">
                    <input
                      type="checkbox"
                      checked={profile.pay_any}
                      onChange={(e) => set('pay_any')(e.target.checked)}
                    />
                    <span>Any pay</span>
                  </label>
                </div>
              </div>

              <div className="form-group">
                <span className="form-label-text">Hours</span>
                <div className="toggle-group">
                  {HOURS_TYPES.map((h) => (
                    <button
                      key={h.value}
                      type="button"
                      className={`toggle-btn ${profile.hours_type === h.value ? 'active' : ''}`}
                      onClick={() => set('hours_type')(profile.hours_type === h.value ? '' : h.value)}
                    >
                      {h.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <span className="form-label-text">Level <span className="label-hint">— optional</span></span>
                <div className="toggle-group">
                  {LEVELS.map((l) => (
                    <button
                      key={l.value}
                      type="button"
                      className={`toggle-btn ${profile.level === l.value ? 'active' : ''}`}
                      onClick={() => set('level')(profile.level === l.value ? '' : l.value)}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-grid">
                <label className="form-label">
                  <span>Start Date</span>
                  <input
                    type="date"
                    value={profile.start_date}
                    onChange={setField('start_date')}
                    className="form-input"
                  />
                </label>
                <label className="form-label">
                  <span>Work Term</span>
                  <input
                    type="text"
                    value={profile.work_term}
                    onChange={setField('work_term')}
                    placeholder="e.g. 4 months, Permanent"
                    className="form-input"
                  />
                </label>
              </div>
            </div>
          )}

          {error && <div className="profile-error">{error}</div>}
          {saveMsg && <div className="profile-success">{saveMsg}</div>}

          <div className="profile-save-row">
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save Changes'}
              <span className="btn-shimmer" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
