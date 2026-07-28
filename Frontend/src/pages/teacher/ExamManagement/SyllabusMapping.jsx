import { useState, useEffect, useCallback } from 'react'
import TeacherShell, { Icon } from '../../../components/TeacherShell.jsx'
import { syllabusService } from '../../../services/syllabusService.js'

export default function SyllabusMapping({ page, setPage }) {
  const [entries, setEntries] = useState([])
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterSubject, setFilterSubject] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ subject: '', topic: '', chapter: '', unit: '', description: '', learning_outcomes: '' })
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    try {
      const data = await syllabusService.list(filterSubject || undefined)
      setEntries(data)
    } catch {
      setEntries([])
    } finally {
      setLoading(false)
    }
  }, [filterSubject])

  const fetchSubjects = useCallback(async () => {
    try {
      const data = await syllabusService.listSubjects()
      setSubjects(data)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => { fetchEntries() }, [fetchEntries])
  useEffect(() => { fetchSubjects() }, [fetchSubjects])

  function resetForm() {
    setForm({ subject: '', topic: '', chapter: '', unit: '', description: '', learning_outcomes: '' })
    setEditingId(null)
    setError('')
  }

  function startEdit(entry) {
    setForm({
      subject: entry.subject || '',
      topic: entry.topic || '',
      chapter: entry.chapter || '',
      unit: entry.unit || '',
      description: entry.description || '',
      learning_outcomes: entry.learning_outcomes || '',
    })
    setEditingId(entry.id)
    setShowForm(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.subject.trim() || !form.topic.trim()) {
      setError('Subject and topic are required.')
      return
    }
    setSaving(true)
    setError('')
    try {
      if (editingId) {
        await syllabusService.update(editingId, form)
      } else {
        await syllabusService.create(form)
      }
      resetForm()
      setShowForm(false)
      fetchEntries()
      fetchSubjects()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Deactivate this syllabus entry?')) return
    try {
      await syllabusService.delete(id)
      fetchEntries()
      fetchSubjects()
    } catch (err) {
      alert(err.message)
    }
  }

  return (
    <TeacherShell page={page} setPage={setPage} title="Syllabus Mapping">
      <div className="flex justify-between items-end mb-lg">
        <div>
          <h1 className="text-4xl font-extrabold text-primary">Syllabus Mapping</h1>
          <p className="text-on-surface-variant">Manage curriculum topics, chapters, and outcomes for AI question generation.</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true) }} className="btn-primary px-md py-sm flex items-center gap-xs">
          <Icon className="text-sm">add_circle</Icon>Add Topic
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { setShowForm(false); resetForm() }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto m-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-lg border-b border-outline-variant">
              <h2 className="text-xl font-bold text-primary">{editingId ? 'Edit Syllabus Entry' : 'Add Syllabus Entry'}</h2>
              <button onClick={() => { setShowForm(false); resetForm() }} className="p-2 hover:bg-surface-container-low rounded-full"><Icon>close</Icon></button>
            </div>
            <form onSubmit={handleSubmit} className="p-lg space-y-md">
              <div className="grid grid-cols-2 gap-md">
                <div>
                  <label className="text-xs font-bold text-on-surface-variant block mb-xs">Subject *</label>
                  <input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} className="input" placeholder="e.g. Physics" />
                </div>
                <div>
                  <label className="text-xs font-bold text-on-surface-variant block mb-xs">Topic *</label>
                  <input value={form.topic} onChange={e => setForm(f => ({ ...f, topic: e.target.value }))} className="input" placeholder="e.g. Thermodynamics" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-md">
                <div>
                  <label className="text-xs font-bold text-on-surface-variant block mb-xs">Chapter</label>
                  <input value={form.chapter} onChange={e => setForm(f => ({ ...f, chapter: e.target.value }))} className="input" placeholder="e.g. Chapter 5" />
                </div>
                <div>
                  <label className="text-xs font-bold text-on-surface-variant block mb-xs">Unit</label>
                  <input value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} className="input" placeholder="e.g. Unit 3" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-on-surface-variant block mb-xs">Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="input min-h-14" placeholder="Brief description of this topic..." />
              </div>
              <div>
                <label className="text-xs font-bold text-on-surface-variant block mb-xs">Learning Outcomes</label>
                <textarea value={form.learning_outcomes} onChange={e => setForm(f => ({ ...f, learning_outcomes: e.target.value }))} className="input min-h-14" placeholder="e.g. Understand the laws of thermodynamics, Apply thermodynamic equations" />
              </div>
              {error && <p className="text-error text-sm font-bold">{error}</p>}
              <div className="flex justify-end gap-sm pt-md border-t border-outline-variant">
                <button type="button" onClick={() => { setShowForm(false); resetForm() }} className="btn-secondary px-lg py-sm">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary px-lg py-sm">{saving ? 'Saving...' : editingId ? 'Update' : 'Add Entry'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex gap-sm mb-lg flex-wrap">
        <button onClick={() => setFilterSubject('')} className={`pill cursor-pointer ${!filterSubject ? 'bg-secondary-container text-white' : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'}`}>All</button>
        {subjects.map(s => (
          <button key={s.subject} onClick={() => setFilterSubject(s.subject)} className={`pill cursor-pointer ${filterSubject === s.subject ? 'bg-secondary-container text-white' : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'}`}>
            {s.subject} ({s.topic_count})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-xl text-on-surface-variant">Loading syllabus...</div>
      ) : entries.length === 0 ? (
        <div className="text-center py-xl">
          <Icon className="text-5xl text-on-surface-variant mb-md">menu_book</Icon>
          <p className="text-lg font-bold text-primary mb-sm">No syllabus entries yet</p>
          <p className="text-on-surface-variant mb-lg">Add your curriculum topics to enable syllabus-based AI question generation.</p>
          <button onClick={() => { resetForm(); setShowForm(true) }} className="btn-primary px-lg py-sm">
            <Icon className="text-sm inline align-middle mr-xs">add_circle</Icon>Add First Topic
          </button>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-left table-fixed">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant">
                <th className="table-th">Subject</th>
                <th className="table-th">Topic</th>
                <th className="table-th w-[12%]">Chapter</th>
                <th className="table-th w-[10%]">Unit</th>
                <th className="table-th">Learning Outcomes</th>
                <th className="table-th w-[15%] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {entries.map(e => (
                <tr key={e.id} className="hover:bg-surface-container-low group">
                  <td className="table-td"><span className="pill bg-primary-fixed text-primary text-xs">{e.subject}</span></td>
                  <td className="table-td font-bold text-primary">{e.topic}</td>
                  <td className="table-td text-sm text-on-surface-variant">{e.chapter || '-'}</td>
                  <td className="table-td text-sm text-on-surface-variant">{e.unit || '-'}</td>
                  <td className="table-td text-xs text-on-surface-variant truncate">{e.learning_outcomes || '-'}</td>
                  <td className="table-td"><div className="flex justify-end gap-xs">
                    <button onClick={() => startEdit(e)} className="p-2 hover:bg-surface-container-high rounded-full" title="Edit">
                      <Icon className="text-sm">edit</Icon>
                    </button>
                    <button onClick={() => handleDelete(e.id)} className="p-2 hover:bg-surface-container-high rounded-full" title="Deactivate">
                      <Icon className="text-sm">delete</Icon>
                    </button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </TeacherShell>
  )
}