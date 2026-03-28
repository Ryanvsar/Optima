import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Navbar.css'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <nav className="nav">
      <Link to={user ? '/dashboard' : '/'} className="nav-logo">
        <span className="nav-dot" />
        Optima
      </Link>

      {user && (
        <div className="nav-center">
          {user.role === 'candidate' ? (
            <>
              <Link to="/profile" className="nav-link">Profile</Link>
              <Link to="/job-postings" className="nav-link">Job Postings</Link>
              <Link to="/interview-hub" className="nav-link">Interview Hub</Link>
            </>
          ) : (
            <>
              <Link to="/company/profile" className="nav-link">About</Link>
              <Link to="/company/jobs" className="nav-link">Job Postings</Link>
            </>
          )}
        </div>
      )}

      <div className="nav-right">
        {user ? (
          <>
            <span className="nav-user">{user.name}</span>
            <button className="btn-nav" onClick={handleLogout}>Log Out</button>
          </>
        ) : (
          <>
            <Link to="/login" className="nav-link">Log In</Link>
            <Link to="/register" className="btn-nav">Sign Up</Link>
          </>
        )}
      </div>
    </nav>
  )
}
