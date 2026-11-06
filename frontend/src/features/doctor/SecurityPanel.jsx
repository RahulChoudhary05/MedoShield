import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { KeyRound, LogOut, Monitor, ShieldCheck, Smartphone } from 'lucide-react'
import { api } from '../../lib/api'
import { useAuth } from '../../store/auth'
import { errorMessage, fmtRelative } from '../../lib/utils'
import Button from '../../components/ui/Button'
import { Card, CardHeader } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { PasswordInput, PasswordStrength } from '../../components/ui/Field'
import { ErrorState, Skeleton } from '../../components/ui/Feedback'
import { ConfirmDialog } from './shared'

function describeAgent(ua = '') {
  const browser = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Browser'
  const os = /iPhone|iPad/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows' : /Mac OS X/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : 'Unknown device'
  return { label: `${browser} on ${os}`, mobile: /iPhone|iPad|Android|Mobile/.test(ua) }
}

export function ChangePassword() {
  const qc = useQueryClient()
  const [form, setForm] = useState({ current: '', next: '', confirm: '' })
  const [errors, setErrors] = useState({})
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const change = useMutation({
    mutationFn: () => api.auth.changePassword({ current_password: form.current, new_password: form.next }),
    onSuccess: () => {
      toast.success('Password updated. Other devices have been signed out.')
      setForm({ current: '', next: '', confirm: '' })
      qc.invalidateQueries({ queryKey: ['auth', 'sessions'] })
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  const submit = (e) => {
    e.preventDefault()
    const errs = {}
    if (!form.current) errs.current = 'Enter your current password'
    if (form.next.length < 10) errs.next = 'Use at least 10 characters'
    else if (form.next === form.current) errs.next = 'Choose a password you haven’t used here'
    if (form.confirm !== form.next) errs.confirm = 'Passwords don’t match'
    setErrors(errs)
    if (!Object.keys(errs).length) change.mutate()
  }

  return (
    <Card as="form" onSubmit={submit} noValidate>
      <CardHeader icon={KeyRound} tone="teal" title="Change password" subtitle="Signs out every other device" />
      <div className="space-y-4">
        <PasswordInput label="Current password" autoComplete="current-password" value={form.current} onChange={set('current')} error={errors.current} />
        <div>
          <PasswordInput label="New password" autoComplete="new-password" value={form.next} onChange={set('next')} error={errors.next} />
          {form.next && <PasswordStrength value={form.next} />}
        </div>
        <PasswordInput label="Confirm new password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} error={errors.confirm} />
      </div>
      <div className="mt-5 flex justify-end">
        <Button type="submit" size="sm" variant="primary" loading={change.isPending} disabled={!form.current || !form.next}>Update password</Button>
      </div>
    </Card>
  )
}

export function Sessions() {
  const navigate = useNavigate()
  const q = useQuery({ queryKey: ['auth', 'sessions'], queryFn: api.auth.sessions })
  const [confirm, setConfirm] = useState(false)

  const logoutAll = useMutation({
    mutationFn: api.auth.logoutAll,
    onSuccess: () => {
      useAuth.getState().clear()
      toast.success('Signed out on every device')
      navigate('/login', { replace: true })
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  const sessions = q.data?.sessions ?? []
  return (
    <Card>
      <CardHeader icon={ShieldCheck} tone="teal" title="Active sessions" subtitle="Devices currently signed in to your account" />
      {q.isLoading ? (
        <div className="space-y-2.5">{[0, 1].map((i) => <Skeleton key={i} className="h-14 rounded-2xl" />)}</div>
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} className="py-6" />
      ) : (
        <ul className="space-y-2">
          {sessions.map((s, i) => {
            const d = describeAgent(s.user_agent)
            const Icon = d.mobile ? Smartphone : Monitor
            return (
              <li key={`${s.created_at}-${i}`} className="flex items-center gap-3 rounded-2xl border border-line/70 bg-cream/60 px-3.5 py-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-paper text-ink-2 ring-1 ring-line"><Icon className="h-4 w-4" /></span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-ink">{d.label}{s.current && <Badge tone="teal" dot>This device</Badge>}</p>
                  <p className="truncate text-xs text-ink-3">{s.ip || 'Unknown IP'} · signed in {fmtRelative(s.created_at)}</p>
                </div>
              </li>
            )
          })}
          {!sessions.length && <li className="text-sm text-ink-4">No active sessions found.</li>}
        </ul>
      )}
      <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-line bg-cream p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-ink-2">Lost a device or shared a computer? End every session, including this one.</p>
        <Button variant="danger" size="sm" icon={LogOut} onClick={() => setConfirm(true)} className="shrink-0">Sign out everywhere</Button>
      </div>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        tone="danger"
        title="Sign out of every device?"
        description="All sessions end immediately, including this one. You’ll need your password to sign back in."
        confirmLabel="Sign out everywhere"
        loading={logoutAll.isPending}
        onConfirm={() => logoutAll.mutate()}
      />
    </Card>
  )
}
