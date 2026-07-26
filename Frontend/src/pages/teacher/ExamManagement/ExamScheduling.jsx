import { useState, useEffect, useCallback, useMemo } from 'react'
import TeacherShell, { Icon, StatCard } from '../../../components/TeacherShell.jsx'
import { examService } from '../../../services/examService.js'

const CANCELLABLE = new Set(['draft', 'scheduled', 'active'])
const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17]
const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function toLocalDT(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function startOfWeek(d = new Date()) {
  const s = new Date(d)
  s.setDate(s.getDate() - ((s.getDay() + 6) % 7))
  s.setHours(0, 0, 0, 0)
  return s
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function dayLabel(d) {
  return `${SHORT_DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`
}

export default function ExamScheduling({ page, setPage }) {
  const [view, setView] = useState('Week')
  const [exams, setExams] = useState([])
  const [loading, setLoading] = useState(true)
  const [cancelTarget, setCancelTarget] = useState(null)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelling, setCancelling] = useState(false)
  const [rescheduleTarget, setRescheduleTarget] = useState(null)
  const [rescheduleStart, setRescheduleStart] = useState('')
  const [rescheduleEnd, setRescheduleEnd] = useState('')
  const [rescheduleReason, setRescheduleReason] = useState('')
  const [rescheduling, setRescheduling] = useState(false)
  const [navDate, setNavDate] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState(null)

  const fetchExams = useCallback(async () => {
    setLoading(true)
    try {
      const data = await examService.list()
      setExams(data)
    } catch {
      setExams([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchExams() }, [fetchExams])

  async function confirmCancel() {
    if (!cancelTarget || !cancelReason.trim()) return
    setCancelling(true)
    try {
      await examService.cancel(cancelTarget.id, cancelReason.trim())
      setExams(prev => prev.map(e => e.id === cancelTarget.id ? { ...e, status: 'cancelled', cancellation_reason: cancelReason.trim() } : e))
      setCancelTarget(null)
      setCancelReason('')
    } catch (err) {
      alert(err.message || 'Failed to cancel exam. Please try again.')
    } finally {
      setCancelling(false)
    }
  }

  async function confirmReschedule() {
    if (!rescheduleTarget || !rescheduleStart || !rescheduleEnd || !rescheduleReason.trim()) return
    setRescheduling(true)
    try {
      const payload = {
        new_start_time: new Date(rescheduleStart).toISOString(),
        new_end_time: new Date(rescheduleEnd).toISOString(),
        reason: rescheduleReason.trim(),
      }
      const updated = await examService.reschedule(rescheduleTarget.id, payload)
      setExams(prev => prev.map(e => e.id === rescheduleTarget.id ? { ...e, ...updated } : e))
      setRescheduleTarget(null)
      setRescheduleStart('')
      setRescheduleEnd('')
      setRescheduleReason('')
    } catch (err) {
      alert(err.message || 'Failed to reschedule exam. Please try again.')
    } finally {
      setRescheduling(false)
    }
  }

  const weekStart = useMemo(() => startOfWeek(navDate), [navDate])

  const weekDays = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart)
      d.setDate(weekStart.getDate() + i)
      return d
    }), [weekStart])

  const monthDays = useMemo(() => {
    const y = navDate.getFullYear(), m = navDate.getMonth()
    const first = new Date(y, m, 1)
    const last = new Date(y, m + 1, 0)
    const startPad = first.getDay()
    const days = []
    for (let i = 0; i < startPad; i++) days.push(null)
    for (let d = 1; d <= last.getDate(); d++) days.push(new Date(y, m, d))
    while (days.length % 7) days.push(null)
    return days
  }, [navDate])

  const thisWeek = useMemo(() =>
    exams.filter(e => {
      const d = new Date(e.start_time)
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 7)
      return d >= weekStart && d < weekEnd
    }), [exams, weekStart])

  const examsByDay = useMemo(() => {
    const map = {}
    for (const e of exams) {
      const key = new Date(e.start_time).toDateString()
      if (!map[key]) map[key] = []
      map[key].push(e)
    }
    return map
  }, [exams])

  function getConflicts(exam) {
    return exams.filter(o =>
      o.id !== exam.id &&
      ['scheduled', 'active'].includes(o.status) &&
      ['scheduled', 'active'].includes(exam.status) &&
      new Date(o.start_time) < new Date(exam.end_time) &&
      new Date(o.end_time) > new Date(exam.start_time)
    )
  }

  const HOUR_HEIGHT = 56

  function ExamCard({ e }) {
    const conflicts = getConflicts(e)
    const hasConflict = conflicts.length > 0
    const showActions = e.status === 'scheduled' || CANCELLABLE.has(e.status)
    return (
      <div className={`p-sm bg-white border rounded-lg text-xs ${hasConflict ? 'border-error/50 bg-error-container/10' : 'border-outline-variant'} ${e.status === 'cancelled' ? 'opacity-60' : ''}`}>
        <p className="font-bold text-primary truncate">{e.title}</p>
        <p className="text-on-surface-variant">{new Date(e.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {e.duration_minutes}min</p>
        <div className="flex items-center gap-1">
          <span className={`font-bold ${e.status === 'scheduled' ? 'text-secondary' : e.status === 'active' ? 'text-error' : e.status === 'cancelled' ? 'text-on-surface-variant line-through' : 'text-on-surface-variant'}`}>
            {e.status}
          </span>
          {hasConflict && CANCELLABLE.has(e.status) && (
            <span className="text-error flex items-center gap-0.5" title={conflicts.map(c => c.title).join(', ')}>
              <Icon className="text-[10px]">warning_amber</Icon>{conflicts.length}
            </span>
          )}
        </div>
        {showActions && (
          <>
            <div className="border-t border-outline-variant/40 my-1.5" />
            <div className="flex flex-wrap gap-1.5 justify-end">
              {e.status === 'scheduled' && (
                <button onClick={() => { setRescheduleTarget(e); setRescheduleStart(toLocalDT(e.start_time)); setRescheduleEnd(toLocalDT(e.end_time)); setRescheduleReason('') }}
                  className="inline-flex items-center gap-0.5 px-2 py-1 text-xs font-bold text-secondary border border-secondary/30 rounded-md hover:bg-secondary/10 hover:border-secondary/50 active:bg-secondary/20 transition-colors">
                  <Icon className="text-[11px]">calendar_month</Icon>Reschedule
                </button>
              )}
              {CANCELLABLE.has(e.status) && (
                <button onClick={() => { setCancelTarget(e); setCancelReason('') }}
                  className="inline-flex items-center gap-0.5 px-2 py-1 text-xs font-bold text-error border border-error/30 rounded-md hover:bg-error/10 hover:border-error/50 active:bg-error/20 transition-colors">
                  <Icon className="text-[11px]">close</Icon>Cancel
                </button>
              )}
            </div>
          </>
        )}
      </div>
    )
  }

  const renderWeek = useCallback(() => {
    const colDays = weekDays.slice(1, 6)
    return (
      <div className="overflow-x-auto">
        <div className="grid grid-cols-[50px_repeat(5,1fr)] gap-px bg-outline-variant/30 rounded-lg overflow-hidden" style={{ minWidth: 600 }}>
          <div className="bg-surface-container-low p-1 text-[10px] font-bold text-on-surface-variant text-right pr-2 sticky left-0 z-10" />
          {colDays.map(d => (
            <div key={d.toISOString()} className="bg-surface-container-low p-1 text-xs font-bold text-primary text-center sticky top-0 z-10">
              {dayLabel(d)}
            </div>
          ))}
          {HOURS.map(h => (
            <div key={h} className="contents">
              <div className="bg-surface-container-low p-1 text-[10px] font-bold text-on-surface-variant text-right pr-2 sticky left-0 z-10" style={{ height: HOUR_HEIGHT }}>
                {h > 12 ? `${h - 12}PM` : h === 12 ? '12PM' : `${h}AM`}
              </div>
              {colDays.map(d => {
                const dayKey = d.toDateString()
                const dayExams = (examsByDay[dayKey] || []).filter(e => {
                  const eh = new Date(e.start_time).getHours()
                  return eh >= h && eh < h + 1
                })
                return (
                  <div key={d.toISOString()} className="bg-surface-container-lowest p-0.5 space-y-0.5 min-h-[56px]">
                    {dayExams.map(e => <ExamCard key={e.id} e={e} />)}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    )
  }, [weekDays, examsByDay])

  const renderDay = useCallback(() => {
    const day = selectedDay || new Date()
    const dayKey = day.toDateString()
    const dayExams = examsByDay[dayKey] || []
    return (
      <div>
        <div className="flex items-center gap-md mb-md">
          <button onClick={() => { const d = new Date(day); d.setDate(d.getDate() - 1); setSelectedDay(d) }} className="p-xs hover:bg-surface-container-high rounded"><Icon>chevron_left</Icon></button>
          <p className="text-base font-bold text-primary">{dayLabel(day)}</p>
          <button onClick={() => { const d = new Date(day); d.setDate(d.getDate() + 1); setSelectedDay(d) }} className="p-xs hover:bg-surface-container-high rounded"><Icon>chevron_right</Icon></button>
        </div>
        <div className="space-y-1">
          {HOURS.map(h => {
            const hourExams = dayExams.filter(e => {
              const eh = new Date(e.start_time).getHours()
              return eh >= h && eh < h + 1
            })
            return (
              <div key={h} className="flex gap-sm items-start">
                <div className="w-14 text-right text-xs font-bold text-on-surface-variant pt-1 shrink-0">
                  {h > 12 ? `${h - 12}PM` : h === 12 ? '12PM' : `${h}AM`}
                </div>
                <div className="flex-1 min-h-[48px] bg-surface-container-lowest rounded-lg p-1 border border-outline-variant/30 space-y-1">
                  {hourExams.length ? hourExams.map(e => <ExamCard key={e.id} e={e} />) : null}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }, [selectedDay, examsByDay])

  const renderMonth = useCallback(() => {
    const weeks = []
    for (let i = 0; i < monthDays.length; i += 7) weeks.push(monthDays.slice(i, i + 7))
    return (
      <div>
        <div className="flex items-center gap-md mb-md">
          <button onClick={() => setNavDate(new Date(navDate.getFullYear(), navDate.getMonth() - 1, 1))} className="p-xs hover:bg-surface-container-high rounded"><Icon>chevron_left</Icon></button>
          <p className="text-base font-bold text-primary">{MONTHS[navDate.getMonth()]} {navDate.getFullYear()}</p>
          <button onClick={() => setNavDate(new Date(navDate.getFullYear(), navDate.getMonth() + 1, 1))} className="p-xs hover:bg-surface-container-high rounded"><Icon>chevron_right</Icon></button>
        </div>
        <div className="grid grid-cols-7 gap-px bg-outline-variant/30 rounded-lg overflow-hidden text-xs">
          {SHORT_DAYS.map(d => (
            <div key={d} className="bg-surface-container-low p-1.5 font-bold text-primary text-center">{d}</div>
          ))}
          {weeks.flat().map((d, i) => {
            if (!d) return <div key={`empty-${i}`} className="bg-surface-container-lowest p-1.5 min-h-[70px]" />
            const key = d.toDateString()
            const count = (examsByDay[key] || []).length
            return (
              <div key={key} className={`bg-surface-container-lowest p-1.5 min-h-[70px] cursor-pointer hover:bg-surface-container-low ${sameDay(d, new Date()) ? 'ring-1 ring-secondary' : ''}`}
                onClick={() => { setSelectedDay(d); setView('Day') }}>
                <p className="font-bold text-on-surface-variant mb-1">{d.getDate()}</p>
                {count > 0 && (
                  <p className="text-secondary font-bold text-[10px]">{count} exam{count > 1 ? 's' : ''}</p>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }, [monthDays, navDate, examsByDay, setView, setSelectedDay])

  return (
    <TeacherShell page={page} setPage={setPage} title="Exam Scheduling">
      <div className="flex justify-between items-end mb-lg">
        <div>
          <h1 className="text-4xl font-extrabold text-primary">Exam Scheduling</h1>
          <p className="text-on-surface-variant">Plan exam dates, assign batches, and avoid timetable conflicts.</p>
        </div>
        <div className="flex items-center gap-xs bg-surface-container-low p-xs rounded-lg border border-outline-variant">
          {['Day', 'Week', 'Month'].map(v => (
            <button key={v} onClick={() => { setView(v); if (v === 'Week') setSelectedDay(null); if (v === 'Month' || v === 'Week') setNavDate(new Date()) }} className={`px-md py-xs rounded text-sm ${view === v ? 'bg-primary text-white' : 'text-on-surface-variant'}`}>{v}</button>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-gutter mb-lg">
        <StatCard label="Total Exams" value={exams.length.toString()} icon="event" />
        <StatCard label="This Week" value={thisWeek.length.toString()} icon="date_range" />
        <StatCard label="Drafts" value={exams.filter(e => e.status === 'draft').length.toString()} icon="edit_note" />
      </div>

      <div className="bento-grid">
        <section className="col-span-8 card p-md">
          <div className="flex items-center justify-between mb-md">
            <div className="flex items-center gap-md">
              <h2 className="text-xl font-bold text-primary">{view} Schedule</h2>
              {view === 'Week' && (
                <div className="flex items-center gap-xs">
                  <button onClick={() => setNavDate(new Date(weekStart.getTime() - 7 * 86400000))} className="p-xs hover:bg-surface-container-high rounded"><Icon className="text-lg">chevron_left</Icon></button>
                  <span className="text-xs font-bold text-on-surface-variant">{dayLabel(weekDays[1])} — {dayLabel(weekDays[5])}</span>
                  <button onClick={() => setNavDate(new Date(weekStart.getTime() + 7 * 86400000))} className="p-xs hover:bg-surface-container-high rounded"><Icon className="text-lg">chevron_right</Icon></button>
                </div>
              )}
            </div>
            <button onClick={() => setPage('createExam')} className="btn-secondary px-md py-sm flex gap-xs">
              <Icon>add</Icon>New Exam
            </button>
          </div>

          {loading ? (
            <p className="text-center text-on-surface-variant py-xl">Loading...</p>
          ) : view === 'Week' ? renderWeek() : view === 'Day' ? renderDay() : renderMonth()}
        </section>

        <section className="col-span-4 card p-md">
          <h2 className="text-xl font-bold text-primary mb-md">Upcoming Exams</h2>
          {loading ? (
            <p className="text-on-surface-variant text-sm">Loading...</p>
          ) : exams.filter(e => e.status !== 'draft').length === 0 ? (
            <p className="text-on-surface-variant text-sm">No exams scheduled.</p>
          ) : (
            <div className="space-y-sm max-h-[600px] overflow-y-auto">
              {exams.filter(e => e.status !== 'draft').map(e => {
                const conflicts = getConflicts(e)
                return (
                  <div key={e.id} className={`p-sm border rounded-lg ${conflicts.length ? 'border-error/50 bg-error-container/10' : 'border-outline-variant'}`}>
                    <p className="font-bold text-sm text-primary">{e.title}</p>
                    <p className="text-xs text-on-surface-variant">{e.subject}</p>
                    <p className="text-xs text-on-surface-variant">{new Date(e.start_time).toLocaleString()}</p>
                    {conflicts.length > 0 && (
                      <p className="text-xs text-error mt-1 flex items-center gap-1">
                        <Icon className="text-xs">warning_amber</Icon> Conflicts with {conflicts.map(c => c.title).join(', ')}
                      </p>
                    )}
                    <div className="border-t border-outline-variant/40 my-1.5" />
                    <div className="flex flex-wrap gap-1.5 justify-end">
                      <button onClick={() => setPage('assignStudents', e.id)}
                        className="inline-flex items-center gap-0.5 px-2 py-1 text-xs font-bold text-secondary border border-secondary/30 rounded-md hover:bg-secondary/10 hover:border-secondary/50 active:bg-secondary/20 transition-colors">
                        <Icon className="text-[11px]">group_add</Icon>Assign Students
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>
      {rescheduleTarget && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-md" onClick={() => !rescheduling && setRescheduleTarget(null)}>
          <div className="bg-surface rounded-2xl max-w-[1000px] w-full shadow-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-lg border-b border-outline-variant sticky top-0 bg-surface z-10">
              <h3 className="text-xl font-bold text-secondary flex items-center gap-sm"><Icon>schedule</Icon>Reschedule Exam</h3>
              <button onClick={() => setRescheduleTarget(null)} className="p-xs hover:bg-surface-container-high rounded-full transition-colors"><Icon className="text-xl">close</Icon></button>
            </div>
            <div className="p-lg space-y-lg">
              <p className="text-sm text-on-surface-variant leading-relaxed">
                Change the date and time for <span className="font-bold text-primary">{rescheduleTarget.title}</span>.
                All existing student assignments will be preserved.
              </p>
              <div className="flex items-start gap-sm bg-surface-container-low rounded-lg p-md">
                <Icon className="text-secondary mt-0.5">info</Icon>
                <p className="text-xs text-on-surface-variant">
                  Originally scheduled: <span className="font-semibold">{new Date(rescheduleTarget.start_time).toLocaleString()}</span> ({rescheduleTarget.timezone || 'UTC'})
                </p>
              </div>
              <div>
                <label className="block text-sm font-bold text-on-surface-variant mb-sm">New Start Date & Time *</label>
                <input type="datetime-local" className="input" value={rescheduleStart} onChange={e => {
                  setRescheduleStart(e.target.value)
                  if (rescheduleTarget.duration_minutes) {
                    const s = new Date(e.target.value)
                    const e2 = new Date(s.getTime() + rescheduleTarget.duration_minutes * 60000)
                    const pad = n => String(n).padStart(2, '0')
                    setRescheduleEnd(`${e2.getFullYear()}-${pad(e2.getMonth() + 1)}-${pad(e2.getDate())}T${pad(e2.getHours())}:${pad(e2.getMinutes())}`)
                  }
                }} />
              </div>
              <div>
                <label className="block text-sm font-bold text-on-surface-variant mb-sm">New End Date & Time *</label>
                <input type="datetime-local" className="input" value={rescheduleEnd} onChange={e => setRescheduleEnd(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-bold text-on-surface-variant mb-sm">Reason for rescheduling *</label>
                <textarea className="input min-h-[80px] resize-none" placeholder="e.g. Room unavailability, schedule conflict..." value={rescheduleReason} onChange={e => setRescheduleReason(e.target.value)} />
              </div>
              <div className="flex gap-md pt-sm border-t border-outline-variant/40">
                <button onClick={() => setRescheduleTarget(null)} disabled={rescheduling} className="flex-1 px-lg py-sm border border-outline-variant rounded-lg text-sm font-bold text-on-surface-variant hover:bg-surface-container-high transition-colors">Keep Original</button>
                <button onClick={confirmReschedule} disabled={rescheduling || !rescheduleStart || !rescheduleEnd || !rescheduleReason.trim()} className="flex-1 btn-secondary px-lg py-sm disabled:opacity-50">
                  {rescheduling ? 'Rescheduling...' : 'Confirm Reschedule'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {cancelTarget && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-md" onClick={() => !cancelling && setCancelTarget(null)}>
          <div className="bg-surface rounded-2xl max-w-[1000px] w-full shadow-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-lg border-b border-outline-variant sticky top-0 bg-surface z-10">
              <h3 className="text-xl font-bold text-error flex items-center gap-sm"><Icon>warning</Icon>Cancel Exam</h3>
              <button onClick={() => setCancelTarget(null)} className="p-xs hover:bg-surface-container-high rounded-full transition-colors"><Icon className="text-xl">close</Icon></button>
            </div>
            <div className="p-lg space-y-lg">
              <div className="flex items-start gap-sm bg-error-container/20 rounded-lg p-md border border-error/20">
                <Icon className="text-error mt-0.5">error_outline</Icon>
                <div>
                  <p className="text-sm font-bold text-error">Are you sure?</p>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    You are about to cancel <span className="font-semibold">{cancelTarget.title}</span>. This action cannot be undone.
                  </p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-on-surface-variant mb-sm">Reason for cancellation *</label>
                <textarea className="input min-h-[100px] resize-none" placeholder="e.g. Scheduling conflict, insufficient registrations..." value={cancelReason} onChange={e => setCancelReason(e.target.value)} autoFocus />
              </div>
              <div className="flex gap-md pt-sm border-t border-outline-variant/40">
                <button onClick={() => setCancelTarget(null)} disabled={cancelling} className="flex-1 px-lg py-sm border border-outline-variant rounded-lg text-sm font-bold text-on-surface-variant hover:bg-surface-container-high transition-colors">Keep Exam</button>
                <button onClick={confirmCancel} disabled={cancelling || !cancelReason.trim()} className="flex-1 px-lg py-sm rounded-lg text-sm font-bold text-white bg-error hover:bg-error/80 transition-colors disabled:opacity-50">
                  {cancelling ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </TeacherShell>
  )
}
