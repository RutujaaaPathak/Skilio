import { useState, useEffect } from 'react'
import { Icon } from '../../../components/TeacherShell.jsx'
import { questionService } from '../../../services/questionService.js'
import { syllabusService } from '../../../services/syllabusService.js'
import { useToast } from '../../../components/Toast.jsx'

export default function AIGenerateModal({ onClose, onSaved }) {
  const { addToast } = useToast()
  const [form, setForm] = useState({ subject: '', topic: '', difficulties: ['medium'], question_types: ['mcq'], count: 5, marks: 1, syllabus_ids: [] })
  const [generated, setGenerated] = useState([])
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [editingId, setEditingId] = useState(null)
  const [editData, setEditData] = useState(null)
  const [step, setStep] = useState('form')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [syllabusEntries, setSyllabusEntries] = useState([])
  const [syllabusSubjects, setSyllabusSubjects] = useState([])
  const [syllabusLoading, setSyllabusLoading] = useState(false)
  const [showSyllabusPicker, setShowSyllabusPicker] = useState(false)
  const [regeneratingId, setRegeneratingId] = useState(null)
  const [bloomsLevels, setBloomsLevels] = useState([])
  const BLOOMS = ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create']

  useEffect(() => {
    syllabusService.listSubjects().then(data => setSyllabusSubjects(data)).catch(() => {})
  }, [])

  useEffect(() => {
    if (!form.subject.trim()) {
      setSyllabusEntries([])
      return
    }
    setSyllabusLoading(true)
    syllabusService.list(form.subject.trim())
      .then(data => setSyllabusEntries(data))
      .catch(() => setSyllabusEntries([]))
      .finally(() => setSyllabusLoading(false))
  }, [form.subject])

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

  function toggleSyllabusEntry(id) {
    setForm(prev => {
      const ids = prev.syllabus_ids.includes(id)
        ? prev.syllabus_ids.filter(x => x !== id)
        : [...prev.syllabus_ids, id]
      return { ...prev, syllabus_ids: ids }
    })
  }

  function toggleBloom(level) {
    setBloomsLevels(prev => prev.includes(level) ? prev.filter(x => x !== level) : [...prev, level])
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
      const result = await questionService.generate({ ...form, blooms_levels: bloomsLevels.length ? bloomsLevels : undefined })
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

  function startEdit(idx) {
    const q = generated[idx]
    setEditingId(idx)
    setEditData({
      question_text: q.question_text,
      options: q.options ? [...q.options] : null,
      correct_answer: q.correct_answer,
      explanation: q.explanation || '',
      marks: q.marks,
    })
  }

  function cancelEdit() {
    setEditingId(null)
    setEditData(null)
  }

  function saveEdit(idx) {
    setGenerated(prev => {
      const updated = [...prev]
      updated[idx] = { ...updated[idx], ...editData }
      return updated
    })
    setEditingId(null)
    setEditData(null)
  }

  function onEditField(field, value) {
    setEditData(prev => ({ ...prev, [field]: value }))
  }

  function onEditOption(optIdx, value) {
    setEditData(prev => {
      const opts = prev.options ? [...prev.options] : []
      opts[optIdx] = value
      return { ...prev, options: opts }
    })
  }

  async function handleSave() {
    const toSave = generated.filter((_, i) => selectedIds.has(i))
    if (toSave.length === 0) return
    setSaving(true)
    setError('')
    try {
      const texts = toSave.map(q => q.question_text)
      const dupCheck = await questionService.checkDuplicates(texts)
      if (dupCheck.total_duplicates > 0) {
        const dupMsgs = dupCheck.results.filter(r => r.is_duplicate).map(r =>
          `"${r.text.substring(0, 60)}..." matches existing question #${r.existing_question_id}`
        )
        if (!confirm(`⚠️ ${dupCheck.total_duplicates} duplicate(s) detected:\n\n${dupMsgs.join('\n')}\n\nSave anyway?`)) {
          setSaving(false)
          return
        }
      }
      const payload = toSave.map(q => ({
        subject: q.subject,
        topic: q.topic,
        difficulty: q.difficulty,
        question_type: q.question_type,
        question_text: q.question_text,
        options: q.options || null,
        correct_answer: q.correct_answer,
        marks: q.marks || form.marks,
        explanation: q.explanation || null,
        is_ai_generated: true,
        blooms_level: q.blooms_level || null,
      }))
      const created = await questionService.bulkCreate(payload)
      onSaved(created)
      addToast(`Saved ${created.length} AI-generated question(s)`, 'success')
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleRegenerate(idx) {
    const q = generated[idx]
    setRegeneratingId(idx)
    setError('')
    try {
      const result = await questionService.generateEquivalentFromData({
        subject: q.subject,
        topic: q.topic,
        difficulty: q.difficulty,
        question_type: q.question_type,
        question_text: q.question_text,
        options: q.options,
        correct_answer: q.correct_answer,
        marks: q.marks || form.marks,
        explanation: q.explanation,
      }, 1)
      if (result.questions && result.questions.length > 0) {
        setGenerated(prev => {
          const updated = [...prev]
          updated[idx] = result.questions[0]
          return updated
        })
        setSelectedIds(prev => { const next = new Set(prev); next.add(idx); return next })
        addToast('Question regenerated', 'success')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setRegeneratingId(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col m-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-lg border-b border-outline-variant shrink-0">
          <div className="flex items-center gap-md">
            <div className="w-10 h-10 rounded-xl bg-secondary-container grid place-items-center">
              <Icon className="text-secondary">auto_awesome</Icon>
            </div>
            <div>
              <h2 className="text-xl font-bold text-primary">AI Question Generator</h2>
              <p className="text-xs text-on-surface-variant">Generate questions instantly with AI</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface-container-low rounded-full"><Icon>close</Icon></button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {step === 'form' && (
            <form onSubmit={handleGenerate} className="p-lg space-y-lg">
              <div className="grid grid-cols-2 gap-lg">
                <div>
                  <label className="text-xs font-bold text-on-surface-variant block mb-xs">Subject *</label>
                  <input value={form.subject} onChange={e => { set('subject', e.target.value); set('syllabus_ids', []) }} className="input" placeholder="e.g. Physics" list="subject-datalist" />
                  <datalist id="subject-datalist">
                    {syllabusSubjects.map(s => <option key={s.subject} value={s.subject} />)}
                  </datalist>
                </div>
                <div>
                  <label className="text-xs font-bold text-on-surface-variant block mb-xs">Topic *</label>
                  <input value={form.topic} onChange={e => set('topic', e.target.value)} className="input" placeholder="e.g. Thermodynamics" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-lg">
                <div>
                  <label className="text-xs font-bold text-on-surface-variant block mb-xs">Number of Questions</label>
                  <input type="number" min="1" max="20" value={form.count} onChange={e => set('count', Math.min(20, Math.max(1, parseInt(e.target.value) || 1)))} className="input" />
                </div>
                <div>
                  <label className="text-xs font-bold text-on-surface-variant block mb-xs">Marks per Question</label>
                  <input type="number" min="1" max="100" value={form.marks} onChange={e => set('marks', Math.max(1, parseInt(e.target.value) || 1))} className="input" />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-on-surface-variant block mb-xs">Question Types</label>
                <div className="flex gap-sm flex-wrap">
                  {['mcq', 'short_answer', 'long_answer'].map(t => (
                    <label key={t} className={`flex items-center gap-sm px-lg py-sm rounded-xl cursor-pointer select-none border transition-all ${form.question_types.includes(t) ? 'border-secondary bg-secondary-container/10 text-secondary font-bold' : 'border-outline-variant text-on-surface-variant hover:border-secondary hover:text-secondary'}`}>
                      <input type="checkbox" checked={form.question_types.includes(t)} onChange={() => toggleType(t)} className="hidden" />
                      <span className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${form.question_types.includes(t) ? 'bg-secondary border-secondary' : 'border-outline-variant'}`}>
                        {form.question_types.includes(t) && <Icon className="text-white text-xs">check</Icon>}
                      </span>
                      {t === 'mcq' ? 'Multiple Choice' : t === 'short_answer' ? 'Short Answer' : 'Long Answer'}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-on-surface-variant block mb-xs">Difficulties</label>
                <div className="flex gap-sm flex-wrap">
                  {['easy', 'medium', 'hard'].map(d => (
                    <label key={d} className={`flex items-center gap-sm px-lg py-sm rounded-xl cursor-pointer select-none border transition-all ${form.difficulties.includes(d) ? 'border-secondary bg-secondary-container/10 text-secondary font-bold' : 'border-outline-variant text-on-surface-variant hover:border-secondary hover:text-secondary'}`}>
                      <input type="checkbox" checked={form.difficulties.includes(d)} onChange={() => toggleDifficulty(d)} className="hidden" />
                      <span className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${form.difficulties.includes(d) ? 'bg-secondary border-secondary' : 'border-outline-variant'}`}>
                        {form.difficulties.includes(d) && <Icon className="text-white text-xs">check</Icon>}
                      </span>
                      {d.charAt(0).toUpperCase() + d.slice(1)}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-on-surface-variant block mb-xs">Bloom's Taxonomy Levels <span className="font-normal text-on-surface-variant">(optional)</span></label>
                <div className="flex gap-sm flex-wrap">
                  {BLOOMS.map(b => (
                    <label key={b} className={`flex items-center gap-sm px-lg py-sm rounded-xl cursor-pointer select-none border transition-all ${bloomsLevels.includes(b) ? 'border-tertiary bg-tertiary-container/10 text-tertiary font-bold' : 'border-outline-variant text-on-surface-variant hover:border-tertiary hover:text-tertiary'}`}>
                      <input type="checkbox" checked={bloomsLevels.includes(b)} onChange={() => toggleBloom(b)} className="hidden" />
                      <span className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${bloomsLevels.includes(b) ? 'bg-tertiary border-tertiary' : 'border-outline-variant'}`}>
                        {bloomsLevels.includes(b) && <Icon className="text-white text-xs">check</Icon>}
                      </span>
                      {b.charAt(0).toUpperCase() + b.slice(1)}
                    </label>
                  ))}
                </div>
              </div>

              {syllabusEntries.length > 0 && (
                <div>
                  <button type="button" onClick={() => setShowSyllabusPicker(!showSyllabusPicker)} className={`flex items-center gap-sm px-md py-sm rounded-xl border transition-all cursor-pointer ${showSyllabusPicker ? 'border-secondary bg-secondary-container/10' : 'border-outline-variant hover:border-secondary'}`}>
                    <Icon className={`text-sm ${showSyllabusPicker ? 'text-secondary' : 'text-on-surface-variant'}`}>menu_book</Icon>
                    <span className={`text-sm font-bold ${showSyllabusPicker ? 'text-secondary' : 'text-on-surface-variant'}`}>
                      {showSyllabusPicker ? 'Hide' : 'Show'} Syllabus Entries
                    </span>
                    {form.syllabus_ids.length > 0 && (
                      <span className="text-xs bg-secondary text-white px-xs py-0.5 rounded-full">{form.syllabus_ids.length}</span>
                    )}
                  </button>
                  {showSyllabusPicker && (
                    <div className="mt-sm max-h-40 overflow-y-auto space-y-xs border border-outline-variant rounded-xl p-sm">
                      {syllabusLoading ? (
                        <div className="flex items-center justify-center gap-sm p-md text-sm text-on-surface-variant">
                          <span className="w-4 h-4 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
                          Loading syllabus...
                        </div>
                      ) : (
                        syllabusEntries.map(entry => (
                          <label key={entry.id} className={`flex items-center gap-sm px-sm py-xs rounded-lg cursor-pointer text-sm transition-all ${form.syllabus_ids.includes(entry.id) ? 'bg-secondary-container/10 text-secondary font-bold' : 'hover:bg-surface-container-low'}`}>
                            <input type="checkbox" checked={form.syllabus_ids.includes(entry.id)} onChange={() => toggleSyllabusEntry(entry.id)} className="hidden" />
                            <span className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 transition-all ${form.syllabus_ids.includes(entry.id) ? 'bg-secondary border-secondary' : 'border-outline-variant'}`}>
                              {form.syllabus_ids.includes(entry.id) && <Icon className="text-white text-xs">check</Icon>}
                            </span>
                            <span className="truncate">{entry.topic}{entry.chapter ? ` — ${entry.chapter}` : ''}{entry.unit ? ` (${entry.unit})` : ''}</span>
                          </label>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}

              {error && <div className="bg-error-container text-error p-md rounded-xl text-sm font-bold flex items-center gap-sm"><Icon className="text-lg">error</Icon>{error}</div>}
              <div className="flex justify-end gap-sm pt-lg border-t border-outline-variant">
                <button type="button" onClick={onClose} className="btn-secondary px-lg py-sm">Cancel</button>
                <button type="submit" disabled={loading} className="btn-primary px-lg py-sm">
                  {loading ? <span className="flex items-center gap-xs"><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Generating...</span> : 'Generate Questions'}
                </button>
              </div>
            </form>
          )}

          {step === 'review' && (
            <div className="p-lg">
              <div className="flex items-center justify-between mb-lg">
                <div>
                  <p className="text-sm text-on-surface-variant">
                    <span className="font-bold text-primary">{generated.length}</span> question(s) generated
                  </p>
                  <p className="text-xs text-on-surface-variant mt-xs">Select the ones you want to save, or edit any question before saving.</p>
                </div>
                <div className="flex items-center gap-sm text-sm">
                  <button onClick={() => setSelectedIds(new Set(generated.map((_, i) => i)))} className="text-secondary font-bold hover:underline">Select All</button>
                  <span className="text-on-surface-variant">|</span>
                  <button onClick={() => setSelectedIds(new Set())} className="text-secondary font-bold hover:underline">Deselect All</button>
                </div>
              </div>

              {error && <div className="mb-md bg-error-container text-error p-md rounded-xl text-sm font-bold flex items-center gap-sm"><Icon className="text-lg">error</Icon>{error}</div>}

              <div className="space-y-md">
                {generated.map((q, i) => {
                  const isEditing = editingId === i
                  const isSelected = selectedIds.has(i)
                  return (
                    <div key={i} className={`rounded-xl border-2 transition-all overflow-hidden ${isSelected ? 'border-secondary' : 'border-outline-variant hover:border-outline-variant'}`}>
                      <div className="flex items-stretch">
                        <div className={`w-1 shrink-0 transition-all ${isSelected ? 'bg-secondary' : 'bg-transparent'}`} />
                        <div className="flex-1 p-lg">
                          <div className="flex items-start gap-md">
                            <button onClick={() => toggleSelect(i)} className={`mt-1 shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-secondary border-secondary' : 'border-outline-variant hover:border-secondary'}`}>
                              {isSelected && <Icon className="text-white text-sm">check</Icon>}
                            </button>
                            <div className="flex-1 min-w-0">
                              <div className="flex gap-sm mb-sm flex-wrap">
                                <span className={`pill text-xs font-bold ${q.difficulty === 'hard' ? 'bg-error-container text-error' : q.difficulty === 'easy' ? 'bg-tertiary-container text-tertiary' : 'bg-secondary-container text-secondary'}`}>{q.difficulty}</span>
                                <span className="pill bg-surface-container-high text-on-surface-variant text-xs">{q.question_type.replace('_', ' ')}</span>
                                <span className="pill bg-surface-container-high text-on-surface-variant text-xs">{q.marks || form.marks} mark(s)</span>
                                {q.blooms_level && <span className="pill bg-tertiary-container/50 text-tertiary text-xs capitalize">{q.blooms_level}</span>}
                                <span className="text-xs text-on-surface-variant">{q.subject} &bull; {q.topic}</span>
                              </div>

                              {isEditing ? (
                                <div className="space-y-md">
                                  <div>
                                    <label className="text-xs font-bold text-on-surface-variant block mb-xs">Question Text</label>
                                    <textarea value={editData.question_text} onChange={e => onEditField('question_text', e.target.value)} className="input min-h-20" />
                                  </div>
                                  {q.question_type === 'mcq' && editData.options && (
                                    <div>
                                      <label className="text-xs font-bold text-on-surface-variant block mb-xs">Options</label>
                                      <div className="space-y-sm">
                                        {editData.options.map((opt, oi) => (
                                          <div key={oi} className="flex items-center gap-sm">
                                            <span className="w-7 h-7 rounded-full bg-surface-container-low grid place-items-center text-xs font-bold shrink-0">{String.fromCharCode(65 + oi)}</span>
                                            <input value={opt} onChange={e => onEditOption(oi, e.target.value)} className="input flex-1" />
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  <div className="grid grid-cols-2 gap-md">
                                    <div>
                                      <label className="text-xs font-bold text-on-surface-variant block mb-xs">Correct Answer</label>
                                      <input value={editData.correct_answer} onChange={e => onEditField('correct_answer', e.target.value)} className="input" />
                                    </div>
                                    <div>
                                      <label className="text-xs font-bold text-on-surface-variant block mb-xs">Marks</label>
                                      <input type="number" min="1" value={editData.marks !== undefined ? editData.marks : (q.marks || form.marks)} onChange={e => onEditField('marks', Math.max(1, parseInt(e.target.value) || 1))} className="input" />
                                    </div>
                                  </div>
                                  <div>
                                    <label className="text-xs font-bold text-on-surface-variant block mb-xs">Explanation</label>
                                    <textarea value={editData.explanation} onChange={e => onEditField('explanation', e.target.value)} className="input min-h-12" placeholder="Brief explanation..." />
                                  </div>
                                  <div className="flex gap-sm">
                                    <button onClick={() => saveEdit(i)} className="btn-primary px-md py-sm text-sm">Save Changes</button>
                                    <button onClick={cancelEdit} className="btn-secondary px-md py-sm text-sm">Cancel</button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <p className="font-bold text-primary text-lg">{q.question_text}</p>
                                  {q.options && (
                                    <div className="mt-sm grid grid-cols-2 gap-sm">
                                      {q.options.map((o, oi) => (
                                        <div key={oi} className="flex items-center gap-sm px-md py-sm bg-surface-container-low rounded-lg border border-outline-variant/50">
                                          <span className="w-6 h-6 rounded-full bg-surface-container-high grid place-items-center text-xs font-bold shrink-0">{String.fromCharCode(65 + oi)}</span>
                                          <span className="text-sm text-primary">{o}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  <div className="mt-sm flex items-center gap-sm flex-wrap">
                                    <span className="text-xs text-on-surface-variant">Answer:</span>
                                    <span className="text-sm font-bold text-secondary">{q.correct_answer}</span>
                                  </div>
                                  {q.explanation && <p className="text-sm text-on-surface-variant mt-sm p-sm bg-surface-container-low rounded-lg border border-outline-variant/30">{q.explanation}</p>}
                                  <div className="mt-md flex gap-lg">
                                    <button onClick={() => startEdit(i)} className="text-sm text-secondary font-bold flex items-center gap-xs hover:underline">
                                      <Icon className="text-sm">edit</Icon>Edit
                                    </button>
                                    <button onClick={() => handleRegenerate(i)} disabled={regeneratingId === i} className="text-sm text-secondary font-bold flex items-center gap-xs hover:underline">
                                      <Icon className={`text-sm ${regeneratingId === i ? 'animate-spin' : ''}`}>{regeneratingId === i ? 'sync' : 'refresh'}</Icon>{regeneratingId === i ? 'Regenerating...' : 'Regenerate'}
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {step === 'review' && (
          <div className="p-lg border-t border-outline-variant bg-surface-container-low shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-sm">
                <span className="w-8 h-8 rounded-full bg-secondary grid place-items-center">
                  <span className="text-white text-sm font-bold">{selectedIds.size}</span>
                </span>
                <span className="text-sm text-on-surface-variant">of <span className="font-bold text-primary">{generated.length}</span> selected</span>
              </div>
              <div className="flex gap-sm">
                <button onClick={() => setStep('form')} className="btn-secondary px-lg py-sm">Back</button>
                <button onClick={handleSave} disabled={saving || selectedIds.size === 0} className="btn-primary px-lg py-sm">
                  {saving ? <span className="flex items-center gap-xs"><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</span> : `Save ${selectedIds.size} Question(s)`}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}