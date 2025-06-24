import { useState, useEffect } from 'react'
import './App.css'
import { API_URL, QUESTIONS_API } from './apiConfig';

const EIKEN_GRADES = [
  '1級', '準1級', '2級', '準2級プラス', '準2級', '3級'
]
const EIKEN_GRADES_API_MAP: { [key: string]: string } = {
  '1級': '1',
  '準1級': 'Pre-1',
  '2級': '2',
  '準2級プラス': 'Pre-2-Plus',
  '準2級': 'Pre-2',
  '3級': '3',
}
const QUESTION_TYPES = ['作文', '要約', 'Eメール']
const STUDENT_GRADES = [
  '一般',
  '小学校低学年',
  '小学校高学年',
  '中学生',
  '高校生',
  '大学生',
  '大学院生',
]

function SimpleAssessmentJa() {
  const [form, setForm] = useState({
    grade: '',
    min_words: '',
    max_words: '',
    question: '',
    question_type: '',
    underlined: '',
    student_name: '',
    student_grade: '一般',
    teacher_id: '',
    student_answer: '',
    question_id: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<any>(null)
  const [questionObj, setQuestionObj] = useState<any>(null)
  const [fetchingQuestions, setFetchingQuestions] = useState(false)

  // 日本語のタイプ名をAPI用に変換
  const apiQuestionType = (type: string) => {
    if (type === '作文') return 'composition';
    if (type === '要約') return 'summary';
    if (type === 'Eメール') return 'email';
    return type.toLowerCase();
  }

  // グレードによるタイプフィルタ
  const filteredQuestionTypes = (form.grade === '1級' || form.grade === '準1級')
    ? QUESTION_TYPES.filter(qt => qt !== 'Eメール')
    : QUESTION_TYPES

  useEffect(() => {
    const fetchQuestion = async () => {
      if (!form.grade || !form.question_type) {
        setQuestionObj(null)
        return
      }
      setFetchingQuestions(true)
      setError(null)
      try {
        const params = new URLSearchParams({
          grade: EIKEN_GRADES_API_MAP[form.grade] || form.grade,
          question_type: apiQuestionType(form.question_type),
        })
        const res = await fetch(`${QUESTIONS_API}?${params.toString()}`)
        if (!res.ok) throw new Error('問題の取得に失敗しました')
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
        setError('問題の取得に失敗しました: ' + err.message)
        setQuestionObj(null)
      } finally {
        setFetchingQuestions(false)
      }
    }
    fetchQuestion()
  }, [form.grade, form.question_type])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
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
        additional_instructions: undefined,
        grade: form.grade,
        min_words: Number(minWords),
        max_words: Number(maxWords),
        question: selectedQuestion,
        question_type: apiQuestionType(form.question_type),
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
        throw new Error(`採点に失敗しました (status: ${res.status})\n${errorText}`)
      }
      const data = await res.json()
      setResult(data)
    } catch (err: any) {
      setError(err.message + (err.cause ? `\n原因: ${err.cause}` : ''))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main id="root">
      <h1>英検アセスメント</h1>
      <form className="eiken-form" onSubmit={handleSubmit} aria-label="英検アセスメントフォーム">
        <div className="form-row">
          <label>
            グレード
            <select name="grade" value={form.grade} onChange={handleChange} required>
              <option value="">グレードを選択</option>
              {EIKEN_GRADES.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </label>
          <label>
            問題タイプ
            <select name="question_type" value={form.question_type} onChange={handleChange} required>
              <option value="">タイプを選択</option>
              {filteredQuestionTypes.map(qt => <option key={qt} value={qt}>{qt}</option>)}
            </select>
          </label>
        </div>
        {fetchingQuestions ? (
          <div>問題を取得中...</div>
        ) : form.grade && form.question_type && !questionObj ? (
          <div style={{marginTop: '1em', color: '#b00'}}>このグレードとタイプの問題がありません。</div>
        ) : questionObj ? (
          <>
            <div style={{marginTop: '1em', padding: '1em', color: '#222', textAlign: 'left'}}>
              <b>問題ID:</b> {form.question_id}
            </div>
            <div style={{marginTop: '1em', background: '#f6f8fa', padding: '1em', borderRadius: 8, color: '#222', textAlign: 'left'}}>
              <b>出題内容:</b>
              <div style={{marginTop: '0.5em'}}>
                {form.question_type === '作文' ? (
                  <>
                    <div>● 指定されたトピックについてエッセイを書いてください。</div>
                    <div>● あなたの答えをサポートする理由を3つ挙げてください。</div>
                    <div>● 構成: 導入・本文・結論</div>
                    <div>● 目安: {form.min_words}-{form.max_words}語</div>
                    <div style={{marginTop: '0.7em'}}>枠外の記述は採点されません。</div>
                    <div style={{marginTop: '1em', fontWeight: 600}}>トピック</div>
                    <div style={{marginTop: '0.5em'}}>{form.question}</div>
                  </>
                ) : form.question_type === '要約' ? (
                  <>
                    <div>下記の文章を読み、できるだけ自分の言葉で要約してください。</div>
                    <div>● {form.min_words}～{form.max_words}語でまとめてください。</div>
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
            生徒氏名
            <input name="student_name" value={form.student_name} onChange={handleChange} required />
          </label>
          <label>
            生徒学年
            <select name="student_grade" value={form.student_grade} onChange={handleChange} required>
              {STUDENT_GRADES.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </label>
        </div>
        <label>
          教員ID
          <input name="teacher_id" value={form.teacher_id} onChange={handleChange} required />
        </label>
        <label>
          生徒解答
          <textarea name="student_answer" value={form.student_answer} onChange={handleChange} required rows={5} />
        </label>
        <button type="submit" disabled={loading}>{loading ? '送信中...' : '送信'}</button>
      </form>
      {error && <div className="error" role="alert">{error}</div>}
      {result && (
        <section className="result" aria-live="polite">
          <h2>アセスメント結果</h2>
          <div style={{textAlign:'left'}}>
            <p><b>生徒:</b> {result.student_name} ({result.student_grade})</p>
            <p><b>教員ID:</b> {result.teacher_id}</p>
            <p><b>試験タイプ:</b> {result.exam_type} ({result.exam_grade})</p>
            <p><b>課題ID:</b><br/> {result.result_id}</p>
            <hr />
            {result.the_result && typeof result.the_result === 'object' ? (
              <>
                <p><b>総合フィードバック:</b> {result.the_result.overall_feedback}</p>
                <p><b>良い点:</b> <ul>{result.the_result.strengths?.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul></p>
                <p><b>改善点:</b> <ul>{result.the_result.weaknesses?.map((w: string, i: number) => <li key={i}>{w}</li>)}</ul></p>
                <p><b>改善提案:</b> <ul>{result.the_result.improvement_suggestions?.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul></p>
                {result.the_result.example_answers && <p><b>模範解答:</b> {result.the_result.example_answers}</p>}
                <p><b>改善プラン:</b> {result.the_result.improvement_plan}</p>
                <p><b>スコア:</b></p>
                <ul>
                  <li>理由: {result.the_result.reasons_score}</li>
                  <li>構成: {result.the_result.structure_score}</li>
                  <li>語数: {result.the_result.length_score}</li>
                  <li>内容: {result.the_result.content_score}</li>
                  <li>一貫性: {result.the_result.cohesion_score}</li>
                  <li>語彙: {result.the_result.vocabulary_score}</li>
                  <li>文法: {result.the_result.grammar_score}</li>
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

export default SimpleAssessmentJa
