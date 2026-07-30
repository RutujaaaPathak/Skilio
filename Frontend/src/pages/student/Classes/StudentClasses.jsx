import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import StudentLayout from '../../../components/StudentLayout.jsx'
import Icon from '../../../components/Icon.jsx'
import { classService } from '../../../services/classService.js'

export default function StudentClasses() {
  const navigate = useNavigate()
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showJoin, setShowJoin] = useState(false)
  const [code, setCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState('')
  const [joinedClass, setJoinedClass] = useState(null)

  const fetchClasses = useCallback(async () => {
    setLoading(true)
    try {
      const data = await classService.getMyClasses()
      setClasses(Array.isArray(data) ? data : [])
    } catch {
      setClasses([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchClasses() }, [fetchClasses])

  const handleJoin = async () => {
    const cleaned = code.trim().toUpperCase()
    if (cleaned.length !== 6) {
      setJoinError('Code must be exactly 6 characters')
      return
    }
    setJoinError('')
    setJoining(true)
    try {
      const result = await classService.joinClass(cleaned)
      setJoinedClass(result)
      setCode('')
      await fetchClasses()
    } catch (e) {
      setJoinError(e.message || 'Failed to join class')
    } finally {
      setJoining(false)
    }
  }

  const handleCloseJoin = () => {
    setShowJoin(false)
    setCode('')
    setJoinError('')
    setJoinedClass(null)
  }

  return (
    <StudentLayout title="My Classes">
      <div className="p-gutter max-w-container-max mx-auto">
        <div className="flex items-center justify-between mb-lg">
          <h2 className="text-headline-md font-bold text-primary">My Classes</h2>
          <button onClick={() => setShowJoin(true)} className="inline-flex h-10 px-md items-center bg-primary text-on-primary rounded-lg text-label-sm font-bold hover:opacity-90 gap-xs">
            <Icon name="add" /> Join Class
          </button>
        </div>

        {loading ? (
          <div className="text-center py-xl text-on-surface-variant">Loading classes...</div>
        ) : classes.length === 0 ? (
          <div className="text-center py-xl max-w-md mx-auto">
            <Icon name="groups" className="text-on-surface-variant text-[48px] mb-md" />
            <h3 className="text-headline-sm text-primary font-bold mb-xs">No Classes Yet</h3>
            <p className="text-on-surface-variant mb-lg">Ask your teacher for the 6-character class code to join.</p>
            <button onClick={() => setShowJoin(true)} className="inline-flex h-11 px-lg items-center bg-primary text-on-primary rounded-lg font-bold hover:opacity-90">
              Join Class
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-md">
            {classes.map(c => (
              <div key={c.id} className="bg-surface border border-outline-variant rounded-xl p-md">
                <h3 className="text-lg font-bold text-primary mb-xs">{c.name}</h3>
                <p className="text-sm text-on-surface-variant mb-xs">{c.subject}</p>
                {(c.semester || c.academic_year) && (
                  <p className="text-xs text-on-surface-variant mb-sm">{c.semester && `Semester ${c.semester}`}{c.semester && c.academic_year ? ' • ' : ''}{c.academic_year || ''}</p>
                )}
                <div className="flex items-center gap-sm mb-md text-xs text-on-surface-variant">
                  <span className="flex items-center gap-xs"><Icon name="person" className="text-sm" /> {c.teacher_name}</span>
                  <span className="flex items-center gap-xs"><Icon name="people" className="text-sm" /> {c.student_count} Students</span>
                </div>
                <button onClick={() => navigate(`/student/classes/${c.id}`)} className="inline-flex h-9 px-md items-center bg-primary text-on-primary rounded-lg text-label-sm font-bold hover:opacity-90">
                  View Class
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Join Class Modal */}
        {showJoin && (
          <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-md" onClick={handleCloseJoin}>
            <div className="bg-surface rounded-2xl max-w-3xl w-full shadow-2xl" onClick={e => e.stopPropagation()}>
              {joinedClass ? (
                <>
                  <div className="p-lg text-center">
                    <div className="w-16 h-16 rounded-full bg-success-container text-success flex items-center justify-center mx-auto mb-md">
                      <Icon name="check_circle" className="text-3xl" />
                    </div>
                    <h3 className="text-xl font-bold text-primary mb-xs">Class Joined Successfully</h3>
                    <p className="text-lg font-bold text-on-surface mb-xs">You have joined:</p>
                    <p className="text-lg font-bold text-primary">{joinedClass.name}</p>
                    <p className="text-sm text-on-surface-variant mb-lg">{joinedClass.subject}</p>
                    <button onClick={() => { handleCloseJoin(); navigate(`/student/classes/${joinedClass.id}`) }} className="btn-primary px-lg py-sm">
                      View Class
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between p-lg border-b border-outline-variant">
                    <h3 className="text-xl font-bold text-primary">Join a Class</h3>
                    <button onClick={handleCloseJoin} className="p-xs hover:bg-surface-container-high rounded-full"><Icon name="close" className="text-xl" /></button>
                  </div>
                  <div className="p-lg">
                    <p className="text-sm text-on-surface-variant mb-md">Enter the 6-character class code provided by your teacher.</p>
                    <input
                      type="text"
                      className="input text-center text-2xl font-extrabold text-primary tracking-[0.3em] uppercase"
                      placeholder="X7K29P"
                      maxLength={6}
                      value={code}
                      onChange={e => { setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')); setJoinError('') }}
                      onKeyDown={e => { if (e.key === 'Enter') handleJoin() }}
                      autoFocus
                    />
                    {joinError && <p className="text-xs text-error mt-sm flex items-center gap-1"><Icon name="error" className="text-xs" />{joinError}</p>}
                    <button onClick={handleJoin} disabled={code.length !== 6 || joining} className="btn-primary w-full mt-md py-sm disabled:opacity-50">
                      {joining ? 'Joining...' : 'Join Class'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </StudentLayout>
  )
}
