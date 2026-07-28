import { useState, useRef } from 'react'
import { Icon } from '../../../components/TeacherShell.jsx'
import { questionService } from '../../../services/questionService.js'

function parseCSV(text) {
  const lines = []
  let current = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]; const next = text[i + 1]
    if (inQuotes) {
      if (ch === '"' && next === '"') { field += '"'; i++ }
      else if (ch === '"') { inQuotes = false }
      else { field += ch }
    } else {
      if (ch === '"') { inQuotes = true }
      else if (ch === ',') { current.push(field.trim()); field = '' }
      else if (ch === '\n' || (ch === '\r' && next === '\n')) {
        if (ch === '\r') i++
        current.push(field.trim())
        if (current.length > 0 && current.some(c => c)) lines.push(current)
        current = []; field = ''
      } else if (ch === '\r') {
        current.push(field.trim())
        if (current.length > 0 && current.some(c => c)) lines.push(current)
        current = []; field = ''
      } else { field += ch }
    }
  }
  current.push(field.trim())
  if (current.length > 0 && current.some(c => c)) lines.push(current)
  return lines
}

const HEADER_MAP = {
  subject: ['subject', 'sub'],
  topic: ['topic'],
  difficulty: ['difficulty', 'diff'],
  question_type: ['question_type', 'type', 'questiontype'],
  question_text: ['question_text', 'question', 'text', 'questiontext'],
  options: ['options', 'option'],
  correct_answer: ['correct_answer', 'answer', 'correctanswer'],
  marks: ['marks', 'mark'],
  explanation: ['explanation', 'explain'],
}

function matchHeader(h) {
  const key = h.toLowerCase().replace(/[^a-z_]/g, '')
  for (const [field, aliases] of Object.entries(HEADER_MAP)) {
    if (aliases.includes(key)) return field
  }
  return null
}

function parseCSVData(text) {
  const rows = parseCSV(text)
  if (rows.length < 2) return { parsed: [], errors: ['CSV file must have a header row and at least one data row.'] }
  const headers = rows[0].map(h => matchHeader(h))
  const unknownIdx = headers.indexOf(undefined)
  if (unknownIdx !== -1) {
    return { parsed: [], errors: ['Unknown column: "' + rows[0][unknownIdx] + '". Valid headers: subject, topic, difficulty, question_type, question_text, options, correct_answer, marks, explanation.'] }
  }
  const parsed = rows.slice(1).map((row) => {
    const q = {}
    headers.forEach((field, ci) => {
      let val = row[ci] || ''
      if (field === 'options') q[field] = val ? val.split(';').map(s => s.trim()).filter(Boolean) : undefined
      else if (field === 'marks') q[field] = parseInt(val) || 1
      else q[field] = val || undefined
    })
    return q
  }).filter(q => q.question_text)

  const errors = []
  parsed.forEach((q, i) => {
    if (!q.subject) errors.push(`Row ${i+1}: subject is required`)
    if (!q.topic) errors.push(`Row ${i+1}: topic is required`)
    if (!q.question_text) errors.push(`Row ${i+1}: question_text is required`)
    if (!q.correct_answer) errors.push(`Row ${i+1}: correct_answer is required`)
    if (q.question_type === 'mcq' && (!q.options || q.options.length < 2)) {
      errors.push(`Row ${i+1}: MCQ must have at least 2 options (semicolon-separated)`)
    }
  })
  return { parsed, errors }
}

