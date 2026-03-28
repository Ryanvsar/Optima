import { useState, useEffect, useRef, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { startInterview, submitInterview, speakText } from '../api/client'
import Navbar from '../components/Navbar'
import './InterviewPage.css'

const VERBAL_TIME = 5 * 60  // 5 minutes in seconds
const CODE_TIME = 10 * 60   // 10 minutes in seconds

function formatTime(secs) {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function InterviewPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { jobTitle, industry, sessionType = 'mock', favouriteJobIds = [] } = location.state || {}

  const [sessionId, setSessionId] = useState(null)
  const [questions, setQuestions] = useState([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [answers, setAnswers] = useState({})
  const [phase, setPhase] = useState('loading')
  const [error, setError] = useState('')
  const [timeLeft, setTimeLeft] = useState(0)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [cameraOn, setCameraOn] = useState(false)
  const [cameraError, setCameraError] = useState(false)
  const timerRef = useRef(null)
  const autoAdvanceRef = useRef(false)
  const audioRef = useRef(null)
  const blobUrlRef = useRef(null)
  const recognitionRef = useRef(null)
  const recordingBaseRef = useRef('')
  const videoRef = useRef(null)
  const streamRef = useRef(null)

  const isConnecting = sessionType === 'connecting'

  // Derived state — must be declared before any useCallback that references it
  const currentQ = questions[currentIdx]

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setCameraOn(false)
  }, [])

  const startCamera = useCallback(() => {
    setCameraError(false)
    navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      .then((stream) => {
        streamRef.current = stream
        setCameraOn(true)
      })
      .catch(() => {
        setCameraError(true)
        setCameraOn(false)
      })
  }, [])

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
    setIsRecording(false)
  }, [])

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording()
      return
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Try Chrome or Edge.')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'
    recognitionRef.current = recognition

    // Save the text already in the box before we start
    recordingBaseRef.current = answers[currentQ?.id] || ''

    recognition.onresult = (event) => {
      let interim = ''
      let final = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript
        if (event.results[i].isFinal) final += t
        else interim += t
      }
      // Commit final words to base, show interim as preview
      if (final) {
        const sep = recordingBaseRef.current ? ' ' : ''
        recordingBaseRef.current = recordingBaseRef.current + sep + final.trim()
      }
      const preview = interim
        ? recordingBaseRef.current + (recordingBaseRef.current ? ' ' : '') + interim
        : recordingBaseRef.current
      setAnswers((a) => ({ ...a, [currentQ.id]: preview }))
    }

    recognition.onend = () => {
      // Commit base (without interim) if recognition ends unexpectedly
      setAnswers((a) => ({ ...a, [currentQ.id]: recordingBaseRef.current }))
      recognitionRef.current = null
      setIsRecording(false)
    }

    recognition.onerror = () => {
      recognitionRef.current = null
      setIsRecording(false)
    }

    recognition.start()
    setIsRecording(true)
  }, [isRecording, stopRecording, answers, currentQ])

  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.onended = null
      audioRef.current.onerror = null
      audioRef.current = null
    }
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current)
      blobUrlRef.current = null
    }
    setIsSpeaking(false)
  }, [])

  // Start interview on mount
  useEffect(() => {
    if (isConnecting) {
      if (!favouriteJobIds || favouriteJobIds.length === 0) {
        navigate('/job-postings')
        return
      }
      startInterview({
        session_type: 'connecting',
        favourite_job_ids: favouriteJobIds,
      })
        .then((res) => {
          setSessionId(res.session_id)
          setQuestions(res.questions)
          setPhase('interview')
        })
        .catch((err) => { setError(err.message); setPhase('error') })
    } else {
      if (!jobTitle || !industry) { navigate('/dashboard'); return }
      startInterview({
        job_title: jobTitle,
        industry,
        session_type: 'mock',
      })
        .then((res) => {
          setSessionId(res.session_id)
          setQuestions(res.questions)
          setPhase('interview')
        })
        .catch((err) => { setError(err.message); setPhase('error') })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Attach stream to video element once it's rendered
  useEffect(() => {
    if (cameraOn && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
    }
  }, [cameraOn])

  // Start camera when interview begins
  useEffect(() => {
    if (phase === 'interview') startCamera()
  }, [phase]) // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup audio, recording, and camera on unmount
  useEffect(() => {
    return () => { stopSpeaking(); stopRecording(); stopCamera() }
  }, [stopSpeaking, stopRecording, stopCamera])

  // Stop recording when question changes
  useEffect(() => {
    stopRecording()
  }, [currentIdx]) // eslint-disable-line react-hooks/exhaustive-deps

  // Reset timer when question changes
  useEffect(() => {
    if (phase !== 'interview' || !currentQ) return
    const limit = currentQ.question_type === 'code' ? CODE_TIME : VERBAL_TIME
    setTimeLeft(limit)
    autoAdvanceRef.current = false

    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current)
          autoAdvanceRef.current = true
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [currentIdx, phase, currentQ])

  // Auto-play TTS when question changes (1s delay so card animation settles first)
  useEffect(() => {
    if (phase !== 'interview' || !currentQ) return

    stopSpeaking()
    let cancelled = false

    const delay = setTimeout(() => {
      speakText(currentQ.question_text)
      .then((url) => {
        if (cancelled) { URL.revokeObjectURL(url); return }
        blobUrlRef.current = url
        const audio = new Audio(url)
        audioRef.current = audio
        audio.onplay = () => setIsSpeaking(true)
        audio.onended = () => {
          setIsSpeaking(false)
          blobUrlRef.current && URL.revokeObjectURL(blobUrlRef.current)
          blobUrlRef.current = null
          audioRef.current = null
        }
        audio.onerror = () => {
          setIsSpeaking(false)
          audioRef.current = null
        }
        audio.play().catch(() => setIsSpeaking(false))
      })
      .catch(() => {
        // TTS unavailable — silently continue
      })
    }, 1000)

    return () => { cancelled = true; clearTimeout(delay) }
  }, [currentIdx, phase]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = useCallback(async () => {
    stopSpeaking()
    stopRecording()
    stopCamera()
    if (timerRef.current) clearInterval(timerRef.current)
    setPhase('submitting')
    try {
      const answerPayload = questions.map((q) => ({
        question_id: q.id,
        answer: answers[q.id] || '',
      }))
      await submitInterview(sessionId, answerPayload)
      if (isConnecting) {
        navigate('/interview-hub')
      } else {
        navigate(`/results/${sessionId}`)
      }
    } catch (err) {
      setError(err.message)
      setPhase('interview')
    }
  }, [questions, answers, sessionId, navigate, isConnecting, stopSpeaking, stopRecording, stopCamera])

  useEffect(() => {
    if (!autoAdvanceRef.current) return
    autoAdvanceRef.current = false
    if (currentIdx < questions.length - 1) {
      setCurrentIdx((i) => i + 1)
    } else {
      handleSubmit()
    }
  }, [timeLeft, currentIdx, questions.length, handleSubmit])

  const handleAnswer = (text) => {
    setAnswers((a) => ({ ...a, [currentQ.id]: text }))
  }

  const handleNext = () => {
    if (currentIdx < questions.length - 1) setCurrentIdx((i) => i + 1)
  }

  const answeredCount = Object.values(answers).filter((a) => a.trim().length > 0).length
  const timerWarn = timeLeft <= 60
  const timerDanger = timeLeft <= 15

  // Loading screen
  if (phase === 'loading') {
    return (
      <div className="site">
        <div className="noise-overlay" />
        <div className="aurora"><div className="aurora-blob a1" /><div className="aurora-blob a2" /></div>
        <Navbar />
        <div className="interview-loading">
          <div className="loader" />
          {isConnecting ? (
            <>
              <h2>Generating interview...</h2>
              <p>Preparing tailored questions for your favourite roles</p>
            </>
          ) : (
            <>
              <h2>Generating interview...</h2>
              <p>Preparing {industry} questions for a {jobTitle} role</p>
            </>
          )}
        </div>
      </div>
    )
  }

  if (phase === 'error') {
    return (
      <div className="site">
        <div className="noise-overlay" />
        <Navbar />
        <div className="interview-loading">
          <h2>Something went wrong</h2>
          <p className="err-text">{error}</p>
          <button className="btn-primary" onClick={() => navigate('/dashboard')}>
            Back to Dashboard <span className="btn-shimmer" />
          </button>
        </div>
      </div>
    )
  }

  // Guard: questions loaded but currentQ not ready yet
  if (phase === 'interview' && !currentQ) {
    return (
      <div className="site">
        <div className="noise-overlay" />
        <div className="aurora"><div className="aurora-blob a1" /><div className="aurora-blob a2" /></div>
        <Navbar />
        <div className="interview-loading"><div className="loader" /></div>
      </div>
    )
  }

  if (phase === 'submitting') {
    return (
      <div className="site">
        <div className="noise-overlay" />
        <div className="aurora"><div className="aurora-blob a1" /><div className="aurora-blob a2" /></div>
        <Navbar />
        <div className="interview-loading">
          <div className="loader" />
          {isConnecting ? (
            <>
              <h2>Processing your connections...</h2>
              <p>Evaluating your answers and matching you with companies. This may take a moment.</p>
            </>
          ) : (
            <>
              <h2>Grading your answers...</h2>
              <p>Evaluating your responses. This may take a moment.</p>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="site">
      <div className="noise-overlay" />
      <div className="aurora"><div className="aurora-blob a1" /><div className="aurora-blob a2" /></div>
      <Navbar />

      <div className="interview">
        {/* Session type banner */}
        {isConnecting && (
          <div className="session-banner session-banner-connecting">
            Connecting Interview — Your answers are confidential and will not be shown to you after submission.
          </div>
        )}
        {!isConnecting && (
          <div className="session-banner session-banner-mock">
            Mock Interview — Practice mode. Full Q&amp;A breakdown available after submission.
          </div>
        )}

        {/* Progress + Timer */}
        <div className="interview-top">
          <div className="interview-progress">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
              />
            </div>
            <span className="progress-text">
              Question {currentIdx + 1} of {questions.length}
            </span>
          </div>

          <div className={`timer ${timerWarn ? 'warn' : ''} ${timerDanger ? 'danger' : ''}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
            {formatTime(timeLeft)}
          </div>
        </div>

        {/* Question card + camera pane */}
        <div className={`interview-body${cameraOn ? ' camera-active' : ''}`}>
          <div className="question-card" key={currentQ.id}>
            <div className="question-meta">
              <span className={`q-type ${currentQ.question_type}`}>
                {currentQ.question_type === 'code' ? 'Technical' : 'Verbal'}
              </span>
              {!isConnecting && <span className="q-industry">{industry}</span>}
              <span className="q-time-limit">
                {currentQ.question_type === 'code' ? '10 min' : '5 min'} limit
              </span>
            </div>

            <div className="question-text-row">
              <h2 className="question-text">{currentQ.question_text}</h2>
              {isSpeaking && (
                <div className="speaking-indicator" title="AI is reading the question">
                  <span className="wave-bar" />
                  <span className="wave-bar" />
                  <span className="wave-bar" />
                  <span className="wave-bar" />
                </div>
              )}
            </div>

            {isSpeaking && <div className="reading-line" />}

            {!cameraOn && (
              <button className="camera-on-inline-btn" onClick={startCamera}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 7l-7 5 7 5V7z" />
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                </svg>
                {cameraError ? 'Camera unavailable — retry' : 'Turn on camera'}
              </button>
            )}

            <textarea
              className={`answer-input${isRecording ? ' recording' : ''}`}
              placeholder="Type your answer here, or use the mic button to speak."
              value={answers[currentQ.id] || ''}
              onChange={(e) => handleAnswer(e.target.value)}
              rows={8}
            />

            <div className="answer-meta">
              <button
                type="button"
                className={`mic-btn${isRecording ? ' active' : ''}`}
                onClick={toggleRecording}
                title={isRecording ? 'Stop recording' : 'Speak your answer'}
              >
                {isRecording ? (
                  <>
                    <span className="mic-dot" />
                    Stop Recording
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                      <line x1="12" y1="19" x2="12" y2="22" />
                    </svg>
                    Speak Answer
                  </>
                )}
              </button>
              <span className="word-count">
                {(answers[currentQ.id] || '').split(/\s+/).filter(Boolean).length} words
              </span>
            </div>
          </div>

          {/* Camera pane — only rendered when on */}
          {cameraOn && (
            <div className="camera-pane">
              <video ref={videoRef} autoPlay playsInline muted className="camera-feed" />
              {!isConnecting && (
                <button className="camera-toggle-btn" onClick={stopCamera}>
                  Turn Off Camera
                </button>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="interview-nav">
          <div className="nav-dots">
            {questions.map((q, i) => (
              <div
                key={q.id}
                className={`nav-dot ${i === currentIdx ? 'current' : ''} ${answers[q.id]?.trim() ? 'answered' : ''} ${i < currentIdx ? 'past' : ''}`}
                title={`Question ${i + 1}`}
              />
            ))}
          </div>

          {currentIdx < questions.length - 1 ? (
            <button className="btn-primary" onClick={handleNext}>
              Next <span className="btn-shimmer" />
            </button>
          ) : (
            <button
              className="btn-primary submit-btn"
              onClick={handleSubmit}
              disabled={answeredCount === 0}
            >
              Submit All ({answeredCount}/{questions.length})
              <span className="btn-shimmer" />
            </button>
          )}
        </div>
      </div>

      {/* Skip TTS button — visible only while speaking */}
      {isSpeaking && (
        <button className="skip-tts-btn" onClick={stopSpeaking} title="Skip voice reading">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 4h4v16H6zm8 0h4v16h-4z" />
          </svg>
          Skip
        </button>
      )}
    </div>
  )
}
