import { useState } from 'react'
import { Icon } from '../../../components/TeacherShell.jsx'
import { questionService } from '../../../services/questionService.js'

export default function AIGenerateModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ subject: '', topic: '', difficulties: ['medium'], question_types: ['mcq'], count: 5 })
  const [generated, setGenerated] = useState([])
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [step, setStep] = useState('form')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function toggleDifficulty(d) {
    setForm(prev => {
      const diffs = prev.difficulties.includes(d)
        ? prev.difficulties.filter(x => x !== d)
        : [...prev.difficulties, d]
      return { ...prev, difficulties: diffs.length ? diffs : ['medium'] }
    })
  }

  function toggleType(t) {
    setForm(prev => {
      const types = prev.question_types.includes(t)
        ? prev.question_types.filter(x => x !== t)
        : [...prev.question_types, t]
      return { ...prev, question_types: types.length ? types : ['mcq'] }
    })
  }

  async function handleGenerate(e) {
    e.preventDefault()
    if (!form.subject.trim() || !form.topic.trim()) {
      setError('Subject and topic are required.')
      return
    }
    setError('')
    setLoading(true)
    try {
      const result = await questionService.generate(form)
      setGenerated(result.questions)
      setSelectedIds(new Set(result.questions.map((_, i) => i)))
      setStep('review')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function toggleSelect(idx) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  async function handleSave() {
    const toSave = generated.filter((_, i) => selectedIds.has(i))
    if (toSave.length === 0) return
    setSaving(true)
    try {
      const created = await questionService.bulkCreate(toSave)
      onSaved(created)
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
          <h2 className="text-xl font-bold text-primary">AI Question Generation</h2>
          <button onClick={onClose} className="p-2 hover:bg-surface-container-low rounded-full"><Icon>close</Icon></button>
        </div>

        {step === 'form' && (
          <form onSubmit={handleGenerate} className="p-lg space-y-md">
            <p className="text-sm text-on-surface-variant">Describe what questions you need and AI will generate them instantly.</p>
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
            <div>
              <div>
                <label className="text-xs font-bold text-on-surface-variant block mb-xs">Difficulties</label>
                <div className="flex gap-sm">
                  {['easy', 'medium', 'hard'].map(d => (
                    <label key={d} className={`flex items-center gap-sm px-md py-sm border rounded-xl cursor-pointer ${form.difficulties.includes(d) ? 'border-secondary-container bg-secondary-container/10 text-secondary font-bold' : 'border-outline-variant hover:bg-surface-container-low'}`}>
                      <input type="checkbox" checked={form.difficulties.includes(d)} onChange={() => toggleDifficulty(d)} className="hidden" />
                      <Icon className="text-sm">{form.difficulties.includes(d) ? 'check_circle' : 'radio_button_unchecked'}</Icon>
                      {d.charAt(0).toUpperCase() + d.slice(1)}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-on-surface-variant block mb-xs">Number of Questions</label>
                <input type="number" min="1" max="20" value={form.count} onChange={e => set('count', Math.min(20, Math.max(1, parseInt(e.target.value) || 1)))} className="input" />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-on-surface-variant block mb-xs">Question Types</label>
              <div className="flex gap-sm">
                {['mcq', 'short_answer', 'long_answer'].map(t => (
                  <label key={t} className={`flex items-center gap-sm px-md py-sm border rounded-xl cursor-pointer ${form.question_types.includes(t) ? 'border-secondary-container bg-secondary-container/10 text-secondary font-bold' : 'border-outline-variant hover:bg-surface-container-low'}`}>
                    <input type="checkbox" checked={form.question_types.includes(t)} onChange={() => toggleType(t)} className="hidden" />
                    <Icon className="text-sm">{form.question_types.includes(t) ? 'check_circle' : 'radio_button_unchecked'}</Icon>
                    {t.replace('_', ' ')}
                  </label>
                ))}
              </div>
            </div>
            {error && <p className="text-error text-sm font-bold">{error}</p>}
            <div className="flex justify-end gap-sm pt-md border-t border-outline-variant">
              <button type="button" onClick={onClose} className="btn-secondary px-lg py-sm">Cancel</button>
              <button type="submit" disabled={loading} className="btn-primary px-lg py-sm">
                {loading ? <span className="flex items-center gap-xs"><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Generating...</span> : 'Generate Questions'}
              </button>
            </div>
          </form>
        )}

        {step === 'review' && (
          <div className="p-lg">
            <p className="text-sm text-on-surface-variant mb-md">
              {generated.length} question(s) generated. Select the ones you want to save.
            </p>

            {error && <div className="mb-md bg-error-container text-error p-md rounded-xl text-sm font-bold">{error}</div>}

            <div className="space-y-md max-h-96 overflow-y-auto">
              {generated.map((q, i) => (
                <div key={i} className={`border rounded-xl p-md cursor-pointer ${selectedIds.has(i) ? 'border-secondary-container bg-secondary-container/5' : 'border-outline-variant hover:bg-surface-container-low'}`} onClick={() => toggleSelect(i)}>
                  <div className="flex items-start gap-sm">
                    <Icon className={`mt-1 ${selectedIds.has(i) ? 'text-secondary' : 'text-on-surface-variant'}`}>{selectedIds.has(i) ? 'check_circle' : 'radio_button_unchecked'}</Icon>
                    <div className="flex-1 min-w-0">
                      <div className="flex gap-sm mb-xs">
                        <span className="pill bg-primary-fixed text-primary text-xs">{q.difficulty}</span>
                        <span className="pill bg-surface-container-high text-on-surface-variant text-xs">{q.question_type.replace('_', ' ')}</span>
                        <span className="text-xs text-on-surface-variant">{q.subject} • {q.topic}</span>
                      </div>
                      <p className="font-bold text-primary">{q.question_text}</p>
                      {q.options && (
                        <div className="mt-xs flex flex-wrap gap-xs">
                          {q.options.map((o, oi) => (
                            <span key={oi} className="text-xs bg-surface-container-low px-sm py-1 rounded">{String.fromCharCode(65 + oi)}. {o}</span>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-on-surface-variant mt-xs">Answer: <b className="text-secondary">{q.correct_answer}</b></p>
                      {q.explanation && <p className="text-xs text-on-surface-variant mt-xs">{q.explanation}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center mt-lg pt-md border-t border-outline-variant">
              <p className="text-sm text-on-surface-variant">{selectedIds.size} of {generated.length} selected</p>
              <div className="flex gap-sm">
                <button onClick={() => setStep('form')} className="btn-secondary px-lg py-sm">Back</button>
                <button onClick={handleSave} disabled={saving || selectedIds.size === 0} className="btn-primary px-lg py-sm">
                  {saving ? 'Saving...' : `Save ${selectedIds.size} Question(s)`}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}