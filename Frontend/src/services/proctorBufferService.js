import { api } from './api.js'

const BUFFER_KEY = 'proctor_event_buffer'
const MAX_RETRY_AGE = 30 * 60 * 1000

function loadBuffer() {
  try {
    return JSON.parse(localStorage.getItem(BUFFER_KEY) || '[]')
  } catch { return [] }
}

function saveBuffer(buf) {
  localStorage.setItem(BUFFER_KEY, JSON.stringify(buf))
}

export const proctorBufferService = {
  queue(event) {
    const buffer = loadBuffer()
    buffer.push({ ...event, queued_at: Date.now() })
    saveBuffer(buffer)
    return buffer.length
  },

  async flush() {
    let buffer = loadBuffer()
    if (buffer.length === 0) return 0

    const now = Date.now()
    const valid = buffer.filter(e => now - e.queued_at < MAX_RETRY_AGE)
    const expired = buffer.length - valid.length
    if (valid.length === 0) {
      saveBuffer([])
      return 0
    }

    try {
      const res = await api.post('/proctor/events/batch', valid)
      saveBuffer([])
      return res?.synced || 0
    } catch {
      saveBuffer(valid)
      return 0
    }
  },

  getBufferSize() {
    return loadBuffer().length
  },

  clear() {
    saveBuffer([])
  },
}
