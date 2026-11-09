import { useSearchParams } from 'react-router-dom'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { BellOff, BellRing, Pill, Plus } from 'lucide-react'
import { api } from '../../lib/api'
import { errorMessage } from '../../lib/utils'
import Button from '../../components/ui/Button'
import { CountUp, PageHeader, Stagger, StaggerItem } from '../../components/ui/motion'
import TodaySchedule, { buildDoses } from '../../features/care/meds/TodaySchedule'
import MedCard from '../../features/care/meds/MedCard'
import AddMedDialog from '../../features/care/meds/AddMedDialog'
import GuidancePanel from '../../features/care/meds/GuidancePanel'
import { ConfirmDialog } from '../../features/care/shared'
import { Empty, InlineError, Section, SkeletonRows } from '../../features/care/kit'
import useNotify from '../../features/care/useNotify'

function adherenceCopy(v) {
  if (v == null) return 'Log a few doses and your adherence will show here.'
  if (v >= 90) return 'Wonderful consistency. Steady timing really helps motor symptoms.'
  if (v >= 70) return 'Good going — a few missed doses. Reminders can help close the gap.'
  return 'Doses are being missed often. Reminders, a pill box, or a chat with your doctor may help.'
}

export default function Medications() {
  const qc = useQueryClient()
  const [params, setParams] = useSearchParams()
  const [adding, setAddingState] = useState(() => params.get('add') === '1')
  // `?add=1` (from the command palette) opens the dialog; closing it cleans the URL.
  const setAdding = (v) => {
    setAddingState(v)
    if (!v && params.has('add')) setParams((p) => { const n = new URLSearchParams(p); n.delete('add'); return n }, { replace: true })
  }
  const [removing, setRemoving] = useState(null)
  const { perm, request } = useNotify()
  const plan = useQuery({ queryKey: ['meds', 'plan', 'self'], queryFn: () => api.meds.plan() })

  const remove = useMutation({
    mutationFn: (name) => api.meds.remove(name),
    onSuccess: (_, name) => {
      toast.success(`${name} removed`)
      setRemoving(null)
      qc.invalidateQueries({ queryKey: ['meds'] })
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  const p = plan.data
  const meds = p?.medications || []
  const doses = buildDoses(p).flatMap((g) => g.items)
  const done = doses.filter((d) => d.status === 'taken').length
  const adherence = p?.adherence_14d

  const reminderBtn =
    perm === 'granted' ? (
      <span className="inline-flex h-11 items-center gap-2 rounded-lg border border-teal-100 bg-teal-50 px-3.5 text-[0.9375rem] text-teal-700"><BellRing className="h-4 w-4" strokeWidth={1.8} aria-hidden /> Reminders on</span>
    ) : perm === 'denied' ? (
      <span className="inline-flex h-11 items-center gap-2 rounded-lg border border-line bg-cream px-3.5 text-[0.9375rem] text-ink-3"><BellOff className="h-4 w-4" strokeWidth={1.8} aria-hidden /> Notifications blocked</span>
    ) : perm === 'unsupported' ? null : (
      <Button variant="outline" icon={BellRing} onClick={request}>Turn on reminders</Button>
    )

  return (
    <div>
      <PageHeader
       
        title="Your"
        accent="medicines"
        description="Today’s doses, reminders and safe over-the-counter guidance in one place."
        actions={<>{reminderBtn}<Button variant="brand" icon={Plus} onClick={() => setAdding(true)}>Add medicine</Button></>}
      />

      {plan.isError ? (
        <InlineError error={plan.error} onRetry={plan.refetch} />
      ) : (
        <Stagger className="space-y-5">
          <StaggerItem>
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
              <Section
                kicker={new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
                title="Today’s doses"
                action={doses.length > 0 && <span className="font-mono text-[0.8125rem] text-ink-3"><span className="num text-ink">{done}</span>/<span className="num">{doses.length}</span> taken</span>}
              >
                {plan.isLoading ? (
                  <SkeletonRows rows={3} rowClassName="h-16" />
                ) : doses.length === 0 ? (
                  <Empty icon={Pill} text="Add a medicine and its times — your day appears here as a timeline." action={<Button variant="outline" icon={Plus} onClick={() => setAdding(true)}>Add your first medicine</Button>} />
                ) : (
                  <TodaySchedule plan={p} />
                )}
              </Section>

              <Section kicker="Last 14 days" title="Adherence" className="h-full">
                {plan.isLoading ? (
                  <SkeletonRows rows={2} rowClassName="h-20" />
                ) : (
                  <div aria-live="polite">
                    <p className="kicker">Doses taken on time</p>
                    <p className="mt-2 flex items-baseline gap-1 leading-none">
                      {adherence == null ? <span className="num text-[3rem] text-ink-3">—</span> : <CountUp value={adherence} className="text-[3rem] text-ink" />}
                      {adherence != null && <span className="font-mono text-[0.9375rem] text-ink-3">%</span>}
                    </p>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-cream" aria-hidden>
                      <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${Math.max(0, Math.min(100, adherence || 0))}%`, background: adherence != null && adherence < 70 ? '#D9522A' : '#1D3AA6' }} />
                    </div>
                    <p className="mt-4 text-[0.9375rem] text-ink-2">{adherenceCopy(adherence)}</p>
                    <dl className="mt-5 grid grid-cols-2 gap-6 border-t border-line pt-4">
                      <div><dt className="kicker">Medicines</dt><dd className="num mt-1 text-[1.5rem] text-ink">{meds.length}</dd></div>
                      <div><dt className="kicker">Doses today</dt><dd className="num mt-1 text-[1.5rem] text-ink">{doses.length}</dd></div>
                    </dl>
                  </div>
                )}
              </Section>
            </div>
          </StaggerItem>

          <StaggerItem>
            <Section kicker={meds.length ? `${meds.length} item${meds.length === 1 ? '' : 's'}` : 'Empty'} title="Medicine cabinet" description="Prescriptions from your doctor are locked so they stay accurate.">
              {plan.isLoading ? (
                <SkeletonRows rows={3} rowClassName="h-20" />
              ) : meds.length === 0 ? (
                <Empty icon={Pill} text="Medicines you add — or your doctor prescribes — show up here." action={<Button variant="outline" icon={Plus} onClick={() => setAdding(true)}>Add a medicine</Button>} />
              ) : (
                <ul className="-my-1 divide-y divide-line">
                  <AnimatePresence initial={false}>
                    {meds.map((m, i) => <MedCard key={m.name} m={m} index={i} onRemove={setRemoving} />)}
                  </AnimatePresence>
                </ul>
              )}
            </Section>
          </StaggerItem>

          <StaggerItem>
            <GuidancePanel />
          </StaggerItem>
        </Stagger>
      )}

      <AddMedDialog open={adding} onOpenChange={setAdding} />
      <ConfirmDialog
        open={!!removing}
        onOpenChange={(o) => !o && setRemoving(null)}
        title={`Remove ${removing?.name || 'medicine'}?`}
        description="Reminders for it will stop. Your past dose history is kept."
        confirmLabel="Remove medicine"
        loading={remove.isPending}
        onConfirm={() => remove.mutate(removing.name)}
      />
    </div>
  )
}
