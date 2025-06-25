import { useState, useEffect } from 'react'
import './App.css'
import { API_URL, QUESTIONS_API } from './apiConfig';

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

function getTeacherIdFromUrl() {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    return params.get('teacher_id') || '';
  }
  return '';
}

function getReviewTypeFromUrl() {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    return params.get('review_type') || 'practice';
  }
  return 'practice';
}

function AssessmentEn() {
  const [form, setForm] = useState({
    exam_grade: '',
    min_words: '',
    max_words: '',
    question: '',
    question_type: '',
    underlined: '',
    student_name: '',
    student_grade: 'General',
    teacher_id: getTeacherIdFromUrl(),
    student_answer: '',
    question_id: '',
    assistant_name: 'voxa',
    review_type: getReviewTypeFromUrl(),
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<any>(null)
  const [questionObj, setQuestionObj] = useState<any>(null)
  const [fetchingQuestions, setFetchingQuestions] = useState(false)

  const filteredQuestionTypes = form.exam_grade === '1' || form.exam_grade === 'Pre-1'
    ? QUESTION_TYPES.filter(qt => qt !== 'Email')
    : QUESTION_TYPES

  useEffect(() => {
    const fetchQuestion = async () => {
      if (!form.exam_grade || !form.question_type) {
        setQuestionObj(null)
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
        if (!res.ok) throw new Error('Failed to fetch question')
        const data = await res.json()
        if (data && typeof data === 'object') {
          const keys = Object.keys(data)
          if (keys.length > 0) {
            const firstKey = keys[0]
            const q = data[firstKey]
            setQuestionObj(q)
            setForm(prev => ({
              ...prev,
              question_id: firstKey || '',
              min_words: q.min_words ? String(q.min_words) : '',
              max_words: q.max_words ? String(q.max_words) : '',
              question: q.question || '',
            }))
          } else {
            setQuestionObj(null)
          }
        } else {
          setQuestionObj(null)
        }
      } catch (err: any) {
        setError('Could not fetch question: ' + err.message)
        setQuestionObj(null)
      } finally {
        setFetchingQuestions(false)
      }
    }
    fetchQuestion()
  }, [form.exam_grade, form.question_type])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    if (e.target.name === 'exam_grade' || e.target.name === 'question_type') {
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

  const getSelectedQuestionId = () => {
    if (form.question_id) return form.question_id;
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)
    const selectedQuestionId = getSelectedQuestionId();
    const selectedQuestion = selectedQuestionId && questionObj ? questionObj.question : form.question;
    const minWords = selectedQuestionId && questionObj ? questionObj.min_words : form.min_words;
    const maxWords = selectedQuestionId && questionObj ? questionObj.max_words : form.max_words;
    const payload = {
      eiken_data: {
        additional_instructions: undefined, // No additional instructions in simple mode
        exam_grade: form.exam_grade,
        min_words: Number(minWords),
        max_words: Number(maxWords),
        question: selectedQuestion,
        question_type: form.question_type.toLowerCase(),
        underlined: form.underlined || '',
        assistant_name: form.assistant_name,
        review_type: form.review_type,
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

  const getUnderlined = () => {
    if (form.underlined && form.underlined.trim() !== '') return form.underlined.trim();
    if (questionObj && questionObj.underlined && String(questionObj.underlined).trim() !== '') return String(questionObj.underlined).trim();
    return '';
  };

  if (!form.teacher_id) {
    return (
      <main id="root">
        <h1>Eiken Assessment</h1>
        <div style={{marginBottom: '1em', fontWeight: 500, color: '#b00'}}>
          Please provide a teacher ID.
        </div>
      </main>
    );
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
      {form.teacher_id && (
        <div style={{marginBottom: '1em', fontWeight: 500, color: '#333'}}>
          Teacher ID: <span style={{fontFamily: 'monospace'}}>{form.teacher_id}</span>
        </div>
      )}
      <div style={{marginBottom:8, color:'#777', fontSize:'0.97em'}}>
        <b>Review Type:</b> {form.review_type}
      </div>
      <AssistantSelector value={form.assistant_name} onChange={e => setForm({ ...form, assistant_name: e.target.value })} />
      <form className="eiken-form" onSubmit={handleSubmit} aria-label="Simple Eiken assessment form">
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
              {filteredQuestionTypes.map(qt => <option key={qt} value={qt}>{qt}</option>)}
            </select>
          </label>
        </div>
        {fetchingQuestions ? (
          <div>Loading questions...</div>
        ) : form.exam_grade && form.question_type && !questionObj ? (
          <div style={{marginTop: '1em', color: '#b00'}}>No question available for this grade and type.</div>
        ) : questionObj ? (
          <>
            <div style={{marginTop: '1em', padding: '1em', color: '#222', textAlign: 'left'}}>
              <b>Question ID:</b> {form.question_id}
            </div>
            <div style={{marginTop: '1em', background: '#f6f8fa', padding: '1em', borderRadius: 8, color: '#222', textAlign: 'left'}}>
              <b>Selected Question:</b>
              <div style={{marginTop: '0.5em'}}>
                {form.question_type.toLowerCase() === 'composition' ? (
                  <>
                    <div>● Write an essay on the given TOPIC.</div>
                    <div>● Give {getUnderlined() && `${getUnderlined()}`} reasons to support your answer.</div>
                    <div>● Structure: introduction, main body, and conclusion</div>
                    <div>● Suggested length: {form.min_words}-{form.max_words} words</div>
                    <div style={{marginTop: '0.7em'}}>Any writing outside the space will not be graded.</div>
                    <div style={{marginTop: '1em', fontWeight: 600}}>TOPIC</div>
                    <div style={{marginTop: '0.5em'}}>{form.question}</div>
                    {form.exam_grade !== '1' && form.exam_grade !== 'Pre-1' && Array.isArray(questionObj?.additional_instructions) && questionObj.additional_instructions.filter((pt: any) => typeof pt === 'string' && pt.trim().length > 0).length > 0 && (
                      <div style={{marginTop: '1em'}}>
                        <div style={{fontWeight: 600}}>Points</div>
                        <ul style={{marginTop: '0.5em'}}>
                          {questionObj.additional_instructions.filter((pt: any) => typeof pt === 'string' && pt.trim().length > 0).map((pt: string, idx: number) => (
                            <li key={idx}>{pt.trim()}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                ) : form.question_type.toLowerCase() === 'summary' ? (
                  <>
                    <div>Read the article below and summarize it in your own words as far as possible in English.</div>
                    <div>● Summarize it between {form.min_words} and {form.max_words} words.</div>
                    <div style={{marginTop: '1em', fontWeight: 600}}>{form.question}</div>
                  </>
                ) : (
                  <div style={{marginTop: '0.5em'}}>{form.question}</div>
                )}
              </div>
            </div>
          </>
        ) : null}
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
          Student Answer
          <textarea name="student_answer" value={form.student_answer} onChange={handleChange} required rows={5} />
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
            <p><b>Assignment ID:</b><br/> {result.result_id}</p>
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

export default AssessmentEn
