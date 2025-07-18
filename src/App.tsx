import { useState, useEffect } from 'react'
import './App.css'
import { API_URL, QUESTIONS_API } from './apiConfig';

// Define the Eiken question/request types
const EIKEN_GRADES = ['1', 'Pre-1', '2', 'Pre-2-Plus', 'Pre-2', '3']
const QUESTION_TYPES = ['Composition', 'Summary', 'Email']
const ASSISTANT_NAMES = [
  { value: 'thena', label: 'Thena', tip: 'Knowledgeable, strict veteran.' },
  { value: 'lumo', label: 'Lumo', tip: 'Fast and rigorous expert.' },
  { value: 'voxa', label: 'Voxa', tip: 'Balanced and reliable.' },
  { value: 'zuno', label: 'Zuno', tip: 'Flexible and quick responder.' },
  { value: 'pico', label: 'Pico', tip: 'Lightweight and speedy newcomer.' },
];
const ASSISTANT_TIPS: { [key: string]: string } = {
  thena: 'Knowledgeable, strict veteran.',
  lumo: 'Fast and rigorous expert.',
  voxa: 'Balanced and reliable.',
  zuno: 'Flexible and quick responder.',
  pico: 'Lightweight and speedy newcomer.',
};

function getReviewTypeFromUrl() {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    return params.get('review_type') || 'practice';
  }
  return 'practice';
}

