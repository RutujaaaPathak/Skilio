import { useState, useEffect, useCallback } from 'react'
import TeacherShell, { Icon, StatCard } from '../../../components/TeacherShell.jsx'
import { questionService } from '../../../services/questionService.js'
import QuestionFormModal from './QuestionFormModal.jsx'
import QuestionPreviewModal from './QuestionPreviewModal.jsx'
import CSVImportModal from './CSVImportModal.jsx'
import AIGenerateModal from './AIGenerateModal.jsx'

const PAGE_SIZE = 20

const DIFFICULTIES = ['easy', 'medium', 'hard']
const QUESTION_TYPES = ['mcq', 'short_answer', 'long_answer']

const SUBJECT_COLORS = [
  'bg-primary/10 border-l-primary',
  'bg-secondary/10 border-l-secondary',
  'bg-tertiary/10 border-l-tertiary',
  'bg-error/10 border-l-error',
  'bg-primary/10 border-l-primary',
  'bg-secondary/10 border-l-secondary',
]

export default function QuestionBankManagement({ page, setPage }) {
  const [open, setOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [selected, setSelected] = useState([])
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [mode, setMode] = useState(null)
  const [editQuestion, setEditQuestion] = useState(null)
  const [previewQuestion, setPreviewQuestion] = useState(null)
  const [view, setView] = useState('overview')
  const [activeSubject, setActiveSubject] = useState('')

  const [searchValue, setSearchValue] = useState('')
  const [filterSubject, setFilterSubject] = useState('')
  const [filterDifficulty, setFilterDifficulty] = useState('')
  const [filterType, setFilterType] = useState('')

  const [pageNum, setPageNum] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [analytics, setAnalytics] = useState(null)
  const [bulkSubject, setBulkSubject] = useState('')
  const [bulkDifficulty, setBulkDifficulty] = useState('')
  const [bulkShow, setBulkShow] = useState(false)
  const [expandedTopics, setExpandedTopics] = useState({})

  const fetchQuestions = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page: pageNum, page_size: PAGE_SIZE }
      if (searchValue.trim()) params.search = searchValue.trim()
      if (filterSubject) params.subject = filterSubject
      if (filterDifficulty) params.difficulty = filterDifficulty
      if (filterType) params.question_type = filterType
      const data = await questionService.list(params)
      setQuestions(data.items || [])
      setTotal(data.total || 0)
      setTotalPages(data.total_pages || 1)
    } catch {
      setQuestions([])
      setTotal(0)
      setTotalPages(1)
    } finally {
      setLoading(false)
    }
  }, [pageNum, searchValue, filterSubject, filterDifficulty, filterType])

