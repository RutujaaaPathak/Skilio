import { useState, useEffect, useCallback, useRef } from 'react'
import TeacherShell, { Icon } from '../../../components/TeacherShell.jsx'
import { evaluationService } from '../../../services/evaluationService.js'

const QUICK_FEEDBACK = [
  'Excellent explanation',
  'Good understanding',
  'Needs more detail',
  'Clear diagram',
  'Well structured',
  'Partially correct',
  'Missing key concept',
  'Good effort',
]

export default function EvaluationWorkspace({ page, setPage }) {
  const [examId, setExamId] = useState(null)
  const [studentId, setStudentId] = useState(null)
  const [submission, setSubmission] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState('')
  const [currentQIndex, setCurrentQIndex] = useState(0)
  const [marksInput, setMarksInput] = useState('')
  const [feedbackInput, setFeedbackInput] = useState('')
  const [flagValue, setFlagValue] = useState('none')
  const [flagNote, setFlagNote] = useState('')
  const [showFlagMenu, setShowFlagMenu] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiSuggestion, setAiSuggestion] = useState(null)
  const [error, setError] = useState(null)
  const saveTimer = useRef(null)
  const [viewMode, setViewMode] = useState('question') // question or student
  const [studentNavOpen, setStudentNavOpen] = useState(false)
  const [studentList, setStudentList] = useState([])

  useEffect(() => {
    const eid = localStorage.getItem('active_exam_id')
    const sid = localStorage.getItem('active_student_id')
    if (eid) setExamId(parseInt(eid))
    if (sid) setStudentId(parseInt(sid))
  }, [])

  useEffect(() => {
    if (!examId || !studentId) return
    setLoading(true)
    setError(null)
    Promise.all([
      evaluationService.getStudentSubmission(examId, studentId),
      evaluationService.getQueue(examId, { per_page: 100 }),
    ]).then(([sub, queue]) => {
      setSubmission(sub)
      setStudentList(queue.items || [])
      if (sub.questions?.length > 0) {
        const firstUnmarked = sub.questions.findIndex(q => !q.evaluation?.marks_awarded && q.evaluation?.marks_awarded !== 0)
        setCurrentQIndex(firstUnmarked >= 0 ? firstUnmarked : 0)
      }
    }).catch(err => setError(err?.detail || 'Failed to load submission'))
      .finally(() => setLoading(false))
  }, [examId, studentId])

  const currentQuestion = submission?.questions?.[currentQIndex]

  useEffect(() => {
    if (!currentQuestion) return
    setMarksInput(currentQuestion.evaluation?.marks_awarded != null ? String(currentQuestion.evaluation.marks_awarded) : '')
    setFeedbackInput(currentQuestion.evaluation?.feedback || '')
    setFlagValue(currentQuestion.evaluation?.flag || 'none')
    setFlagNote(currentQuestion.evaluation?.flag_note || '')
    setAiSuggestion(currentQuestion.evaluation?.ai_suggested_marks != null ? {
      suggested_marks: currentQuestion.evaluation.ai_suggested_marks,
      confidence: currentQuestion.evaluation.ai_confidence,
      reason: currentQuestion.evaluation.ai_reason,
    } : null)
  }, [currentQIndex, currentQuestion])

  const saveEvaluation = useCallback(async (marks, feedback, flag, note) => {
    if (!examId || !studentId || !currentQuestion) return
    setSaving(true)
    setSaveStatus('Saving...')
    try {
      await evaluationService.saveEvaluation(examId, {
        student_id: studentId,
        question_id: currentQuestion.question_id,
        marks_awarded: marks !== '' ? parseFloat(marks) : null,
        feedback: feedback || '',
        flag: flag || 'none',
        flag_note: note || '',
      })
      setSaveStatus('Saved')
      setTimeout(() => setSaveStatus(''), 2000)
      if (submission) {
        const qs = [...submission.questions]
        const idx = qs.findIndex(q => q.question_id === currentQuestion.question_id)
        if (idx >= 0) {
          qs[idx] = { ...qs[idx], evaluation: { ...qs[idx].evaluation, marks_awarded: marks !== '' ? parseFloat(marks) : null, feedback: feedback || '', flag: flag || 'none', flag_note: note || '', evaluated_at: new Date().toISOString() } }
          setSubmission({ ...submission, questions: qs })
        }
      }
    } catch {
      setSaveStatus('Error saving')
    } finally {
      setSaving(false)
    }
  }, [examId, studentId, currentQuestion, submission])

  const handleMarksChange = (val) => {
    const maxMarks = currentQuestion?.marks || 0
    if (val === '') { setMarksInput(''); return }
    const num = parseFloat(val)
    if (!isNaN(num)) setMarksInput(String(Math.min(Math.max(num, 0), maxMarks)))
    else setMarksInput(val)
  }

  const handleSave = () => {
    saveEvaluation(marksInput, feedbackInput, flagValue, flagNote)
  }

  const handleSaveNext = () => {
    saveEvaluation(marksInput, feedbackInput, flagValue, flagNote).then(() => {
      if (currentQIndex < (submission?.questions?.length || 1) - 1) {
        setCurrentQIndex(i => i + 1)
      }
    })
  }

  const handleQuickMark = (val) => {
    setMarksInput(String(val))
  }

  const handleQuickFeedback = (text) => {
    const current = feedbackInput
    const separator = current ? '. ' : ''
    setFeedbackInput(current + separator + text)
  }

  const handleRequestAI = async () => {
    if (!examId || !studentId || !currentQuestion) return
    setAiLoading(true)
    try {
      const result = await evaluationService.requestAISuggestion(examId, studentId, currentQuestion.question_id)
      setAiSuggestion(result)
    } catch {
      setAiSuggestion({ suggested_marks: 0, confidence: 0, reason: 'AI service unavailable. Try again later.' })
    } finally {
      setAiLoading(false)
    }
  }

  const handleApplyAI = () => {
    if (aiSuggestion) {
      setMarksInput(String(aiSuggestion.suggested_marks))
    }
  }

  const handleSwitchStudent = (sid) => {
    localStorage.setItem('active_student_id', sid)
    setStudentId(sid)
    setCurrentQIndex(0)
    setAiSuggestion(null)
    setStudentNavOpen(false)
  }

  const qStatusIcon = (q) => {
    if (!q) return <Icon className="text-outline text-sm">circle</Icon>
    const ev = q.evaluation
    if (ev?.flag && ev.flag !== 'none') return <Icon className="text-error text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>flag</Icon>
    if (ev?.marks_awarded != null) return <Icon className="text-green-600 text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</Icon>
    if (q.answer?.answer_text || q.answer?.selected_option) return <Icon className="text-tertiary text-sm">error</Icon>
    return <Icon className="text-outline text-sm">circle</Icon>
  }

  const studentStatusBadge = (s) => {
    if (s.status === 'evaluated') return <span className="text-green-600 text-xs"><Icon className="text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</Icon></span>
    if (s.status === 'flagged') return <span className="text-error text-xs"><Icon className="text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>flag</Icon></span>
    return <span className="text-outline text-xs"><Icon className="text-[12px]">schedule</Icon></span>
  }

  if (error) {
    return <TeacherShell page={page} setPage={setPage} title="Evaluation Workspace">
      <div className="max-w-3xl mx-auto py-xxl text-center">
        <Icon className="text-5xl text-error mb-md">error</Icon>
        <p className="text-xl font-bold text-error mb-sm">Failed to load submission</p>
        <p className="text-on-surface-variant mb-md">{error}</p>
        <button onClick={() => setPage('evaluationDashboard')} className="btn-primary px-md py-sm">Back to Dashboard</button>
      </div>
    </TeacherShell>
  }

  if (loading) {
    return <TeacherShell page={page} setPage={setPage} title="Evaluation Workspace">
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    </TeacherShell>
  }

  if (!submission) {
    return <TeacherShell page={page} setPage={setPage} title="Evaluation Workspace">
      <div className="max-w-3xl mx-auto py-xxl text-center">
        <Icon className="text-5xl text-outline mb-md">assignment</Icon>
        <p className="text-xl font-bold text-on-surface mb-sm">No submission selected</p>
        <p className="text-on-surface-variant mb-md">Select a student from the evaluation dashboard to begin.</p>
        <button onClick={() => setPage('evaluationDashboard')} className="btn-primary px-md py-sm">Back to Dashboard</button>
      </div>
    </TeacherShell>
  }

  const currentIdx = studentList.findIndex(s => s.student_id === studentId)

  return <TeacherShell page={page} setPage={setPage} title="Evaluation Workspace">
    <div className="flex flex-col h-[calc(100vh-8rem)] -m-md lg:-m-lg">
      <div className="h-14 bg-surface px-lg flex items-center justify-between border-b border-outline-variant shrink-0">
        <div className="flex items-center gap-md">
          <button onClick={() => setPage('evaluationDashboard')} className="p-xs hover:bg-surface-container rounded-lg transition-colors group">
            <Icon className="text-on-surface-variant group-hover:text-primary">chevron_left</Icon>
          </button>
          <div className="relative">
            <div className="flex items-center gap-sm px-md py-xs bg-surface-container rounded-full cursor-pointer" onClick={() => setStudentNavOpen(!studentNavOpen)}>
              <span className="text-label-md font-bold text-on-surface">{submission.student_name}</span>
              <span className="text-label-sm text-on-surface-variant">[{currentIdx + 1}/{studentList.length}]</span>
              <Icon className="text-sm text-on-surface-variant">unfold_more</Icon>
            </div>
            {studentNavOpen && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-xl max-h-80 overflow-y-auto z-50">
                {studentList.map(s => (
                  <button key={s.student_id} onClick={() => handleSwitchStudent(s.student_id)}
                    className={`w-full flex items-center gap-sm px-md py-sm hover:bg-surface-container transition-colors text-left ${s.student_id === studentId ? 'bg-secondary-container' : ''}`}>
                    {studentStatusBadge(s)}
                    <span className="text-label-md font-medium">{s.student_name}</span>
                    <span className="text-label-sm text-outline ml-auto">{s.final_score || '--'}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {currentIdx > 0 && (
            <button onClick={() => handleSwitchStudent(studentList[currentIdx - 1].student_id)} className="p-xs hover:bg-surface-container rounded-lg transition-colors group">
              <Icon className="text-on-surface-variant group-hover:text-primary">chevron_left</Icon>
            </button>
          )}
          {currentIdx < studentList.length - 1 && (
            <button onClick={() => handleSwitchStudent(studentList[currentIdx + 1].student_id)} className="p-xs hover:bg-surface-container rounded-lg transition-colors group">
              <Icon className="text-on-surface-variant group-hover:text-primary">chevron_right</Icon>
            </button>
          )}
        </div>
        <div className="flex items-center gap-xl">
          <div className="flex items-center p-1 bg-surface-container-high rounded-lg">
            <button onClick={() => setViewMode('question')}
              className={`px-md py-1 text-label-sm rounded-md font-medium transition-all ${viewMode === 'question' ? 'bg-white shadow-sm text-primary font-bold' : 'text-on-surface-variant hover:text-on-surface'}`}>Question View</button>
            <button onClick={() => setViewMode('student')}
              className={`px-md py-1 text-label-sm rounded-md font-medium transition-all ${viewMode === 'student' ? 'bg-white shadow-sm text-primary font-bold' : 'text-on-surface-variant hover:text-on-surface'}`}>Student View</button>
          </div>
          <div className="flex items-center gap-sm text-on-surface-variant">
            <Icon className={`text-sm ${saveStatus === 'Saved' ? 'text-green-600' : saveStatus === 'Saving...' ? 'text-primary animate-pulse' : 'text-outline'}`}>
              {saveStatus === 'Saved' ? 'cloud_done' : saveStatus === 'Saving...' ? 'cloud_upload' : 'cloud'}
            </Icon>
            <span className="text-label-sm">{saveStatus || 'Ready'}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-16 md:w-64 border-r border-outline-variant flex flex-col bg-surface-container-lowest overflow-y-auto">
          <div className="p-md font-label-md font-bold border-b border-outline-variant shrink-0">Questions</div>
          <div className="flex-1 overflow-y-auto py-sm">
            {submission.questions?.map((q, i) => (
              <button key={q.question_id} onClick={() => setCurrentQIndex(i)}
                className={`w-full flex items-center justify-between px-md py-md hover:bg-surface-container transition-colors border-l-4 ${i === currentQIndex ? 'bg-secondary-container border-l-primary' : 'border-transparent'}`}>
                <div className="flex items-center gap-md overflow-hidden min-w-0">
                  <span className={`text-label-md font-bold shrink-0 ${i === currentQIndex ? 'text-on-secondary-container' : 'text-on-surface'}`}>Q{q.order_index || (i + 1)}</span>
                  <span className="text-label-sm text-on-surface-variant truncate hidden md:block">{q.question_text?.slice(0, 20)}{q.question_text?.length > 20 ? '...' : ''}</span>
                </div>
                {qStatusIcon(q)}
              </button>
            ))}
          </div>
        </aside>

        <section className="flex-1 bg-surface-container-low overflow-y-auto p-xl">
          {currentQuestion && (
            <div className="max-w-3xl mx-auto space-y-xl">
              <div className="bg-white rounded-xl p-lg shadow-sm border border-outline-variant">
                <div className="flex justify-between items-start mb-md">
                  <span className="text-label-sm font-bold text-primary uppercase tracking-wider">Question {currentQuestion.order_index} ({currentQuestion.question_type === 'mcq' ? 'MCQ' : currentQuestion.question_type === 'short_answer' ? 'Short Answer' : 'Theory'})</span>
                  <div className="px-sm py-1 bg-surface-container-highest rounded text-label-sm font-bold text-on-surface">{currentQuestion.marks} Marks</div>
                </div>
                <h2 className="text-xl font-bold text-on-surface">{currentQuestion.question_text}</h2>
                {currentQuestion.topic && <span className="inline-block mt-sm px-sm py-xs bg-secondary-container text-secondary rounded-full text-label-sm">{currentQuestion.topic}</span>}
              </div>

              <div className="bg-white rounded-xl p-xl shadow-sm border border-outline-variant relative">
                <div className="flex items-center gap-sm mb-lg">
                  <Icon className="text-primary">person</Icon>
                  <span className="text-label-md font-bold text-on-surface">{submission.student_name}'s Response</span>
                  {currentQuestion.answer?.word_count > 0 && (
                    <span className="text-label-sm text-outline ml-auto">{currentQuestion.answer.word_count} words</span>
                  )}
                </div>
                {currentQuestion.answer?.answer_text ? (
                  <div className="text-body-lg text-on-surface-variant leading-relaxed whitespace-pre-wrap">
                    {currentQuestion.answer.answer_text}
                  </div>
                ) : currentQuestion.answer?.selected_option ? (
                  <div className="text-body-lg text-on-surface-variant">
                    <span className="bg-primary-fixed-dim px-2 py-1 rounded font-bold">Selected: {currentQuestion.answer.selected_option}</span>
                  </div>
                ) : (
                  <div className="text-on-surface-variant italic">No answer provided</div>
                )}
                <div className="mt-xl pt-lg border-t border-outline-variant flex justify-between items-center">
                  <div className="flex gap-md">
                    <button className="flex items-center gap-xs px-md py-sm bg-surface-container hover:bg-surface-container-high rounded-full text-label-sm transition-colors">
                      <Icon className="text-sm">history</Icon> History
                    </button>
                  </div>
                  <div className="flex items-center gap-sm">
                    <span className="text-label-md font-bold">Auto Score:</span>
                    <span className={`text-headline-sm font-bold ${currentQuestion.is_correct ? 'text-green-600' : 'text-error'}`}>
                      {currentQuestion.auto_score != null ? `${currentQuestion.auto_score} / ${currentQuestion.marks}` : '—'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        <aside className="w-72 xl:w-80 border-l border-outline-variant bg-surface-container-lowest flex flex-col">
          <div className="p-lg border-b border-outline-variant bg-surface flex items-center gap-md shrink-0">
            <Icon className="text-primary">grading</Icon>
            <h3 className="text-headline-sm font-bold">Marking Panel</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-lg space-y-xl">
            <div className="space-y-md">
              <label className="text-label-sm font-bold text-on-surface-variant uppercase tracking-wider">Award Marks</label>
              <div className="flex items-center gap-md">
                <input type="number" value={marksInput} onChange={e => handleMarksChange(e.target.value)}
                  className="w-20 text-2xl font-bold text-center border-outline-variant rounded-lg focus:ring-primary focus:border-primary" min="0" max={currentQuestion?.marks || 0} step="0.5" />
                <span className="text-headline-sm text-outline-variant">/ {currentQuestion?.marks || 0}</span>
              </div>
              <div className="flex flex-wrap gap-xs pt-sm">
                {Array.from({ length: Math.min((currentQuestion?.marks || 5) + 1, 11) }).map((_, i) => (
                  <button key={i} onClick={() => handleQuickMark(i)}
                    className={`px-md py-sm rounded-md text-label-sm font-bold transition-all ${marksInput === String(i) ? 'bg-primary-container text-white' : 'bg-surface-container hover:bg-primary-container hover:text-white'}`}>
                    {i}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl border-l-4 border-primary p-md bg-white/70 backdrop-blur-sm relative overflow-hidden">
              <div className="flex items-center gap-sm mb-sm">
                <Icon className="text-primary text-sm">auto_awesome</Icon>
                <span className="text-label-sm font-bold text-primary">AI SUGGESTION</span>
                {aiSuggestion && (
                  <span className="ml-auto text-label-sm font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded">{aiSuggestion.confidence}% Match</span>
                )}
              </div>
              {aiLoading ? (
                <div className="flex items-center gap-sm text-on-surface-variant">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  <span className="text-label-sm">AI is evaluating...</span>
                </div>
              ) : aiSuggestion ? (
                <>
                  <p className="text-body-sm font-bold text-on-surface mb-xs">Suggested: {aiSuggestion.suggested_marks}/{currentQuestion?.marks || 0} Marks</p>
                  <p className="text-body-sm text-on-surface-variant leading-tight italic">"{aiSuggestion.reason}"</p>
                  <button onClick={handleApplyAI}
                    className="mt-md w-full py-1 text-label-sm text-primary font-bold border border-primary/20 rounded-lg hover:bg-primary hover:text-white transition-all">Apply Suggestion</button>
                </>
              ) : (
                <button onClick={handleRequestAI}
                  className="w-full py-1 text-label-sm text-primary font-bold border border-primary/20 rounded-lg hover:bg-primary hover:text-white transition-all flex items-center justify-center gap-xs">
                  <Icon className="text-sm">auto_awesome</Icon>
                  Request AI Suggestion
                </button>
              )}
            </div>

            <div className="space-y-md">
              <label className="text-label-sm font-bold text-on-surface-variant uppercase tracking-wider">Feedback</label>
              <textarea value={feedbackInput} onChange={e => setFeedbackInput(e.target.value)}
                className="w-full h-24 rounded-xl border-outline-variant focus:ring-primary focus:border-primary text-body-sm p-md resize-none"
                placeholder="Type feedback here..."></textarea>
              <div className="flex flex-wrap gap-xs">
                {QUICK_FEEDBACK.slice(0, 4).map(text => (
                  <span key={text} onClick={() => handleQuickFeedback(text)}
                    className="px-sm py-1 bg-secondary-container text-on-secondary-container text-label-sm rounded-full cursor-pointer hover:bg-secondary-fixed transition-colors">{text}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="p-lg border-t border-outline-variant bg-surface space-y-md shrink-0">
            <button onClick={handleSaveNext}
              className="w-full bg-primary text-on-primary py-md rounded-xl font-bold shadow-md hover:shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-md">
              Save & Next
              <Icon>send</Icon>
            </button>
            <button onClick={handleSave}
              className="w-full bg-transparent border border-outline-variant text-on-surface-variant py-sm rounded-xl font-label-md hover:bg-surface-container transition-colors">
              Save Only
            </button>
            <div className="relative">
              <button onClick={() => setShowFlagMenu(!showFlagMenu)}
                className={`w-full border ${flagValue !== 'none' ? 'border-error text-error bg-error-container/20' : 'border-outline-variant text-on-surface-variant'} py-sm rounded-xl font-label-md hover:bg-surface-container transition-colors flex items-center justify-center gap-sm`}>
                <Icon className="text-sm">flag</Icon>
                {flagValue !== 'none' ? `Flagged: ${flagValue}` : 'Mark as Flagged'}
              </button>
              {showFlagMenu && (
                <div className="absolute bottom-full left-0 right-0 mb-1 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-xl overflow-hidden z-50">
                  {[
                    { value: 'none', label: 'No Flag' },
                    { value: 'plagiarism', label: 'Possible Plagiarism' },
                    { value: 'unclear', label: 'Unclear Answer' },
                    { value: 'ai_suspected', label: 'AI-Generated Suspected' },
                    { value: 'needs_review', label: 'Needs Second Review' },
                    { value: 'ambiguity', label: 'Question Ambiguity' },
                    { value: 'other', label: 'Other' },
                  ].map(opt => (
                    <button key={opt.value} onClick={() => { setFlagValue(opt.value); setShowFlagMenu(false) }}
                      className={`w-full text-left px-md py-sm text-label-sm hover:bg-surface-container transition-colors ${flagValue === opt.value ? 'bg-surface-container font-bold text-primary' : 'text-on-surface-variant'}`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  </TeacherShell>
}
