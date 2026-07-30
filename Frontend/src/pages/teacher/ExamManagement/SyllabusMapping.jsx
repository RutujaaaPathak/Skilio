import { useState, useEffect, useCallback, useMemo } from 'react'
import TeacherShell, { Icon } from '../../../components/TeacherShell.jsx'
import { syllabusService } from '../../../services/syllabusService.js'

const TABS = ['Overview', 'Questions', 'Learning Outcomes', 'Exam Mapping']

function AnalyticsCard({ label, value, sub, icon, trend, color = 'primary' }) {
  return <div className={`bg-white p-lg rounded-xl border border-outline-variant shadow-sm hover:border-${color} transition-all group`}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-label-sm text-secondary mb-base">{label}</p>
        <h3 className="text-headline-md font-bold flex items-center gap-sm">{value}{trend && <span className={`text-${trend.startsWith('+') ? 'success' : 'error'} text-label-sm font-bold`}>{trend}</span>}</h3>
      </div>
      <div className="relative w-12 h-12 flex items-center justify-center">
        {icon === 'coverage' ? (
          <svg className="w-full h-full -rotate-90">
            <circle cx="24" cy="24" fill="transparent" r="20" stroke="#f1f5f9" strokeWidth="4"></circle>
            <circle cx="24" cy="24" fill="transparent" r="20" stroke="#0050cb" strokeDasharray="125.6" strokeDashoffset={125.6 - (125.6 * parseInt(value) / 100)} strokeLinecap="round" strokeWidth="4"></circle>
          </svg>
        ) : icon === 'completed' ? (
          <svg className="w-full h-full -rotate-90">
            <circle cx="24" cy="24" fill="transparent" r="20" stroke="#f1f5f9" strokeWidth="4"></circle>
            <circle cx="24" cy="24" fill="transparent" r="20" stroke="#0050cb" strokeDasharray="125.6" strokeDashoffset={125.6 - (125.6 * parseInt(value.split('/')[0]) / parseInt(value.split('/')[1] || 1))} strokeLinecap="round" strokeWidth="4"></circle>
          </svg>
        ) : (
          <div className={`w-12 h-12 bg-${color}-container/10 rounded-xl flex items-center justify-center text-${color}`}>
            <Icon className="text-lg">{icon}</Icon>
          </div>
        )}
      </div>
    </div>
    {sub && <p className="text-success text-[10px] font-bold mt-sm">{sub}</p>}
  </div>
}

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
  const [activeTab, setActiveTab] = useState('Overview')
  const [selectedTopic, setSelectedTopic] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedUnits, setExpandedUnits] = useState({})

  const toggleUnit = (unit) => {
    setExpandedUnits(prev => ({ ...prev, [unit]: !prev[unit] }))
  }

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    try {
      const data = await syllabusService.list(filterSubject || undefined)
      setEntries(Array.isArray(data) ? data : [])
    } catch { setEntries([]) }
    finally { setLoading(false) }
  }, [filterSubject])

  const fetchSubjects = useCallback(async () => {
    try {
      const data = await syllabusService.listSubjects()
      setSubjects(Array.isArray(data) ? data : [])
    } catch { /* ignore */ }
  }, [])

  useEffect(() => { fetchEntries() }, [fetchEntries])
  useEffect(() => { fetchSubjects() }, [fetchSubjects])

  const grouped = useMemo(() => {
    const map = {}
    entries.forEach(e => {
      const unit = e.unit || 'General'
      if (!map[unit]) map[unit] = { unit, topics: [] }
      map[unit].topics.push(e)
    })
    return Object.values(map).sort((a, b) => a.unit.localeCompare(b.unit))
  }, [entries])

  const filteredEntries = useMemo(() => {
    if (!searchTerm) return entries
    const s = searchTerm.toLowerCase()
    return entries.filter(e =>
      e.topic?.toLowerCase().includes(s) ||
      e.subject?.toLowerCase().includes(s) ||
      e.chapter?.toLowerCase().includes(s) ||
      e.unit?.toLowerCase().includes(s)
    )
  }, [entries, searchTerm])

  const totalTopics = entries.length
  const completedTopics = entries.filter(e => e.completed).length
  const overallCoverage = totalTopics ? Math.round((completedTopics / totalTopics) * 100) : 0
  const activeSubjectCount = new Set(entries.map(e => e.subject).filter(Boolean)).size

  function resetForm() {
    setForm({ subject: '', topic: '', chapter: '', unit: '', description: '', learning_outcomes: '' })
    setEditingId(null)
    setError('')
  }

  function startEdit(entry) {
    setForm({
      subject: entry.subject || '', topic: entry.topic || '', chapter: entry.chapter || '',
      unit: entry.unit || '', description: entry.description || '', learning_outcomes: entry.learning_outcomes || '',
    })
    setEditingId(entry.id)
    setShowForm(true)
  }

  function selectTopic(entry) {
    setSelectedTopic(entry)
    setActiveTab('Overview')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.subject.trim() || !form.topic.trim()) { setError('Subject and topic are required.'); return }
    setSaving(true); setError('')
    try {
      if (editingId) await syllabusService.update(editingId, form)
      else await syllabusService.create(form)
      resetForm(); setShowForm(false); fetchEntries(); fetchSubjects()
    } catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }

  async function handleToggleComplete(id) {
    try { const updated = await syllabusService.toggleComplete(id); setEntries(prev => prev.map(e => e.id === id ? { ...e, completed: updated.completed } : e)); if (selectedTopic?.id === id) setSelectedTopic(prev => prev ? { ...prev, completed: updated.completed } : null) }
    catch (err) { alert(err.message) }
  }

  async function handleDelete(id) {
    if (!confirm('Deactivate this syllabus entry?')) return
    try { await syllabusService.delete(id); fetchEntries(); fetchSubjects() }
    catch (err) { alert(err.message) }
  }

  return (
    <TeacherShell page={page} setPage={setPage} title="Syllabus Mapping" search searchValue={searchTerm} onSearchChange={setSearchTerm}>
      <div className="max-w-[1400px] w-full mx-auto">
        <div className="flex flex-col gap-md mb-xl">
          <div className="flex items-center text-label-sm text-secondary gap-xs">
            <span>Dashboard</span><Icon className="text-xs">chevron_right</Icon>
            <span>Subjects</span><Icon className="text-xs">chevron_right</Icon>
            <span className="text-primary font-bold">{filterSubject || 'All Subjects'}</span>
          </div>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-md">
            <h1 className="text-headline-lg text-on-surface tracking-tight">Syllabus Mapping</h1>
            <div className="flex flex-wrap items-center gap-sm">
              <button className="flex items-center gap-sm px-md py-sm border border-outline-variant bg-white rounded-xl text-label-md hover:bg-surface-container-low transition-all shadow-sm">
                <Icon className="text-md">upload</Icon> Import
              </button>
              <button className="flex items-center gap-sm px-md py-sm border border-outline-variant bg-white rounded-xl text-label-md hover:bg-surface-container-low transition-all shadow-sm">
                <Icon className="text-md">download</Icon> Export
              </button>
              <button onClick={() => { resetForm(); setShowForm(true) }} className="flex items-center gap-sm px-md py-sm bg-primary text-on-primary rounded-xl text-label-md shadow-lg hover:opacity-90 transition-all">
                <Icon className="text-md">add_circle</Icon> New Topic
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-lg mb-xl">
          <AnalyticsCard label="Overall Coverage" value={`${overallCoverage}%`} icon="coverage" trend={overallCoverage > 0 ? `+${overallCoverage}%` : ''} />
          <AnalyticsCard label="Mapped Questions" value={String(totalTopics)} sub={`${activeSubjectCount} subject(s)`} icon="quiz" />
          <AnalyticsCard label="Completed Topics" value={`${completedTopics}/${totalTopics}`} icon="completed" />
          <div className="bg-primary p-lg rounded-xl shadow-xl flex items-center justify-between text-on-primary">
            <div>
              <p className="text-label-sm opacity-80 mb-base">Active Subjects</p>
              <h3 className="text-headline-md font-bold">{activeSubjectCount}</h3>
              <p className="text-white/70 text-[10px] font-bold">Syllabus entries</p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Icon className="text-lg">book</Icon>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-lg min-h-[600px]">
          <div className="col-span-12 lg:col-span-3 bg-white border border-outline-variant rounded-xl flex flex-col overflow-hidden shadow-sm">
            <div className="p-md border-b border-outline-variant bg-surface-container-lowest">
              <div className="flex items-center justify-between mb-md">
                <div>
                  <h4 className="text-label-md font-bold">Syllabus Explorer</h4>
                  <p className="text-[10px] text-secondary">v2.4</p>
                </div>
                <span className="text-[10px] bg-surface-container-high px-base py-[2px] rounded-full text-secondary">{totalTopics} topics</span>
              </div>
              <div className="relative">
                <Icon className="absolute left-sm top-1/2 -translate-y-1/2 text-outline text-md">search</Icon>
                <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-xl pr-sm py-xs bg-surface-container-low border border-outline-variant rounded-lg text-body-sm focus:outline-none focus:border-primary transition-all" placeholder="Find topic..." />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-md space-y-lg custom-scrollbar" style={{ maxHeight: '500px' }}>
              {filteredEntries.length === 0 ? (
                <div className="text-center py-xl text-secondary text-sm">No topics found.</div>
              ) : (
                Object.entries(
                  filteredEntries.reduce((acc, e) => {
                    const unit = e.unit || 'General'
                    if (!acc[unit]) acc[unit] = []
                    acc[unit].push(e)
                    return acc
                  }, {})
                ).sort((a, b) => a[0].localeCompare(b[0])).map(([unit, topics]) => {
                  const completed = topics.filter(t => t.completed).length
                  const pct = topics.length ? Math.round((completed / topics.length) * 100) : 0
                  const isExpanded = expandedUnits[unit] !== false
                  return (
                    <div key={unit} className="space-y-sm">
                      <div className="flex flex-col gap-base group cursor-pointer" onClick={() => toggleUnit(unit)}>
                        <div className="flex items-center justify-between text-body-sm font-bold">
                          <div className="flex items-center gap-sm">
                            <Icon className={`text-md text-secondary transition-transform ${isExpanded ? '' : '-rotate-90'}`}>expand_more</Icon>
                            <span className={selectedTopic?.unit === unit ? 'text-primary' : ''}>{unit}</span>
                          </div>
                          <span className="text-[10px] text-secondary">{completed}/{topics.length} Topics</span>
                        </div>
                        <div className="w-full h-1 bg-surface-container-low rounded-full overflow-hidden">
                          <div className={`h-full ${pct >= 100 ? 'bg-success' : 'bg-primary'} rounded-full transition-all`} style={{ width: `${pct}%` }}></div>
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="ml-xl space-y-1 border-l border-outline-variant pl-md">
                          {topics.map(t => (
                            <div key={t.id} onClick={() => selectTopic(t)}
                              className={`group relative flex items-center gap-sm p-sm rounded-lg cursor-pointer transition-all ${selectedTopic?.id === t.id ? 'bg-primary-container/10 border-l-2 border-primary' : 'hover:bg-surface-container-low'}`}>
                              <div className={`w-2 h-2 rounded-full shrink-0 ${t.completed ? 'bg-success' : 'bg-slate-300'}`}></div>
                              <span className="text-body-sm truncate text-secondary">{t.topic}</span>
                              <div className="absolute right-2 opacity-0 group-hover:opacity-100 bg-white border border-outline-variant px-sm py-1 rounded shadow-sm text-[9px] z-10">
                                {t.subject}{t.chapter ? ` · ${t.chapter}` : ''}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>

          <div className="col-span-12 lg:col-span-6 flex flex-col gap-lg">
            <div className="bg-white border border-outline-variant rounded-xl flex flex-col shadow-sm overflow-hidden">
              <div className="px-lg pt-lg border-b border-outline-variant flex gap-lg overflow-x-auto bg-surface-container-lowest">
                {TABS.map(t => (
                  <button key={t} onClick={() => setActiveTab(t)}
                    className={`pb-md text-label-md font-bold whitespace-nowrap transition-colors ${activeTab === t ? 'text-primary border-b-2 border-primary' : 'text-secondary hover:text-primary'}`}>
                    {t}
                  </button>
                ))}
              </div>
              <div className="p-lg">
                {selectedTopic ? (
                  <>
                    <div className="flex justify-between items-start mb-lg">
                      <div>
                        <div className="flex items-center gap-sm mb-base flex-wrap">
                          <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-md py-[2px] rounded-full uppercase tracking-wider">{selectedTopic.unit || 'General'}</span>
                          <span className="bg-secondary-container text-on-secondary-container text-[10px] font-bold px-md py-[2px] rounded-full uppercase tracking-wider">{selectedTopic.subject}</span>
                          {selectedTopic.completed ? (
                            <span className="bg-success/10 text-success text-[10px] font-bold px-md py-[2px] rounded-full uppercase tracking-wider">Completed</span>
                          ) : (
                            <span className="bg-warning/10 text-warning text-[10px] font-bold px-md py-[2px] rounded-full uppercase tracking-wider">Draft</span>
                          )}
                        </div>
                        <h2 className="text-headline-md font-bold text-on-surface">{selectedTopic.topic}</h2>
                      </div>
                      <div className="flex gap-sm">
                        <button onClick={() => handleToggleComplete(selectedTopic.id)} className={`p-sm rounded-xl transition-colors ${selectedTopic.completed ? 'bg-success/10 text-success hover:bg-success/20' : 'bg-surface-container-low text-secondary hover:bg-surface-container'}`} title={selectedTopic.completed ? 'Mark as Draft' : 'Mark as Completed'}>
                          <Icon className="text-md">{selectedTopic.completed ? 'check_circle' : 'radio_button_unchecked'}</Icon>
                        </button>
                        <button onClick={() => startEdit(selectedTopic)} className="p-sm rounded-xl bg-primary-container/10 text-primary hover:bg-primary-container/20 transition-colors">
                          <Icon className="text-md">edit</Icon>
                        </button>
                        <button onClick={() => handleDelete(selectedTopic.id)} className="p-sm rounded-xl border border-outline-variant hover:bg-surface-container transition-colors text-error">
                          <Icon className="text-md">delete</Icon>
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-md mb-lg">
                      <div className="p-md bg-surface-container-low border border-outline-variant rounded-xl flex items-center gap-md">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary"><Icon className="text-md">quiz</Icon></div>
                        <div><p className="text-[10px] text-secondary font-bold uppercase">Questions</p><p className="text-body-md font-bold">0 Mapped</p></div>
                      </div>
                      <div className="p-md bg-surface-container-low border border-outline-variant rounded-xl flex items-center gap-md">
                        <div className="w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center text-success"><Icon className="text-md">assignment</Icon></div>
                        <div><p className="text-[10px] text-secondary font-bold uppercase">Chapter</p><p className="text-body-md font-bold">{selectedTopic.chapter || '—'}</p></div>
                      </div>
                      <div className="p-md bg-surface-container-low border border-outline-variant rounded-xl flex items-center gap-md">
                        <div className="w-10 h-10 bg-warning/10 rounded-lg flex items-center justify-center text-warning"><Icon className="text-md">event_available</Icon></div>
                        <div><p className="text-[10px] text-secondary font-bold uppercase">Unit</p><p className="text-body-md font-bold">{selectedTopic.unit || '—'}</p></div>
                      </div>
                    </div>
                    <div className="space-y-lg">
                      <div>
                        <h4 className="text-label-md font-bold mb-sm text-secondary uppercase tracking-tight text-[11px]">Description</h4>
                        <p className="text-body-md text-on-surface-variant leading-relaxed bg-white border border-outline-variant/50 p-md rounded-xl">
                          {selectedTopic.description || 'No description provided.'}
                        </p>
                      </div>
                      <div>
                        <h4 className="text-label-md font-bold mb-sm text-secondary uppercase tracking-tight text-[11px]">Learning Outcomes</h4>
                        <div className="space-y-sm">
                          {(selectedTopic.learning_outcomes || '').split('\n').filter(Boolean).map((lo, i) => (
                            <div key={i} className="flex items-center justify-between p-sm border border-outline-variant/50 rounded-xl bg-white hover:border-primary transition-all cursor-default">
                              <div className="flex items-center gap-md">
                                <Icon className="text-success text-sm">check_circle</Icon>
                                <span className="text-body-sm">{lo}</span>
                              </div>
                              <span className="text-[10px] font-bold text-slate-400">LO{i + 1}</span>
                            </div>
                          ))}
                          {!selectedTopic.learning_outcomes && <p className="text-body-sm text-secondary italic">No learning outcomes defined.</p>}
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-xxl">
                    <Icon className="text-5xl text-outline mb-md">auto_stories</Icon>
                    <p className="text-headline-sm font-bold text-on-surface mb-sm">Select a Topic</p>
                    <p className="text-body-sm text-secondary">Choose a topic from the explorer to view details.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white border border-outline-variant rounded-xl shadow-sm overflow-hidden">
              <div className="px-lg pt-lg pb-md border-b border-outline-variant bg-surface-container-lowest">
                <div className="flex items-center justify-between mb-sm">
                  <h4 className="text-label-md font-bold flex items-center gap-md">
                    <span className="w-7 h-7 bg-gradient-to-br from-primary to-primary-container rounded-lg flex items-center justify-center text-white"><Icon className="text-sm">grid_view</Icon></span>
                    Subject Coverage Heatmap
                  </h4>
                  <div className="flex items-center gap-lg">
                    <div className="flex items-center gap-base text-[10px] font-bold text-secondary"><div className="w-3 h-3 rounded-sm bg-success"></div> Done</div>
                    <div className="flex items-center gap-base text-[10px] font-bold text-secondary"><div className="w-3 h-3 rounded-sm bg-slate-200 border border-slate-300"></div> Pending</div>
                  </div>
                </div>
                <div className="flex items-center gap-xs text-[10px] text-secondary">
                  <span className="font-bold text-on-surface">{completedTopics}/{totalTopics}</span> topics covered
                  <span className="mx-xs">·</span>
                  <span className="font-bold text-on-surface">{activeSubjectCount}</span> subject(s)
                  <span className="mx-xs">·</span>
                  <span className="font-bold text-on-surface">{overallCoverage}%</span> coverage
                </div>
              </div>
              <div className="p-lg space-y-lg max-h-56 overflow-y-auto custom-scrollbar">
                {Object.entries(
                  entries.reduce((acc, e) => {
                    const subj = e.subject || 'General'
                    if (!acc[subj]) acc[subj] = { subject: subj, units: {} }
                    const unit = e.unit || 'General'
                    if (!acc[subj].units[unit]) acc[subj].units[unit] = { unit, topics: [] }
                    acc[subj].units[unit].topics.push(e)
                    return acc
                  }, {})
                ).sort((a, b) => a[0].localeCompare(b[0])).map(([subject, subjData]) => {
                  const subjectTopics = Object.values(subjData.units).flatMap(u => u.topics)
                  const subjectCompleted = subjectTopics.filter(t => t.completed).length
                  const subjectPct = subjectTopics.length ? Math.round((subjectCompleted / subjectTopics.length) * 100) : 0
                  return (
                    <div key={subject}>
                      <div className="flex items-center justify-between mb-sm">
                        <div className="flex items-center gap-md">
                          <div className="w-3 h-3 rounded" style={{ backgroundColor: `hsl(${(subject.charCodeAt(0) * 60) % 360}, 70%, 45%)` }}></div>
                          <span className="text-label-sm font-bold">{subject}</span>
                          <span className="text-[10px] bg-surface-container-high px-base py-[2px] rounded-full text-secondary">{subjectTopics.length} topics</span>
                        </div>
                        <div className="flex items-center gap-md">
                          <div className="text-[10px] font-bold text-secondary">{subjectCompleted}/{subjectTopics.length}</div>
                          <div className={`text-[10px] font-bold px-sm py-[1px] rounded ${subjectPct >= 80 ? 'bg-success/10 text-success' : subjectPct >= 50 ? 'bg-warning/10 text-warning' : 'bg-error/10 text-error'}`}>{subjectPct}%</div>
                        </div>
                      </div>
                      <div className="w-full h-1.5 bg-surface-container-low rounded-full overflow-hidden mb-md">
                        <div className="h-full bg-gradient-to-r from-primary to-success rounded-full transition-all" style={{ width: `${subjectPct}%` }}></div>
                      </div>
                      {Object.entries(subjData.units).sort((a, b) => a[0].localeCompare(b[0])).map(([unit, unitData]) => {
                        const unitCompleted = unitData.topics.filter(t => t.completed).length
                        const unitPct = unitData.topics.length ? Math.round((unitCompleted / unitData.topics.length) * 100) : 0
                        return (
                          <div key={unit} className="ml-lg mb-md last:mb-0">
                            <div className="flex items-center justify-between mb-xs">
                              <span className="text-[10px] font-bold text-secondary/70 uppercase tracking-wider">{unit}</span>
                              <span className="text-[9px] text-secondary/50">{unitCompleted}/{unitData.topics.length}</span>
                            </div>
                            <div className="flex flex-wrap gap-[3px]">
                              {unitData.topics.map(t => (
                                <div key={t.id} onClick={() => selectTopic(t)}
                                  className={`group relative w-7 h-7 rounded-md flex items-center justify-center text-[8px] font-bold cursor-pointer transition-all ${t.completed ? 'bg-success text-white shadow-sm shadow-success/20' : 'bg-slate-100 text-slate-400 border border-slate-200'} ${selectedTopic?.id === t.id ? 'ring-2 ring-primary ring-offset-1' : 'hover:ring-2 hover:ring-primary/30 hover:ring-offset-1'}`}
                                  title={`${t.topic}${t.chapter ? ` (${t.chapter})` : ''}`}>
                                  {t.topic.charAt(0).toUpperCase()}
                                  <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-white border border-outline-variant hidden group-hover:flex items-center justify-center">
                                    <div className={`w-1.5 h-1.5 rounded-full ${t.completed ? 'bg-success' : 'bg-slate-300'}`}></div>
                                  </div>
                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-sm py-base bg-slate-800 text-white text-[9px] rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 shadow-lg">
                                    {t.topic}
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-800"></div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
                {entries.length === 0 && <div className="text-center py-xl"><div className="w-12 h-12 bg-surface-container-low rounded-xl flex items-center justify-center mx-auto mb-md text-outline"><Icon className="text-lg">grid_view</Icon></div><p className="text-body-sm text-secondary">No topics yet. Add your first topic.</p></div>}
              </div>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-3 flex flex-col gap-lg">
            <div className="bg-gradient-to-br from-primary to-primary-container p-lg rounded-xl text-white shadow-xl">
              <div className="flex items-center gap-sm mb-md">
                <Icon className="text-white/80">lightbulb</Icon>
                <span className="text-label-sm font-bold opacity-80 uppercase tracking-widest">Getting Started</span>
              </div>
              <h5 className="font-bold mb-sm">Build Your Syllabus</h5>
              <p className="text-body-sm text-white/90 mb-lg leading-snug">
                Add topics, organize by unit, and define learning outcomes to enable AI question generation.
              </p>
              <button onClick={() => { resetForm(); setShowForm(true) }}
                className="w-full bg-white text-primary py-sm rounded-xl font-bold text-label-md hover:bg-primary-fixed transition-colors flex items-center justify-center gap-sm">
                <Icon className="text-md">add_circle</Icon> Add New Topic
              </button>
            </div>

            <div className="bg-white border border-outline-variant rounded-xl p-md shadow-sm">
              <div className="flex items-center justify-between mb-md px-sm">
                <h4 className="text-label-md font-bold">Recent Topics</h4>
                <Icon className="text-secondary text-md">history</Icon>
              </div>
              <div className="space-y-md">
                {entries.slice(0, 4).map(e => (
                  <div key={e.id} onClick={() => selectTopic(e)}
                    className="flex gap-md px-sm group cursor-pointer hover:bg-surface-container-low rounded-lg py-sm transition-colors">
                    <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${e.completed ? 'bg-success' : 'bg-warning'}`}></div>
                    <div className="min-w-0">
                      <p className="text-body-sm font-medium leading-tight truncate">{e.topic}</p>
                      <p className="text-[10px] text-secondary">{e.subject}{e.unit ? ` · ${e.unit}` : ''}</p>
                    </div>
                  </div>
                ))}
                {entries.length === 0 && <p className="text-sm text-secondary italic px-sm">No topics yet.</p>}
              </div>
            </div>

            <div className="space-y-sm">
              <button className="w-full flex items-center justify-between px-md py-sm bg-white border border-outline-variant rounded-xl text-label-md font-medium hover:bg-slate-50 transition-all shadow-sm">
                <div className="flex items-center gap-md"><Icon className="text-md text-primary">auto_stories</Icon> Bulk Map Topics</div>
                <Icon className="text-secondary">chevron_right</Icon>
              </button>
              <button className="w-full flex items-center justify-between px-md py-sm bg-white border border-outline-variant rounded-xl text-label-md font-medium hover:bg-slate-50 transition-all shadow-sm">
                <div className="flex items-center gap-md"><Icon className="text-md text-success">verified</Icon> Export Syllabus</div>
                <Icon className="text-secondary">chevron_right</Icon>
              </button>
            </div>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { setShowForm(false); resetForm() }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto m-4" onClick={e => e.stopPropagation()}>
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
                <textarea value={form.learning_outcomes} onChange={e => setForm(f => ({ ...f, learning_outcomes: e.target.value }))} className="input min-h-14" placeholder="One per line, e.g.&#10;Understand the laws of thermodynamics&#10;Apply thermodynamic equations" />
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
    </TeacherShell>
  )
}