export default function CSVImportModal({ onClose, onSaved }) {
  const [importMode, setImportMode] = useState('csv')
  const [step, setStep] = useState('upload')
  const [preview, setPreview] = useState([])
  const [errors, setErrors] = useState([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)
  const fileRef = useRef()

  function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (importMode === 'csv') {
      const reader = new FileReader()
      reader.onload = (ev) => {
        const result = parseCSVData(ev.target.result)
        setErrors(result.errors)
        setPreview(result.parsed)
        setStep('preview')
      }
      reader.readAsText(file)
    } else if (importMode === 'pdf') {
      setLoading(true)
      questionService.importPdfPreview(file)
        .then(data => {
          setErrors(data.errors || [])
          setPreview(data.parsed || [])
          setStep('preview')
        })
        .catch(err => setErrors([err.message]))
        .finally(() => setLoading(false))
    } else {
      setLoading(true)
      questionService.importExcelPreview(file)
        .then(data => {
          setErrors(data.errors || [])
          setPreview(data.parsed || [])
          setStep('preview')
        })
        .catch(err => setErrors([err.message]))
        .finally(() => setLoading(false))
    }
  }

  async function handleImport() {
    setSaving(true)
    try {
      const created = await questionService.bulkCreate(preview)
      onSaved(created)
      onClose()
    } catch (err) {
      setErrors([err.message])
    } finally {
      setSaving(false)
    }
  }

  function handleRetry() {
    setStep('upload')
    setPreview([])
    setErrors([])
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto m-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-lg border-b border-outline-variant">
          <h2 className="text-xl font-bold text-primary">Bulk Import</h2>
          <button onClick={onClose} className="p-2 hover:bg-surface-container-low rounded-full"><Icon>close</Icon></button>
        </div>

        {step === 'upload' && (
          <div className="p-lg">
            <div className="flex gap-sm mb-lg">
              {['csv', 'excel', 'pdf'].map(mode => (
                <button key={mode} onClick={() => setImportMode(mode)}
                  className={"px-lg py-sm rounded-lg text-sm font-bold transition-colors " + (importMode === mode ? 'bg-secondary text-on-secondary' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high')}>
                  <Icon className="text-sm align-middle mr-xs">{mode === 'csv' ? 'description' : mode === 'excel' ? 'table_chart' : 'picture_as_pdf'}</Icon>
                  {mode === 'csv' ? 'CSV' : mode === 'excel' ? 'Excel (.xlsx)' : 'PDF'}
                </button>
              ))}
            </div>

            <div className="border-2 border-dashed border-outline-variant rounded-xl p-xl text-center hover:border-secondary cursor-pointer" onClick={() => fileRef.current?.click()}>
              <Icon className="text-4xl text-on-surface-variant mb-md">upload_file</Icon>
              <p className="font-bold text-primary">Click to select a {importMode === 'csv' ? 'CSV' : importMode === 'excel' ? 'Excel' : 'PDF'} file</p>
              <p className="text-sm text-on-surface-variant mt-xs">or drag and drop</p>
              {loading && <p className="text-sm text-secondary mt-sm">Parsing file...</p>}
            </div>
            <input ref={fileRef} type="file" accept={importMode === 'csv' ? '.csv' : importMode === 'excel' ? '.xlsx,.xls' : '.pdf'} className="hidden" onChange={handleFile} disabled={loading} />

            <div className="mt-lg bg-surface-container-low rounded-xl p-md">
              <h3 className="font-bold text-primary mb-sm">{importMode === 'csv' ? 'CSV Format' : importMode === 'excel' ? 'Excel Format' : 'PDF Format'}</h3>
              {importMode === 'pdf' ? (
                <>
                  <p className="text-xs text-on-surface-variant mb-sm">Format each question with labelled fields. Questions can be separated by blank lines or numbering.</p>
                  <p className="text-xs text-on-surface-variant mb-sm">Supported labels: <b>Subject:</b>, <b>Topic:</b>, <b>Difficulty:</b>, <b>Type:</b>, <b>Answer:</b>, <b>Options:</b>, <b>Marks:</b>, <b>Explanation:</b></p>
                  <pre className="text-xs bg-surface-container-high p-sm rounded-lg mt-sm overflow-x-auto whitespace-pre">{`1. What is entropy?
Subject: Physics
Topic: Thermodynamics
Difficulty: medium
Type: mcq
Options: Disorder; Energy; Temperature; Pressure
Answer: Disorder
Explanation: Entropy measures disorder

2. Explain Newton's First Law
Subject: Physics
Topic: Mechanics
Difficulty: hard
Type: short_answer
Answer: An object at rest stays at rest`}</pre>
                </>
              ) : importMode === 'csv' ? (
                <>
                  <p className="text-xs text-on-surface-variant mb-sm">Required columns: <b>subject</b>, <b>topic</b>, <b>question_text</b>, <b>correct_answer</b></p>
                  <p className="text-xs text-on-surface-variant mb-sm">Optional columns: <b>difficulty</b> (easy/medium/hard), <b>question_type</b> (mcq/short_answer/long_answer), <b>options</b> (semicolon-separated for MCQ), <b>marks</b>, <b>explanation</b></p>
                  <pre className="text-xs bg-surface-container-high p-sm rounded-lg mt-sm overflow-x-auto whitespace-pre">{`subject,topic,question_text,question_type,options,correct_answer,difficulty,marks
Physics,Thermodynamics,What is entropy?,mcq,Disorder;Energy;Temperature;Pressure,Disorder,medium,2`}</pre>
                </>
              ) : (
                <>
                  <p className="text-xs text-on-surface-variant mb-sm">Required columns: <b>subject</b>, <b>topic</b>, <b>question_text</b>, <b>correct_answer</b></p>
                  <p className="text-xs text-on-surface-variant mb-sm">Optional columns: <b>difficulty</b> (easy/medium/hard), <b>question_type</b> (mcq/short_answer/long_answer), <b>options</b> (semicolon-separated for MCQ), <b>marks</b>, <b>explanation</b></p>
                </>
              )}
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="p-lg">
            {errors.length > 0 && (
              <div className="mb-md bg-error-container text-error p-md rounded-xl text-sm">
                {errors.map((e, i) => <p key={i} className="font-bold">{e}</p>)}
              </div>
            )}

            <p className="text-sm text-on-surface-variant mb-md">{preview.length} question(s) parsed from file.</p>

            <div className="overflow-x-auto border border-outline-variant rounded-xl max-h-80 overflow-y-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-container-low sticky top-0">
                  <tr>
                    <th className="px-md py-sm font-bold">#</th>
                    <th className="px-md py-sm font-bold">Subject</th>
                    <th className="px-md py-sm font-bold">Topic</th>
                    <th className="px-md py-sm font-bold">Type</th>
                    <th className="px-md py-sm font-bold">Question</th>
                    <th className="px-md py-sm font-bold">Difficulty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {preview.map((q, i) => (
                    <tr key={i} className="hover:bg-surface-container-low">
                      <td className="px-md py-sm">{i + 1}</td>
                      <td className="px-md py-sm">{q.subject}</td>
                      <td className="px-md py-sm">{q.topic}</td>
                      <td className="px-md py-sm">{q.question_type || 'mcq'}</td>
                      <td className="px-md py-sm max-w-xs truncate">{q.question_text}</td>
                      <td className="px-md py-sm">{q.difficulty || 'medium'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-sm mt-lg pt-md border-t border-outline-variant">
              <button onClick={handleRetry} className="btn-secondary px-lg py-sm">Back</button>
              <button onClick={handleImport} disabled={saving || errors.length > 0} className="btn-primary px-lg py-sm">
                {saving ? 'Importing...' : `Import ${preview.length} Question(s)`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}