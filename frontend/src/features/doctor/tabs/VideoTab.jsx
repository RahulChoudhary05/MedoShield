import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { AlertCircle, CheckCircle2, ClipboardPen, Download, Lightbulb, Lock, Search, Stethoscope, Video } from 'lucide-react'
import { api, downloadBlob } from '../../../lib/api'
import { errorMessage, fmtDate, fmtRelative } from '../../../lib/utils'
import Button from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { Badge } from '../../../components/ui/Badge'
import { ScoreBar } from '../../../components/ui/Data'
import Dialog from '../../../components/ui/Dialog'
import { Textarea } from '../../../components/ui/Field'
import { EmptyState, ErrorState, Notice, Skeleton } from '../../../components/ui/Feedback'
import { Label, Tag } from '../shared'

const sentence = (t) => (t ? `${String(t)[0].toUpperCase()}${String(t).slice(1)}` : t)
const QUALITY = { good: 'teal', fair: 'ink', poor: 'apricot' }

export default function VideoTab({ patientId }) {
  const qc = useQueryClient()
  const historyQ = useQuery({ queryKey: ['doctor', 'video', patientId], queryFn: () => api.video.history(patientId) })
  const access = useQuery({ queryKey: ['doctor', 'video-access', patientId], queryFn: () => api.video.access(patientId) })
  const [editing, setEditing] = useState(null)
  const [notes, setNotes] = useState('')
  const [downloading, setDownloading] = useState(null)

  const review = useMutation({
    mutationFn: ({ id, text }) => api.video.review(id, text),
    onSuccess: () => {
      toast.success('Clinical notes saved. The patient has been notified.')
      setEditing(null)
      qc.invalidateQueries({ queryKey: ['doctor', 'video', patientId] })
      qc.invalidateQueries({ queryKey: ['doctor', 'overview', patientId] })
      qc.invalidateQueries({ queryKey: ['doctor', 'timeline', patientId] })
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  const pdf = async (a) => {
    setDownloading(a.id)
    try {
      const res = await api.video.pdf(a.id)
      downloadBlob(res.data, `medoshield-movement-${fmtDate(a.created_at, 'yyyy-MM-dd')}.pdf`)
    } catch (e) {
      toast.error(errorMessage(e, 'Couldn’t generate the PDF'))
    } finally {
      setDownloading(null)
    }
  }

  const openNotes = (a) => {
    setNotes(a.doctor_notes || '')
    setEditing(a)
  }

  if (historyQ.isLoading) return <div className="grid gap-6 lg:grid-cols-2"><Skeleton className="h-80 rounded-3xl" /><Skeleton className="h-80 rounded-3xl" /></div>
  if (historyQ.isError) return <ErrorState error={historyQ.error} onRetry={() => historyQ.refetch()} />
  const rows = historyQ.data?.analyses ?? []

  return (
    <div className="space-y-6">
      <h2 className="sr-only">AI video reviews</h2>
      {access.data && !access.data.is_unlocked && (
        <Notice tone="teal" icon={Lock} title="AI video review is locked">
          The patient can’t submit new videos until you switch on “Video review” in the header above.
        </Notice>
      )}

      {rows.length === 0 ? (
        <Card><EmptyState icon={Video} tone="teal" headingLevel={3} title="No video reviews yet" text="Short movement videos the patient submits are analysed by AI for gait, balance and fluidity, then land here for your notes." /></Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {rows.map((a, i) => {
            const v = a.video_analysis || {}
            return (
              <motion.article
                key={a.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i, 6) * 0.05, duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
                className="card card-pad flex flex-col"
              >
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-[1.0625rem] font-medium">{sentence(v.observed_activity) || 'Movement video'}</h3>
                    <p className="font-mono text-[0.8125rem] text-ink-3">{fmtDate(a.created_at, 'd MMM yyyy, HH:mm')} · {fmtRelative(a.created_at)}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {a.is_reviewed ? <Badge tone="teal"><CheckCircle2 aria-hidden strokeWidth={1.8} className="h-3.5 w-3.5" /> Reviewed</Badge> : <Badge tone="apricot" dot>Needs review</Badge>}
                    {v.video_quality && <Badge tone={QUALITY[v.video_quality] || 'ink'}>{v.video_quality} quality</Badge>}
                  </div>
                </div>

                <div className="grid gap-x-6 gap-y-3.5 border-t border-line pt-4 sm:grid-cols-2">
                  <ScoreBar label="Gait quality" value={v.gait_quality_score} />
                  <ScoreBar label="Balance" value={v.balance_score} />
                  <ScoreBar label="Stride consistency" value={v.stride_consistency} />
                  <ScoreBar label="Movement fluidity" value={v.movement_fluidity} />
                </div>

                {v.summary && <p className="mt-4 text-[0.9375rem] leading-relaxed text-ink-2 text-pretty">{v.summary}</p>}
                {v.posture && <p className="mt-2 text-[0.875rem] text-ink-3"><span className="font-medium text-ink-2">Posture:</span> {v.posture}</p>}

                {(v.key_findings || []).length > 0 && (
                  <Section icon={Search} title="Findings">
                    <Bullets items={v.key_findings} />
                  </Section>
                )}
                {(v.risk_areas || []).length > 0 && (
                  <Section icon={AlertCircle} title="Risk areas">
                    <div className="flex flex-wrap gap-1.5">{v.risk_areas.map((r) => <Tag key={r} tone="apricot" className="whitespace-normal">{r}</Tag>)}</div>
                  </Section>
                )}
                {(v.recommendations || []).length > 0 && (
                  <Section icon={Lightbulb} title="AI suggestions">
                    <Bullets items={v.recommendations} />
                  </Section>
                )}

                {a.doctor_notes && (
                  <div className="mt-4 rounded-xl border border-teal-100 bg-teal-50/60 px-4 py-3">
                    <p className="mb-1 flex items-center gap-1.5 font-mono text-[0.8125rem] text-teal-800"><Stethoscope aria-hidden strokeWidth={1.8} className="h-3.5 w-3.5" /> Your clinical notes</p>
                    <p className="whitespace-pre-line text-[0.9375rem] text-ink-2">{a.doctor_notes}</p>
                  </div>
                )}

                <div className="mt-auto flex flex-wrap items-center gap-2 pt-5">
                  <Button variant={a.is_reviewed ? 'outline' : 'brand'} icon={ClipboardPen} onClick={() => openNotes(a)}>
                    {a.doctor_notes ? 'Edit notes' : 'Add clinical notes'}
                  </Button>
                  <Button variant="ghost" icon={Download} loading={downloading === a.id} onClick={() => pdf(a)}>Download PDF</Button>
                  {v.source && v.source !== 'model' && <span className="font-mono text-[0.8125rem] text-ink-3">Pose-engine fallback</span>}
                </div>
              </motion.article>
            )
          })}
        </div>
      )}

      <Dialog
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        title="Clinical notes"
        description={editing ? `Video from ${fmtDate(editing.created_at, 'd MMM yyyy')}. Notes are visible to the patient and mark the review as complete.` : undefined}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)} disabled={review.isPending}>Cancel</Button>
            <Button variant="brand" loading={review.isPending} disabled={!notes.trim()} onClick={() => review.mutate({ id: editing.id, text: notes.trim() })}>Save & mark reviewed</Button>
          </>
        }
      >
        <Textarea
          label="Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={2000}
          rows={7}
          autoFocus
          placeholder="e.g. Reduced right arm swing consistent with prior visits. Continue current dose; physiotherapy gait review in 4 weeks."
          help={`${notes.length}/2000`}
        />
      </Dialog>
    </div>
  )
}

function Section({ icon, title, children }) {
  return (
    <div className="mt-4">
      <Label icon={icon} className="mb-1.5">{title}</Label>
      {children}
    </div>
  )
}

function Bullets({ items = [] }) {
  return (
    <ul className="space-y-1">
      {items.map((f, j) => (
        <li key={j} className="relative pl-4 text-[0.9375rem] text-ink-2 before:absolute before:left-0 before:top-[0.7em] before:h-px before:w-2 before:bg-ink-4">{f}</li>
      ))}
    </ul>
  )
}
