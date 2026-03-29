import { useState, useEffect, useRef, useCallback } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import AuthPage from './pages/AuthPage'
import Dashboard from './pages/Dashboard'
import InterviewPage from './pages/InterviewPage'
import ResultsPage from './pages/ResultsPage'
import GradingRubric from './pages/GradingRubric'
import CandidateProfile from './pages/CandidateProfile'
import JobPostingsPage from './pages/JobPostingsPage'
import InterviewHub from './pages/InterviewHub'
import CompanyProfile from './pages/CompanyProfile'
import CompanyJobs from './pages/CompanyJobs'
import CompanyApplicants from './pages/CompanyApplicants'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import './App.css'


/* ──────────────────────────────────────────────
   PROTECTED ROUTE WRAPPER
   ────────────────────────────────────────────── */
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  return user ? children : <Navigate to="/login" replace />
}


/* ──────────────────────────────────────────────
   WELCOME SCREEN — cinematic entrance
   ────────────────────────────────────────────── */
function WelcomeScreen({ onEnter }) {
  const canvasRef = useRef(null)
  const mouse = useRef({ x: 0.5, y: 0.5 })
  const particles = useRef([])
  const animFrame = useRef(null)
  const [phase, setPhase] = useState(0)

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 300)
    const t2 = setTimeout(() => setPhase(2), 900)
    const t3 = setTimeout(() => setPhase(3), 1500)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let w, h
    const resize = () => { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight }
    resize()

    const COUNT = 70
    particles.current = Array.from({ length: COUNT }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 1.5 + 0.5, opacity: Math.random() * 0.4 + 0.1,
    }))

    window.addEventListener('resize', resize)

    const draw = () => {
      ctx.clearRect(0, 0, w, h)
      const mx = mouse.current.x * w, my = mouse.current.y * h

      const g1 = ctx.createRadialGradient(mx * 0.8 + w * 0.1, my * 0.6, 0, mx * 0.8 + w * 0.1, my * 0.6, 600)
      g1.addColorStop(0, 'rgba(100, 60, 255, 0.07)'); g1.addColorStop(1, 'transparent')
      ctx.fillStyle = g1; ctx.fillRect(0, 0, w, h)

      const g2 = ctx.createRadialGradient(mx, my, 0, mx, my, 400)
      g2.addColorStop(0, 'rgba(0, 212, 255, 0.1)'); g2.addColorStop(0.5, 'rgba(100, 60, 255, 0.04)'); g2.addColorStop(1, 'transparent')
      ctx.fillStyle = g2; ctx.fillRect(0, 0, w, h)

      const g3 = ctx.createRadialGradient(w - mx * 0.5, h - my * 0.3, 0, w - mx * 0.5, h - my * 0.3, 500)
      g3.addColorStop(0, 'rgba(255, 50, 120, 0.04)'); g3.addColorStop(1, 'transparent')
      ctx.fillStyle = g3; ctx.fillRect(0, 0, w, h)

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.025)'; ctx.lineWidth = 0.5
      const gs = 80
      for (let x = 0; x < w; x += gs) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke() }
      for (let y = 0; y < h; y += gs) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke() }

      particles.current.forEach((p) => {
        const dx = mx - p.x, dy = my - p.y, dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 250) { p.vx += (dx / dist) * 0.015; p.vy += (dy / dist) * 0.015 }
        p.x += p.vx; p.y += p.vy; p.vx *= 0.99; p.vy *= 0.99
        if (p.x < 0) p.x = w; if (p.x > w) p.x = 0; if (p.y < 0) p.y = h; if (p.y > h) p.y = 0
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(150, 130, 255, ${p.opacity})`; ctx.fill()
      })

      for (let i = 0; i < particles.current.length; i++) {
        for (let j = i + 1; j < particles.current.length; j++) {
          const a = particles.current[i], b = particles.current[j]
          const d = Math.hypot(a.x - b.x, a.y - b.y)
          if (d < 100) {
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y)
            ctx.strokeStyle = `rgba(150, 130, 255, ${0.06 * (1 - d / 100)})`; ctx.lineWidth = 0.5; ctx.stroke()
          }
        }
      }
      animFrame.current = requestAnimationFrame(draw)
    }
    draw()
    return () => { window.removeEventListener('resize', resize); cancelAnimationFrame(animFrame.current) }
  }, [])

  const handleMouseMove = useCallback((e) => {
    mouse.current.x = e.clientX / window.innerWidth
    mouse.current.y = e.clientY / window.innerHeight
  }, [])

  const handleClick = () => {
    setPhase(-1)
    setTimeout(onEnter, 700)
  }

  return (
    <div className={`welcome ${phase === -1 ? 'exit' : ''}`} onMouseMove={handleMouseMove} onClick={handleClick}>
      <canvas ref={canvasRef} className="welcome-canvas" />
      <div className="noise-overlay" />

      <div className="welcome-content">
        <div className={`welcome-badge ${phase >= 1 ? 'in' : ''}`}>
          Optima
        </div>
        <h1 className={`welcome-title ${phase >= 2 ? 'in' : ''}`}>
          <span className="title-line">Welcome to the future</span>
          <span className="title-line title-gradient">of hiring</span>
        </h1>
        <p className={`welcome-sub ${phase >= 2 ? 'in' : ''}`}>AI-powered interviews. Real connections.</p>
        <div className={`welcome-cta ${phase >= 3 ? 'in' : ''}`}>
          <div className="cta-ring"><span className="cta-dot" /></div>
          <span>Click anywhere to begin</span>
        </div>
      </div>

      <div className="corners">
        <span className="c tl" /><span className="c tr" />
        <span className="c bl" /><span className="c br" />
      </div>
      <div className="scanline" />
    </div>
  )
}


/* ──────────────────────────────────────────────
   LANDING PAGE
   ────────────────────────────────────────────── */
function LandingPage() {
  const [visible, setVisible] = useState(false)
  const navigate = useNavigate()
  const { user } = useAuth()

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    const els = document.querySelectorAll('.reveal')
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('revealed'); obs.unobserve(e.target) }
      })
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' })
    els.forEach((el) => obs.observe(el))
    return () => obs.disconnect()
  }, [visible])

  const handleCardMouse = (e) => {
    const card = e.currentTarget
    const rect = card.getBoundingClientRect()
    card.style.setProperty('--mx', `${e.clientX - rect.left}px`)
    card.style.setProperty('--my', `${e.clientY - rect.top}px`)
  }

  const features = [
    {
      icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="10" r="3" /><path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662" /></svg>,
      title: 'Smart Interview Matching',
      desc: 'Complete a weekly connecting interview and get matched to companies whose job postings fit your answers and skills.',
    },
    {
      icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="22" /></svg>,
      title: 'Mock Interview Practice',
      desc: 'Practice with AI-generated questions tailored to your target role. Get instant feedback and a score to track your progress.',
    },
    {
      icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5Z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></svg>,
      title: 'AI-Powered Scoring',
      desc: 'Claude AI evaluates every answer for key points, depth, and relevance — providing constructive feedback to help you improve.',
    },
    {
      icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83" /><path d="M22 12A10 10 0 0 0 12 2v10z" /></svg>,
      title: 'Compatibility Rankings',
      desc: 'Companies see candidates ranked by a multi-factor compatibility score — interview performance, answer relevance, skills, and resume.',
    },
    {
      icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" /></svg>,
      title: 'Browse & Save Job Postings',
      desc: 'Explore open roles from companies actively hiring on Optima. Save favourites to focus your next connecting interview on the jobs that excite you most.',
    },
    {
      icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>,
      title: 'Employer Hiring Dashboard',
      desc: 'Post jobs, set required skills, and receive a ranked list of matched candidates automatically — no inbox flooded with unqualified applications.',
    },
  ]

  const steps = [
    { num: '01', title: 'Build Your Profile', desc: 'Add your skills, resume, and desired roles. The more complete your profile, the better your matches.' },
    { num: '02', title: 'Take a Connecting Interview', desc: 'Once a week, complete an 8-question AI interview tailored to your favourite job postings.' },
    { num: '03', title: 'Get Connected', desc: 'Top candidates are automatically surfaced to matching companies. No applications. No wasted time.' },
  ]

  const CountUp = ({ target, suffix = '' }) => {
    const ref = useRef(null)
    const counted = useRef(false)
    useEffect(() => {
      if (!visible) return
      const obs = new IntersectionObserver(([e]) => {
        if (e.isIntersecting && !counted.current) {
          counted.current = true
          const el = ref.current; const start = performance.now(); const duration = 1400
          const tick = (now) => {
            const t = Math.min((now - start) / duration, 1)
            el.textContent = Math.round(target * (1 - Math.pow(1 - t, 3))) + suffix
            if (t < 1) requestAnimationFrame(tick)
          }
          requestAnimationFrame(tick)
        }
      }, { threshold: 0.5 })
      if (ref.current) obs.observe(ref.current)
      return () => obs.disconnect()
    }, [visible, target, suffix])
    return <span ref={ref}>0{suffix}</span>
  }

  if (!visible) return null

  return (
    <div className="site">
      <div className="noise-overlay" />
      <div className="aurora">
        <div className="aurora-blob a1" /><div className="aurora-blob a2" /><div className="aurora-blob a3" />
      </div>

      <nav className="nav">
        <div className="nav-logo"><span className="nav-dot" />Optima</div>
        <div className="nav-links"><a href="#features">Features</a><a href="#how">How It Works</a></div>
        <div className="nav-right">
          {user ? (
            <button className="btn-nav" onClick={() => navigate('/dashboard')}>Dashboard <span className="btn-shimmer" /></button>
          ) : (
            <>
              <a className="nav-link" href="/login" onClick={(e) => { e.preventDefault(); navigate('/login') }}>Log In</a>
              <button className="btn-nav" onClick={() => navigate('/register')}>Sign Up <span className="btn-shimmer" /></button>
            </>
          )}
        </div>
      </nav>

      <section className="hero">
        <div className="hero-grid" /><div className="hero-spotlight" />
        <div className="hero-content">
          <div className="hero-badge reveal"><span className="badge-pulse" />AI-Powered Hiring Platform</div>
          <h1 className="hero-title reveal" style={{ '--d': '0.1s' }}>Better interviews.<br /><span className="gradient-text">Real connections.</span></h1>
          <p className="hero-desc reveal" style={{ '--d': '0.2s' }}>Optima connects qualified candidates directly to the right companies through AI-scored interviews that replace the noise of traditional job applications.</p>
          <div className="hero-btns reveal" style={{ '--d': '0.3s' }}>
            <button className="btn-primary" onClick={() => navigate('/register?role=candidate')}>
              Join as Candidate <span className="btn-shimmer" />
            </button>
            <button className="btn-ghost" onClick={() => navigate('/register?role=company')}>
              Post Jobs as a Company <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17L17 7" /><path d="M7 7h10v10" /></svg>
            </button>
          </div>
        </div>
        <div className="stats reveal" style={{ '--d': '0.4s' }}>
          <div className="stat"><span className="stat-num stat-text">Weekly</span><span className="stat-label">Connecting Interviews</span></div>
          <div className="stat-div" />
          <div className="stat"><span className="stat-num stat-text">Multi-Factor</span><span className="stat-label">Compatibility Score</span></div>
          <div className="stat-div" />
          <div className="stat"><span className="stat-num stat-text">Anthropic AI</span><span className="stat-label">Answer Evaluation</span></div>
        </div>
      </section>

      <section className="features" id="features">
        <div className="section-head reveal"><span className="tag">Features</span><h2>Everything you need to <span className="gradient-text">find the right fit</span></h2><p>AI-driven interviews and matching that saves time for both candidates and companies.</p></div>
        <div className="feat-grid">
          {features.map((f, i) => (
            <div className="feat-card reveal" key={i} style={{ '--d': `${i * 0.08}s` }} onMouseMove={handleCardMouse}>
              <div className="feat-card-glow" /><div className="feat-icon">{f.icon}</div><h3>{f.title}</h3><p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="how" id="how">
        <div className="section-head reveal"><span className="tag">How It Works</span><h2>Three steps to <span className="gradient-text">your next opportunity</span></h2><p>No endless applications. Just one weekly interview and AI handles the matching.</p></div>
        <div className="steps">
          {steps.map((s, i) => (
            <div className="step reveal" key={i} style={{ '--d': `${i * 0.1}s` }}>
              <div className="step-num">{s.num}</div><h3>{s.title}</h3><p>{s.desc}</p>
              {i < steps.length - 1 && <div className="step-line" />}
            </div>
          ))}
        </div>
      </section>

      <section className="cta-section">
        <div className="cta-glow" />
        <h2 className="reveal">Ready to find your next opportunity?</h2>
        <p className="reveal" style={{ '--d': '0.1s' }}>Join as a candidate or post jobs as a company — it's free to start.</p>
        <div className="hero-btns reveal" style={{ '--d': '0.2s' }}>
          <button className="btn-primary btn-lg" onClick={() => navigate('/register?role=candidate')}>
            Get Started as Candidate <span className="btn-shimmer" />
          </button>
          <button className="btn-ghost" onClick={() => navigate('/register?role=company')}>
            Sign Up as Company <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17L17 7" /><path d="M7 7h10v10" /></svg>
          </button>
        </div>
      </section>

      <footer className="footer">
        <div className="footer-inner">
          <div className="nav-logo"><span className="nav-dot" />Optima</div>
          <p>Built for the future of hiring.</p>
        </div>
      </footer>
    </div>
  )
}


/* ──────────────────────────────────────────────
   HOME
   ────────────────────────────────────────────── */
function Home() {
  const [entered, setEntered] = useState(false)
  return entered ? <LandingPage /> : <WelcomeScreen onEnter={() => setEntered(true)} />
}


/* ──────────────────────────────────────────────
   APP — Routes
   ────────────────────────────────────────────── */
function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<AuthPage />} />
      <Route path="/register" element={<AuthPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/interview" element={<ProtectedRoute><InterviewPage /></ProtectedRoute>} />
      <Route path="/results/:sessionId" element={<ProtectedRoute><ResultsPage /></ProtectedRoute>} />
      <Route path="/rubric" element={<ProtectedRoute><GradingRubric /></ProtectedRoute>} />

      {/* Candidate pages */}
      <Route path="/profile" element={<ProtectedRoute><CandidateProfile /></ProtectedRoute>} />
      <Route path="/job-postings" element={<ProtectedRoute><JobPostingsPage /></ProtectedRoute>} />
      <Route path="/interview-hub" element={<ProtectedRoute><InterviewHub /></ProtectedRoute>} />

      {/* Company pages */}
      <Route path="/company/profile" element={<ProtectedRoute><CompanyProfile /></ProtectedRoute>} />
      <Route path="/company/jobs" element={<ProtectedRoute><CompanyJobs /></ProtectedRoute>} />
      <Route path="/company/jobs/:jobId/applicants" element={<ProtectedRoute><CompanyApplicants /></ProtectedRoute>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