const fetchAnalytics = useCallback(async () => {
    try {
      const data = await questionService.analytics()
      setAnalytics(data)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => { fetchQuestions() }, [fetchQuestions])
  useEffect(() => { fetchAnalytics() }, [fetchAnalytics])
  useEffect(() => { setPageNum(1) }, [searchValue, filterSubject, filterDifficulty, filterType])

  function getFilterParams() {
    const params = {}
    if (searchValue.trim()) params.search = searchValue.trim()
    if (filterSubject) params.subject = filterSubject
    if (filterDifficulty) params.difficulty = filterDifficulty
    if (filterType) params.question_type = filterType
    return params
  }

  function handleSubjectClick(subject) {
    setActiveSubject(subject)
    setFilterSubject(subject)
    setView('subject')
    setPageNum(1)
  }

  function handleBackToOverview() {
    setActiveSubject('')
    setFilterSubject('')
    setView('overview')
    setSelected([])
    setSearchValue('')
    setFilterDifficulty('')
    setFilterType('')
    setPageNum(1)
  }

  async function handleExportCsv() {
    setExportOpen(false)
    try { await questionService.exportCsv(getFilterParams()) }
    catch (err) { alert(err.message) }
  }

  async function handleExportJson() {
    setExportOpen(false)
    try { await questionService.exportJson(getFilterParams()) }
    catch (err) { alert(err.message) }
  }

  async function handleExportPdf() {
    setExportOpen(false)
    try { await questionService.exportPdf(getFilterParams()) }
    catch (err) { alert(err.message) }
  }

  async function handleDelete(id) {
    try {
      await questionService.delete(id)
      setQuestions(prev => prev.filter(q => q.id !== id))
      setTotal(prev => prev - 1)
    } catch (err) {
      alert(err.message)
    }
  }

  async function handleDuplicate(id) {
    try {
      const created = await questionService.duplicate(id)
      setQuestions(prev => [created, ...prev])
      setTotal(prev => prev + 1)
    } catch (err) {
      alert(err.message)
    }
  }

  async function handleBulkDelete() {
    if (selected.length === 0) return
    if (!confirm('Delete ' + selected.length + ' selected question(s)?')) return
    try {
      const result = await questionService.bulkDelete(selected)
      setQuestions(prev => prev.filter(q => !selected.includes(q.id)))
      setTotal(prev => prev - result.deleted)
      setSelected([])
      if (result.errors.length > 0) {
        alert('Deleted ' + result.deleted + '. Errors: ' + result.errors.join('; '))
      }
    } catch (err) {
      alert(err.message)
    }
  }

  async function handleBulkUpdate() {
    if (selected.length === 0 || !bulkSubject && !bulkDifficulty) return
    if (!confirm('Update ' + selected.length + ' selected question(s)?')) return
    try {
      const data = {}
      if (bulkSubject) data.subject = bulkSubject
      if (bulkDifficulty) data.difficulty = bulkDifficulty
      const result = await questionService.bulkUpdate(selected, data)
      setBulkShow(false)
      setBulkSubject('')
      setBulkDifficulty('')
      setSelected([])
      fetchQuestions()
      alert('Updated ' + result.updated + ' question(s)')
    } catch (err) {
      alert(err.message)
    }
  }

  function handleAddClick(x, i) {
    setOpen(false)
    setEditQuestion(null)
    if (i === 0) { setMode('manual'); setShowModal(true) }
    else if (i === 1) { setMode('csv'); setShowModal(true) }
    else { setMode('ai'); setShowModal(true) }
  }

  function handleEdit(q) {
    setEditQuestion(q)
    setMode('manual')
    setShowModal(true)
  }

  function handleSaved(result) {
    fetchQuestions()
    fetchAnalytics()
  }

  function handleCloseModal() {
    setShowModal(false)
    setEditQuestion(null)
  }

  function resetFilters() {
    setSearchValue('')
    setFilterSubject('')
    setFilterDifficulty('')
    setFilterType('')
    setPageNum(1)
  }

  function toggleSelect(id) {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  function toggleSelectAll() {
    setSelected(prev => prev.length === questions.length ? [] : questions.map(q => q.id))
  }

  const difficultyClass = (d) => {
    if (d === 'hard') return 'text-error'
    if (d === 'easy') return 'text-on-tertiary-container'
    return 'text-secondary'
  }

  const subjects = analytics?.by_subject ? Object.entries(analytics.by_subject) : []

  return (
    <TeacherShell page={page} setPage={setPage} title="Question Bank" search={view === 'subject'} searchValue={searchValue} onSearchChange={setSearchValue}>
      <div className="flex justify-between items-end mb-lg">
        <div>
          {view === 'subject' ? (
            <div className="flex items-center gap-sm mb-xs">
              <button onClick={handleBackToOverview} className="text-sm text-secondary font-bold flex items-center gap-xs hover:underline">
                <Icon className="text-sm">arrow_back</Icon>All Subjects
              </button>
            </div>
          ) : null}
          <h1 className="text-4xl font-extrabold text-primary">
            {view === 'subject' ? activeSubject : 'Question Bank'}
          </h1>
          <p className="text-on-surface-variant">
            {view === 'subject'
              ? `Manage questions for ${activeSubject}`
              : 'Manage your institution\'s central assessment repository.'}
          </p>
        </div>
        <div className="flex gap-sm">
{selected.length > 0 && (
            <button onClick={handleBulkDelete} className="btn-error px-md py-sm flex items-center gap-xs">
              <Icon>delete</Icon>Delete {selected.length}
            </button>
          )}
          {selected.length > 0 && (
            <button onClick={() => setBulkShow(true)} className="btn-secondary px-md py-sm flex items-center gap-xs">
              <Icon>edit</Icon>Update {selected.length}
            </button>
          )}
          {view === 'subject' && (
            <div className="relative">
              <button onClick={() => setExportOpen(!exportOpen)} className="btn-secondary px-md py-sm flex items-center gap-xs">
                <Icon>download</Icon>Export<Icon>expand_more</Icon>
              </button>
              {exportOpen && <div className="absolute top-full right-0 mt-xs w-44 bg-surface-container-lowest border border-outline-variant rounded-lg shadow-xl py-xs z-50">
                <button onClick={handleExportCsv} className="w-full flex items-center gap-xs px-md py-sm text-sm hover:bg-surface-container-low">
                  <Icon className="text-sm">description</Icon>Export CSV
                </button>
                <button onClick={handleExportJson} className="w-full flex items-center gap-xs px-md py-sm text-sm hover:bg-surface-container-low">
                  <Icon className="text-sm">data_object</Icon>Export JSON
                </button>
                <button onClick={handleExportPdf} className="w-full flex items-center gap-xs px-md py-sm text-sm hover:bg-surface-container-low">
                  <Icon className="text-sm">picture_as_pdf</Icon>Export PDF
                </button>
              </div>}
            </div>
          )}
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
      </div>

      {view === 'overview' ? (
        <div>
          {!analytics ? (
            <div className="text-center py-xl text-on-surface-variant">Loading subjects...</div>
          ) : subjects.length === 0 ? (
            <div className="text-center py-xl">
              <Icon className="text-5xl text-on-surface-variant mb-md mb-4">school</Icon>
              <p className="text-lg font-bold text-primary mb-sm">No subjects yet</p>
              <p className="text-on-surface-variant mb-lg">Add your first question to get started.</p>
              <button onClick={() => { setMode('manual'); setShowModal(true) }} className="btn-primary px-lg py-sm">
                <Icon className="text-sm inline align-middle mr-xs">add_circle</Icon>Add First Question
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md mb-lg">
                {subjects.map(([subject, count], idx) => (
                  <button
                    key={subject}
                    onClick={() => handleSubjectClick(subject)}
                    className={'text-left p-md rounded-xl border border-outline-variant border-l-4 hover:shadow-lg transition-shadow cursor-pointer ' + SUBJECT_COLORS[idx % SUBJECT_COLORS.length]}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-primary">{subject}</h3>
                        <p className="text-sm text-on-surface-variant mt-xs">{count} question{count !== 1 ? 's' : ''}</p>
                      </div>
                      <Icon className="text-xl text-on-surface-variant">chevron_right</Icon>
                    </div>
                  </button>
                ))}
              </div>
              <div className="grid md:grid-cols-4 gap-gutter">
                <StatCard label="Total Repository" value={analytics ? String(analytics.total_questions) : '0'} />
                <StatCard label="Recently Added (30d)" value={analytics ? String(analytics.recently_added) : '---'} icon="schedule" />
                <StatCard label="Unused" value={analytics ? String(analytics.unused) : '---'} icon="archive" />
                <StatCard label="Average Difficulty" value={analytics ? analytics.average_difficulty : '---'} />
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="flex gap-gutter items-start">
          <aside className="w-72 flex-shrink-0 sticky top-[88px] bg-surface-container-low rounded-xl border border-outline-variant p-md hidden md:block">
            <div className="flex justify-between mb-md">
              <h3 className="text-xl font-bold text-primary">Filters</h3>
              <button onClick={resetFilters} className="text-xs text-secondary font-bold">RESET</button>
            </div>
            <div className="space-y-md">
              <div>
                <label className="text-xs font-bold text-on-surface-variant block mb-xs">Subject</label>
                <div className="input bg-surface-container-high text-on-surface-variant flex items-center gap-xs">
                  <Icon className="text-sm">lock</Icon>
                  <span className="text-sm font-bold">{activeSubject}</span>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-on-surface-variant block mb-xs">Difficulty</label>
                <select value={filterDifficulty} onChange={e => setFilterDifficulty(e.target.value)} className="input">
                  <option value="">All Difficulties</option>
                  {DIFFICULTIES.map(d => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-on-surface-variant block mb-xs">Question Type</label>
                <select value={filterType} onChange={e => setFilterType(e.target.value)} className="input">
                  <option value="">All Types</option>
                  {QUESTION_TYPES.map(t => (
                    <option key={t} value={t}>{t === 'short_answer' ? 'Short Answer' : t === 'long_answer' ? 'Long Answer' : 'MCQ'}</option>
                  ))}
                </select>
              </div>
            </div>
          </aside>

          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="text-center py-xl text-on-surface-variant">Loading questions...</div>
            ) : questions.length === 0 ? (
              <div className="card p-xl text-center">
                <Icon className="text-4xl text-on-surface-variant mb-md">quiz</Icon>
                <p className="text-lg font-bold text-primary mb-sm">No questions for {activeSubject}</p>
                <p className="text-on-surface-variant mb-lg">Add a new question to get started.</p>
                <button onClick={() => { setMode('manual'); setShowModal(true) }} className="btn-primary px-lg py-sm">
                  <Icon className="text-sm inline align-middle mr-xs">add_circle</Icon>Add First Question
                </button>
              </div>
            ) : (
              <div className="space-y-md">
                {Object.entries(
                  questions.reduce((acc, q) => {
                    const topic = q.topic || 'Untitled'
                    if (!acc[topic]) acc[topic] = []
                    acc[topic].push(q)
                    return acc
                  }, {})
                ).sort((a, b) => a[0].localeCompare(b[0])).map(([topic, topicQuestions]) => {
                  const isExpanded = expandedTopics[topic] !== false
                  return (
                    <div key={topic} className="card overflow-hidden">
                      <button
                        onClick={() => setExpandedTopics(prev => ({ ...prev, [topic]: !isExpanded }))}
                        className="w-full flex items-center justify-between p-md hover:bg-surface-container-low transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-md">
                          <div className={`w-2 h-8 rounded-full shrink-0 ${SUBJECT_COLORS[Object.keys(questions.reduce((a, q) => { if (!a[q.topic]) a[q.topic] = true; return a }, {})).indexOf(topic) % SUBJECT_COLORS.length] || 'bg-primary'}`} />
                          <div className="text-left">
                            <h3 className="text-lg font-bold text-primary">{topic}</h3>
                            <p className="text-xs text-on-surface-variant">{topicQuestions.length} question{topicQuestions.length !== 1 ? 's' : ''}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-sm">
                          <span className={`text-xs font-bold px-sm py-0.5 rounded-full ${topicQuestions.every(q => selected.includes(q.id)) ? 'bg-secondary text-white' : 'bg-surface-container-high text-on-surface-variant'}`}>
                            {topicQuestions.filter(q => selected.includes(q.id)).length}/{topicQuestions.length} selected
                          </span>
                          <Icon className={`text-on-surface-variant transition-transform ${isExpanded ? 'rotate-180' : ''}`}>expand_more</Icon>
                        </div>
                      </button>
                      {isExpanded && (
                        <div className="divide-y divide-outline-variant border-t border-outline-variant">
                          {topicQuestions.map((q, i) => (
                            <div key={q.id} className={`flex items-center gap-md p-md hover:bg-surface-container-low cursor-pointer transition-colors ${selected.includes(q.id) ? 'bg-secondary-container/5' : ''}`} onClick={() => toggleSelect(q.id)}>
                              <input checked={selected.includes(q.id)} readOnly type="checkbox" className="shrink-0" aria-label={"Select question " + q.id} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-sm mb-xs">
                                  <span className={'text-xs font-bold px-sm py-0.5 rounded-full ' + (q.difficulty === 'hard' ? 'bg-error-container text-error' : q.difficulty === 'easy' ? 'bg-tertiary-container text-tertiary' : 'bg-secondary-container text-secondary')}>{q.difficulty}</span>
                                  <span className="text-xs px-sm py-0.5 rounded-full bg-surface-container-high text-on-surface-variant">{q.question_type.replace('_', ' ')}</span>
                                  {q.blooms_level && <span className="text-xs px-sm py-0.5 rounded-full bg-tertiary-container/50 text-tertiary capitalize">{q.blooms_level}</span>}
                                  <span className="text-xs text-on-surface-variant">{q.marks} mark(s)</span>
                                </div>
                                <p className="text-sm font-bold text-primary truncate">{q.question_text}</p>
                                <p className="text-xs text-on-surface-variant truncate">Answer: {q.correct_answer}</p>
                              </div>
                              <div className="flex gap-xs shrink-0" onClick={e => e.stopPropagation()}>
                                <button onClick={() => setPreviewQuestion(q)} aria-label="Preview" className="p-1.5 hover:bg-surface-container-high rounded-full" title="Preview">
                                  <Icon className="text-sm">visibility</Icon>
                                </button>
                                <button onClick={() => handleEdit(q)} aria-label="Edit" className="p-1.5 hover:bg-surface-container-high rounded-full" title="Edit">
                                  <Icon className="text-sm">edit</Icon>
                                </button>
                                <button onClick={() => handleDuplicate(q.id)} aria-label="Duplicate" className="p-1.5 hover:bg-surface-container-high rounded-full" title="Duplicate">
                                  <Icon className="text-sm">content_copy</Icon>
                                </button>
                                <button onClick={() => { if (confirm('Delete this question?')) handleDelete(q.id) }} aria-label="Delete" className="p-1.5 hover:bg-surface-container-high rounded-full" title="Delete">
                                  <Icon className="text-sm">delete</Icon>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-md">
                <p className="text-sm text-on-surface-variant">Showing {((pageNum - 1) * PAGE_SIZE) + 1}-{Math.min(pageNum * PAGE_SIZE, total)} of {total} questions</p>
                <div className="flex items-center gap-sm">
                  <button onClick={() => setPageNum(p => Math.max(1, p - 1))} disabled={pageNum <= 1} className="btn-secondary px-md py-sm text-sm disabled:opacity-40">Previous</button>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    let p
                    if (totalPages <= 5) { p = i + 1 }
                    else if (pageNum <= 3) { p = i + 1 }
                    else if (pageNum >= totalPages - 2) { p = totalPages - 4 + i }
                    else { p = pageNum - 2 + i }
                    return <button key={p} onClick={() => setPageNum(p)} className={'w-8 h-8 rounded-lg text-sm font-bold ' + (p === pageNum ? 'bg-secondary text-white' : 'bg-surface-container-low hover:bg-surface-container-high')}>{p}</button>
                  })}
                  <button onClick={() => setPageNum(p => Math.min(totalPages, p + 1))} disabled={pageNum >= totalPages} className="btn-secondary px-md py-sm text-sm disabled:opacity-40">Next</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {bulkShow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setBulkShow(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md m-4 p-lg" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-primary mb-md">Bulk Update {selected.length} Questions</h3>
            <div className="space-y-md">
              <div>
                <label className="text-xs font-bold text-on-surface-variant block mb-xs">Subject</label>
                <input value={bulkSubject} onChange={e => setBulkSubject(e.target.value)} className="input" placeholder="Leave empty to keep current" />
              </div>
              <div>
                <label className="text-xs font-bold text-on-surface-variant block mb-xs">Difficulty</label>
                <select value={bulkDifficulty} onChange={e => setBulkDifficulty(e.target.value)} className="input">
                  <option value="">Keep current</option>
                  {DIFFICULTIES.map(d => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-sm mt-lg">
              <button onClick={() => setBulkShow(false)} className="btn-secondary px-lg py-sm">Cancel</button>
              <button onClick={handleBulkUpdate} className="btn-primary px-lg py-sm">Update</button>
            </div>
          </div>
        </div>
      )}

      {showModal && mode === 'manual' && <QuestionFormModal onClose={handleCloseModal} onSaved={handleSaved} editQuestion={editQuestion} prefillSubject={view === 'subject' ? activeSubject : ''} />}
      {showModal && mode === 'csv' && <CSVImportModal onClose={handleCloseModal} onSaved={handleSaved} />}
      {showModal && mode === 'ai' && <AIGenerateModal onClose={handleCloseModal} onSaved={handleSaved} />}
      {previewQuestion && <QuestionPreviewModal question={previewQuestion} onClose={() => setPreviewQuestion(null)} onSaved={handleSaved} />}
    </TeacherShell>
  )
}