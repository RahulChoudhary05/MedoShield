import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { KeyRound, Laptop, LogOut, ShieldCheck, Smartphone } from 'lucide-react'
import { Card, CardHeader } from '../../../components/ui/Card'
import Button from '../../../components/ui/Button'
import { PasswordInput, PasswordStrength } from '../../../components/ui/Field'
import { Skeleton } from '../../../components/ui/Feedback'
import { Badge } from '../../../components/ui/Badge'
import { api } from '../../../lib/api'
import { errorMessage, fmtRelative } from '../../../lib/utils'
import { useAuth } from '../../../store/auth'
import { ConfirmDialog, SectionLabel } from '../shared'

function describeAgent(ua = '') {
  const browser = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Browser'
  const os = /Android/.test(ua) ? 'Android' : /iPhone|iPad|iOS/.test(ua) ? 'iOS' : /Windows/.test(ua) ? 'Windows' : /Mac OS/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : 'Unknown device'
  return { label: `${browser} on ${os}`, mobile: /Android|iPhone|iPad|Mobile/.test(ua) }
}

const strong = (v) => v.length >= 10 && /[a-z]/.test(v) && /[A-Z]/.test(v) && /\d/.test(v) && /[^A-Za-z0-9]/.test(v)

export default function Security() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' })
  const [errors, setErrors] = useState({})
  const [confirmAll, setConfirmAll] = useState(false)
  const sessions = useQuery({ queryKey: ['auth', 'sessions'], queryFn: api.auth.sessions })

  const change = useMutation({
    mutationFn: (body) => api.auth.changePassword(body),
    onSuccess: () => {
      toast.success('Password changed', { description: 'Other devices have been signed out for safety.' })
      setPw({ current: '', next: '', confirm: '' })
      qc.invalidateQueries({ queryKey: ['auth', 'sessions'] })
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  const logoutAll = useMutation({
    mutationFn: () => api.auth.logoutAll(),
    onSuccess: () => {
      toast.success('Signed out on every device')
      useAuth.getState().clear()
      qc.clear()
      navigate('/login', { replace: true })
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  function submit(e) {
    e.preventDefault()
    const errs = {}
    if (!pw.current) errs.current = 'Enter your current password'
    if (!strong(pw.next)) errs.next = 'Use 10+ characters with upper & lower case, a number and a symbol'
    else if (pw.next === pw.current) errs.next = 'Choose a password you haven’t used here'
    if (pw.confirm !== pw.next) errs.confirm = 'Passwords don’t match'
    setErrors(errs)
    if (Object.keys(errs).length) return
    change.mutate({ current_password: pw.current, new_password: pw.next })
  }

  const list = sessions.data?.sessions || []
  return (
    <Card id="security" as="section" className="scroll-mt-24">
      <CardHeader icon={ShieldCheck} tone="teal" title="Security" subtitle="Password and signed-in devices" />
      <div className="grid gap-8 lg:grid-cols-2">
        <form onSubmit={submit} className="space-y-4" noValidate>
          <SectionLabel>Change password</SectionLabel>
          <PasswordInput label="Current password" value={pw.current} onChange={(e) => setPw((s) => ({ ...s, current: e.target.value }))} error={errors.current} autoComplete="current-password" maxLength={128} />
          <div>
            <PasswordInput label="New password" value={pw.next} onChange={(e) => setPw((s) => ({ ...s, next: e.target.value }))} error={errors.next} autoComplete="new-password" maxLength={128} />
            {pw.next && <PasswordStrength value={pw.next} />}
          </div>
          <PasswordInput label="Confirm new password" value={pw.confirm} onChange={(e) => setPw((s) => ({ ...s, confirm: e.target.value }))} error={errors.confirm} autoComplete="new-password" maxLength={128} />
          <Button variant="primary" size="sm" type="submit" icon={KeyRound} loading={change.isPending}>Update password</Button>
        </form>

        <div>
          <SectionLabel>Active sessions</SectionLabel>
          {sessions.isLoading ? (
            <div className="space-y-2">{[0, 1].map((i) => <Skeleton key={i} className="h-16" />)}</div>
          ) : sessions.isError ? (
            <p className="text-sm text-ink-3">Couldn’t load sessions. <button className="font-medium text-teal-600 hover:underline" onClick={() => sessions.refetch()}>Retry</button></p>
          ) : (
            <ul className="space-y-2">
              {list.map((s, i) => {
                const a = describeAgent(s.user_agent)
                const Icon = a.mobile ? Smartphone : Laptop
                return (
                  <li key={`${s.created_at}-${i}`} className="tile flex items-center gap-3 px-3.5 py-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-paper text-ink-3 ring-1 ring-line"><Icon className="h-4 w-4" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">{a.label}</p>
                      <p className="truncate text-xs text-ink-4">Signed in {fmtRelative(s.created_at)}{s.ip ? ` · ${s.ip}` : ''}</p>
                    </div>
                    {s.current && <Badge tone="teal" dot>This device</Badge>}
                  </li>
                )
              })}
            </ul>
          )}
          <Button variant="outline" size="sm" icon={LogOut} className="mt-4 text-rose-600" onClick={() => setConfirmAll(true)}>Sign out everywhere</Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmAll}
        onOpenChange={setConfirmAll}
        title="Sign out of every device?"
        description="Including this one. You’ll need your password to sign back in."
        confirmLabel="Sign out everywhere"
        loading={logoutAll.isPending}
        onConfirm={() => logoutAll.mutate()}
      >
        <p className="text-sm text-ink-3">Useful if you’ve lost a phone or used a shared computer.</p>
      </ConfirmDialog>
    </Card>
  )
}
