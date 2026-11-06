import { create } from 'zustand'

/**
 * The access token lives ONLY in memory (never localStorage) so an XSS bug can't
 * exfiltrate a long-lived credential. Sessions survive reloads through the
 * httpOnly refresh cookie (see lib/api.js -> bootstrapSession).
 */
export const useAuth = create((set, get) => ({
  status: 'loading', // loading | authenticated | anonymous
  token: null,
  expiresAt: 0,
  role: null,
  user: null,

  setSession: ({ access_token, expires_in, role, user }) =>
    set({ token: access_token, expiresAt: Date.now() + expires_in * 1000, role, user, status: 'authenticated' }),
  setUser: (user) => set({ user: { ...get().user, ...user } }),
  clear: () => set({ token: null, expiresAt: 0, role: null, user: null, status: 'anonymous' }),
}))

export const homeFor = (role) => (role === 'doctor' ? '/doctor' : '/app')
