import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { AnimatePresence, motion } from 'framer-motion'
import { AlarmClock, CalendarRange, Check, Clock3, Pill, Plus, Stethoscope, Trash2, UserRound, X } from 'lucide-react'
import { api } from '../../../lib/api'
import { cn, errorMessage, fmtDate } from '../../../lib/utils'
import Button from '../../../components/ui/Button'
import { Card, CardHeader } from '../../../components/ui/Card'
import { ScoreRing } from '../../../components/ui/Data'
import { EmptyState, ErrorState, Skeleton } from '../../../components/ui/Feedback'
import { ConfirmDialog, Tag } from '../shared'
import PrescribeDialog from '../PrescribeDialog'

export default function MedsTab({ patientId, patientName }) {
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['doctor', 'meds', patientId], queryFn: () => api.meds.plan(patientId) })
  const [prescribing, setPrescribing] = useState(false)
  const [removing, setRemoving] = useState(null)

  const remove = useMutation({
    mutationFn: (name) => api.meds.remove(name, patientId),
    onSuccess: (_, name) => {
      toast.success(`${name} removed from the plan`)
      setRemoving(null)
      ;['meds', 'overview'].forEach((k) => qc.invalidateQueries({ queryKey: ['doctor', k, patientId] }))
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  if (q.isLoading) return <div className="grid gap-5 lg:grid-cols-[320px_1fr]"><Skeleton className="h-72 rounded-3xl" /><Skeleton className="h-72 rounded-3xl" /></div>
  if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} />

  const plan = q.data || {}
  const meds = plan.medications || []
  const schedule = Object.entries(plan.schedule || {})
  const today = plan.today || []
  const statusOf = (name, slot) => today.find((l) => l.medication_name === name && l.time_slot === slot)?.status
  const adh = plan.adherence_14d

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        <Card className="flex flex-col items-center text-center">
          <p className="self-start text-xs font-semibold uppercase tracking-[.14em] text-ink-4">14-day adherence</p>
          <ScoreRing value={adh} size={150} stroke={12} color={adh == null ? '#A39B8E' : adh >= 80 ? '#4A7C64' : adh >= 50 ? '#C9A845' : '#B8513F'} label="% taken" className="my-4" />
          <p className="text-sm text-ink-3 text-pretty">
            {adh == null ? 'Adherence is calculated once the plan has scheduled doses.' : adh >= 80 ? 'Taking medicines consistently.' : adh >= 50 ? 'Some doses are being missed — worth a gentle check-in.' : 'Many doses are being missed. Consider discussing barriers.'}
          </p>
          <Button variant="brand" size="sm" icon={Plus} className="mt-5" onClick={() => setPrescribing(true)}>Prescribe</Button>
        </Card>

        <Card>
          <CardHeader icon={AlarmClock} tone="teal" title="Today’s schedule" subtitle={schedule.length ? `${today.filter((t) => t.status !== 'skipped').length} doses logged today` : 'No reminders set'} />
          {schedule.length ? (
            <ol className="relative space-y-3 before:absolute before:bottom-2 before:left-[1.65rem] before:top-2 before:w-px before:bg-line">
              {schedule.map(([slot, names]) => (
                <li key={slot} className="relative flex items-start gap-4">
                  <span className="num relative z-10 w-[3.3rem] shrink-0 rounded-full bg-paper py-1 text-center text-xs font-semibold text-ink ring-1 ring-line">{slot}</span>
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {names.map((n) => {
                      const st = statusOf(n, slot)
                      return (
                        <span key={n} className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium', st === 'taken' ? 'bg-teal-50 text-teal-700' : st === 'skipped' ? 'bg-apricot-50 text-apricot-600' : 'bg-cream text-ink-2 ring-1 ring-inset ring-line')}>
                          {st === 'taken' ? <Check className="h-3 w-3" /> : st === 'skipped' ? <X className="h-3 w-3" /> : <Clock3 className="h-3 w-3 text-ink-4" />}
                          {n}
                          <span className="sr-only">{st ? `, ${st}` : ', not logged yet'}</span>
                        </span>
                      )
                    })}
                  </div>
                </li>
              ))}
            </ol>
          ) : <p className="text-sm text-ink-4">Reminder times appear here once medicines are added.</p>}
        </Card>
      </div>

      {meds.length === 0 ? (
        <Card>
          <EmptyState icon={Pill} tone="apricot" title="No medicines in the plan" text={`Prescribe a medicine and ${patientName} gets reminders at the times you set, with adherence tracked here.`} action={<Button variant="brand" size="sm" icon={Plus} onClick={() => setPrescribing(true)}>Prescribe</Button>} />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <AnimatePresence initial={false}>
            {meds.map((m) => (
              <motion.article key={m.name} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }} className="card card-pad card-interactive">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl icon-tile icon-teal"><Pill className="h-5 w-5" /></span>
                    <div className="min-w-0">
                      <h3 className="truncate text-[1.02rem] font-semibold">{m.name}</h3>
                      <p className="text-sm text-ink-3">{[m.dosage, m.frequency].filter(Boolean).join(' · ')}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-ink-4 hover:bg-apricot-50 hover:text-apricot-600" onClick={() => setRemoving(m)} aria-label={`Remove ${m.name}`}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {(m.time_slots || []).map((s) => <span key={s} className="num inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-medium text-teal-700"><Clock3 className="h-3 w-3" />{s}</span>)}
                  {m.duration_days && <span className="inline-flex items-center gap-1 rounded-full bg-cream px-2.5 py-0.5 text-xs text-ink-2 ring-1 ring-inset ring-line"><CalendarRange className="h-3 w-3" />{m.duration_days} days</span>}
                </div>
                {m.instructions && <p className="mt-3 text-sm text-ink-2 text-pretty">{m.instructions}</p>}
                {(m.side_effects || []).length > 0 && (
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-ink-4">Watch for</span>
                    {m.side_effects.map((s) => <Tag key={s} tone="teal">{s}</Tag>)}
                  </div>
                )}
                <p className="mt-4 flex items-center gap-1.5 border-t border-line/70 pt-3 text-xs text-ink-4">
                  {m.added_by === 'doctor' ? <Stethoscope className="h-3 w-3" /> : <UserRound className="h-3 w-3" />}
                  {m.added_by === 'doctor' ? `Prescribed by ${m.added_by_name || 'a doctor'}` : 'Added by the patient'}
                  {m.added_at && <> · {fmtDate(m.added_at)}</>}
                </p>
              </motion.article>
            ))}
          </AnimatePresence>
        </div>
      )}

      <PrescribeDialog open={prescribing} onOpenChange={setPrescribing} patientId={patientId} patientName={patientName} existing={meds} />
      <ConfirmDialog
        open={!!removing}
        onOpenChange={(o) => !o && setRemoving(null)}
        tone="danger"
        title={`Remove ${removing?.name || 'medicine'}?`}
        description="It will be taken off the patient’s plan and reminders stop immediately. Past adherence logs are kept."
        confirmLabel="Remove"
        loading={remove.isPending}
        onConfirm={() => remove.mutate(removing.name)}
      />
    </div>
  )
}
