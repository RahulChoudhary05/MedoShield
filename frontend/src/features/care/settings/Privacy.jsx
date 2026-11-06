import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Bell, Download, Lock, Trash2 } from 'lucide-react'
import { Card, CardHeader } from '../../../components/ui/Card'
import Button from '../../../components/ui/Button'
import Dialog from '../../../components/ui/Dialog'
import { PasswordInput } from '../../../components/ui/Field'
import { Notice } from '../../../components/ui/Feedback'
import { api, downloadBlob } from '../../../lib/api'
import { cn, errorMessage } from '../../../lib/utils'
import { useAuth } from '../../../store/auth'
import useNotify from '../useNotify'

function Row({ icon: Icon, title, text, children, tone = 'bg-cream text-ink-2' }) {
  return (
    <div className="flex flex-col gap-4 py-5 first:pt-0 last:pb-0 sm:flex-row sm:items-center">
      <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-2xl', tone)}><Icon className="h-5 w-5" /></span>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-ink">{title}</p>
        <p className="text-sm text-ink-3 text-pretty">{text}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

export function NotificationsCard() {
  const { perm, request } = useNotify()
  const on = perm === 'granted'
  return (
    <Card id="notifications" as="section" className="scroll-mt-24">
      <CardHeader icon={Bell} tone="apricot" title="Notifications" subtitle="Medicine reminders on this device" />
      <div className="flex items-center gap-4">
        <p className="flex-1 text-sm text-ink-3">
          {perm === 'unsupported'
            ? 'This browser doesn’t support notifications. You’ll still see reminders inside MedoShield.'
            : perm === 'denied'
              ? 'Notifications are blocked. Allow them in your browser’s site settings, then come back.'
              : on
                ? 'Reminders are on. To turn them off, use your browser’s site settings.'
                : 'Get a gentle nudge when a dose is due, even if MedoShield is in another tab.'}
        </p>
        <button
          role="switch"
          aria-checked={on}
          aria-label="Browser notifications"
          disabled={perm !== 'default'}
          onClick={request}
          className={cn('relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed', on ? 'bg-teal-500' : 'bg-line', perm === 'default' && 'hover:bg-ink-4/40')}
        >
          <motion.span layout transition={{ type: 'spring', stiffness: 500, damping: 32 }} className={cn('absolute top-1 h-5 w-5 rounded-full bg-white shadow-soft', on ? 'right-1' : 'left-1')} />
        </button>
      </div>
    </Card>
  )
}

export default function Privacy() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [ack, setAck] = useState(false)

  const exportData = useMutation({
    mutationFn: () => api.patient.exportData(),
    onSuccess: (res) => {
      downloadBlob(res.data, `medoshield-my-data-${new Date().toISOString().slice(0, 10)}.json`)
      toast.success('Your data is downloading')
    },
    onError: (err) => toast.error(errorMessage(err, 'Couldn’t prepare your export.')),
  })

  const del = useMutation({
    mutationFn: () => api.patient.deleteAccount(password),
    onSuccess: () => {
      toast.success('Your account and data have been deleted. Take care.')
      useAuth.getState().clear()
      qc.clear()
      navigate('/', { replace: true })
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  function close(o) {
    setOpen(o)
    if (!o) {
      setPassword('')
      setAck(false)
    }
  }

  return (
    <Card id="privacy" as="section" className="scroll-mt-24">
      <CardHeader icon={Lock} tone="teal" title="Privacy & data" subtitle="Your health data belongs to you" />
      <div className="divide-y divide-line/70">
        <Row icon={Download} tone="bg-teal-50 text-teal-600" title="Download my data" text="Everything we store about you — checks, reports, messages, logs — as a single JSON file.">
          <Button variant="outline" size="sm" icon={Download} loading={exportData.isPending} onClick={() => exportData.mutate()}>Download</Button>
        </Row>
        <Row icon={Trash2} tone="bg-rose-50 text-rose-500" title="Delete my account" text="Permanently erase your account and all health data. Your doctors lose access immediately.">
          <Button variant="ghost" size="sm" className="text-rose-600 hover:bg-rose-50 hover:text-rose-600" icon={Trash2} onClick={() => setOpen(true)}>Delete account</Button>
        </Row>
      </div>

      <Dialog
        open={open}
        onOpenChange={close}
        title="Delete your account?"
        description="This permanently removes your account and all your health data."
        size="sm"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => close(false)}>Keep my account</Button>
            <Button variant="danger" size="sm" type="submit" form="delete-form" loading={del.isPending} disabled={!password || !ack}>Delete forever</Button>
          </>
        }
      >
        <form id="delete-form" onSubmit={(e) => { e.preventDefault(); if (password && ack) del.mutate() }} className="space-y-4">
          <Notice tone="danger" icon={Trash2}>Movement checks, reports, medicines, messages and appointments will all be erased. This can’t be undone.</Notice>
          <p className="text-sm text-ink-3">Tip: download your data first if you’d like a copy.</p>
          <PasswordInput label="Confirm with your password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" maxLength={128} />
          <label className="flex cursor-pointer items-start gap-2.5 text-sm text-ink-2">
            <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="mt-0.5 h-4 w-4 accent-rose-500" />
            I understand my data cannot be recovered.
          </label>
        </form>
      </Dialog>
    </Card>
  )
}
