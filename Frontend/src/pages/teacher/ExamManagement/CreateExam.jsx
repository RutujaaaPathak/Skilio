import { useState, useEffect, useCallback, useRef } from 'react'
import TeacherShell, { Icon } from '../../../components/TeacherShell.jsx'
import { examService } from '../../../services/examService.js'
import { teacherService } from '../../../services/teacherService.js'
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
    fullscreen_required: true,
    microphone_required: true,
    tab_switch_limit: 3,
    camera_required: true,
    voice_verification_enabled: false,
    ai_monitoring_level: 'medium',
    face_detection_enabled: true,
    multiple_person_detection_enabled: true,
    phone_detection_enabled: true,
    voice_monitoring_enabled: true,
    screen_monitoring_enabled: true,
    registered_device_only: false,
    randomize_questions: true,
    shuffle_options: true,
    negative_marking_enabled: false,
    negative_marks_per_question: 0,
    adaptive_difficulty_enabled: false,
    zero_knowledge_generation_enabled: false,
    exam_type: 'exam',
    difficulty_level: 'medium',
    passing_marks: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    grace_period_minutes: 0,
    allow_late_entry: true,
    late_entry_cutoff_minutes: 0,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [savedSuccess, setSavedSuccess] = useState(false)
  const [selectingFromBank, setSelectingFromBank] = useState(false)
  const [questions, setQuestions] = useState([])
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [questionMarks, setQuestionMarks] = useState({})
  const [loadingQuestions, setLoadingQuestions] = useState(false)
  const [showManualEntry, setShowManualEntry] = useState(false)
  const [subjects, setSubjects] = useState([])
  const [loadingSubjects, setLoadingSubjects] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [conflicts, setConflicts] = useState([])
  const [bankSearch, setBankSearch] = useState('')
  const [bankDifficultyFilter, setBankDifficultyFilter] = useState('')
  const [bankTypeFilter, setBankTypeFilter] = useState('')
  const [expandedBankTopics, setExpandedBankTopics] = useState({})
  const conflictTimer = useRef(null)
  const total = 4
  const timezones = [
    'UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
    'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Moscow', 'Europe/Istanbul',
    'Asia/Dubai', 'Asia/Kolkata', 'Asia/Dhaka', 'Asia/Bangkok', 'Asia/Singapore',
    'Asia/Shanghai', 'Asia/Tokyo', 'Australia/Sydney', 'Pacific/Auckland',
  ]

  const fetchQuestions = useCallback(async () => {
    setLoadingQuestions(true)
    try {
      const data = await questionService.list()
      setQuestions(data.items || [])
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
    setLoadingSubjects(true)
    teacherService.getSubjects()
      .then(setSubjects)
      .catch(() => setSubjects([]))
      .finally(() => setLoadingSubjects(false))
  }, [])

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

  useEffect(() => {
    if (conflictTimer.current) clearTimeout(conflictTimer.current)
    if (!form.start_time || !form.end_time) { setConflicts([]); return }
    conflictTimer.current = setTimeout(async () => {
      try {
        const res = await examService.checkConflicts(
          new Date(form.start_time).toISOString(),
          new Date(form.end_time).toISOString()
        )
        setConflicts(res.conflicts || [])
      } catch { setConflicts([]) }
    }, 500)
    return () => { if (conflictTimer.current) clearTimeout(conflictTimer.current) }
  }, [form.start_time, form.end_time])

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

  function validate() {
    const errors = {}
    if (!form.title.trim()) errors.title = 'Exam title is required'
    if (!form.subject.trim()) errors.subject = 'Please select a subject'
    if (!form.start_time) errors.start_time = 'Start date & time is required'
    if (!form.end_time) errors.end_time = 'End date & time is required'
    if (form.start_time && form.end_time) {
      const s = new Date(form.start_time)
      const e = new Date(form.end_time)
      if (e <= s) errors.end_time = 'End time must be after start time'
    }
    if (form.duration_minutes < 1) errors.duration_minutes = 'Duration must be at least 1 minute'
    if (form.total_marks < 1) errors.total_marks = 'Total marks must be at least 1'
    if (form.passing_marks !== '' && form.passing_marks !== null && form.passing_marks !== undefined) {
      const pm = Number(form.passing_marks)
      if (isNaN(pm) || pm < 0) errors.passing_marks = 'Passing marks cannot be negative'
      else if (pm > form.total_marks) errors.passing_marks = 'Passing marks cannot exceed total marks'
    }
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSave(status) {
    setError('')
    if (!validate()) return
    setSaving(true)
    try {
      const start = new Date(form.start_time)
      const end = new Date(form.end_time)
      const payload = {
        title: form.title.trim(),
        subject: form.subject.trim(),
        description: form.description.trim() || null,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        duration_minutes: form.duration_minutes,
        timezone: form.timezone,
        total_marks: form.total_marks,
        status,
        is_offline_enabled: form.is_offline_enabled,
        fullscreen_required: form.fullscreen_required,
        microphone_required: form.microphone_required,
        tab_switch_limit: form.tab_switch_limit,
        camera_required: form.camera_required,
        voice_verification_enabled: form.voice_verification_enabled,
        ai_monitoring_level: form.ai_monitoring_level,
        face_detection_enabled: form.face_detection_enabled,
        multiple_person_detection_enabled: form.multiple_person_detection_enabled,
        phone_detection_enabled: form.phone_detection_enabled,
        voice_monitoring_enabled: form.voice_monitoring_enabled,
        screen_monitoring_enabled: form.screen_monitoring_enabled,
        registered_device_only: form.registered_device_only,
        randomize_questions: form.randomize_questions,
        shuffle_options: form.shuffle_options,
        negative_marking_enabled: form.negative_marking_enabled,
        negative_marks_per_question: form.negative_marks_per_question,
        adaptive_difficulty_enabled: form.adaptive_difficulty_enabled,
        zero_knowledge_generation_enabled: form.zero_knowledge_generation_enabled,
        exam_type: form.exam_type,
        difficulty_level: form.difficulty_level,
        passing_marks: form.passing_marks === '' || form.passing_marks === null ? null : Number(form.passing_marks),
        grace_period_minutes: form.grace_period_minutes,
        allow_late_entry: form.allow_late_entry,
        late_entry_cutoff_minutes: form.late_entry_cutoff_minutes,
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

      setSavedSuccess(true)
      setTimeout(() => setPage('scheduling'), 1200)
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

        {error && Object.keys(fieldErrors).length === 0 && <div className="mb-md rounded-lg bg-error-container p-sm text-label-md text-error font-bold">{error}</div>}
        {savedSuccess && <div className="mb-md rounded-lg bg-success-container p-sm text-label-md text-on-success-container font-bold flex items-center gap-sm"><Icon className="text-lg">check_circle</Icon>Exam created successfully! Redirecting...</div>}
        {conflicts.length > 0 && (
          <div className="mb-md rounded-lg bg-error-container/10 border border-error/30 p-md">
            <p className="text-sm font-bold text-error flex items-center gap-sm"><Icon className="text-base">warning_amber</Icon>Schedule Conflict Detected</p>
            <p className="text-xs text-on-surface-variant mt-xs">The selected time slot overlaps with the following exam(s):</p>
            <ul className="mt-sm space-y-1">
              {conflicts.map(c => (
                <li key={c.exam_id} className="text-xs text-on-surface-variant flex items-center gap-1">
                  <Icon className="text-xs text-error">schedule</Icon> {c.title} — {new Date(c.start_time).toLocaleString()} to {new Date(c.end_time).toLocaleString()} ({c.status})
                </li>
              ))}
            </ul>
            <p className="text-xs text-on-surface-variant mt-xs">You can still proceed, but consider adjusting the schedule to avoid conflicts.</p>
          </div>
        )}

        <form className="space-y-lg" onSubmit={e => e.preventDefault()}>
          {step === 1 && (
            <div className="card p-lg">
              <h3 className="text-xl font-bold text-primary mb-lg">Exam Identity</h3>
              <div className="space-y-md">
                <Field label="Exam Title" error={fieldErrors.title} required>
                  <input className={`input ${fieldErrors.title ? 'border-error' : ''}`} placeholder="e.g. Mid-Term Calculus" value={form.title} onChange={e => { set('title', e.target.value); setFieldErrors(p => ({ ...p, title: undefined })) }} />
                </Field>
                <Field label="Subject" error={fieldErrors.subject} required>
                  <select className={`input ${fieldErrors.subject ? 'border-error' : ''}`} value={form.subject} onChange={e => { set('subject', e.target.value); setFieldErrors(p => ({ ...p, subject: undefined })) }}>
                    <option value="">{loadingSubjects ? 'Loading subjects...' : 'Select a subject'}</option>
                    {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>
                <div className="grid md:grid-cols-2 gap-md">
                  <Field label="Exam Type" required>
                    <select className="input" value={form.exam_type} onChange={e => set('exam_type', e.target.value)}>
                      <option value="exam">Exam</option>
                      <option value="quiz">Quiz</option>
                      <option value="midterm">Midterm</option>
                      <option value="final">Final</option>
                      <option value="practice">Practice</option>
                      <option value="assignment">Assignment</option>
                    </select>
                  </Field>
                  <Field label="Difficulty Level" required>
                    <select className="input" value={form.difficulty_level} onChange={e => set('difficulty_level', e.target.value)}>
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </Field>
                </div>
                <Field label="Description">
                  <textarea className="input min-h-[100px]" placeholder="Exam instructions, topics covered, etc." value={form.description} onChange={e => set('description', e.target.value)} />
                </Field>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="card p-lg">
              <h3 className="text-xl font-bold text-primary mb-lg">Scheduling & Grading</h3>
              <div className="grid md:grid-cols-2 gap-md">
                <Field label="Start Date & Time" error={fieldErrors.start_time} required>
                  <input type="datetime-local" className={`input ${fieldErrors.start_time ? 'border-error' : ''}`} value={form.start_time} onChange={e => { set('start_time', e.target.value); setFieldErrors(p => ({ ...p, start_time: undefined })) }} />
                </Field>
                <Field label="End Date & Time" error={fieldErrors.end_time} required>
                  <input type="datetime-local" className={`input ${fieldErrors.end_time ? 'border-error' : ''}`} value={form.end_time} disabled />
                </Field>
                <Field label="Duration (minutes)" error={fieldErrors.duration_minutes}>
                  <input type="number" min="1" className={`input ${fieldErrors.duration_minutes ? 'border-error' : ''}`} value={form.duration_minutes} onChange={e => { set('duration_minutes', Math.max(1, parseInt(e.target.value) || 1)); setFieldErrors(p => ({ ...p, duration_minutes: undefined })) }} />
                </Field>
                <Field label="Total Marks" error={fieldErrors.total_marks}>
                  <input type="number" min="1" className={`input ${fieldErrors.total_marks ? 'border-error' : ''}`} value={form.total_marks} onChange={e => { set('total_marks', Math.max(1, parseInt(e.target.value) || 1)); setFieldErrors(p => ({ ...p, total_marks: undefined })) }} />
                </Field>
                <Field label="Passing Marks" error={fieldErrors.passing_marks} hint="Leave empty to use system default (40%)">
                  <input type="number" min="0" className={`input ${fieldErrors.passing_marks ? 'border-error' : ''}`} placeholder="e.g. 40" value={form.passing_marks} onChange={e => { set('passing_marks', e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0)); setFieldErrors(p => ({ ...p, passing_marks: undefined })) }} />
                </Field>
                <Field label="Time Zone" required>
                  <select className="input" value={form.timezone} onChange={e => set('timezone', e.target.value)}>
                    {timezones.map(tz => <option key={tz} value={tz}>{tz.replace(/_/g, ' ').replace(/\//g, ' / ')}</option>)}
                  </select>
                </Field>
                <Field label="Grace Period (minutes)" hint="Extra time after end_time to allow late submissions">
                  <input type="number" min="0" className="input" value={form.grace_period_minutes} onChange={e => set('grace_period_minutes', Math.max(0, parseInt(e.target.value) || 0))} />
                </Field>
              </div>
              <div className="mt-md p-md border border-outline-variant rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-on-surface">Allow Late Entry</p>
                    <p className="text-xs text-on-surface-variant">Let students start the exam after the scheduled start time</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={form.allow_late_entry} onChange={e => set('allow_late_entry', e.target.checked)} className="sr-only peer" />
                    <div className="w-11 h-6 bg-outline-variant rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-secondary-container" />
                  </label>
                </div>
                {form.allow_late_entry && (
                  <div className="mt-md">
                    <Field label="Late Entry Cutoff (minutes)" hint="0 = anytime before end_time">
                      <input type="number" min="0" className="input" value={form.late_entry_cutoff_minutes} onChange={e => set('late_entry_cutoff_minutes', Math.max(0, parseInt(e.target.value) || 0))} />
                    </Field>
                  </div>
                )}
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
                <Toggle icon="fullscreen" label="Fullscreen Required" desc="Students must run exam in fullscreen mode" checked={form.fullscreen_required} onChange={v => set('fullscreen_required', v)} />
                <Toggle icon="mic" label="Microphone Required" desc="Students must enable microphone during exam" checked={form.microphone_required} onChange={v => set('microphone_required', v)} />
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
                <div className="flex items-center justify-between p-md border border-outline-variant rounded-lg">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded bg-primary-container flex items-center justify-center mr-md"><Icon className="text-white">monitor_heart</Icon></div>
                    <div>
                      <p className="text-sm font-bold text-on-surface">AI Monitoring Level</p>
                      <p className="text-xs text-on-surface-variant">Controls proctoring sensitivity and which events are tracked</p>
                    </div>
                  </div>
                  <select className="h-10 px-3 bg-surface-container-low border border-outline-variant rounded-lg text-sm" value={form.ai_monitoring_level} onChange={e => set('ai_monitoring_level', e.target.value)}>
                    <option value="low">Low (critical only)</option>
                    <option value="medium">Medium (critical + high)</option>
                    <option value="high">High (all events)</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
                {form.ai_monitoring_level === 'custom' && (
                  <div className="pl-lg space-y-md border-l-2 border-primary-container">
                    <Toggle icon="face" label="Face Detection" desc="Detect no face or looking away" checked={form.face_detection_enabled} onChange={v => set('face_detection_enabled', v)} />
                    <Toggle icon="groups" label="Multiple Person Detection" desc="Detect multiple faces in frame" checked={form.multiple_person_detection_enabled} onChange={v => set('multiple_person_detection_enabled', v)} />
                    <Toggle icon="phone_android" label="Phone Detection" desc="Detect mobile phone usage" checked={form.phone_detection_enabled} onChange={v => set('phone_detection_enabled', v)} />
                    <Toggle icon="mic" label="Voice Monitoring" desc="Monitor audio for suspicious sounds" checked={form.voice_monitoring_enabled} onChange={v => set('voice_monitoring_enabled', v)} />
                    <Toggle icon="desktop_windows" label="Screen Monitoring" desc="Detect tab switches, fullscreen exits, devtools" checked={form.screen_monitoring_enabled} onChange={v => set('screen_monitoring_enabled', v)} />
                  </div>
                )}
                <Toggle icon="phone_iphone" label="Registered Device Only" desc="Require students to register their device before taking the exam" checked={form.registered_device_only} onChange={v => set('registered_device_only', v)} />
                <Toggle icon="shuffle" label="Randomize Questions" desc="Shuffle question order for each student" checked={form.randomize_questions} onChange={v => set('randomize_questions', v)} />
                <Toggle icon="more_horiz" label="Shuffle Options" desc="Shuffle answer options for MCQ questions" checked={form.shuffle_options} onChange={v => set('shuffle_options', v)} />
                <Toggle icon="remove_circle_outline" label="Negative Marking" desc="Deduct marks for incorrect answers" checked={form.negative_marking_enabled} onChange={v => set('negative_marking_enabled', v)} />
                {form.negative_marking_enabled && (
                  <div className="flex items-center justify-between p-md border border-outline-variant rounded-lg">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded bg-primary-container flex items-center justify-center mr-md"><Icon className="text-white">exposure_minus_1</Icon></div>
                      <div>
                        <p className="text-sm font-bold text-on-surface">Marks Deducted Per Wrong Answer</p>
                        <p className="text-xs text-on-surface-variant">e.g. 0.25 for -0.25 marks per wrong answer</p>
                      </div>
                    </div>
                    <input type="number" step="0.01" min="0" className="w-24 h-10 px-3 bg-surface-container-low border border-outline-variant rounded-lg text-center" value={form.negative_marks_per_question} onChange={e => set('negative_marks_per_question', Math.max(0, parseFloat(e.target.value) || 0))} />
                  </div>
                )}
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
                    <div>
                      <h3 className="text-xl font-bold text-primary">Select Questions</h3>
                      <p className="text-xs text-on-surface-variant mt-xs">Browse your question bank by topic. Override marks per question after selection.</p>
                    </div>
                    <button type="button" onClick={() => setSelectingFromBank(false)} className="text-sm text-secondary font-bold hover:underline">Back to choices</button>
                  </div>
                  {loadingQuestions ? (
                    <div className="flex items-center justify-center gap-sm py-xl text-on-surface-variant">
                      <span className="w-5 h-5 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm">Loading questions...</span>
                    </div>
                  ) : questions.length === 0 ? (
                    <div className="text-center py-xl">
                      <Icon className="text-4xl text-on-surface-variant mb-md">quiz</Icon>
                      <p className="text-sm font-bold text-primary mb-sm">No questions in the bank yet</p>
                      <p className="text-xs text-on-surface-variant">Add questions to the bank first, then come back to select them.</p>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-sm mb-md flex-wrap">
                        <div className="relative flex-1 min-w-[200px]">
                          <Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-on-surface-variant">search</Icon>
                          <input type="text" placeholder="Search questions..." value={bankSearch} onChange={e => setBankSearch(e.target.value)} className="input pl-xl h-9 text-sm" />
                        </div>
                        <select value={bankDifficultyFilter} onChange={e => setBankDifficultyFilter(e.target.value)} className="input h-9 text-sm w-auto">
                          <option value="">All Difficulties</option>
                          <option value="easy">Easy</option>
                          <option value="medium">Medium</option>
                          <option value="hard">Hard</option>
                        </select>
                        <select value={bankTypeFilter} onChange={e => setBankTypeFilter(e.target.value)} className="input h-9 text-sm w-auto">
                          <option value="">All Types</option>
                          <option value="mcq">MCQ</option>
                          <option value="short_answer">Short Answer</option>
                          <option value="long_answer">Long Answer</option>
                        </select>
                      </div>
                      {(() => {
                        const filtered = questions.filter(q => {
                          if (bankSearch && !q.question_text.toLowerCase().includes(bankSearch.toLowerCase())) return false
                          if (bankDifficultyFilter && q.difficulty !== bankDifficultyFilter) return false
                          if (bankTypeFilter && q.question_type !== bankTypeFilter) return false
                          return true
                        })
                        const grouped = filtered.reduce((acc, q) => {
                          const topic = q.topic || 'Untitled'
                          if (!acc[topic]) acc[topic] = []
                          acc[topic].push(q)
                          return acc
                        }, {})
                        const selectedCount = Array.from(selectedIds).reduce((sum, id) => sum + (questionMarks[id] || 1), 0)
                        return (
                          <>
                            <div className="flex items-center justify-between mb-sm text-sm">
                              <span className="text-on-surface-variant">{filtered.length} question{filtered.length !== 1 ? 's' : ''} available</span>
                              {selectedIds.size > 0 && (
                                <span className="font-bold text-primary">{selectedIds.size} selected ({selectedCount} total marks)</span>
                              )}
                            </div>
                            <div className="space-y-md max-h-[420px] overflow-y-auto border border-outline-variant rounded-xl p-sm">
                              {Object.entries(grouped).sort((a, b) => a[0].localeCompare(b[0])).map(([topic, topicQuestions]) => {
                                const selectedInTopic = topicQuestions.filter(q => selectedIds.has(q.id))
                                const isExpanded = expandedBankTopics[topic] !== false
                                return (
                                  <div key={topic} className="border border-outline-variant rounded-xl overflow-hidden">
                                    <button type="button" onClick={() => setExpandedBankTopics(prev => ({ ...prev, [topic]: !isExpanded }))} className="w-full flex items-center justify-between px-md py-sm bg-surface-container-low hover:bg-surface-container-high transition-colors cursor-pointer">
                                      <div className="flex items-center gap-sm">
                                        <div className="w-2 h-6 rounded-full bg-secondary shrink-0" />
                                        <span className="text-sm font-bold text-primary">{topic}</span>
                                        <span className="text-xs text-on-surface-variant">({topicQuestions.length})</span>
                                      </div>
                                      <div className="flex items-center gap-sm">
                                        {selectedInTopic.length > 0 && (
                                          <span className="text-xs bg-secondary text-white px-sm py-0.5 rounded-full">{selectedInTopic.length} selected</span>
                                        )}
                                        <Icon className={`text-sm text-on-surface-variant transition-transform ${isExpanded ? 'rotate-180' : ''}`}>expand_more</Icon>
                                      </div>
                                    </button>
                                    {isExpanded && (
                                      <div className="divide-y divide-outline-variant">
                                        {topicQuestions.map(q => {
                                          const selected = selectedIds.has(q.id)
                                          return (
                                            <div key={q.id} className={`flex items-center gap-md px-md py-sm hover:bg-surface-container-low transition-colors ${selected ? 'bg-secondary-container/5' : ''}`}>
                                              <input type="checkbox" checked={selected} onChange={() => toggleQuestion(q.id, q.marks)} className="rounded text-secondary shrink-0" id={`q-${q.id}`} />
                                              <div className="flex-1 min-w-0" onClick={() => toggleQuestion(q.id, q.marks)}>
                                                <div className="flex items-center gap-xs flex-wrap mb-xs">
                                                  <span className={'text-[10px] font-bold px-1.5 py-0.5 rounded ' + (q.difficulty === 'hard' ? 'bg-error-container text-error' : q.difficulty === 'easy' ? 'bg-tertiary-container text-tertiary' : 'bg-secondary-container text-secondary')}>{q.difficulty}</span>
                                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface-variant">{q.question_type.replace('_', ' ')}</span>
                                                  {q.blooms_level && <span className="text-[10px] px-1.5 py-0.5 rounded bg-tertiary-container/30 text-tertiary capitalize">{q.blooms_level}</span>}
                                                  <span className="text-[10px] text-on-surface-variant">{q.marks} mark(s)</span>
                                                </div>
                                                <p className="text-sm font-bold text-primary leading-snug">{q.question_text}</p>
                                                <p className="text-xs text-on-surface-variant mt-xs">Answer: {q.correct_answer}</p>
                                              </div>
                                              {selected ? (
                                                <div className="shrink-0">
                                                  <label className="text-[10px] text-on-surface-variant block mb-0.5 text-center">Marks</label>
                                                  <input type="number" min="1" className="w-14 h-7 px-1 bg-surface-container-low border border-outline-variant rounded text-xs text-center" value={questionMarks[q.id] || q.marks || 1} onChange={e => setQuestionMark(q.id, Math.max(1, parseInt(e.target.value) || 1))} onClick={e => e.stopPropagation()} />
                                                </div>
                                              ) : (
                                                <span className="text-xs text-on-surface-variant w-14 text-center shrink-0">{q.marks} mark(s)</span>
                                              )}
                                            </div>
                                          )
                                        })}
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                            {filtered.length === 0 && (
                              <div className="text-center py-lg text-on-surface-variant text-sm">No questions match your filters.</div>
                            )}
                          </>
                        )
                      })()}
                    </>
                  )}
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
                <div className="flex gap-md">
                  <button type="button" onClick={() => setShowPreview(true)} className="px-lg py-sm border border-outline-variant rounded-lg text-sm font-bold text-on-surface-variant hover:bg-surface-container-high">
                    <Icon className="text-sm align-middle mr-xs">visibility</Icon>Preview
                  </button>
                  <button type="button" disabled={saving} onClick={() => handleSave('scheduled')} className="btn-secondary px-xl py-sm">
                    {saving ? 'Publishing...' : 'Publish Exam'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </form>
      </div>

      {showPreview && (
        <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-md" onClick={() => setShowPreview(false)}>
          <div className="bg-surface rounded-2xl max-w-xl w-full max-h-[85vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-lg border-b border-outline-variant sticky top-0 bg-surface z-10">
              <h3 className="text-xl font-bold text-primary">Exam Preview</h3>
              <button onClick={() => setShowPreview(false)} className="p-xs hover:bg-surface-container-high rounded-full"><Icon className="text-xl">close</Icon></button>
            </div>
            <div className="p-lg space-y-lg">
              <div className="grid md:grid-cols-2 gap-md">
                <PreviewField label="Title" value={form.title} />
                <PreviewField label="Subject" value={form.subject} />
                <PreviewField label="Type" value={form.exam_type.charAt(0).toUpperCase() + form.exam_type.slice(1)} />
                <PreviewField label="Difficulty" value={form.difficulty_level.charAt(0).toUpperCase() + form.difficulty_level.slice(1)} />
                <PreviewField label="Start" value={form.start_time ? new Date(form.start_time).toLocaleString() : '—'} />
                <PreviewField label="End" value={form.end_time ? new Date(form.end_time).toLocaleString() : '—'} />
                <PreviewField label="Duration" value={`${form.duration_minutes} min`} />
                <PreviewField label="Time Zone" value={form.timezone} />
                <PreviewField label="Total Marks" value={String(form.total_marks)} />
                <PreviewField label="Passing Marks" value={form.passing_marks === '' || form.passing_marks === null ? 'System default (40%)' : String(form.passing_marks)} />
                <PreviewField label="Grace Period" value={`${form.grace_period_minutes} min`} />
                <PreviewField label="Late Entry" value={form.allow_late_entry ? `${form.late_entry_cutoff_minutes > 0 ? `${form.late_entry_cutoff_minutes} min cutoff` : 'Anytime before end'}` : 'Not allowed'} />
                <PreviewField label="Tab Switch Limit" value={String(form.tab_switch_limit)} />
                <PreviewField label="Camera Required" value={form.camera_required ? 'Yes' : 'No'} />
                <PreviewField label="Fullscreen Required" value={form.fullscreen_required ? 'Yes' : 'No'} />
                <PreviewField label="Microphone Required" value={form.microphone_required ? 'Yes' : 'No'} />
                <PreviewField label="Voice Verification" value={form.voice_verification_enabled ? 'Yes' : 'No'} />
                <PreviewField label="AI Monitoring" value={form.ai_monitoring_level.charAt(0).toUpperCase() + form.ai_monitoring_level.slice(1)} />
                <PreviewField label="Registered Device Only" value={form.registered_device_only ? 'Yes' : 'No'} />
                <PreviewField label="Randomize Questions" value={form.randomize_questions ? 'Yes' : 'No'} />
                <PreviewField label="Shuffle Options" value={form.shuffle_options ? 'Yes' : 'No'} />
                <PreviewField label="Negative Marking" value={form.negative_marking_enabled ? `${form.negative_marks_per_question} per wrong` : 'Off'} />
                <PreviewField label="Offline Mode" value={form.is_offline_enabled ? 'Yes' : 'No'} />
                <PreviewField label="Adaptive Difficulty" value={form.adaptive_difficulty_enabled ? 'Yes' : 'No'} />
                <PreviewField label="AI Question Gen" value={form.zero_knowledge_generation_enabled ? 'Yes' : 'No'} />
              </div>
              {form.description && (
                <div>
                  <p className="text-xs font-bold text-on-surface-variant mb-xs uppercase tracking-wider">Description</p>
                  <p className="text-sm text-on-surface bg-surface-container-low rounded-lg p-md">{form.description}</p>
                </div>
              )}
              <div className="bg-surface-container-low rounded-lg p-md flex items-center justify-between">
                <p className="text-sm font-bold text-on-surface">Selected Questions</p>
                <span className="text-lg font-extrabold text-primary">{selectedIds.size}</span>
              </div>
              <div className="flex gap-md pt-sm border-t border-outline-variant">
                <button onClick={() => setShowPreview(false)} className="flex-1 px-lg py-sm border border-outline-variant rounded-lg text-sm font-bold text-on-surface-variant hover:bg-surface-container-high">Edit</button>
                <button onClick={() => { setShowPreview(false); handleSave('scheduled') }} disabled={saving} className="flex-1 btn-secondary px-xl py-sm">{saving ? 'Publishing...' : 'Confirm & Publish'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showManualEntry && <QuestionFormModal onClose={() => setShowManualEntry(false)} onSaved={handleManualSaved} />}
    </TeacherShell>
  )
}

function PreviewField({ label, value }) {
  return (
    <div className="bg-surface-container-low rounded-lg p-md">
      <p className="text-xs text-on-surface-variant font-bold uppercase tracking-wider mb-xs">{label}</p>
      <p className="text-sm font-bold text-primary truncate">{value || '—'}</p>
    </div>
  )
}

function Field({ label, children, error, hint, required }) {
  return (
    <div>
      <label className="block text-sm font-bold text-on-surface-variant mb-xs">
        {label} {required && '*'}
      </label>
      {children}
      {error && <p className="text-xs text-error mt-xs flex items-center gap-1"><Icon className="text-xs">error</Icon>{error}</p>}
      {hint && !error && <p className="text-xs text-on-surface-variant mt-xs">{hint}</p>}
    </div>
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
