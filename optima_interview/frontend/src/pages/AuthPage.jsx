import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { login, register } from '../api/client'
import Navbar from '../components/Navbar'
import './AuthPage.css'

const LOCATIONS = [
  // Canada — Major Cities
  'Calgary, AB', 'Edmonton, AB', 'Red Deer, AB',
  'Vancouver, BC', 'Burnaby, BC', 'Kelowna, BC', 'Richmond, BC', 'Surrey, BC', 'Victoria, BC',
  'Winnipeg, MB',
  'Fredericton, NB', 'Moncton, NB', 'Saint John, NB',
  "St. John's, NL",
  'Halifax, NS',
  'Brampton, ON', 'Hamilton, ON', 'Kitchener, ON', 'London, ON', 'Markham, ON',
  'Mississauga, ON', 'Ottawa, ON', 'Toronto, ON', 'Vaughan, ON', 'Windsor, ON',
  'Charlottetown, PE',
  'Gatineau, QC', 'Laval, QC', 'Montreal, QC', 'Quebec City, QC',
  'Regina, SK', 'Saskatoon, SK',
  // US — Major Cities
  'Atlanta, GA', 'Austin, TX', 'Boston, MA', 'Charlotte, NC', 'Chicago, IL',
  'Columbus, OH', 'Dallas, TX', 'Denver, CO', 'Detroit, MI', 'Fort Worth, TX',
  'Houston, TX', 'Indianapolis, IN', 'Jacksonville, FL', 'Las Vegas, NV',
  'Los Angeles, CA', 'Memphis, TN', 'Miami, FL', 'Minneapolis, MN', 'Nashville, TN',
  'New Orleans, LA', 'New York, NY', 'Oklahoma City, OK', 'Orlando, FL',
  'Philadelphia, PA', 'Phoenix, AZ', 'Portland, OR', 'Sacramento, CA',
  'San Antonio, TX', 'San Diego, CA', 'San Francisco, CA', 'San Jose, CA',
  'Seattle, WA', 'Tampa, FL', 'Washington, DC',
  // Remote
  'Remote', 'Hybrid',
]

