import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { AnimatePresence, motion } from 'framer-motion'
import { CalendarRange, Check, Clock3, Pill, Plus, Stethoscope, Trash2, UserRound, X } from 'lucide-react'
import { api } from '../../../lib/api'
import { cn, errorMessage, fmtDate } from '../../../lib/utils'
import Button from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { ScoreRing, scoreHex } from '../../../components/ui/Data'
import { EmptyState, ErrorState, Skeleton } from '../../../components/ui/Feedback'
import { ConfirmDialog, Head, Label, Tag } from '../shared'
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

  if (q.isLoading) return <div className="grid gap-6 lg:grid-cols-[320px_1fr]"><Skeleton className="h-72 rounded-3xl" /><Skeleton className="h-72 rounded-3xl" /></div>
  if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} />

  const plan = q.data || {}
  const meds = plan.medications || []
  const schedule = Object.entries(plan.schedule || {})
  const today = plan.today || []
  const statusOf = (name, slot) => today.find((l) => l.medication_name === name && l.time_slot === slot)?.status
  const adh = plan.adherence_14d

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        <Card className="flex flex-col items-center text-center">
          <h2 className="self-start text-[1.0625rem] font-medium text-ink">14-day adherence</h2>
          <ScoreRing value={adh} size={150} stroke={10} color={scoreHex(adh == null ? null : adh >= 80 ? 80 : adh >= 50 ? 50 : 0)} label="% taken" className="my-5" />
          <p className="text-[0.9375rem] text-ink-3 text-pretty">
            {adh == null ? 'Adherence is calculated once the plan has scheduled doses.' : adh >= 80 ? 'Taking medicines consistently.' : adh >= 50 ? 'Some doses are being missed — worth a gentle check-in.' : 'Many doses are being missed. Consider discussing barriers.'}
          </p>
          <Button variant="brand" icon={Plus} className="mt-5" onClick={() => setPrescribing(true)}>Prescribe a medicine</Button>
        </Card>

        <Card>
          <Head title="Today’s schedule" subtitle={schedule.length ? `${today.filter((t) => t.status !== 'skipped').length} doses logged today` : 'No reminders set'} />
          {schedule.length ? (
            <ol className="divide-y divide-line border-y border-line">
              {schedule.map(([slot, names]) => (
                <li key={slot} className="flex items-start gap-4 py-3">
                  <span className="num w-14 shrink-0 pt-0.5 font-mono text-[0.9375rem] text-ink">{slot}</span>
                  <div className="flex flex-wrap gap-1.5">
                    {names.map((n) => {
                      const st = statusOf(n, slot)
                      return (
                        <span key={n} className={cn('badge ring-1 ring-inset', st === 'taken' ? 'bg-teal-50 text-teal-800 ring-teal-100' : st === 'skipped' ? 'bg-apricot-50 text-apricot-600 ring-apricot-100' : 'bg-paper text-ink-2 ring-line')}>
                          {st === 'taken' ? <Check aria-hidden strokeWidth={1.8} className="h-3.5 w-3.5" /> : st === 'skipped' ? <X aria-hidden strokeWidth={1.8} className="h-3.5 w-3.5" /> : <Clock3 aria-hidden strokeWidth={1.8} className="h-3.5 w-3.5 text-ink-4" />}
                          {n}
                          <span className="sr-only">{st ? `, ${st}` : ', not logged yet'}</span>
                        </span>
                      )
                    })}
                  </div>
                </li>
              ))}
            </ol>
          ) : <p className="text-[0.9375rem] text-ink-3">Reminder times appear here once medicines are added.</p>}
        </Card>
      </div>

      {meds.length === 0 ? (
        <Card>
          <EmptyState icon={Pill} tone="ink" headingLevel={2} title="No medicines in the plan" text={`Prescribe a medicine and ${patientName} gets reminders at the times you set, with adherence tracked here.`} action={<Button variant="brand" icon={Plus} onClick={() => setPrescribing(true)}>Prescribe a medicine</Button>} />
        </Card>
      ) : (
        <section aria-labelledby="meds-plan-title">
        <h2 id="meds-plan-title" className="kicker mb-3">Current plan · {meds.length} {meds.length === 1 ? 'medicine' : 'medicines'}</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <AnimatePresence initial={false}>
            {meds.map((m) => (
              <motion.article key={m.name} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }} className="card card-pad">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-cream text-ink-2 ring-1 ring-inset ring-line"><Pill aria-hidden strokeWidth={1.8} className="h-[18px] w-[18px]" /></span>
                    <div className="min-w-0">
                      <h3 className="truncate text-[1.0625rem] font-medium">{m.name}</h3>
                      <p className="font-mono text-[0.8125rem] text-ink-3">{[m.dosage, m.frequency].filter(Boolean).join(' · ')}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="-mr-2 -mt-1 h-11 w-11 shrink-0 text-ink-3 hover:bg-rose-50 hover:text-rose-600" onClick={() => setRemoving(m)} aria-label={`Remove ${m.name}`}>
                    <Trash2 className="h-4 w-4" strokeWidth={1.8} />
                  </Button>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {(m.time_slots || []).map((s) => <Tag key={s} tone="teal" className="num gap-1"><Clock3 aria-hidden strokeWidth={1.8} className="h-3.5 w-3.5" />{s}</Tag>)}
                  {m.duration_days && <Tag tone="ink" className="gap-1"><CalendarRange aria-hidden strokeWidth={1.8} className="h-3.5 w-3.5" />{m.duration_days} days</Tag>}
                </div>
                {m.instructions && <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-2 text-pretty">{m.instructions}</p>}
                {(m.side_effects || []).length > 0 && (
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <Label as="span">Watch for</Label>
                    {m.side_effects.map((s) => <Tag key={s} tone="apricot">{s}</Tag>)}
                  </div>
                )}
                <p className="mt-4 flex items-center gap-1.5 border-t border-line pt-3 text-[0.8125rem] text-ink-3">
                  {m.added_by === 'doctor' ? <Stethoscope aria-hidden strokeWidth={1.8} className="h-3.5 w-3.5" /> : <UserRound aria-hidden strokeWidth={1.8} className="h-3.5 w-3.5" />}
                  {m.added_by === 'doctor' ? `Prescribed by ${m.added_by_name || 'a doctor'}` : 'Added by the patient'}
                  {m.added_at && <> · {fmtDate(m.added_at)}</>}
                </p>
              </motion.article>
            ))}
          </AnimatePresence>
        </div>
        </section>
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
