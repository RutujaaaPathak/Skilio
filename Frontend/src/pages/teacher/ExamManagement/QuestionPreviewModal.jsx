import { useState } from 'react'
import { Icon } from '../../../components/TeacherShell.jsx'
import { questionService } from '../../../services/questionService.js'
import { useToast } from '../../../components/Toast.jsx'

function parseOptions(raw) {
  if (!raw) return []
  if (Array.isArray(raw)) return raw
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch { return [] }
}

export default function QuestionPreviewModal({ question, onClose, onSaved }) {
  const { addToast } = useToast()
  if (!question) return null
  const options = parseOptions(question.options)
  const isMcq = question.question_type === 'mcq'
  const [suggestions, setSuggestions] = useState(null)
  const [suggestLoading, setSuggestLoading] = useState(false)
  const [versions, setVersions] = useState(null)
  const [versionsLoading, setVersionsLoading] = useState(false)
  const [showVersions, setShowVersions] = useState(false)
  const [equivLoading, setEquivLoading] = useState(false)

  async function handleSuggest() {
    setSuggestLoading(true)
    try {
      const data = await questionService.suggest(question.id)
      setSuggestions(data.suggestions || [])
    } catch (err) {
      alert(err.message)
    } finally {
      setSuggestLoading(false)
    }
  }

  async function handleVersions() {
    if (versions) { setShowVersions(!showVersions); return }
    setVersionsLoading(true)
    try {
      const data = await questionService.getVersions(question.id)
      setVersions(data || [])
      setShowVersions(true)
    } catch (err) {
      alert(err.message)
    } finally {
      setVersionsLoading(false)
    }
  }

  async function handleGenerateEquivalent() {
    setEquivLoading(true)
    try {
      const result = await questionService.generateEquivalent(question.id, 1)
      const eq = result.questions?.[0]
      if (!eq) return
      const created = await questionService.create({
        subject: eq.subject,
        topic: eq.topic,
        difficulty: eq.difficulty,
        question_type: eq.question_type,
        question_text: eq.question_text,
        options: eq.options || null,
        correct_answer: eq.correct_answer,
        marks: eq.marks || question.marks,
        explanation: eq.explanation || null,
        is_ai_generated: true,
      })
      if (onSaved) onSaved(created)
      addToast('Equivalent question saved to Question Bank', 'success')
    } catch (err) {
      alert(err.message)
    } finally {
      setEquivLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose} onKeyDown={e => e.key === "Escape" && onClose()} role="dialog" aria-modal="true" aria-label="Question preview">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-lg border-b border-outline-variant">
          <h2 className="text-xl font-bold text-primary">Question Preview</h2>
          <button onClick={onClose} aria-label="Close preview" className="p-2 hover:bg-surface-container-low rounded-full"><Icon>close</Icon></button>
        </div>

        <div className="p-lg space-y-lg">
          <div className="flex flex-wrap gap-sm">
            <span className="pill bg-primary-fixed text-primary text-xs">{question.subject}</span>
            <span className="pill bg-surface-container-high text-on-surface-variant text-xs">{question.topic}</span>
            <span className={'pill text-xs font-bold ' + (question.difficulty === 'hard' ? 'bg-error-container text-error' : question.difficulty === 'easy' ? 'bg-tertiary-container text-tertiary' : 'bg-secondary-container text-secondary')}>
              {question.difficulty}
            </span>
            <span className="pill bg-surface-container-highest text-on-surface-variant text-xs">{question.question_type.replace('_', ' ')}</span>
            <span className="pill bg-surface-container-high text-on-surface-variant text-xs">{question.marks} mark(s)</span>
            {question.blooms_level && (
              <span className="pill bg-tertiary-container text-tertiary text-xs">{question.blooms_level}</span>
            )}
          </div>

          <div className="bg-surface-container-low rounded-xl p-lg">
            <p className="text-sm font-bold text-on-surface-variant mb-sm">Question</p>
            <p className="text-lg text-primary leading-relaxed">{question.question_text}</p>
          </div>

          {isMcq && options.length > 0 && (
            <div>
              <p className="text-sm font-bold text-on-surface-variant mb-sm">Options</p>
              <div className="space-y-sm">
                {options.map((opt, i) => {
                  const isCorrect = opt.trim().toLowerCase() === question.correct_answer.trim().toLowerCase()
                  return (
                    <div key={i} className={'flex items-center gap-sm p-md rounded-xl border ' + (isCorrect ? 'border-secondary-container bg-secondary-container/10' : 'border-outline-variant')}>
                      <span className={'w-7 h-7 rounded-full grid place-items-center text-xs font-bold shrink-0 ' + (isCorrect ? 'bg-secondary text-white' : 'bg-surface-container-low')}>
                        {String.fromCharCode(65 + i)}
                      </span>
                      <span className={'text-sm ' + (isCorrect ? 'font-bold text-secondary' : '')}>{opt}</span>
                      {isCorrect && <Icon className="text-secondary text-sm ml-auto">check_circle</Icon>}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {!isMcq && (
            <div className="bg-surface-container-low rounded-xl p-lg">
              <p className="text-sm font-bold text-on-surface-variant mb-sm">Correct Answer</p>
              <p className="text-sm text-primary font-bold">{question.correct_answer}</p>
            </div>
          )}

{question.explanation && (
            <div className="bg-info-container/10 border border-info-container rounded-xl p-lg">
              <p className="text-sm font-bold text-info mb-sm">Explanation</p>
              <p className="text-sm text-on-surface">{question.explanation}</p>
            </div>
          )}

          {suggestions && (
            <div className="bg-tertiary-container/10 border border-tertiary-container rounded-xl p-lg">
              <p className="text-sm font-bold text-tertiary mb-sm">AI Suggestions</p>
              <ul className="list-disc list-inside space-y-xs">
                {suggestions.map((s, i) => <li key={i} className="text-sm text-on-surface">{s}</li>)}
              </ul>
            </div>
          )}

          {showVersions && versions && versions.length > 0 && (
            <div className="bg-surface-container-low rounded-xl p-lg max-h-64 overflow-y-auto">
              <p className="text-sm font-bold text-on-surface-variant mb-sm">Version History</p>
              <div className="space-y-sm">
                {versions.map(v => (
                  <div key={v.id} className="flex justify-between items-center p-sm bg-white rounded-lg border border-outline-variant">
                    <span className="text-sm font-bold text-primary">v{v.version_number}</span>
                    <span className="text-xs text-on-surface-variant">{v.created_at ? new Date(v.created_at).toLocaleString() : ''}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

<div className="flex justify-between gap-sm pt-md border-t border-outline-variant">
            <div className="flex gap-sm flex-wrap">
              <button onClick={handleSuggest} disabled={suggestLoading} aria-label="Get AI suggestions" className="btn-secondary px-md py-sm text-sm flex items-center gap-xs">
                <Icon className="text-sm">smart_toy</Icon>{suggestLoading ? 'Analyzing...' : 'AI Suggest'}
              </button>
              <button onClick={handleVersions} disabled={versionsLoading} aria-label="View version history" className="btn-secondary px-md py-sm text-sm flex items-center gap-xs">
                <Icon className="text-sm">history</Icon>{versionsLoading ? 'Loading...' : 'History'}
              </button>
              <button onClick={handleGenerateEquivalent} disabled={equivLoading} aria-label="Generate equivalent question" className="btn-secondary px-md py-sm text-sm flex items-center gap-xs">
                <Icon className="text-sm">{equivLoading ? 'sync' : 'auto_awesome'}</Icon>{equivLoading ? 'Generating...' : 'Equivalent'}
              </button>
            </div>
            <button onClick={onClose} className="btn-secondary px-lg py-sm">Close</button>
          </div>
        </div>
      </div>
    </div>
  )
}