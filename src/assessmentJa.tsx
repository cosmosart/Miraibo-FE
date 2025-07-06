import { useState, useEffect } from 'react'
import './App.css'
import { API_URL, CONVERT_API, QUESTIONS_API } from './apiConfig';

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
const ASSISTANT_NAMES = [
  { value: 'thena', label: 'Thena' },
  { value: 'lumo', label: 'Lumo' },
  { value: 'voxa', label: 'Voxa' },
  { value: 'zuno', label: 'Zuno' },
  { value: 'pico', label: 'Pico' },
]
const ASSISTANT_TIPS: { [key: string]: string } = {
  thena: '知識豊富で厳しめのベテラン。',
  lumo: '素早く厳格な実力派。',
  voxa: 'バランスの取れた安定型。',
  zuno: '柔軟で反応の速いタイプ。',
  pico: '軽快で素早い新人。',
};

function AssessmentJa() {
  const [form, setForm] = useState({
    exam_grade: '',
    min_words: '',
    max_words: '',
    question: '',
    question_type: '',
    underlined: '',
    student_name: '',
    student_grade: '一般',
    teacher_id: getTeacherIdFromUrl(),
    student_answer: '',
    question_id: '',
    assistant_name: 'voxa', // default changed from 'thena' to 'voxa'
    review_type: getReviewTypeFromUrl(),
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<any>(null)
  const [questionObj, setQuestionObj] = useState<any>(null)
  const [fetchingQuestions, setFetchingQuestions] = useState(false)
  const [useHandwriting, setUseHandwriting] = useState(false)
  const [convertingHandwriting, setConvertingHandwriting] = useState(false)

  const apiQuestionType = (type: string) => {
    if (type === '作文') return 'composition';
    if (type === '要約') return 'summary';
    if (type === 'Eメール') return 'email';
    return type.toLowerCase();
  }

  const filteredQuestionTypes = (form.exam_grade === '1級' || form.exam_grade === '準1級')
    ? QUESTION_TYPES.filter(qt => qt !== 'Eメール')
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
          exam_grade: EIKEN_GRADES_API_MAP[form.exam_grade] || form.exam_grade,
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
  }, [form.exam_grade, form.question_type])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const getSelectedQuestionId = () => {
    if (form.question_id) return form.question_id;
    return '';
  };

  const handleHandwritingChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setConvertingHandwriting(true);
      setError(null);
      try {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const base64 = (reader.result as string).split(',')[1];
            const res = await fetch(CONVERT_API, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ image_file: base64 }),
            });
            if (!res.ok) throw new Error('手書きファイルの変換に失敗しました');
            const data = await res.json();
            let answer = '';
            if (typeof data === 'string') {
              answer = data;
            } else if (data && data.text) {
              answer = data.text;
            } else {
              throw new Error('手書きファイルの変換結果が不正です');
            }
            setForm(prev => ({ ...prev, student_answer: answer }));
          } catch (err: any) {
            setError('手書きファイルの変換に失敗しました: ' + err.message);
            setForm(prev => ({ ...prev, student_answer: '' }));
          } finally {
            setConvertingHandwriting(false);
          }
        };
        reader.onerror = () => {
          setError('ファイルの読み込みに失敗しました');
          setConvertingHandwriting(false);
        };
        reader.readAsDataURL(file);
      } catch (err: any) {
        setError('手書きファイルの変換に失敗しました: ' + err.message);
        setForm(prev => ({ ...prev, student_answer: '' }));
        setConvertingHandwriting(false);
      }
    } else {
      setForm(prev => ({ ...prev, student_answer: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)
    // No need to convert handwriting here, already handled on file upload
    let studentAnswer = form.student_answer;
    const selectedQuestionId = getSelectedQuestionId();
    const selectedQuestion = selectedQuestionId && questionObj ? questionObj.question : form.question;
    const minWords = selectedQuestionId && questionObj ? questionObj.min_words : form.min_words;
    const maxWords = selectedQuestionId && questionObj ? questionObj.max_words : form.max_words;
    const payload = {
      eiken_data: {
        additional_instructions: undefined,
        exam_grade: form.exam_grade,
        min_words: Number(minWords),
        max_words: Number(maxWords),
        question: selectedQuestion,
        question_type: apiQuestionType(form.question_type),
        underlined: form.underlined || '',
        assistant_name: form.assistant_name,
        review_type: form.review_type,
      },
      question_id: selectedQuestionId || '',
      uuid: crypto.randomUUID(),
      student_name: form.student_name,
      student_grade: form.student_grade,
      teacher_id: form.teacher_id,
      student_answer: studentAnswer,
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

  const getUnderlined = () => {
    if (form.underlined && form.underlined.trim() !== '') return form.underlined.trim();
    if (questionObj && questionObj.underlined && String(questionObj.underlined).trim() !== '') return String(questionObj.underlined).trim();
    return '';
  };

  if (!form.teacher_id) {
    return (
      <main id="root">
        <h1>英検アセスメント</h1>
        <div style={{marginBottom: '1em', fontWeight: 500, color: '#b00'}}>
          教員IDを入れてください。
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
        <div style={{ minWidth: 140, textAlign: 'left', color: '#888', fontSize: '0.8em', marginLeft: 8 }}>
          {ASSISTANT_TIPS[value]}
        </div>
      </div>
    );
  }

  // English template for grade 1 and Pre-1
  const EN_QUESTION_TEMPLATE = (
    <>
      <b>{form.question_type === '作文' ? 'English Composition' : form.question_type === '要約' ? 'English Summary' : 'Selected Question'}</b>
      <div style={{marginTop: '0.5em'}}>
        {form.question_type === '作文' ? (
          <>
            <div>● Write an essay on the given TOPIC.</div>
            <div>
              ● Give {getUnderlined() ? getUnderlined() : 'THREE'} reasons to support your answer.
            </div>
            <div>● Structure: introduction, main body, and conclusion</div>
            <div>● Suggested length: {form.min_words}-{form.max_words} words</div>
            <div style={{marginTop: '0.7em'}}>Any writing outside the space will not be graded.</div>
            <div style={{marginTop: '1em', fontWeight: 600}}>TOPIC</div>
            <div style={{marginTop: '0.5em'}}>{form.question}</div>
          </>
        ) : form.question_type === '要約' ? (
          <>
            <div>Read the article below and summarize it in your own words as far as possible in English.</div>
            <div>● Summarize it between {form.min_words} and {form.max_words} words.</div>
            <div style={{marginTop: '1em', fontWeight: 600}}>{form.question}</div>
          </>
        ) : (
          <div style={{marginTop: '0.5em'}}>{form.question}</div>
        )}
      </div>
    </>
  );

  function formatEmailContentWithUnderline(text: string, underline: string) {
    if (!text) return '';
    let formatted = text
      .replace(/(Hi,|Dear [^\n,]+,)/g, '$1\n')
      .replace(/(Best regards,|Your friend,|Sincerely,|Regards,)/g, '$1\n')
      .replace(/(\n\s*)+/g, '\n');
    formatted = formatted.replace(/(\n)([A-Z][a-z]+)$/gm, '\n$2');
    if (underline && underline.trim().length > 0) {
      // Split underline by newlines, punctuation, and also by spaces for multi-line/multi-phrase
      let underlineParts = underline.split(/\n|。|\.|!|\?|\s{2,}/).map(s => s.trim()).filter(Boolean);
      if (underlineParts.length === 0) underlineParts = [underline.trim()];
      underlineParts.forEach(part => {
        if (part.length === 0) return;
        // Match across newlines and whitespace, so use a regex with 's' flag
        const escaped = part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Match the part even if it is split by a line break in the text
        const underlineRegex = new RegExp(escaped.replace(/\s+/g, '\\s+'), 'gs');
        formatted = formatted.replace(underlineRegex, match => `<span style="text-decoration:underline;font-weight:500">${match}</span>`);
      });
    }
    // Return as JSX
    return <span dangerouslySetInnerHTML={{__html: formatted}} />;
  }

  return (
    <main id="root">
      <h1>英検アセスメント</h1>
      <div style={{marginBottom: '1em', fontWeight: 500, color: '#333'}}>
        教員ID: <span style={{fontFamily: 'monospace'}}>{form.teacher_id}</span>
      </div>
      <div style={{marginBottom:8, color:'#888', fontSize:'0.8em', textAlign:'left'}}>
        <b>Review type:</b> {form.review_type}
      </div>
      <AssistantSelector value={form.assistant_name} onChange={e => setForm({ ...form, assistant_name: e.target.value })} />
      {/* First form: all fields except student_answer and handwriting */}
      <form className="eiken-form" onSubmit={e => e.preventDefault()} aria-label="英検アセスメントフォーム-1">
        <div className="form-row">
          <label>
            グレード
            <select name="exam_grade" value={form.exam_grade} onChange={handleChange} required>
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
        ) : form.exam_grade && form.question_type && !questionObj ? (
          <div style={{marginTop: '1em', color: '#b00'}}>このグレードとタイプの問題がありません。</div>
        ) : questionObj ? (
          <>
            <div style={{marginTop: '1em', padding: '1em', color: '#222', textAlign: 'left'}}>
              <b>問題ID:</b> {form.question_id}
            </div>
            <div style={{marginTop: '1em', background: '#f6f8fa', padding: '1em', borderRadius: 8, color: '#222', textAlign: 'left'}}>
              {(form.exam_grade === '1級' || form.exam_grade === '準1級') ? (
                EN_QUESTION_TEMPLATE
              ) : (
                <>
                  <b>出題内容:</b>
                  <div style={{marginTop: '0.5em'}}>
                    {form.question_type === '作文' ? (
                      <>
                        <div>● 以下の TOPIC について，あなたの意見とその理由を{getUnderlined()}つ書きなさい。</div>
                        {form.exam_grade !== '1級' && form.exam_grade !== '準1級' && (
                          <div>● POINTS は理由を書く際の参考となる観点を示したものです。ただし，これら以外の観点から理由を書いてもかまいません。</div>
                        )}
                        <div>● 語数の目安は {form.min_words}語-{form.max_words}語です。</div>
                        <div>● 構成: 導入・本文・結論</div>
                        <div style={{marginTop: '0.7em'}}>枠外の記述は採点されません。</div>
                        <div style={{marginTop: '1em', fontWeight: 600}}>トピック</div>
                        <div style={{marginTop: '0.5em'}}>{form.question}</div>
                        {/* ポイント欄: 1級・準1級以外でadditional_instructionsがあれば表示 */}
                        {form.exam_grade !== '1級' && form.exam_grade !== '準1級' && (
                          Array.isArray(questionObj?.additional_instructions) && questionObj.additional_instructions.filter((pt: any) => typeof pt === 'string' && pt.trim().length > 0).length > 0 && (
                            <>
                              <div style={{fontWeight: 600, marginTop: '0.5em'}}>ポイント</div>
                              <ul style={{marginTop: '0.5em'}}>
                                {questionObj.additional_instructions.filter((pt: any) => typeof pt === 'string' && pt.trim().length > 0).map((pt: string, idx: number) => (
                                  <li key={idx}>{pt.trim()}</li>
                                ))}
                              </ul>
                            </>
                          )
                        )}
                      </>
                    ) : form.question_type === '要約' ? (
                      <>
                        <div>下記の文章を読み、できるだけ自分の言葉で要約してください。</div>
                        <div>● {form.min_words}～{form.max_words}語でまとめてください。</div>
                        <div style={{marginTop: '1em', fontWeight: 600}}>{form.question}</div>
                      </>
                    ) : form.question_type === 'Eメール' ? (
                      // Email formatting: break after greeting, after closing, and before signature
                      <div style={{whiteSpace: 'pre-line'}}>
                        {formatEmailContentWithUnderline(form.question, getUnderlined())}
                      </div>
                    ) : (
                      <div style={{marginTop: '0.5em'}}>{form.question}</div>
                    )}
                  </div>
                </>
              )}
            </div>
          </>
        ) : null}
        <div className="form-row">
          <label>
            Name
            <input name="student_name" value={form.student_name} onChange={handleChange} required />
          </label>
          <label>
            学年
            <select name="student_grade" value={form.student_grade} onChange={handleChange} required>
              {STUDENT_GRADES.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </label>
        </div>
      </form>
      {/* Handwriting controls moved under the first form */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 8, justifyContent: 'flex-start' }}>
        <input
          type="checkbox"
          id="useHandwriting"
          checked={useHandwriting}
          onChange={e => { setUseHandwriting(e.target.checked); if (!e.target.checked) { setForm(prev => ({ ...prev, student_answer: '' })); } }}
          style={{ margin: 0, alignSelf: 'flex-start' }}
        />
        <label htmlFor="useHandwriting" style={{ margin: 0, fontWeight: 400, whiteSpace: 'nowrap', alignSelf: 'flex-start' }}>手書きファイル付け</label>
        <input
          type="file"
          accept="image/png,image/jpeg,image/jpg"
          disabled={!useHandwriting}
          onChange={handleHandwritingChange}
          style={{ margin: 0, padding: 0, width: 'auto', minWidth: 0, alignSelf: 'flex-start' }}
        />
        {convertingHandwriting && <span style={{ color: '#888', marginLeft: 6, fontSize: '0.95em', alignSelf: 'flex-start' }}>変換中...</span>}
      </div>
      {/* Second form: student_answer and handwriting */}
      <form className="eiken-form" onSubmit={handleSubmit} aria-label="英検アセスメントフォーム-2">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 4 }}>
          <label style={{ flex: 1 }}>
            解答
            <textarea name="student_answer" value={form.student_answer} onChange={handleChange} required={!useHandwriting} disabled={useHandwriting} rows={7} />
          </label>
        </div>
        <button type="submit" disabled={loading}>{loading ? '送信中...' : '送信'}</button>
      </form>
      {error && <div className="error" role="alert">{error}</div>}
      {result && (
        <section className="result" aria-live="polite">
          <h2>アセスメント結果</h2>
          <div style={{textAlign:'left'}}>
            <p><b>生徒:</b> {result.student_name} ({result.student_grade})</p>
            <p><b>教員ID:</b> {result.teacher_id}</p>
            <p><b>試験グレード:</b> {result.exam_grade}</p>
            <p><b>レビュータイプ:</b> {result.review_type}</p>
            <p><b>課題ID:</b><br/> {result.result_id}</p>
            <hr />
            {result.the_result && typeof result.the_result === 'object' ? (
              <>
                <p><b>総合フィードバック:</b> {result.the_result.overall_feedback}</p>
                <p><b>良い点:</b> <ul>{result.the_result.strengths?.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul></p>
                {result.the_result.weaknesses && result.the_result.weaknesses.length > 0 && (
                  <p><b>改善点:</b> <ul>{result.the_result.weaknesses.map((w: string, i: number) => <li key={i}>{w}</li>)}</ul></p>
                )}
                {result.the_result.improvement_suggestions && result.the_result.improvement_suggestions.length > 0 && (
                  <p><b>改善提案:</b> <ul>{result.the_result.improvement_suggestions.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul></p>
                )}
                {result.the_result.exemplar_answer && (
                  <p><b>模範解答:</b> {result.the_result.exemplar_answer}</p>
                )}
                <p><b>スコア:</b></p>
                <ul>
                  <li>内容: {result.the_result.content_score}</li>
                  <li>構成: {result.the_result.structure_score}</li>
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

export default AssessmentJa
