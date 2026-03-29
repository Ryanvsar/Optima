import { useState, useEffect, useRef } from 'react'
import { getMyProfile, updateMyProfile, uploadAvatar } from '../api/client'
import Navbar from '../components/Navbar'
import ImageCropModal from '../components/ImageCropModal'
import './CompanyProfile.css'

// ── Tag Input ─────────────────────────────────────────────────────────────────
function TagInput({ tags, onChange, placeholder }) {
  const [input, setInput] = useState('')
  const inputRef = useRef(null)

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
    <div className="tag-list" onClick={() => inputRef.current?.focus()}>
      {tags.map((tag) => (
        <span className="tag-chip" key={tag}>
          {tag}
          <button className="tag-remove" onClick={() => removeTag(tag)} type="button">×</button>
        </span>
      ))}
      <input
        ref={inputRef}
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

export default function CompanyProfile() {
  const avatarInputRef = useRef(null)

  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  // Info section
  const [description, setDescription] = useState('')
  const [locations, setLocations] = useState([])

  // Save state
  const [savingInfo, setSavingInfo] = useState(false)
  const [infoMsg, setInfoMsg] = useState({ type: '', text: '' })
  const [cropImageSrc, setCropImageSrc] = useState(null)

  useEffect(() => {
    getMyProfile()
      .then((p) => {
        setProfile(p)
        setDescription(p.company_description || '')
        setLocations(p.company_locations || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const showMsg = (setter, type, text) => {
    setter({ type, text })
    setTimeout(() => setter({ type: '', text: '' }), 3500)
  }

  const handleAvatarClick = () => avatarInputRef.current?.click()

  const handleAvatarSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setCropImageSrc(reader.result)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleCroppedUpload = async (croppedFile) => {
    try {
      const res = await uploadAvatar(croppedFile)
      const url = res.profile_picture_url
      setProfile((p) => ({ ...p, profile_picture_url: url ? `${url}?t=${Date.now()}` : url }))
      setCropImageSrc(null)
    } catch (err) {
      showMsg(setInfoMsg, 'error', err.message || 'Failed to upload logo.')
    }
  }

  const handleSaveInfo = async () => {
    setSavingInfo(true)
    try {
      await updateMyProfile({ company_description: description, company_locations: locations })
      showMsg(setInfoMsg, 'success', 'Company profile saved.')
    } catch (err) {
      showMsg(setInfoMsg, 'error', err.message || 'Failed to save.')
    } finally {
      setSavingInfo(false)
    }
  }

  if (loading) {
    return (
      <div className="site">
        <div className="noise-overlay" />
        <Navbar />
        <div className="cp-loading">Loading profile…</div>
      </div>
    )
  }

  const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'
  const avatarUrl = profile?.profile_picture_url
    ? (profile.profile_picture_url.startsWith('http') ? profile.profile_picture_url : `${API}${profile.profile_picture_url}`)
    : null

  const initials = profile?.name
    ? profile.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  return (
    <div className="site">
      <div className="noise-overlay" />
      <div className="aurora">
        <div className="aurora-blob a1" />
        <div className="aurora-blob a2" />
      </div>
      <Navbar />

      <div className="cp-page">
        <div className="cp-header">
          <h1>Company Profile</h1>
          <p>Help candidates learn about your company and culture.</p>
        </div>

        <input
          type="file"
          accept="image/*"
          ref={avatarInputRef}
          onChange={handleAvatarSelect}
          style={{ display: 'none' }}
        />
        {cropImageSrc && (
          <ImageCropModal
            imageSrc={cropImageSrc}
            onClose={() => setCropImageSrc(null)}
            onCropDone={handleCroppedUpload}
            shape="rect"
          />
        )}

        {/* ── Company Info Section ── */}
        <div className="cp-card">
          <div className="cp-card-title">Company Info</div>

          {/* Avatar */}
          <div className="cp-avatar-row">
            <div className="cp-avatar-wrap">
              <div className="cp-avatar-container">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Company logo" className="cp-avatar-img" />
                ) : (
                  <div className="cp-avatar-placeholder">{initials}</div>
                )}
                {avatarUrl && (
                  <button
                    className="cp-avatar-edit-btn"
                    type="button"
                    onClick={handleAvatarClick}
                    title="Edit logo"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                )}
              </div>
              <button className="cp-avatar-btn" onClick={handleAvatarClick} type="button">
                {avatarUrl ? 'Change Logo' : 'Upload Logo'}
              </button>
            </div>
            <div className="cp-company-name-block">
              <div className="cp-company-name">{profile?.name}</div>
              <div className="cp-company-email">{profile?.email}</div>
            </div>
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="form-label">
              <span>Company Description</span>
              <textarea
                className="cp-textarea"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tell candidates about your company, culture, and mission…"
                rows={6}
              />
            </label>
          </div>

          {infoMsg.text && (
            <div className={infoMsg.type === 'success' ? 'cp-success' : 'cp-error'}>
              {infoMsg.text}
            </div>
          )}

          <div className="cp-save-row">
            <button className="btn-primary" onClick={handleSaveInfo} disabled={savingInfo}>
              {savingInfo ? 'Saving…' : 'Save Info'}
              <span className="btn-shimmer" />
            </button>
          </div>
        </div>

        {/* ── Locations Section ── */}
        <div className="cp-card">
          <div className="cp-card-title">Office Locations</div>
          <p className="cp-card-desc">
            Add office cities or regions. Type a location and press Enter to add.
          </p>

          <TagInput
            tags={locations}
            onChange={setLocations}
            placeholder="e.g. Toronto, Remote, New York…"
          />

          <div className="cp-save-row" style={{ marginTop: '20px' }}>
            <button className="btn-primary" onClick={handleSaveInfo} disabled={savingInfo}>
              {savingInfo ? 'Saving…' : 'Save Locations'}
              <span className="btn-shimmer" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
