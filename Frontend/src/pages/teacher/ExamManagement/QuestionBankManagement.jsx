import { useState, useEffect, useCallback } from 'react'
import TeacherShell, { Icon, StatCard } from '../../../components/TeacherShell.jsx'
import { questionService } from '../../../services/questionService.js'
import QuestionFormModal from './QuestionFormModal.jsx'
import CSVImportModal from './CSVImportModal.jsx'
import AIGenerateModal from './AIGenerateModal.jsx'

export default function QuestionBankManagement({ page, setPage }) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState([])
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [mode, setMode] = useState(null)

  const fetchQuestions = useCallback(async () => {
    setLoading(true)
    try {
      const data = await questionService.list()
      setQuestions(data)
    } catch {
      setQuestions([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchQuestions() }, [fetchQuestions])

  async function handleDelete(id) {
    if (!confirm('Delete this question?')) return
    try {
      await questionService.delete(id)
      setQuestions(prev => prev.filter(q => q.id !== id))
    } catch (err) {
      alert(err.message)
    }
  }

  function handleAddClick(x, i) {
    setOpen(false)
    if (i === 0) {
      setMode('manual')
      setShowModal(true)
    } else if (i === 1) {
      setMode('csv')
      setShowModal(true)
    } else {
      setMode('ai')
      setShowModal(true)
    }
  }

  function handleSaved(result) {
    if (Array.isArray(result)) {
      setQuestions(prev => [...result, ...prev])
    } else {
      setQuestions(prev => [result, ...prev])
    }
  }

  const difficultyClass = (d) => {
    if (d === 'hard') return 'text-error'
    if (d === 'easy') return 'text-on-tertiary-container'
    return 'text-secondary'
  }

  return (
    <TeacherShell page={page} setPage={setPage} title="Question Bank" search>
      <div className="flex justify-between items-end mb-lg">
        <div>
          <h1 className="text-4xl font-extrabold text-primary">Question Bank</h1>
          <p className="text-on-surface-variant">Manage your institution's central assessment repository.</p>
        </div>
        <div className="relative">
          <button onClick={() => setOpen(!open)} className="btn-primary px-md py-sm flex items-center gap-xs">
            <Icon>add_circle</Icon>Add New Question<Icon>expand_more</Icon>
          </button>
          {open && <div className="absolute top-full right-0 mt-xs w-48 bg-surface-container-lowest border border-outline-variant rounded-lg shadow-xl py-xs z-50">
            {['Manual Entry', 'Bulk CSV Import', 'AI Generation'].map((x, i) =>
              <button key={x} onClick={() => handleAddClick(x, i)} className="w-full flex items-center gap-xs px-md py-sm text-sm hover:bg-surface-container-low">
                <Icon className="text-sm">{['edit_note', 'upload_file', 'smart_toy'][i]}</Icon>{x}
              </button>
            )}
          </div>}
          
        </div>
      </div>

      <div className="flex gap-gutter items-start">
        <aside className="w-72 flex-shrink-0 sticky top-[88px] bg-surface-container-low rounded-xl border border-outline-variant p-md">
          <div className="flex justify-between mb-md">
            <h3 className="text-xl font-bold text-primary">Filters</h3>
            <button className="text-xs text-secondary font-bold">RESET</button>
          </div>
          <div className="space-y-md">
            <div><label className="text-xs font-bold text-on-surface-variant block mb-xs">Subject</label><select className="input"><option>All Subjects</option></select></div>
            <div><label className="text-xs font-bold text-on-surface-variant block mb-xs">Difficulty</label>{['Easy', 'Medium', 'Hard'].map((x, i) => <label key={x} className="flex items-center gap-sm p-2 hover:bg-surface-container-high rounded-lg"><input type="checkbox" defaultChecked={i === 1} className="rounded text-secondary" /><span className="text-sm">{x}</span></label>)}</div>
            <div><label className="text-xs font-bold text-on-surface-variant block mb-xs">Question Type</label><div className="flex flex-wrap gap-xs">{['MCQ', 'Subjective', 'True/False', 'Matching'].map(x => <button key={x} className="px-sm py-1 rounded-full border border-outline-variant bg-white text-xs hover:border-secondary">{x}</button>)}</div></div>
            <input type="date" className="input" />
          </div>
        </aside>

        <div className="flex-1 card overflow-hidden">
          <table className="w-full text-left table-fixed">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant">
                <th className="table-th w-10"><input type="checkbox" /></th>
                <th className="table-th">Question Preview</th>
                <th className="table-th w-[11%]">Type</th>
                <th className="table-th w-[11%]">Subject</th>
                <th className="table-th w-[11%]">Difficulty</th>
                <th className="table-th w-[15%]">Created</th>
                <th className="table-th w-[20%] last:text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {loading ? (
                <tr><td colSpan={7} className="table-td text-center py-xl text-on-surface-variant">Loading questions...</td></tr>
              ) : questions.length === 0 ? (
                <tr><td colSpan={7} className="table-td text-center text-on-surface-variant py-xl">No questions yet. Add a new question to get started.</td></tr>
              ) : questions.map((q, i) => (
                <tr key={q.id} onClick={() => setSelected(s => s.includes(q.id) ? s.filter(x => x !== q.id) : [...s, q.id])} className="hover:bg-surface-container-low cursor-pointer group">
                  <td className="table-td"><input checked={selected.includes(q.id)} readOnly type="checkbox" /></td>
                  <td className="table-td truncate">
                    <div className="flex gap-sm">
                      <div className={`w-2 h-10 rounded-full shrink-0 ${i % 2 ? 'bg-secondary-container' : 'bg-primary'}`} />
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-primary truncate">{q.question_text}</p>
                        <p className="text-xs text-on-surface-variant truncate">{q.topic}</p>
                      </div>
                    </div>
                  </td>
                  <td className="table-td whitespace-nowrap"><span className="pill bg-surface-container-highest text-on-surface-variant">{q.question_type.replace('_', ' ')}</span></td>
                  <td className="table-td whitespace-nowrap text-sm">{q.subject}</td>
                  <td className="table-td whitespace-nowrap"><span className={`text-xs font-bold ${difficultyClass(q.difficulty)}`}>● {q.difficulty}</span></td>
                  <td className="table-td whitespace-nowrap text-xs text-on-surface-variant">{new Date(q.created_at).toLocaleDateString()}</td>
                  <td className="table-td whitespace-nowrap"><div className="flex justify-end gap-xs opacity-0 group-hover:opacity-100">
                    <button className="p-2 hover:bg-surface-container-high rounded-full"><Icon className="text-sm">edit</Icon></button>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(q.id) }} className="p-2 hover:bg-surface-container-high rounded-full"><Icon className="text-sm">delete</Icon></button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-gutter mt-lg">
        <StatCard label="Total Repository" value={questions.length.toString() || '—'} />
        <StatCard label="AI Generated" value="—" icon="auto_awesome" />
        <StatCard label="Unused" value="—" icon="archive" />
        <StatCard label="Average Difficulty" value="—" />
      </div>

      {showModal && mode === 'manual' && <QuestionFormModal onClose={() => setShowModal(false)} onSaved={handleSaved} />}
      {showModal && mode === 'csv' && <CSVImportModal onClose={() => setShowModal(false)} onSaved={handleSaved} />}
      {showModal && mode === 'ai' && <AIGenerateModal onClose={() => setShowModal(false)} onSaved={handleSaved} />}
    </TeacherShell>
  )
}
