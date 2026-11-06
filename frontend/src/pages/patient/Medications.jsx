import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { BellOff, BellRing, CalendarCheck2, CheckCircle2, Pill, Plus } from 'lucide-react'
import { api } from '../../lib/api'
import { errorMessage } from '../../lib/utils'
import { PageHeader, ScoreRing } from '../../components/ui/Data'
import { Card, CardHeader } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/Feedback'
import { Stagger, StaggerItem } from '../../components/ui/motion'
import TodaySchedule, { buildDoses } from '../../features/care/meds/TodaySchedule'
import MedCard from '../../features/care/meds/MedCard'
import AddMedDialog from '../../features/care/meds/AddMedDialog'
import GuidancePanel from '../../features/care/meds/GuidancePanel'
import { ConfirmDialog } from '../../features/care/shared'
import useNotify from '../../features/care/useNotify'

function adherenceCopy(v) {
  if (v == null) return 'Log a few doses and your adherence will show here.'
  if (v >= 90) return 'Wonderful consistency. Steady timing really helps motor symptoms.'
  if (v >= 70) return 'Good going — a few missed doses. Reminders can help close the gap.'
  return 'Doses are being missed often. Reminders, a pill box, or a chat with your doctor may help.'
}

export default function Medications() {
  const qc = useQueryClient()
  const [adding, setAdding] = useState(false)
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

  const reminderBtn =
    perm === 'granted' ? (
      <Badge tone="teal" className="h-9 px-3.5 text-sm"><BellRing className="h-4 w-4" /> Reminders on</Badge>
    ) : perm === 'denied' ? (
      <Badge tone="ink" className="h-9 px-3.5 text-sm"><BellOff className="h-4 w-4" /> Notifications blocked</Badge>
    ) : perm === 'unsupported' ? null : (
      <Button variant="outline" size="md" icon={BellRing} onClick={request}>Enable reminders</Button>
    )

  return (
    <div>
      <PageHeader
        eyebrow="Care"
        title="Your"
        accent="medicines"
        subtitle="Today’s doses, gentle reminders and safe guidance — all in one calm place."
        actions={<>{reminderBtn}<Button variant="brand" icon={Plus} onClick={() => setAdding(true)}>Add medicine</Button></>}
      />

      {plan.isError ? (
        <ErrorState error={plan.error} onRetry={plan.refetch} />
      ) : (
        <Stagger className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
            <StaggerItem>
              <Card className="h-full">
                <CardHeader icon={CalendarCheck2} title="Today" subtitle={new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
                  action={doses.length > 0 && <Badge tone={done === doses.length ? 'teal' : 'ink'}>{done}/{doses.length} taken</Badge>} />
                {plan.isLoading ? (
                  <div className="space-y-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-20" />)}</div>
                ) : doses.length === 0 ? (
                  <EmptyState icon={Pill} title="No doses scheduled" text="Add a medicine and its times — your day will appear here as a simple timeline." action={<Button variant="soft" size="sm" icon={Plus} onClick={() => setAdding(true)}>Add your first medicine</Button>} />
                ) : (
                  <TodaySchedule plan={p} />
                )}
              </Card>
            </StaggerItem>

            <StaggerItem>
              <Card className="card-tint-teal relative h-full overflow-hidden">
                <CardHeader icon={CheckCircle2} title="Adherence" subtitle="Last 14 days" />
                {plan.isLoading ? (
                  <Skeleton className="mx-auto h-40 w-40 rounded-full" />
                ) : (
                  <div className="flex flex-col items-center text-center">
                    <ScoreRing value={p?.adherence_14d} size={156} label="On time" color={p?.adherence_14d != null && p.adherence_14d < 70 ? '#C06D48' : '#3A6652'} />
                    <p className="mt-4 max-w-xs text-sm text-ink-3 text-pretty">{adherenceCopy(p?.adherence_14d)}</p>
                    <div className="mt-5 grid w-full grid-cols-2 gap-3">
                      <div className="tile bg-paper/80 p-3"><p className="num text-teal-700 text-2xl font-semibold">{meds.length}</p><p className="text-xs text-ink-3">Medicines</p></div>
                      <div className="tile bg-paper/80 p-3"><p className="num text-apricot-500 text-2xl font-semibold">{doses.length}</p><p className="text-xs text-ink-3">Doses today</p></div>
                    </div>
                  </div>
                )}
              </Card>
            </StaggerItem>
          </div>

          <StaggerItem>
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">Medicine cabinet</h2>
                <p className="text-sm text-ink-3">Prescriptions from your doctor are locked so they stay accurate.</p>
              </div>
            </div>
            {plan.isLoading ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-52 rounded-3xl" />)}</div>
            ) : meds.length === 0 ? (
              <Card><EmptyState icon={Pill} tone="apricot" title="Your cabinet is empty" text="Medicines you add — or your doctor prescribes — will show up here." /></Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <AnimatePresence>
                  {meds.map((m, i) => <MedCard key={m.name} m={m} index={i} onRemove={setRemoving} />)}
                </AnimatePresence>
              </div>
            )}
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
        confirmLabel="Remove"
        loading={remove.isPending}
        onConfirm={() => remove.mutate(removing.name)}
      />
    </div>
  )
}