function App() {
  const [form, setForm] = useState({
    exam_grade: '',
    min_words: '',
    max_words: '',
    question: '',
    question_type: '',
    underlined: '',
    student_name: '',
    student_grade: '',
    teacher_id: '',
    student_answer: '',
    question_id: '',
    assistant_name: 'voxa',
    review_type: getReviewTypeFromUrl(),
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<any>(null)
  const [additionalInstructions, setAdditionalInstructions] = useState<string[]>([])
  const [newInstruction, setNewInstruction] = useState('')
  const [questions, setQuestions] = useState<{[id: string]: any}>({})
  const [fetchingQuestions, setFetchingQuestions] = useState(false)

  useEffect(() => {
    const fetchQuestions = async () => {
      if (!form.exam_grade || !form.question_type) {
        setQuestions({})
        return
      }
      setFetchingQuestions(true)
      setError(null)
      try {
        const params = new URLSearchParams({
          exam_grade: form.exam_grade,
          question_type: form.question_type.toLowerCase(),
        })
        const res = await fetch(`${QUESTIONS_API}?${params.toString()}`)
        if (!res.ok) throw new Error('Failed to fetch questions')
        const data = await res.json()
        if (data && typeof data === 'object') {
          setQuestions(data)
        } else {
          setQuestions({})
        }
      } catch (err: any) {
        setError('Could not fetch question list: ' + err.message)
        setQuestions({})
      } finally {
        setFetchingQuestions(false)
      }
    }
    fetchQuestions()
  }, [form.exam_grade, form.question_type])

  // When a question is selected, auto-fill min_words, max_words, and question, and make them read-only
  useEffect(() => {
    if (form.question_id && questions[form.question_id]) {
      const q = questions[form.question_id];
      setForm(prev => ({
        ...prev,
        min_words: q.min_words ? String(q.min_words) : '',
        max_words: q.max_words ? String(q.max_words) : '',
        question: q.question || '',
      }));
    }
    // Only clear if question_id is cleared
    if (!form.question_id) {
      setForm(prev => ({ ...prev, min_words: '', max_words: '', question: '' }));
    }
    // eslint-disable-next-line
  }, [form.question_id])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleAddInstruction = () => {
    if (newInstruction.trim()) {
      setAdditionalInstructions([...additionalInstructions, newInstruction.trim()])
      setNewInstruction('')
    }
  }
  const handleRemoveInstruction = (idx: number) => {
    setAdditionalInstructions(additionalInstructions.filter((_, i) => i !== idx))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)
    const payload = {
      eiken_data: {
        additional_instructions: additionalInstructions.length > 0 ? additionalInstructions : undefined,
        exam_grade: form.exam_grade,
        min_words: Number(form.min_words),
        max_words: Number(form.max_words),
        question: form.question,
        question_type: form.question_type.toLowerCase(),
        underlined: form.underlined || undefined,
        question_id: form.question_id || undefined,
        assistant_name: form.assistant_name,
        review_type: form.review_type,
      },
      uuid: crypto.randomUUID(),
      student_name: form.student_name,
      student_grade: form.student_grade,
      teacher_id: form.teacher_id,
      student_answer: form.student_answer,
    }
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'accept': 'application/json',
        },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        let errorText = await res.text();
        console.error('Request payload:', payload);
        console.error('Response status:', res.status);
        console.error('Response text:', errorText);
        throw new Error(`Failed to get assessment (status: ${res.status})\n${errorText}`)
      }
      const data = await res.json()
      setResult(data)
    } catch (err: any) {
      console.error(err);
      setError(err.message + (err.cause ? `\nCause: ${err.cause}` : ''))
    } finally {
      setLoading(false)
    }
  }

  // Assistant selector separate from main form
  function AssistantSelector({ value, onChange }: { value: string, onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void }) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <label htmlFor="assistant_name" style={{ fontWeight: 500, minWidth: 70 }}>Assistant</label>
        <select id="assistant_name" name="assistant_name" value={value} onChange={onChange} style={{ minWidth: 90 }}>
          {ASSISTANT_NAMES.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <div style={{ minWidth: 200, textAlign: 'left', color: '#555', fontSize: '0.98em', marginLeft: 8 }}>
          {ASSISTANT_TIPS[value]}
        </div>
      </div>
    );
  }

  return (
    <main id="root">
      <h1>Eiken Assessment</h1>
      <form className="eiken-form" onSubmit={handleSubmit} aria-label="Eiken assessment form">
        <AssistantSelector value={form.assistant_name} onChange={e => setForm({ ...form, assistant_name: e.target.value })} />
        <div className="form-row">
          <label>
            Exam Grade
            <select name="exam_grade" value={form.exam_grade} onChange={handleChange} required>
              <option value="">Select grade</option>
              {EIKEN_GRADES.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </label>
          <label>
            Question Type
            <select name="question_type" value={form.question_type} onChange={handleChange} required>
              <option value="">Select type</option>
              {QUESTION_TYPES.map(qt => <option key={qt} value={qt}>{qt}</option>)}
            </select>
          </label>
        </div>
        {fetchingQuestions ? (
          <div>Loading questions...</div>
        ) : Object.keys(questions).length > 0 ? (
          <>
            <label>
              Question ID
              <select name="question_id" value={form.question_id} onChange={handleChange} required>
                <option value="">Select question ID</option>
                {Object.entries(questions).map(([qid, qobj]: [string, any]) => (
                  <option key={qid} value={qid}>
                    {qid} - {qobj.question.replace(/\s+/g, ' ').trim().slice(0, 60)}
                  </option>
                ))}
              </select>
            </label>
            {/* Show the question text for the selected ID */}
            {form.question_id && questions[form.question_id] && (
              <div style={{marginTop: '1em', background: '#f6f8fa', padding: '1em', borderRadius: 8, color: '#222', textAlign: 'left'}}>
                <b>Selected Question:</b>
                <div style={{marginTop: '0.5em'}}>{questions[form.question_id].question}</div>
              </div>
            )}
          </>
        ) : null}
        <div className="form-row">
          <label>
            Min Words
            <input name="min_words" type="number" min={1} value={form.min_words} onChange={handleChange} required readOnly={!!form.question_id} style={form.question_id ? {background:'#eee'} : {}} />
          </label>
          <label>
            Max Words
            <input name="max_words" type="number" min={1} value={form.max_words} onChange={handleChange} required readOnly={!!form.question_id} style={form.question_id ? {background:'#eee'} : {}} />
          </label>
        </div>
        <label>
          Question
          <textarea name="question" value={form.question} onChange={handleChange} required rows={3} readOnly={!!form.question_id} style={form.question_id ? {background:'#eee'} : {}} />
        </label>
        <label>
          Underlined (optional)
          <input name="underlined" value={form.underlined} onChange={handleChange} />
        </label>
        <div className="form-row">
          <label>
            Student Name
            <input name="student_name" value={form.student_name} onChange={handleChange} required />
          </label>
          <label>
            Student Grade
            <input name="student_grade" value={form.student_grade} onChange={handleChange} required />
          </label>
        </div>
        <label>
          Teacher ID
          <input name="teacher_id" value={form.teacher_id} onChange={handleChange} required />
        </label>
        {form.teacher_id && (
          <div style={{marginBottom: '1em', fontWeight: 500, color: '#333'}}>
            Teacher ID: <span style={{fontFamily: 'monospace'}}>{form.teacher_id}</span>
          </div>
        )}
        <div style={{marginBottom:8, color:'#777', fontSize:'0.97em'}}>
          <b>Review Type:</b> {form.review_type}
        </div>
        <label>
          Student Answer
          <textarea name="student_answer" value={form.student_answer} onChange={handleChange} required rows={5} />
        </label>
        <label>
          Additional Instructions (optional)
          <div style={{display:'flex', gap:'0.5em', alignItems:'center', marginBottom:'0.5em'}}>
            <input
              type="text"
              value={newInstruction}
              onChange={e => setNewInstruction(e.target.value)}
              placeholder="Add instruction"
            />
            <button type="button" onClick={handleAddInstruction} disabled={!newInstruction.trim()}>Add</button>
          </div>
          <ul style={{margin:0, paddingLeft:'1.2em'}}>
            {additionalInstructions.map((inst, idx) => (
              <li key={idx} style={{display:'flex', alignItems:'center', gap:'0.5em'}}>
                <span>{inst}</span>
                <button type="button" aria-label="Remove instruction" onClick={() => handleRemoveInstruction(idx)} style={{fontSize:'0.9em', color:'#b00020', background:'none', border:'none', cursor:'pointer'}}>✕</button>
              </li>
            ))}
          </ul>
        </label>
        <button type="submit" disabled={loading}>{loading ? 'Submitting...' : 'Submit'}</button>
      </form>
      {error && <div className="error" role="alert">{error}</div>}
      {result && (
        <section className="result" aria-live="polite">
          <h2>Assessment Result</h2>
          <div style={{textAlign:'left'}}>
            <p><b>Student:</b> {result.student_name} ({result.student_grade})</p>
            <p><b>Teacher ID:</b> {result.teacher_id}</p>
            <p><b>Exam Type:</b> {result.exam_type} ({result.exam_grade})</p>
            <p><b>Assignment ID:</b> {result.assignment_id} ({result.assignment_grade})</p>
            <hr />
            {result.the_result && typeof result.the_result === 'object' ? (
              <>
                <p><b>Overall Feedback:</b> {result.the_result.overall_feedback}</p>
                <p><b>Strengths:</b> <ul>{result.the_result.strengths?.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul></p>
                <p><b>Weaknesses:</b> <ul>{result.the_result.weaknesses?.map((w: string, i: number) => <li key={i}>{w}</li>)}</ul></p>
                <p><b>Improvement Suggestions:</b> <ul>{result.the_result.improvement_suggestions?.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul></p>
                {result.the_result.example_answers && <p><b>Example Answers:</b> {result.the_result.example_answers}</p>}
                <p><b>Improvement Plan:</b> {result.the_result.improvement_plan}</p>
                <p><b>Scores:</b></p>
                <ul>
                  <li>Reasons: {result.the_result.reasons_score}</li>
                  <li>Structure: {result.the_result.structure_score}</li>
                  <li>Length: {result.the_result.length_score}</li>
                  <li>Content: {result.the_result.content_score}</li>
                  <li>Cohesion: {result.the_result.cohesion_score}</li>
                  <li>Vocabulary: {result.the_result.vocabulary_score}</li>
                  <li>Grammar: {result.the_result.grammar_score}</li>
                </ul>
                {result.the_result.gemini_internal_summary && <details><summary>Gemini Internal Summary</summary><pre>{result.the_result.gemini_internal_summary}</pre></details>}
              </>
            ) : (
              <pre>{JSON.stringify(result.the_result, null, 2)}</pre>
            )}
            {/* Always print the full raw result for debugging */}
            <hr />
            <details open>
              <summary>Raw API Response</summary>
              <pre>{JSON.stringify(result, null, 2)}</pre>
            </details>
          </div>
        </section>
      )}
    </main>
  )
}

export default App
