import { useState } from 'react'
import { Icon } from '../../../components/TeacherShell.jsx'
import { questionService } from '../../../services/questionService.js'

const INITIAL = { subject: '', topic: '', difficulty: 'medium', question_type: 'mcq', question_text: '', options: ['', ''], correct_answer: '', marks: 1, explanation: '' }

function parseOptions(raw) {
  if (!raw) return ['', '']
  if (Array.isArray(raw)) return raw.length >= 2 ? raw : ['', '']
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) && parsed.length >= 2 ? parsed : ['', '']
  } catch {
    return ['', '']
  }
}

function FormCard({ form, idx, onChange, onOptionChange, onAddOption, onRemoveOption, onRemove }) {
  function set(field, value) { onChange(idx, field, value) }
  function setOption(optIdx, value) { onOptionChange(idx, optIdx, value) }
  function addOption() { onAddOption(idx) }
  function removeOption(optIdx) { onRemoveOption(idx, optIdx) }

  return (
    <div className="border border-outline-variant rounded-xl p-md space-y-md bg-surface-container-low/30">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-sm text-primary">Question {idx + 1}</h3>
        {onRemove && (
          <button type="button" onClick={() => onRemove(idx)} className="p-1 hover:bg-error-container rounded text-error">
            <Icon className="text-sm">close</Icon>
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-md">
        <div>
          <label className="text-xs font-bold text-on-surface-variant block mb-xs">Subject *</label>
          <input value={form.subject} onChange={e => set('subject', e.target.value)} className="input" placeholder="e.g. Physics" />
        </div>
        <div>
          <label className="text-xs font-bold text-on-surface-variant block mb-xs">Topic *</label>
          <input value={form.topic} onChange={e => set('topic', e.target.value)} className="input" placeholder="e.g. Thermodynamics" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-md">
        <div>
          <label className="text-xs font-bold text-on-surface-variant block mb-xs">Difficulty</label>
          <select value={form.difficulty} onChange={e => set('difficulty', e.target.value)} className="input">
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-bold text-on-surface-variant block mb-xs">Question Type</label>
          <select value={form.question_type} onChange={e => set('question_type', e.target.value)} className="input">
            <option value="mcq">MCQ</option>
            <option value="short_answer">Short Answer</option>
            <option value="long_answer">Long Answer</option>
          </select>
        </div>
      </div>
      <div>
        <label className="text-xs font-bold text-on-surface-variant block mb-xs">Question Text *</label>
        <textarea value={form.question_text} onChange={e => set('question_text', e.target.value)} className="input min-h-20" placeholder="Enter the question..." />
      </div>
      {form.question_type === 'mcq' && (
        <div>
          <label className="text-xs font-bold text-on-surface-variant block mb-xs">Options *</label>
          <div className="space-y-sm">
            {form.options.map((opt, i) => (
              <div key={i} className="flex items-center gap-sm">
                <span className="w-6 h-6 rounded-full bg-surface-container-low grid place-items-center text-xs font-bold">{String.fromCharCode(65 + i)}</span>
                <input value={opt} onChange={e => setOption(i, e.target.value)} className="input flex-1" placeholder={`Option ${String.fromCharCode(65 + i)}`} />
                {form.options.length > 2 && <button type="button" onClick={() => removeOption(i)} className="p-1 hover:bg-error-container rounded text-error"><Icon className="text-sm">close</Icon></button>}
              </div>
            ))}
            <button type="button" onClick={addOption} className="text-sm text-secondary font-bold flex items-center gap-xs"><Icon className="text-sm">add</Icon>Add option</button>
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-md">
        <div>
          <label className="text-xs font-bold text-on-surface-variant block mb-xs">Correct Answer *</label>
          <input value={form.correct_answer} onChange={e => set('correct_answer', e.target.value)} className="input" placeholder={form.question_type === 'mcq' ? 'e.g. Option A' : 'Expected answer'} />
        </div>
        <div>
          <label className="text-xs font-bold text-on-surface-variant block mb-xs">Marks</label>
          <input type="number" min="1" value={form.marks} onChange={e => set('marks', Math.max(1, parseInt(e.target.value) || 1))} className="input" />
        </div>
      </div>
      <div>
        <label className="text-xs font-bold text-on-surface-variant block mb-xs">Explanation (optional)</label>
        <textarea value={form.explanation} onChange={e => set('explanation', e.target.value)} className="input min-h-14" placeholder="Explain the correct answer..." />
      </div>
    </div>
  )
}

export default function QuestionFormModal({ onClose, onSaved, editQuestion, prefillSubject = '' }) {
  const isEdit = !!editQuestion
  const [count, setCount] = useState(1)
  const [forms, setForms] = useState(() => {
    if (editQuestion) {
      return [{
        subject: editQuestion.subject || '',
        topic: editQuestion.topic || '',
        difficulty: editQuestion.difficulty || 'medium',
        question_type: editQuestion.question_type || 'mcq',
        question_text: editQuestion.question_text || '',
        options: parseOptions(editQuestion.options),
        correct_answer: editQuestion.correct_answer || '',
        marks: editQuestion.marks || 1,
        explanation: editQuestion.explanation || '',
      }]
    }
    return [{ ...INITIAL, subject: prefillSubject }]
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  function onChange(idx, field, value) {
    setForms(prev => {
      const updated = [...prev]
      updated[idx] = { ...updated[idx], [field]: value }
      return updated
    })
  }

  function onOptionChange(idx, optIdx, value) {
    setForms(prev => {
      const updated = [...prev]
      const opts = [...updated[idx].options]
      opts[optIdx] = value
      updated[idx] = { ...updated[idx], options: opts }
      return updated
    })
  }

  function onAddOption(idx) {
    setForms(prev => {
      const updated = [...prev]
      updated[idx] = { ...updated[idx], options: [...updated[idx].options, ''] }
      return updated
    })
  }

  function onRemoveOption(idx, optIdx) {
    setForms(prev => {
      const updated = [...prev]
      updated[idx] = { ...updated[idx], options: updated[idx].options.filter((_, i) => i !== optIdx) }
      return updated
    })
  }

  function handleCountChange(val) {
    const newCount = Math.min(50, Math.max(1, parseInt(val) || 1))
    setCount(newCount)
    setForms(prev => {
      if (newCount > prev.length) {
        const template = prev[prev.length - 1] || INITIAL
        const added = Array.from({ length: newCount - prev.length }, () => ({ ...template, question_text: '', correct_answer: '', explanation: '', options: ['', ''], marks: 1 }))
        return [...prev, ...added]
      }
      return prev.slice(0, newCount)
    })
  }

  function handleRemoveQuestion(idx) {
    setForms(prev => {
      const updated = prev.filter((_, i) => i !== idx)
      return updated
    })
    setCount(prev => Math.max(1, prev - 1))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    const payloads = forms.map(form => ({
      subject: form.subject.trim(),
      topic: form.topic.trim(),
      difficulty: form.difficulty,
      question_type: form.question_type,
      question_text: form.question_text.trim(),
      correct_answer: form.correct_answer.trim(),
      marks: form.marks,
    }))

    for (let i = 0; i < payloads.length; i++) {
      const p = payloads[i]
      if (!p.subject || !p.topic || !p.question_text || !p.correct_answer) {
        setError(`Question ${i + 1}: Subject, topic, question text, and correct answer are required.`)
        return
      }
      if (forms[i].question_type === 'mcq') {
        const filtered = forms[i].options.filter(o => o.trim())
        if (filtered.length < 2) {
          setError(`Question ${i + 1}: MCQ must have at least 2 options.`)
          return
        }
        p.options = filtered
      }
      if (forms[i].explanation.trim()) {
        p.explanation = forms[i].explanation.trim()
      }
    }

    setSaving(true)
    try {
      if (isEdit) {
        const saved = await questionService.update(editQuestion.id, payloads[0])
        onSaved(saved)
      } else if (payloads.length === 1) {
        const saved = await questionService.create(payloads[0])
        onSaved(saved)
      } else {
        const saved = await questionService.bulkCreate(payloads)
        onSaved(saved)
      }
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto m-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-lg border-b border-outline-variant">
          <h2 className="text-xl font-bold text-primary">{isEdit ? 'Edit Question' : 'New Questions'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-surface-container-low rounded-full"><Icon>close</Icon></button>
        </div>

        {!isEdit && (
          <div className="flex items-center gap-sm px-lg pt-lg">
            <label className="text-xs font-bold text-on-surface-variant whitespace-nowrap">Number of Questions</label>
            <input
              type="number" min="1" max="50"
              value={count}
              onChange={e => handleCountChange(e.target.value)}
              className="input w-20"
            />
            <span className="text-xs text-on-surface-variant">(max 50)</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-lg space-y-lg">
          {forms.map((form, idx) => (
            <FormCard
              key={idx}
              form={form}
              idx={idx}
              onChange={onChange}
              onOptionChange={onOptionChange}
              onAddOption={onAddOption}
              onRemoveOption={onRemoveOption}
              onRemove={!isEdit && forms.length > 1 ? handleRemoveQuestion : undefined}
            />
          ))}

          {error && <p className="text-error text-sm font-bold">{error}</p>}
          <div className="flex justify-end gap-sm pt-md border-t border-outline-variant">
            <button type="button" onClick={onClose} className="btn-secondary px-lg py-sm">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary px-lg py-sm">
              {saving ? 'Saving...' : isEdit ? 'Update Question' : `Save ${forms.length} Question${forms.length > 1 ? 's' : ''}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}