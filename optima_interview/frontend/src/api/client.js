const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

async function request(path, options = {}) {
  const token = localStorage.getItem('nexus_token')
  const headers = { 'Content-Type': 'application/json', ...options.headers }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${API}${path}`, { ...options, headers })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const err = new Error(body.detail || `Request failed: ${res.status}`)
    err.status = res.status
    throw err
  }

  // 204 No Content
  if (res.status === 204) return null
  return res.json()
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export const register = (data) =>
  request('/auth/register', { method: 'POST', body: JSON.stringify(data) })

export const login = (data) =>
  request('/auth/login', { method: 'POST', body: JSON.stringify(data) })

export const getMe = () => request('/auth/me')

// ── Profile ───────────────────────────────────────────────────────────────────
export const getMyProfile = () => request('/profile/me')

export const updateMyProfile = (data) =>
  request('/profile/me', { method: 'PATCH', body: JSON.stringify(data) })

export const getCandidateProfile = (userId) => request(`/profile/${userId}`)

/** Upload a profile picture (multipart/form-data). */
export const uploadAvatar = (file) => {
  const token = localStorage.getItem('nexus_token')
  const form = new FormData()
  form.append('file', file)
  return fetch(`${API}/profile/avatar`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  }).then((r) =>
    r.ok ? r.json() : r.json().then((b) => Promise.reject(new Error(b.detail || 'Upload failed')))
  )
}

/** Upload a resume file (multipart/form-data). */
export const uploadResume = (file) => {
  const token = localStorage.getItem('nexus_token')
  const form = new FormData()
  form.append('file', file)
  return fetch(`${API}/profile/resume`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  }).then((r) =>
    r.ok ? r.json() : r.json().then((b) => Promise.reject(new Error(b.detail || 'Upload failed')))
  )
}

// ── Interviews ────────────────────────────────────────────────────────────────
export const getIndustries = () => request('/interviews/industries')

export const getRolesForIndustry = (industry) =>
  request(`/interviews/roles?industry=${encodeURIComponent(industry)}`)

export const canStartConnecting = () => request('/interviews/can-connect')

export const startInterview = (data) =>
  request('/interviews/start', { method: 'POST', body: JSON.stringify(data) })

export const submitInterview = (sessionId, answers) =>
  request(`/interviews/${sessionId}/submit`, {
    method: 'POST',
    body: JSON.stringify({ answers }),
  })

export const getResults = (sessionId) => request(`/interviews/${sessionId}/results`)

export const getMySessions = () => request('/interviews/')

// ── Jobs ──────────────────────────────────────────────────────────────────────
export const listJobs = (filters = {}) => {
  const params = new URLSearchParams()
  if (filters.industry)      params.set('industry', filters.industry)
  if (filters.location_type && filters.location_type !== 'any') params.set('location_type', filters.location_type)
  if (filters.hours_type && filters.hours_type !== 'any')       params.set('hours_type', filters.hours_type)
  if (filters.job_level)     params.set('job_level', filters.job_level)
  if (filters.salary_min)    params.set('salary_min', filters.salary_min)
  if (filters.salary_max)    params.set('salary_max', filters.salary_max)
  if (filters.start_date)    params.set('start_date', filters.start_date)
  if (filters.work_term)     params.set('work_term', filters.work_term)
  const qs = params.toString()
  return request(`/jobs/${qs ? '?' + qs : ''}`)
}

export const getMyJobs = () => request('/jobs/mine')

export const getPastJobs = () => request('/jobs/mine/past')

export const createJob = (data) =>
  request('/jobs/', { method: 'POST', body: JSON.stringify(data) })

export const updateJob = (jobId, data) =>
  request(`/jobs/${jobId}`, { method: 'PATCH', body: JSON.stringify(data) })

export const getJob = (jobId) => request(`/jobs/${jobId}`)

// ── Favourites ────────────────────────────────────────────────────────────────
export const getFavourites = () => request('/favourites/')

export const addFavourite = (jobId) =>
  request(`/favourites/${jobId}`, { method: 'POST' })

export const removeFavourite = (jobId) =>
  request(`/favourites/${jobId}`, { method: 'DELETE' })

// ── Applications ──────────────────────────────────────────────────────────────
export const getMyApplications = () => request('/applications/mine')

export const getApplicationsForSession = (sessionId) =>
  request(`/applications/mine/session/${sessionId}`)

export const updateApplication = (applicationId, data) =>
  request(`/applications/${applicationId}`, { method: 'PATCH', body: JSON.stringify(data) })

export const withdrawApplication = (applicationId) =>
  request(`/applications/${applicationId}/withdraw`, { method: 'POST' })

export const getApplicantsForJob = (jobId) =>
  request(`/applications/for-job/${jobId}`)

export const updateApplicationStatus = (applicationId, newStatus) =>
  request(`/applications/${applicationId}/status?new_status=${newStatus}`, { method: 'PATCH' })

export const uploadTailoredResume = (applicationId, file) => {
  const token = localStorage.getItem('nexus_token')
  const fd = new FormData()
  fd.append('file', file)
  return fetch(`${API}/applications/${applicationId}/upload-resume`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  }).then(async (res) => {
    if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.detail || 'Upload failed') }
    return res.json()
  })
}

export const uploadCoverLetter = (applicationId, file) => {
  const token = localStorage.getItem('nexus_token')
  const fd = new FormData()
  fd.append('file', file)
  return fetch(`${API}/applications/${applicationId}/upload-cover`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  }).then(async (res) => {
    if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.detail || 'Upload failed') }
    return res.json()
  })
}

// ── TTS ───────────────────────────────────────────────────────────────────────
/** Calls the TTS endpoint and returns a blob URL for the audio. Caller must revoke it after use. */
export const speakText = async (text) => {
  const token = localStorage.getItem('nexus_token')
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${API}/tts/speak`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ text }),
  })
  if (!res.ok) throw new Error('TTS unavailable')
  const blob = await res.blob()
  return URL.createObjectURL(blob)
}

// ── Matches ───────────────────────────────────────────────────────────────────
export const getMatches = (jobId) =>
  request(`/matches/${jobId ? `?job_id=${jobId}` : ''}`)

export const getMyMatches = () => request('/matches/mine')

export const updateMatchStatus = (matchId, newStatus) =>
  request(`/matches/${matchId}/status?new_status=${newStatus}`, { method: 'PATCH' })
