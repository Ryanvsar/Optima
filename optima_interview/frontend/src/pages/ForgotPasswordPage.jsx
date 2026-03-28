import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import './AuthPage.css'

export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    setSubmitted(true)
  }

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
          <h1>Reset Password</h1>
          <p className="auth-sub">
            {submitted
              ? 'If that email exists, a reset link will be sent shortly.'
              : 'Enter your email and we\'ll send you a reset link.'}
          </p>

          {!submitted ? (
            <form onSubmit={handleSubmit} className="auth-form">
              <label>
                <span>Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </label>

              <div className="auth-error" style={{ background: 'rgba(251,191,36,0.07)', borderColor: 'rgba(251,191,36,0.2)', color: '#fbbf24' }}>
                Password reset emails are coming soon. Please contact support to reset your account.
              </div>

              <button type="submit" className="btn-primary auth-submit">
                Send Reset Link <span className="btn-shimmer" />
              </button>
            </form>
          ) : (
            <div className="auth-form">
              <button
                className="btn-primary auth-submit"
                onClick={() => navigate('/login')}
              >
                Back to Login <span className="btn-shimmer" />
              </button>
            </div>
          )}

          <p className="auth-switch">
            Remember your password?{' '}
            <a href="/login" onClick={(e) => { e.preventDefault(); navigate('/login') }}>
              Log in
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
