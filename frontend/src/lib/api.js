import axios from 'axios'
import { useAuth } from '../store/auth'

const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

export const http = axios.create({
  baseURL: `${BASE}/api`,
  withCredentials: true, // refresh cookie
  timeout: 90_000,
})

// ── Session refresh (single-flight) ─────────────────────────────────────
let refreshing = null

export function refreshSession() {
  if (!refreshing) {
    refreshing = axios
      .post(`${BASE}/api/auth/refresh`, null, { withCredentials: true, headers: { 'X-CSRF-Guard': '1' }, timeout: 15_000 })
      .then(({ data }) => {
        useAuth.getState().setSession(data)
        return data.access_token
      })
      .catch((e) => {
        useAuth.getState().clear()
        throw e
      })
      .finally(() => {
        refreshing = null
      })
  }
  return refreshing
}

export async function bootstrapSession() {
  try {
    await refreshSession()
  } catch {
    useAuth.getState().clear()
  }
}

http.interceptors.request.use(async (config) => {
  const { token, expiresAt } = useAuth.getState()
  let t = token
  // Proactively refresh shortly before expiry.
  if (t && expiresAt - Date.now() < 30_000 && !config.url?.startsWith('/auth/')) {
    try {
      t = await refreshSession()
    } catch {
      t = null
    }
  }
  if (t) config.headers.Authorization = `Bearer ${t}`
  return config
})

http.interceptors.response.use(
  (r) => r,
  async (error) => {
    const { config, response } = error
    if (response?.status === 401 && config && !config._retried && !config.url?.startsWith('/auth/')) {
      config._retried = true
      try {
        const t = await refreshSession()
        config.headers.Authorization = `Bearer ${t}`
        return http(config)
      } catch {
        /* fall through */
      }
    }
    return Promise.reject(error)
  },
)

const data = (p) => p.then((r) => r.data)
const q = (patientId) => (patientId ? { params: { patient_id: patientId } } : {})

