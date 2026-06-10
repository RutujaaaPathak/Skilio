import { useState, useEffect, useCallback } from 'react'
import TeacherShell, { Icon } from '../../../components/TeacherShell.jsx'
import { examService } from '../../../services/examService.js'
import { questionService } from '../../../services/questionService.js'
import QuestionFormModal from './QuestionFormModal.jsx'

const stepNames = ['Basic Information', 'Scheduling & Grading', 'Security & Features', 'Question Selection']

export default function CreateExam({ page, setPage }) {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    title: '',
    subject: '',
    description: '',
    start_time: '',
    end_time: '',
    duration_minutes: 60,
    total_marks: 100,
    is_offline_enabled: false,
    tab_switch_limit: 3,
    camera_required: true,
    voice_verification_enabled: false,
    adaptive_difficulty_enabled: false,
    zero_knowledge_generation_enabled: false,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [selectingFromBank, setSelectingFromBank] = useState(false)
  const [questions, setQuestions] = useState([])
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [questionMarks, setQuestionMarks] = useState({})
  const [loadingQuestions, setLoadingQuestions] = useState(false)
  const [showManualEntry, setShowManualEntry] = useState(false)
  const total = 4

  const fetchQuestions = useCallback(async () => {
    setLoadingQuestions(true)
    try {
      const data = await questionService.list()
      setQuestions(data)
    } catch {
      setQuestions([])
    } finally {
      setLoadingQuestions(false)
    }
  }, [])

  useEffect(() => {
    if (selectingFromBank) fetchQuestions()
  }, [selectingFromBank, fetchQuestions])

  useEffect(() => {
    if (form.start_time && form.duration_minutes > 0) {
      const start = new Date(form.start_time)
      const end = new Date(start.getTime() + form.duration_minutes * 60000)
      const pad = n => String(n).padStart(2, '0')
      setForm(prev => ({
        ...prev,
        end_time: `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}T${pad(end.getHours())}:${pad(end.getMinutes())}`,
      }))
    }
  }, [form.start_time, form.duration_minutes])

  function handleManualSaved(question) {
    setSelectedIds(prev => new Set(prev).add(question.id))
    setQuestionMarks(prev => ({ ...prev, [question.id]: question.marks || 1 }))
    setShowManualEntry(false)
  }

  function toggleQuestion(id, defaultMarks) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
        setQuestionMarks(m => ({ ...m, [id]: defaultMarks || 1 }))
      }
      return next
    })
  }

  function setQuestionMark(id, marks) {
    setQuestionMarks(prev => ({ ...prev, [id]: marks }))
  }

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSave(status) {
    setError('')
    if (!form.title.trim() || !form.subject.trim()) {
      setError('Title and subject are required.')
      return
    }
    if (!form.start_time || !form.end_time) {
      setError('Start and end times are required.')
      return
    }
    const start = new Date(form.start_time)
    const end = new Date(form.end_time)
    if (end <= start) {
      setError('End time must be after start time.')
      return
    }
    setSaving(true)
    try {
      const payload = {
        title: form.title.trim(),
        subject: form.subject.trim(),
        description: form.description.trim() || null,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        duration_minutes: form.duration_minutes,
        total_marks: form.total_marks,
        status,
        is_offline_enabled: form.is_offline_enabled,
        tab_switch_limit: form.tab_switch_limit,
        camera_required: form.camera_required,
        voice_verification_enabled: form.voice_verification_enabled,
        adaptive_difficulty_enabled: form.adaptive_difficulty_enabled,
        zero_knowledge_generation_enabled: form.zero_knowledge_generation_enabled,
      }
      const exam = await examService.create(payload)

      if (selectedIds.size) {
        const questionsPayload = {
          questions: Array.from(selectedIds).map((qid, i) => ({
            question_id: qid,
            marks: questionMarks[qid] || 1,
            order_index: i,
          })),
        }
        await examService.addQuestions(exam.id, questionsPayload)
      }

      setPage('scheduling')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <TeacherShell page={page} setPage={setPage} title="Create New Examination">
      <div className="w-full bg-surface-container-low h-1 fixed left-64 top-16 z-40">
        <div className="h-full bg-secondary-container transition-all" style={{ width: `${step / total * 100}%` }} />
      </div>
      <div className="max-w-[850px] mx-auto pt-lg">
        <div className="mb-lg">
          <div className="flex justify-between items-center text-xs font-bold text-on-surface-variant mb-base">
            <span>STEP {step} OF {total}</span>
            <span>{stepNames[step - 1]}</span>
          </div>
          <div className="flex gap-xs">
            {[1, 2, 3, 4].map(n => (
              <div key={n} className={`h-1 flex-1 rounded-full ${n <= step ? 'bg-secondary-container' : 'bg-surface-container-highest'}`} />
            ))}
          </div>
        </div>

        {error && <div className="mb-md rounded-lg bg-error-container p-sm text-label-md text-error font-bold">{error}</div>}

        <form className="space-y-lg" onSubmit={e => e.preventDefault()}>
          {step === 1 && (
            <div className="card p-lg">
              <h3 className="text-xl font-bold text-primary mb-lg">Exam Identity</h3>
              <div className="space-y-md">
                <div>
                  <label className="block text-sm font-bold text-on-surface-variant mb-xs">Exam Title *</label>
                  <input className="input" placeholder="e.g. Mid-Term Calculus" value={form.title} onChange={e => set('title', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-on-surface-variant mb-xs">Subject *</label>
                  <input className="input" placeholder="e.g. Mathematics" value={form.subject} onChange={e => set('subject', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-on-surface-variant mb-xs">Description</label>
                  <textarea className="input min-h-[100px]" placeholder="Exam instructions, topics covered, etc." value={form.description} onChange={e => set('description', e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="card p-lg">
              <h3 className="text-xl font-bold text-primary mb-lg">Scheduling & Grading</h3>
              <div className="grid md:grid-cols-2 gap-md">
                <div>
                  <label className="block text-sm font-bold text-on-surface-variant mb-xs">Start Date & Time *</label>
                  <input type="datetime-local" className="input" value={form.start_time} onChange={e => set('start_time', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-on-surface-variant mb-xs">End Date & Time</label>
                  <input type="datetime-local" className="input" value={form.end_time} disabled />
                </div>
                <div>
                  <label className="block text-sm font-bold text-on-surface-variant mb-xs">Duration (minutes)</label>
                  <input type="number" min="1" className="input" value={form.duration_minutes} onChange={e => set('duration_minutes', Math.max(1, parseInt(e.target.value) || 1))} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-on-surface-variant mb-xs">Total Marks</label>
                  <input type="number" min="1" className="input" value={form.total_marks} onChange={e => set('total_marks', Math.max(1, parseInt(e.target.value) || 1))} />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="card p-lg">
              <div className="flex items-center justify-between mb-lg">
                <h3 className="text-xl font-bold text-primary">Security & Features</h3>
              </div>
              <div className="space-y-md">
                <Toggle icon="visibility" label="Camera Required" desc="Students must enable webcam during exam" checked={form.camera_required} onChange={v => set('camera_required', v)} />
                <Toggle icon="face" label="Voice Verification" desc="Identity check using voice sample" checked={form.voice_verification_enabled} onChange={v => set('voice_verification_enabled', v)} />
                <Toggle icon="wifi_off" label="Offline Mode" desc="Allow students to take exam offline" checked={form.is_offline_enabled} onChange={v => set('is_offline_enabled', v)} />
                <Toggle icon="tune" label="Adaptive Difficulty" desc="Adjust question difficulty based on performance" checked={form.adaptive_difficulty_enabled} onChange={v => set('adaptive_difficulty_enabled', v)} />
                <Toggle icon="auto_awesome" label="AI Question Generation" desc="Generate questions dynamically from syllabus" checked={form.zero_knowledge_generation_enabled} onChange={v => set('zero_knowledge_generation_enabled', v)} />
                <div className="flex items-center justify-between p-md border border-outline-variant rounded-lg">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded bg-primary-container flex items-center justify-center mr-md"><Icon className="text-white">tab</Icon></div>
                    <div>
                      <p className="text-sm font-bold text-on-surface">Tab Switch Limit</p>
                      <p className="text-xs text-on-surface-variant">Max tab switches before auto-submit</p>
                    </div>
                  </div>
                  <input type="number" min="0" className="w-20 h-10 px-3 bg-surface-container-low border border-outline-variant rounded-lg text-center" value={form.tab_switch_limit} onChange={e => set('tab_switch_limit', Math.max(0, parseInt(e.target.value) || 0))} />
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              {!selectingFromBank ? (
                <>
                  <div className="grid md:grid-cols-2 gap-md">
                    <button type="button" onClick={() => setSelectingFromBank(true)} className="group p-lg border border-outline-variant rounded-xl bg-surface-container-lowest hover:border-secondary-container transition-all text-left">
                      <div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center mb-md group-hover:bg-secondary-fixed"><Icon className="text-primary">auto_awesome</Icon></div>
                      <h4 className="text-xl font-bold text-primary mb-xs">Select from Question Bank</h4>
                      <p className="text-on-surface-variant">Browse verified questions by curriculum topic.</p>
                    </button>
                    <button type="button" onClick={() => setShowManualEntry(true)} className="group p-lg border border-outline-variant rounded-xl bg-surface-container-lowest hover:border-secondary-container transition-all text-left">
                      <div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center mb-md group-hover:bg-secondary-fixed"><Icon className="text-primary">edit_note</Icon></div>
                      <h4 className="text-xl font-bold text-primary mb-xs">Manual Entry</h4>
                      <p className="text-on-surface-variant">Create new questions from scratch.</p>
                    </button>
                  </div>
                  <div className="mt-md bg-surface-container-low border border-dashed border-outline rounded-xl p-xl flex flex-col items-center text-center">
                    <Icon className="text-6xl text-outline-variant mb-md">inventory_2</Icon>
                    <p className="text-xl text-on-surface-variant">{selectedIds.size ? `${selectedIds.size} question(s) selected` : 'No questions selected yet'}</p>
                    <p className="text-sm text-outline mb-md">Total Marks: {form.total_marks}</p>
                  </div>
                </>
              ) : (
                <div className="card p-lg">
                  <div className="flex items-center justify-between mb-md">
                    <h3 className="text-xl font-bold text-primary">Select Questions</h3>
                    <button type="button" onClick={() => setSelectingFromBank(false)} className="text-sm text-secondary font-bold">Back to choices</button>
                  </div>
                  {loadingQuestions ? (
                    <p className="text-on-surface-variant text-sm text-center py-xl">Loading questions...</p>
                  ) : questions.length === 0 ? (
                    <p className="text-on-surface-variant text-sm text-center py-xl">No questions in the bank yet. Add some first.</p>
                  ) : (
                    <div className="divide-y divide-outline-variant max-h-96 overflow-y-auto border border-outline-variant rounded-xl">
                      {questions.map(q => {
                        const selected = selectedIds.has(q.id)
                        return (
                          <div key={q.id} className={`flex items-center gap-md p-md ${selected ? 'bg-secondary-container/5' : ''}`}>
                            <input type="checkbox" checked={selected} onChange={() => toggleQuestion(q.id, q.marks)} className="rounded text-secondary" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-primary truncate">{q.question_text}</p>
                              <p className="text-xs text-on-surface-variant">{q.subject} • {q.topic} • <span className={`font-bold ${q.difficulty === 'hard' ? 'text-error' : q.difficulty === 'easy' ? 'text-on-tertiary-container' : 'text-secondary'}`}>{q.difficulty}</span></p>
                            </div>
                            {selected ? (
                              <input type="number" min="1" className="w-16 h-8 px-2 bg-surface-container-low border border-outline-variant rounded text-xs text-center" value={questionMarks[q.id] || q.marks || 1} onChange={e => setQuestionMark(q.id, Math.max(1, parseInt(e.target.value) || 1))} />
                            ) : (
                              <span className="text-xs text-on-surface-variant">{q.marks} mark(s)</span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                  <p className="text-sm text-on-surface-variant mt-md">{selectedIds.size} question(s) selected</p>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between pt-md">
            <button type="button" onClick={() => setStep(Math.max(1, step - 1))} className={`${step === 1 ? 'invisible' : ''} px-lg py-sm border border-outline-variant rounded-lg text-sm font-bold text-on-surface-variant hover:bg-surface-container-high`}>
              Previous
            </button>
            <div className="flex gap-md">
              <button type="button" disabled={saving} onClick={() => handleSave('draft')} className="px-lg py-sm text-sm font-bold text-on-surface-variant hover:bg-surface-container-high rounded-lg">
                {saving ? 'Saving...' : 'Save Draft'}
              </button>
              {step < total ? (
                <button type="button" onClick={() => setStep(step + 1)} className="btn-primary px-xl py-sm">Next Step</button>
              ) : (
                <button type="button" disabled={saving} onClick={() => handleSave('scheduled')} className="btn-secondary px-xl py-sm">
                  {saving ? 'Publishing...' : 'Publish Exam'}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>

      {showManualEntry && <QuestionFormModal onClose={() => setShowManualEntry(false)} onSaved={handleManualSaved} />}
    </TeacherShell>
  )
}

function Toggle({ label, desc, icon, checked, onChange }) {
  return (
    <div className="flex items-center justify-between p-md border border-outline-variant rounded-lg hover:bg-surface-container-low transition-colors">
      <div className="flex items-center">
        <div className="w-10 h-10 rounded bg-primary-container flex items-center justify-center mr-md"><Icon className="text-white">{icon}</Icon></div>
        <div>
          <p className="text-sm font-bold text-on-surface">{label}</p>
          <p className="text-xs text-on-surface-variant">{desc}</p>
        </div>
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="sr-only peer" />
        <div className="w-11 h-6 bg-outline-variant rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-secondary-container" />
      </label>
    </div>
  )
}
