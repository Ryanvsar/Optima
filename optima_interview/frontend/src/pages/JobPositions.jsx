import Navbar from '../components/Navbar'
import './GradingRubric.css'

export default function JobPositions() {
  return (
    <div className="site">
      <div className="noise-overlay" />
      <div className="aurora">
        <div className="aurora-blob a1" />
        <div className="aurora-blob a2" />
      </div>
      <Navbar />

      <div className="empty-page">
        <h1>Job Positions</h1>
        <p>Available positions from companies will appear here soon.</p>
      </div>
    </div>
  )
}
