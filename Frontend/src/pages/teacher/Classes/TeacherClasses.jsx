import { useState, useEffect, useCallback } from 'react'
import TeacherShell, { Icon } from '../../../components/TeacherShell.jsx'
import { classService } from '../../../services/classService.js'

export default function TeacherClasses({ page, setPage, pageRef }) {
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', subject: '', description: '', semester: '', academic_year: '' })
  const [creating, setCreating] = useState(false)
  const [createdClass, setCreatedClass] = useState(null)

  const fetchClasses = useCallback(async () => {
    setLoading(true)
    try {
      const data = await classService.getTeacherClasses()
      setClasses(Array.isArray(data) ? data : [])
    } catch {
      setClasses([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchClasses() }, [fetchClasses])

  const handleCreate = async () => {
    if (!form.name.trim() || !form.subject.trim()) return
    setCreating(true)
    try {
      const cls = await classService.createClass(form)
      setCreatedClass(cls)
      await fetchClasses()
    } catch (e) {
      alert('Failed to create class: ' + e.message)
    } finally {
      setCreating(false)
    }
  }

  const copyCode = (code) => {
    navigator.clipboard.writeText(code)
  }

  if (createdClass) {
    return (
      <TeacherShell page={page} setPage={setPage} title="Class Created">
        <div className="max-w-3xl mx-auto mt-xl text-center">
          <div className="card p-xl">
            <div className="w-16 h-16 rounded-full bg-success-container text-success flex items-center justify-center mx-auto mb-md">
              <Icon className="text-3xl">check_circle</Icon>
            </div>
            <h2 className="text-2xl font-bold text-primary mb-xs">Class Created Successfully</h2>
            <p className="text-lg font-bold text-on-surface mb-lg">{createdClass.name}</p>
            <div className="bg-surface-container-low rounded-xl p-lg mb-lg">
              <p className="text-xs text-on-surface-variant uppercase tracking-wider mb-sm font-bold">Class Code</p>
              <p className="text-4xl font-extrabold text-primary tracking-[0.25em] mb-md">{createdClass.code}</p>
              <button onClick={() => copyCode(createdClass.code)} className="btn-primary px-lg py-sm inline-flex items-center gap-xs">
                <Icon className="text-sm">content_copy</Icon> Copy Code
              </button>
            </div>
            <p className="text-sm text-on-surface-variant mb-lg">Share this code with your students so they can join your class.</p>
            <div className="flex gap-md justify-center">
              <button onClick={() => { setCreatedClass(null); setShowCreate(false); setForm({ name: '', subject: '', description: '', semester: '', academic_year: '' }) }} className="px-lg py-sm border border-outline-variant rounded-lg text-sm font-bold text-on-surface-variant hover:bg-surface-container-high">
                Create Another
              </button>
              <button onClick={() => { setCreatedClass(null); setPage('manageClass'); pageRef.current = { manageClass: createdClass.id } }} className="btn-primary px-lg py-sm">
                Go to Class
              </button>
            </div>
          </div>
        </div>
      </TeacherShell>
    )
  }

  return (
    <TeacherShell page={page} setPage={setPage} title="My Classes">
      <div className="flex justify-between items-center mb-lg">
        <div>
          <h1 className="text-4xl font-extrabold text-primary">Classes</h1>
          <p className="text-on-surface-variant">Manage your class groups and invite students.</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary px-md py-sm flex items-center gap-xs">
          <Icon>add</Icon> Create Class
        </button>
      </div>

      {loading ? (
        <div className="text-center py-xl text-on-surface-variant">Loading classes...</div>
      ) : classes.length === 0 ? (
        <div className="card p-xl text-center max-w-3xl mx-auto">
          <Icon className="text-6xl text-outline-variant mb-md">groups</Icon>
          <h3 className="text-xl font-bold text-primary mb-sm">No Classes Yet</h3>
          <p className="text-sm text-on-surface-variant mb-lg">
            Create a class to organize your students and assign exams to an entire class at once.
          </p>
          <button onClick={() => setShowCreate(true)} className="btn-primary px-lg py-sm">Create Class</button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-md">
          {classes.map(c => (
            <div key={c.id} className="card p-md flex flex-col">
              <div className="flex-1">
                <h3 className="text-lg font-bold text-primary mb-xs">{c.name}</h3>
                <p className="text-sm text-on-surface-variant mb-md">{c.subject}</p>
                {(c.semester || c.academic_year) && (
                  <p className="text-xs text-on-surface-variant mb-md">
                    {c.semester && `Semester ${c.semester}`}{c.semester && c.academic_year ? ' • ' : ''}{c.academic_year || ''}
                  </p>
                )}
                <div className="flex gap-lg mb-md text-sm">
                  <span className="flex items-center gap-xs text-on-surface-variant">
                    <Icon className="text-sm">people</Icon> {c.student_count} Students
                  </span>
                  <span className="flex items-center gap-xs text-on-surface-variant">
                    <Icon className="text-sm">assignment</Icon> {c.exam_count} Exams
                  </span>
                </div>
                <div className="bg-surface-container-low rounded-lg p-md mb-md text-center">
                  <p className="text-xs text-on-surface-variant font-bold uppercase tracking-wider mb-xs">Class Code</p>
                  <p className="text-2xl font-extrabold text-primary tracking-wider">{c.code}</p>
                </div>
              </div>
              <div className="flex gap-sm pt-md border-t border-outline-variant">
                <button onClick={() => copyCode(c.code)} className="flex-1 px-md py-sm border border-outline-variant rounded-lg text-xs font-bold text-on-surface-variant hover:bg-surface-container-high flex items-center justify-center gap-xs">
                  <Icon className="text-xs">content_copy</Icon> Copy Code
                </button>
                <button onClick={() => { pageRef.current = { manageClass: c.id }; setPage('manageClass') }} className="flex-1 btn-primary px-md py-sm text-xs">
                  Manage Class
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && !createdClass && (
        <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-md" onClick={() => setShowCreate(false)}>
          <div className="bg-surface rounded-2xl max-w-3xl w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-lg border-b border-outline-variant">
              <h3 className="text-xl font-bold text-primary">Create Class</h3>
              <button onClick={() => setShowCreate(false)} className="p-xs hover:bg-surface-container-high rounded-full"><Icon className="text-xl">close</Icon></button>
            </div>
            <form className="p-lg space-y-md" onSubmit={e => { e.preventDefault(); handleCreate() }}>
              <div>
                <label className="block text-sm font-bold text-on-surface-variant mb-xs">Class Name *</label>
                <input className="input" placeholder="e.g. Data Structures - SE A" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
              </div>
              <div>
                <label className="block text-sm font-bold text-on-surface-variant mb-xs">Subject *</label>
                <input className="input" placeholder="e.g. Data Structures" value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} required />
              </div>
              <div className="grid grid-cols-2 gap-md">
                <div>
                  <label className="block text-sm font-bold text-on-surface-variant mb-xs">Semester</label>
                  <input className="input" placeholder="e.g. 3" value={form.semester} onChange={e => setForm(p => ({ ...p, semester: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-on-surface-variant mb-xs">Academic Year</label>
                  <input className="input" placeholder="e.g. 2025-26" value={form.academic_year} onChange={e => setForm(p => ({ ...p, academic_year: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-on-surface-variant mb-xs">Description</label>
                <textarea className="input min-h-[80px]" placeholder="Optional description..." value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
              </div>
              <div className="flex gap-md pt-sm border-t border-outline-variant">
                <button type="button" onClick={() => setShowCreate(false)} className="flex-1 px-lg py-sm border border-outline-variant rounded-lg text-sm font-bold text-on-surface-variant hover:bg-surface-container-high">Cancel</button>
                <button type="submit" disabled={creating || !form.name.trim() || !form.subject.trim()} className="flex-1 btn-primary px-lg py-sm disabled:opacity-50">{creating ? 'Creating...' : 'Create Class'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </TeacherShell>
  )
}