export default function AuthPage() {
  const location = useLocation()
  const isRegister = location.pathname === '/register'
  const navigate = useNavigate()
  const { loginUser } = useAuth()

  // Read ?role=candidate or ?role=company from URL
  const urlRole = new URLSearchParams(location.search).get('role') || 'candidate'

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    company_name: '',
    company_location: '',
    email: '',
    password: '',
    role: urlRole,
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [locationSuggestions, setLocationSuggestions] = useState([])
  const [showLocationDropdown, setShowLocationDropdown] = useState(false)
  const locationRef = useRef(null)

  // Sync role if URL param changes (e.g. navigating from landing page buttons)
  useEffect(() => {
    setForm((f) => ({ ...f, role: urlRole }))
  }, [urlRole])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (locationRef.current && !locationRef.current.contains(e.target)) {
        setShowLocationDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLocationInput = (e) => {
    const val = e.target.value
    setForm((f) => ({ ...f, company_location: val }))
    if (val.length >= 1) {
      const filtered = LOCATIONS.filter((l) =>
        l.toLowerCase().includes(val.toLowerCase())
      ).slice(0, 8)
      setLocationSuggestions(filtered)
      setShowLocationDropdown(filtered.length > 0)
    } else {
      setLocationSuggestions([])
      setShowLocationDropdown(false)
    }
  }

  const selectLocation = (loc) => {
    setForm((f) => ({ ...f, company_location: loc }))
    setShowLocationDropdown(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (isRegister && form.password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)
    try {
      let payload
      if (isRegister) {
        const base = { email: form.email.toLowerCase().trim(), password: form.password, role: form.role }
        if (form.role === 'candidate') {
          if (!form.first_name.trim() || !form.last_name.trim()) {
            setError('Please enter your first and last name')
            setLoading(false)
            return
          }
          payload = { ...base, first_name: form.first_name.trim(), last_name: form.last_name.trim() }
        } else {
          if (!form.company_name.trim()) {
            setError('Please enter your company name')
            setLoading(false)
            return
          }
          payload = { ...base, company_name: form.company_name.trim(), location: form.company_location.trim() }
        }
      } else {
        payload = { email: form.email.toLowerCase().trim(), password: form.password }
      }

      const res = isRegister ? await register(payload) : await login(payload)
      loginUser(res)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  return (
    <div className="site">
      <div className="noise-overlay" />
      <div className="aurora">
        <div className="aurora-blob a1" />
        <div className="aurora-blob a2" />
      </div>
      <Navbar />

      <div className="auth-page">
        <div className="auth-card">
          <h1>{isRegister ? 'Create Account' : 'Welcome Back'}</h1>
          <p className="auth-sub">
            {isRegister
              ? form.role === 'company'
                ? 'Create a company account to post jobs and find top candidates'
                : 'Sign up to start your interview journey'
              : 'Log in to continue'}
          </p>

          <form onSubmit={handleSubmit} className="auth-form">
            {isRegister && (
              <label>
                <span>I am a...</span>
                <div className="role-toggle">
                  <button
                    type="button"
                    className={`role-btn ${form.role === 'candidate' ? 'active' : ''}`}
                    onClick={() => setForm((f) => ({ ...f, role: 'candidate' }))}
                  >
                    Candidate
                  </button>
                  <button
                    type="button"
                    className={`role-btn ${form.role === 'company' ? 'active' : ''}`}
                    onClick={() => setForm((f) => ({ ...f, role: 'company' }))}
                  >
                    Company
                  </button>
                </div>
              </label>
            )}

            {isRegister && form.role === 'candidate' && (
              <div className="name-row">
                <label>
                  <span>First Name</span>
                  <input
                    type="text"
                    value={form.first_name}
                    onChange={set('first_name')}
                    placeholder="Jane"
                    required
                  />
                </label>
                <label>
                  <span>Last Name</span>
                  <input
                    type="text"
                    value={form.last_name}
                    onChange={set('last_name')}
                    placeholder="Smith"
                    required
                  />
                </label>
              </div>
            )}

            {isRegister && form.role === 'company' && (
              <>
                <label>
                  <span>Company Name</span>
                  <input
                    type="text"
                    value={form.company_name}
                    onChange={set('company_name')}
                    placeholder="Acme Corp"
                    required
                  />
                </label>
                <label>
                  <span>Location</span>
                  <div className="location-wrap" ref={locationRef}>
                    <input
                      type="text"
                      value={form.company_location}
                      onChange={handleLocationInput}
                      placeholder="Toronto, ON"
                      autoComplete="off"
                    />
                    {showLocationDropdown && locationSuggestions.length > 0 && (
                      <ul className="location-dropdown">
                        {locationSuggestions.map((loc) => (
                          <li
                            key={loc}
                            className="location-option"
                            onMouseDown={() => selectLocation(loc)}
                          >
                            {loc}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </label>
              </>
            )}

            <label>
              <span>{form.role === 'company' && isRegister ? 'Company Email' : 'Email'}</span>
              <input
                type="email"
                value={form.email}
                onChange={set('email')}
                placeholder="you@example.com"
                required
              />
            </label>

            <label>
              <span>Password</span>
              <input
                type="password"
                value={form.password}
                onChange={set('password')}
                placeholder={isRegister ? 'Min 8 characters' : 'Your password'}
                required
                minLength={isRegister ? 8 : 1}
              />
            </label>

            {!isRegister && (
              <div className="forgot-pw-row">
                <a href="/forgot-password" onClick={(e) => { e.preventDefault(); navigate('/forgot-password') }}>
                  Forgot password?
                </a>
              </div>
            )}

            {error && <div className="auth-error">{error}</div>}

            <button type="submit" className="btn-primary auth-submit" disabled={loading}>
              {loading ? 'Please wait...' : isRegister ? 'Create Account' : 'Log In'}
              <span className="btn-shimmer" />
            </button>
          </form>

          <p className="auth-switch">
            {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
            <a href={isRegister ? '/login' : '/register'} onClick={(e) => {
              e.preventDefault()
              navigate(isRegister ? '/login' : '/register')
            }}>
              {isRegister ? 'Log in' : 'Sign up'}
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
