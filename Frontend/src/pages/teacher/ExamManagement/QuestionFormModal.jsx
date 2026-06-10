import { useState } from 'react'
import { Icon } from '../../../components/TeacherShell.jsx'
import { questionService } from '../../../services/questionService.js'

const INITIAL = { subject: '', topic: '', difficulty: 'medium', question_type: 'mcq', question_text: '', options: ['', ''], correct_answer: '', marks: 1, explanation: '' }

export default function QuestionFormModal({ onClose, onSaved }) {
  const [form, setForm] = useState(INITIAL)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function setOption(idx, value) {
    setForm(prev => {
      const opts = [...prev.options]
      opts[idx] = value
      return { ...prev, options: opts }
    })
  }

  function addOption() {
    setForm(prev => ({ ...prev, options: [...prev.options, ''] }))
  }

  function removeOption(idx) {
    setForm(prev => ({ ...prev, options: prev.options.filter((_, i) => i !== idx) }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    const payload = {
      subject: form.subject.trim(),
      topic: form.topic.trim(),
      difficulty: form.difficulty,
      question_type: form.question_type,
      question_text: form.question_text.trim(),
      correct_answer: form.correct_answer.trim(),
      marks: form.marks,
    }

    if (!payload.subject || !payload.topic || !payload.question_text || !payload.correct_answer) {
      setError('Subject, topic, question text, and correct answer are required.')
      return
    }

    if (form.question_type === 'mcq') {
      const filtered = form.options.filter(o => o.trim())
      if (filtered.length < 2) {
        setError('MCQ must have at least 2 options.')
        return
      }
      payload.options = filtered
    }

    if (form.explanation.trim()) {
      payload.explanation = form.explanation.trim()
    }

    setSaving(true)
    try {
      const saved = await questionService.create(payload)
      onSaved(saved)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-lg border-b border-outline-variant">
          <h2 className="text-xl font-bold text-primary">New Question</h2>
          <button onClick={onClose} className="p-2 hover:bg-surface-container-low rounded-full"><Icon>close</Icon></button>
        </div>
        <form onSubmit={handleSubmit} className="p-lg space-y-md">
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
            <textarea value={form.question_text} onChange={e => set('question_text', e.target.value)} className="input min-h-24" placeholder="Enter the question..." />
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
            <textarea value={form.explanation} onChange={e => set('explanation', e.target.value)} className="input min-h-16" placeholder="Explain the correct answer..." />
          </div>
          {error && <p className="text-error text-sm font-bold">{error}</p>}
          <div className="flex justify-end gap-sm pt-md border-t border-outline-variant">
            <button type="button" onClick={onClose} className="btn-secondary px-lg py-sm">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary px-lg py-sm">{saving ? 'Saving...' : 'Save Question'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
