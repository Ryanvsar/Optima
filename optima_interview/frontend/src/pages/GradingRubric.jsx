import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import './GradingRubric.css'

/* ──────────────────────────────────────────────
   SHARED DATA
   ────────────────────────────────────────────── */

const scoreTiers = [
  {
    range: '90 - 100%',
    label: 'Exceptional',
    color: '#00d4ff',
    candidate: 'You demonstrated expert-level knowledge and gave outstanding, well-structured answers. This score is rare and places you in the top tier of interviewees.',
    employer: 'Candidate demonstrated expert-level domain knowledge with comprehensive, well-structured answers using frameworks like STAR. Covered all key points with genuine depth and real-world examples. These candidates represent the top 5% and would likely excel in senior or lead roles. Immediate interview recommended.',
  },
  {
    range: '80 - 89%',
    label: 'Excellent',
    color: '#34d399',
    candidate: 'Your answers were thorough, specific, and showed strong knowledge. You covered nearly all the important points with real depth. This is a top-tier score.',
    employer: 'Near-complete coverage of expected key points with genuine depth of understanding. Communication is clear and confident. Candidates at this level demonstrate strong domain knowledge and can articulate complex ideas effectively. They are highly employable and should be prioritized in your pipeline.',
  },
  {
    range: '65 - 79%',
    label: 'Strong',
    color: '#a78bfa',
    candidate: 'This is where most well-prepared, capable professionals score. Your answers were solid with minor areas for improvement. Keep practicing and you\'ll push higher.',
    employer: 'This is the bell curve for competent, job-ready professionals. Answers are solid and cover the majority of key points, though there may be minor gaps in specificity or structure. These candidates are capable and ready for the role — they represent your primary talent pool. Consider them strong hires, especially when paired with good cultural fit.',
  },
  {
    range: '50 - 64%',
    label: 'Developing',
    color: '#fbbf24',
    candidate: 'You showed foundational understanding but your answers could be more specific and detailed. Try using concrete examples from your experience and structuring responses more clearly.',
    employer: 'Foundational understanding is present but answers lack depth, specificity, or structure. Candidates often give generic responses rather than concrete examples. May be suitable for junior roles or roles with strong mentorship structures. Consider if the gaps align with trainable skills vs. core requirements.',
  },
  {
    range: '30 - 49%',
    label: 'Needs Improvement',
    color: '#fb923c',
    candidate: 'There are gaps in your responses. Focus on studying the core concepts for your target role and practice giving structured, detailed answers.',
    employer: 'Significant gaps in domain knowledge or communication ability. Answers tend to be too short, off-topic, or superficial. Not recommended for mid-level or senior positions. May warrant a follow-up screening if the role is entry-level and the candidate shows potential in other areas.',
  },
  {
    range: '0 - 29%',
    label: 'Insufficient',
    color: '#ff4d6a',
    candidate: 'Your answers were too brief or didn\'t address the questions. Take time to learn the fundamentals of your target role and try again — practice makes perfect.',
    employer: 'Answers are missing, extremely brief, or fail to address the questions. Indicates the candidate is either unfamiliar with the subject area or did not engage meaningfully. Not recommended for outreach at this stage.',
  },
]


/* ──────────────────────────────────────────────
   CANDIDATE VIEW — simple, just score tiers
   ────────────────────────────────────────────── */
