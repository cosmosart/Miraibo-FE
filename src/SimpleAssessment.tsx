import { useState, useEffect } from 'react'
import './App.css'

const EIKEN_GRADES = ['1', 'Pre-1', '2', 'Pre-2-Plus', 'Pre-2', '3', '4', '5']
const QUESTION_TYPES = ['Composition', 'Summary', 'Email']
const STUDENT_GRADES = [
  'General',
  'Pre-Elementary',
  'Lower Elementary',
  'Upper Elementary',
  'Middle School',
  'High School',
  'University',
  'Post graduation',
]

//const API_URL = 'https://miraibo-api-7n5a4c6z6a-an.a.run.app/v1/eiken_exam'
//const QUESTIONS_API = 'https://miraibo-api-7n5a4c6z6a-an.a.run.app/v1/show_questions'


const API_URL = 'http://localhost:8000/v1/eiken_exam'
const QUESTIONS_API = 'http://localhost:8000/v1/show_questions'

function SimpleAssessment() {
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
    question_id: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<any>(null)
  const [questions, setQuestions] = useState<{[id: string]: any}>({})
  const [fetchingQuestions, setFetchingQuestions] = useState(false)

  // Filter question types based on grade
  const filteredQuestionTypes = form.grade === '1' || form.grade === 'Pre-1'
    ? QUESTION_TYPES.filter(qt => qt !== 'Email')
    : QUESTION_TYPES

  useEffect(() => {
    const fetchQuestions = async () => {
      if (!form.grade || !form.question_type) {
        setQuestions({})
        return
      }
      setFetchingQuestions(true)
      setError(null)
      try {
        const params = new URLSearchParams({
          grade: form.grade,
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
  }, [form.grade, form.question_type])

  // When a question is selected, auto-fill min_words and max_words from the selected question
  useEffect(() => {
    if (form.question_id && questions[form.question_id]) {
      const q = questions[form.question_id];
      setForm(prev => ({
        ...prev,
        min_words: q.min_words ? String(q.min_words) : '',
        max_words: q.max_words ? String(q.max_words) : '',
      }));
    }
    if (!form.question_id) {
      setForm(prev => ({ ...prev, min_words: '', max_words: '' }));
    }
    // eslint-disable-next-line
  }, [form.question_id])

  // When questions are loaded, pick a random question_id if not already set
  useEffect(() => {
    if (Object.keys(questions).length > 0 && !form.question_id) {
      const keys = Object.keys(questions);
      const randomId = keys[Math.floor(Math.random() * keys.length)];
      setForm(prev => ({
        ...prev,
        question_id: randomId,
        min_words: questions[randomId]?.min_words ? String(questions[randomId].min_words) : '',
        max_words: questions[randomId]?.max_words ? String(questions[randomId].max_words) : '',
      }));
    }
    // eslint-disable-next-line
  }, [questions])

  // When grade or question_type changes (from left nav or form), reset question_id and min/max words
  // useEffect(() => {
  //   setForm(prev => ({
  //     ...prev,
  //     question_id: '',
  //     min_words: '',
  //     max_words: '',
  //   }));
  // }, [form.grade, form.question_type])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    // If changing grade or question_type, reset question_id and min/max words
    if (e.target.name === 'grade' || e.target.name === 'question_type') {
      setForm({
        ...form,
        [e.target.name]: e.target.value,
        question_id: '',
        min_words: '',
        max_words: '',
      })
    } else {
      setForm({ ...form, [e.target.name]: e.target.value })
    }
  }

  // If user does not select a question_id, pick one at random before submit
  const getSelectedQuestionId = () => {
    if (form.question_id) return form.question_id;
    const keys = Object.keys(questions);
    if (keys.length > 0) {
      return keys[Math.floor(Math.random() * keys.length)];
    }
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)
    // Use selected or random question
    const selectedQuestionId = getSelectedQuestionId();
    const selectedQuestion = selectedQuestionId && questions[selectedQuestionId] ? questions[selectedQuestionId].question : form.question;
    const minWords = selectedQuestionId && questions[selectedQuestionId] ? questions[selectedQuestionId].min_words : form.min_words;
    const maxWords = selectedQuestionId && questions[selectedQuestionId] ? questions[selectedQuestionId].max_words : form.max_words;
    const payload = {
      eiken_data: {
        additional_instructions: undefined, // No additional instructions in simple mode
        grade: form.grade,
        min_words: Number(minWords),
        max_words: Number(maxWords),
        question: selectedQuestion,
        question_type: form.question_type.toLowerCase(),
        underlined: form.underlined || '',
      },
      question_id: selectedQuestionId || '',
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
        throw new Error(`Failed to get assessment (status: ${res.status})\n${errorText}`)
      }
      const data = await res.json()
      setResult(data)
    } catch (err: any) {
      setError(err.message + (err.cause ? `\nCause: ${err.cause}` : ''))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main id="root">
      <h1>Assessment</h1>
      <form className="eiken-form" onSubmit={handleSubmit} aria-label="Simple Eiken assessment form">
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
              {filteredQuestionTypes.map(qt => <option key={qt} value={qt}>{qt}</option>)}
            </select>
          </label>
        </div>
        {fetchingQuestions ? (
          <div>Loading questions...</div>
        ) : form.grade && form.question_type && Object.keys(questions).length === 0 ? (
          <div style={{marginTop: '1em', color: '#b00'}}>No questions available for this grade and type.</div>
        ) : Object.keys(questions).length > 0 ? (
          <>
            {/* Show the randomly selected question ID and the question, divided into two pieces, no highlight */}
            {form.question_id && questions[form.question_id] && (
              <>
                <div style={{marginTop: '1em', padding: '1em', color: '#222', textAlign: 'left'}}>
                  <b>Question ID:</b> {form.question_id}
                </div>
                <div style={{marginTop: '1em', background: '#f6f8fa', padding: '1em', borderRadius: 8, color: '#222', textAlign: 'left'}}>
                  <b>Selected Question:</b>
                  <div style={{marginTop: '0.5em'}}>
                    {form.question_type === 'Composition' ? (
                      <>
                        <div>● Write an essay on the given TOPIC.</div>
                        <div>● Give THREE reasons to support your answer.</div>
                        <div>● Structure: introduction, main body, and conclusion</div>
                        <div>● Suggested length: {form.min_words} {form.max_words} words</div>
                        <div style={{marginTop: '0.7em'}}>Any writing outside the space will not be graded.</div>
                        <div style={{marginTop: '1em', fontWeight: 600}}>TOPIC</div>
                        <div style={{marginTop: '0.5em'}}>{questions[form.question_id].question}</div>
                      </>
                    ) : form.question_type === 'Summary' ? (
                      <>
                        <div>Read the article below and summarize it in your own words as far as possible in English.</div>
                        <div>● Summarize it between {form.min_words} and {form.max_words} words.</div>
                        <div style={{marginTop: '1em', fontWeight: 600}}>{questions[form.question_id].question}</div>
                      </>
                    ) : (
                      <div style={{marginTop: '0.5em'}}>{questions[form.question_id].question}</div>
                    )}
                  </div>
                </div>
              </>
            )}
          </>
        ) : null}
        {/* Only show these fields for input on Simple page */}
        <div className="form-row">
          <label>
            Min Words
            <input name="min_words" type="number" min={1} value={form.min_words} readOnly style={{background:'#eee'}} />
          </label>
          <label>
            Max Words
            <input name="max_words" type="number" min={1} value={form.max_words} readOnly style={{background:'#eee'}} />
          </label>
        </div>
        <div className="form-row">
          <label>
            Student Name
            <input name="student_name" value={form.student_name} onChange={handleChange} required />
          </label>
          <label>
            Student Grade
            <select name="student_grade" value={form.student_grade || 'General'} onChange={handleChange} required>
              {STUDENT_GRADES.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
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
        {/* Hide all other fields on Simple page */}
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

export default SimpleAssessment