// ── Endpoints ───────────────────────────────────────────────────────────
export const api = {
  auth: {
    login: (body) => data(http.post('/auth/login', body)),
    registerPatient: (body) => data(http.post('/auth/patient/register', body)),
    registerDoctor: (body) => data(http.post('/auth/doctor/register', body)),
    logout: () => http.post('/auth/logout', null, { headers: { 'X-CSRF-Guard': '1' } }),
    logoutAll: () => http.post('/auth/logout-all', null, { headers: { 'X-CSRF-Guard': '1' } }),
    me: () => data(http.get('/auth/me')),
    changePassword: (body) => http.post('/auth/change-password', body),
    sessions: () => data(http.get('/auth/sessions')),
  },
  patient: {
    me: () => data(http.get('/patients/me')),
    update: (body) => data(http.patch('/patients/me', body)),
    dashboard: () => data(http.get('/patients/dashboard')),
    trends: (days = 90) => data(http.get('/patients/trends', { params: { days } })),
    appointments: () => data(http.get('/patients/appointments')),
    exportData: () => http.get('/patients/me/export', { responseType: 'blob' }),
    deleteAccount: (password) => http.post('/patients/me/delete', { password }),
  },
  doctors: {
    profile: () => data(http.get('/doctors/profile')),
    updateProfile: (body) => data(http.patch('/doctors/profile', body)),
    directory: (params) => data(http.get('/doctors/directory', { params })),
    requestAppointment: (body) => data(http.post('/doctors/appointments', body)),
    cancelAppointment: (id) => data(http.post(`/doctors/appointments/${id}/cancel`)),
    appointments: (status) => data(http.get('/doctors/appointments', { params: status ? { status } : {} })),
    accept: (id, note = '') => data(http.post(`/doctors/appointments/${id}/accept`, { note })),
    reject: (id, note = '') => data(http.post(`/doctors/appointments/${id}/reject`, { note })),
    patients: () => data(http.get('/doctors/patients')),
    overview: (pid) => data(http.get(`/doctors/patients/${pid}/overview`)),
    summary: (pid) => data(http.post(`/doctors/patients/${pid}/summary`)),
    discharge: (pid) => data(http.post(`/doctors/patients/${pid}/discharge`)),
  },
  analysis: {
    submit: (body) => data(http.post('/analysis/sessions', body)),
    sessions: (patientId, limit = 30) => data(http.get('/analysis/sessions', { params: { limit, ...(patientId ? { patient_id: patientId } : {}) } })),
    session: (id) => data(http.get(`/analysis/sessions/${id}`)),
    summary: (patientId, days = 90) => data(http.get('/analysis/summary', { params: { days, ...(patientId ? { patient_id: patientId } : {}) } })),
  },
  video: {
    access: (patientId) => data(http.get('/video/access', q(patientId))),
    unlock: (pid) => data(http.post(`/video/unlock/${pid}`)),
    lock: (pid) => data(http.post(`/video/lock/${pid}`)),
    analyze: (file, poseMetrics, onUploadProgress) => {
      const fd = new FormData()
      fd.append('file', file)
      if (poseMetrics) fd.append('pose_metrics', JSON.stringify(poseMetrics))
      return data(http.post('/video/analyze', fd, { onUploadProgress, timeout: 180_000 }))
    },
    history: (patientId) => data(http.get('/video/history', q(patientId))),
    review: (id, doctor_notes) => data(http.post(`/video/${id}/review`, { doctor_notes })),
    pdf: (id) => http.get(`/video/${id}/pdf`, { responseType: 'blob' }),
  },
  assistant: {
    send: (message, conversation_id) => data(http.post('/assistant/message', { message, ...(conversation_id ? { conversation_id } : {}) })),
    conversations: () => data(http.get('/assistant/conversations')),
    conversation: (id) => data(http.get(`/assistant/conversations/${id}`)),
    remove: (id) => http.delete(`/assistant/conversations/${id}`),
  },
  meds: {
    plan: (patientId) => data(http.get('/medications/plan', q(patientId))),
    add: (item, patientId) => data(http.post('/medications/plan', item, q(patientId))),
    remove: (name, patientId) => data(http.delete(`/medications/plan/${encodeURIComponent(name)}`, q(patientId))),
    log: (body) => data(http.post('/medications/log', body)),
    guidance: (body) => data(http.post('/medications/guidance', body)),
  },
  reports: {
    analyze: (file, onUploadProgress) => {
      const fd = new FormData()
      fd.append('file', file)
      return data(http.post('/reports/analyze', fd, { onUploadProgress, timeout: 120_000 }))
    },
    list: (patientId) => data(http.get('/reports', q(patientId))),
    get: (id) => data(http.get(`/reports/${id}`)),
  },
  timeline: (patientId) => data(http.get('/timeline', q(patientId))),
  chat: {
    threads: () => data(http.get('/chat/threads')),
    messages: (otherId) => data(http.get(`/chat/${otherId}/messages`)),
    send: (otherId, content) => data(http.post(`/chat/${otherId}/messages`, { content })),
    sendMedia: (otherId, file, kind = 'voice') => {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('kind', kind)
      return data(http.post(`/chat/${otherId}/media`, fd))
    },
    media: (url) => http.get(url.replace(/^\/api/, ''), { responseType: 'blob' }),
  },
  fitness: {
    records: (patientId) => data(http.get('/fitness/records', q(patientId))),
    add: (body) => data(http.post('/fitness/records', body)),
    remove: (id) => http.delete(`/fitness/records/${id}`),
    coach: (patientId) => data(http.post('/fitness/coach', null, q(patientId))),
  },
  notifications: {
    list: () => data(http.get('/notifications')),
    read: () => data(http.post('/notifications/read')),
  },
  sos: (body) => data(http.post('/sos', body)),
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}