function CandidateRubric() {
  return (
    <div className="rubric">
      <div className="rubric-header">
        <span className="tag">Grading Rubric</span>
        <h1>Understanding your score</h1>
        <p>
          After each interview, you receive a score based on how well you answered the questions.
          Here's what each score range means and what to aim for.
        </p>
      </div>

      <div className="rubric-section">
        <p className="rubric-note">
          Most well-prepared professionals score in the <strong>65-79% (Strong)</strong> range.
          Anything above 80% is genuinely impressive. Don't be discouraged by a lower score — each
          practice session helps you improve.
        </p>
        <div className="tiers">
          {scoreTiers.map((t, i) => (
            <div className="tier-card" key={i}>
              <div className="tier-left" style={{ '--tc': t.color }}>
                <span className="tier-range">{t.range}</span>
                <span className="tier-label">{t.label}</span>
              </div>
              <p className="tier-desc">{t.candidate}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rubric-section">
        <h2>Tips to improve your score</h2>
        <div className="tips-grid">
          <div className="tip-card">
            <span className="tip-num">01</span>
            <h3>Be specific</h3>
            <p>Use real examples from your experience. "I built X which resulted in Y" is always stronger than "I have experience with X."</p>
          </div>
          <div className="tip-card">
            <span className="tip-num">02</span>
            <h3>Structure your answers</h3>
            <p>Use the STAR method (Situation, Task, Action, Result) for behavioral questions. For technical questions, explain your reasoning step by step.</p>
          </div>
          <div className="tip-card">
            <span className="tip-num">03</span>
            <h3>Hit the key points</h3>
            <p>Each question has specific concepts the evaluator looks for. Cover the core topics thoroughly rather than touching many topics superficially.</p>
          </div>
          <div className="tip-card">
            <span className="tip-num">04</span>
            <h3>Aim for 80-250 words</h3>
            <p>Too short means you're not giving enough detail. Too long means you're rambling. Find the sweet spot where every sentence adds value.</p>
          </div>
        </div>
      </div>
    </div>
  )
}


/* ──────────────────────────────────────────────
   EMPLOYER VIEW — detailed, full algorithm
   ────────────────────────────────────────────── */
function EmployerRubric() {
  return (
    <div className="rubric">
      <div className="rubric-header">
        <span className="tag">Employer Intelligence</span>
        <h1>Complete grading & matching methodology</h1>
        <p>
          A full breakdown of how candidates are evaluated, scored, and matched to your job postings.
          Use this to understand exactly what each score means for hiring decisions.
        </p>
      </div>

      {/* Section 1: Answer Grading */}
      <div className="rubric-section">
        <h2>1. How candidate answers are graded</h2>
        <p className="section-intro">Every answer to every question is individually scored by Claude AI using three weighted criteria:</p>

        <div className="criteria-grid">
          <div className="criteria-card">
            <div className="criteria-top">
              <h3>Key Points Coverage</h3>
              <span className="criteria-weight">50%</span>
            </div>
            <p>Each question has 3-5 pre-defined key points that a strong answer should address. The AI checks how many the candidate covered. For example, a system design question might expect mentions of scalability, caching, load balancing, and database choice. A candidate who covers 4/5 scores higher than one who covers 2/5.</p>
          </div>
          <div className="criteria-card">
            <div className="criteria-top">
              <h3>Depth of Understanding</h3>
              <span className="criteria-weight">30%</span>
            </div>
            <p>Does the candidate demonstrate genuine understanding or are they giving surface-level textbook answers? The AI evaluates whether responses include specific examples, real-world context, nuanced trade-offs, and evidence of hands-on experience. A candidate who explains WHY they chose an approach scores higher than one who just names it.</p>
          </div>
          <div className="criteria-card">
            <div className="criteria-top">
              <h3>Answer Quality & Structure</h3>
              <span className="criteria-weight">20%</span>
            </div>
            <p>Evaluates clarity, structure, and appropriate length. Answers under 30 words are penalized heavily (no substance). Answers over 400 words are penalized (unfocused). The ideal range is 80-250 words — concise but thorough. Use of frameworks like STAR is rewarded.</p>
          </div>
        </div>

        <div className="formula-box">
          <strong>Overall Score</strong> = Average of all individual question scores (each 0-100)
        </div>
      </div>

      {/* Section 2: Score Tiers */}
      <div className="rubric-section">
        <h2>2. What each score tier means for hiring</h2>
        <p className="section-intro">Scores are calibrated so that 80+ requires genuinely impressive answers. Here's how to interpret each tier when reviewing candidates:</p>

        <div className="tiers">
          {scoreTiers.map((t, i) => (
            <div className="tier-card" key={i}>
              <div className="tier-left" style={{ '--tc': t.color }}>
                <span className="tier-range">{t.range}</span>
                <span className="tier-label">{t.label}</span>
              </div>
              <p className="tier-desc">{t.employer}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Section 3: Job Matching */}
      <div className="rubric-section">
        <h2>3. How candidates are matched to your jobs</h2>
        <p className="section-intro">
          After a candidate completes an interview, their full set of answers is compared against
          each of your active job postings. The AI generates a <strong>match score (0-100)</strong> for
          every candidate-job pair, along with a written reasoning for the match.
        </p>

        <div className="match-algorithm">
          <div className="match-step">
            <div className="match-step-header">
              <span className="match-step-num">A</span>
              <h3>Skills Alignment — 40%</h3>
            </div>
            <p>The AI compares your job's <strong>required skills</strong> against what the candidate demonstrated in their answers. If you listed "React, TypeScript, API design" and the candidate's answers show deep React knowledge but no mention of TypeScript, the skills alignment reflects that partial match. This is the heaviest-weighted factor because skills are the most concrete hiring signal.</p>
          </div>

          <div className="match-step">
            <div className="match-step-header">
              <span className="match-step-num">B</span>
              <h3>Experience Relevance — 30%</h3>
            </div>
            <p>The AI evaluates whether the candidate's described experience aligns with your <strong>job description and responsibilities</strong>. A candidate interviewing for "Frontend Engineer" who describes building dashboards and component libraries will score higher against a frontend job than one who mostly describes backend work, even if both scored well on their interviews.</p>
          </div>

          <div className="match-step">
            <div className="match-step-header">
              <span className="match-step-num">C</span>
              <h3>Communication Quality — 15%</h3>
            </div>
            <p>Are the candidate's answers clear, well-organized, and professional? This factor evaluates how effectively the candidate communicates technical and behavioral concepts. Strong communicators score higher because communication ability is critical in virtually every role.</p>
          </div>

          <div className="match-step">
            <div className="match-step-header">
              <span className="match-step-num">D</span>
              <h3>Culture Fit Signals — 15%</h3>
            </div>
            <p>The AI looks for indicators of problem-solving ability, collaboration, initiative, and growth mindset in the candidate's answers. These soft signals are weighted lighter but help differentiate candidates with similar technical scores.</p>
          </div>
        </div>

        <div className="formula-box">
          <strong>Match Score</strong> = (Skills × 0.4) + (Experience × 0.3) + (Communication × 0.15) + (Culture × 0.15)
          <br />
          <span className="formula-note">Each dimension is scored 0-100 independently, then combined into the final match score.</span>
        </div>
      </div>

      {/* Section 4: How to use */}
      <div className="rubric-section">
        <h2>4. How to use match scores effectively</h2>
        <div className="usage-grid">
          <div className="usage-card">
            <h3>Write detailed job descriptions</h3>
            <p>The more specific your job description and required skills, the more accurate the matching. Vague descriptions lead to vague matches.</p>
          </div>
          <div className="usage-card">
            <h3>Match score ≠ interview score</h3>
            <p>A candidate might score 85% on their interview but only 60% match for your specific role if the skills don't align. Both numbers matter — the interview score shows ability, the match score shows fit.</p>
          </div>
          <div className="usage-card">
            <h3>Read the AI reasoning</h3>
            <p>Every match includes a written explanation of why the candidate was scored that way. Use this to quickly triage candidates before reviewing their full interview transcript.</p>
          </div>
          <div className="usage-card">
            <h3>Focus on 65%+ matches</h3>
            <p>Candidates with match scores above 65% are strong fits worth contacting. Scores above 80% are exceptional matches — reach out quickly before competitors do.</p>
          </div>
        </div>
      </div>

      {/* Section 5: Question generation */}
      <div className="rubric-section">
        <h2>5. How interview questions are generated</h2>
        <p className="section-intro">
          Questions are generated dynamically by Claude AI based on the candidate's chosen job title and industry.
          Each industry has a curated set of topic areas covering both technical and behavioral competencies.
        </p>
        <div className="gen-details">
          <div className="gen-row">
            <strong>Questions per session</strong>
            <span>8 (6 verbal/behavioral + 2 technical for technical roles)</span>
          </div>
          <div className="gen-row">
            <strong>Time limits</strong>
            <span>5 minutes per verbal question, 10 minutes per technical question</span>
          </div>
          <div className="gen-row">
            <strong>Key points</strong>
            <span>3-5 expected key points per question, generated alongside the question</span>
          </div>
          <div className="gen-row">
            <strong>Supported industries</strong>
            <span>Software Engineering, Data Science, Finance, Product Management, Marketing, UX Design</span>
          </div>
          <div className="gen-row">
            <strong>Auto-submit</strong>
            <span>When a question timer expires, the answer is locked and the next question begins</span>
          </div>
        </div>
      </div>
    </div>
  )
}


/* ──────────────────────────────────────────────
   MAIN EXPORT — switches based on role
   ────────────────────────────────────────────── */
export default function GradingRubric() {
  const { user } = useAuth()

  return (
    <div className="site">
      <div className="noise-overlay" />
      <div className="aurora">
        <div className="aurora-blob a1" />
        <div className="aurora-blob a2" />
      </div>
      <Navbar />

      {user?.role === 'company' ? <EmployerRubric /> : <CandidateRubric />}
    </div>
  )
}
