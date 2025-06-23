import { useState } from 'react'
import './App.css'

// Define the Eiken question/request types
const EIKEN_GRADES = ['1', 'Pre-1', '2', 'Pre-2-Plus', 'Pre-2', '3', '4', '5']
const QUESTION_TYPES = ['Composition', 'Summary', 'Email']

const API_URL = 'https://miraibo-api-7n5a4c6z6a-an.a.run.app/v1/eiken_exam' // <-- Updated API endpoint

function App() {
  const [form, setForm] = useState({
    grade: '',
    min_words: '',
    max_words: '',
    question: '',
    question_type: '',
    underlined: '',
    student_name: '',
    student_grade: '',
    teacher_id: '',
    student_answer: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<any>(null)
  const [additionalInstructions, setAdditionalInstructions] = useState<string[]>([])
  const [newInstruction, setNewInstruction] = useState('')

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
        grade: form.grade,
        min_words: Number(form.min_words),
        max_words: Number(form.max_words),
        question: form.question,
        question_type: form.question_type,
        underlined: form.underlined || undefined,
      },
      uuid: crypto.randomUUID(),
      student_name: form.student_name,
      student_grade: form.student_grade,
      teacher_id: form.teacher_id,
      student_answer: form.student_answer,
    }
    try {
      // Try to log the payload and response for debugging
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

  return (
    <main id="root">
      <h1>Eiken Assessment Submission</h1>
      <form className="eiken-form" onSubmit={handleSubmit} aria-label="Eiken assessment form">
        <div className="form-row">
          <label>
            Grade
            <select name="grade" value={form.grade} onChange={handleChange} required>
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
        <div className="form-row">
          <label>
            Min Words
            <input name="min_words" type="number" min={1} value={form.min_words} onChange={handleChange} required />
          </label>
          <label>
            Max Words
            <input name="max_words" type="number" min={1} value={form.max_words} onChange={handleChange} required />
          </label>
        </div>
        <label>
          Question
          <textarea name="question" value={form.question} onChange={handleChange} required rows={3} />
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
          </div>
        </section>
      )}
    </main>
  )
}

export default App
