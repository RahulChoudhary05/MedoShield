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
import { Tag } from '../shared'

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

  if (historyQ.isLoading) return <div className="grid gap-5 lg:grid-cols-2"><Skeleton className="h-80 rounded-3xl" /><Skeleton className="h-80 rounded-3xl" /></div>
  if (historyQ.isError) return <ErrorState error={historyQ.error} onRetry={() => historyQ.refetch()} />
  const rows = historyQ.data?.analyses ?? []

  return (
    <div className="space-y-5">
      {access.data && !access.data.is_unlocked && (
        <Notice tone="teal" icon={Lock} title="AI video review is locked">
          The patient can’t submit new videos until you switch on “Video review” in the header above.
        </Notice>
      )}

      {rows.length === 0 ? (
        <Card><EmptyState icon={Video} tone="teal" title="No video reviews yet" text="Short movement videos the patient submits are analysed by AI for gait, balance and fluidity, then land here for your notes." /></Card>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {rows.map((a, i) => {
            const v = a.video_analysis || {}
            return (
              <motion.article
                key={a.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i, 6) * 0.05, duration: 0.45, ease: [0.2, 0.7, 0.2, 1] }}
                className="card card-pad card-interactive flex flex-col"
              >
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-[1.05rem] font-semibold">{v.observed_activity || 'Movement video'}</h3>
                    <p className="text-xs text-ink-3">{fmtDate(a.created_at, 'd MMM yyyy, HH:mm')} · {fmtRelative(a.created_at)}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {a.is_reviewed ? <Badge tone="teal"><CheckCircle2 className="h-3 w-3" /> Reviewed</Badge> : <Badge tone="teal" dot>Needs review</Badge>}
                    {v.video_quality && <Badge tone={QUALITY[v.video_quality] || 'ink'}>{v.video_quality} quality</Badge>}
                  </div>
                </div>

                <div className="grid gap-3.5 sm:grid-cols-2">
                  <ScoreBar label="Gait quality" value={v.gait_quality_score} />
                  <ScoreBar label="Balance" value={v.balance_score} />
                  <ScoreBar label="Stride consistency" value={v.stride_consistency} />
                  <ScoreBar label="Movement fluidity" value={v.movement_fluidity} />
                </div>

                {v.summary && <p className="mt-4 text-sm leading-relaxed text-ink-2 text-pretty">{v.summary}</p>}
                {v.posture && <p className="mt-2 text-xs text-ink-3"><span className="font-medium text-ink-2">Posture:</span> {v.posture}</p>}

                {(v.key_findings || []).length > 0 && (
                  <Section icon={Search} title="Findings">
                    <ul className="space-y-1">{v.key_findings.map((f, j) => <li key={j} className="text-sm text-ink-2 before:mr-2 before:text-teal-500 before:content-['•']">{f}</li>)}</ul>
                  </Section>
                )}
                {(v.risk_areas || []).length > 0 && (
                  <Section icon={AlertCircle} title="Risk areas">
                    <div className="flex flex-wrap gap-1.5">{v.risk_areas.map((r) => <Tag key={r} tone="apricot" className="whitespace-normal">{r}</Tag>)}</div>
                  </Section>
                )}
                {(v.recommendations || []).length > 0 && (
                  <Section icon={Lightbulb} title="AI suggestions">
                    <ul className="space-y-1">{v.recommendations.map((f, j) => <li key={j} className="text-sm text-ink-2 before:mr-2 before:text-apricot-400 before:content-['•']">{f}</li>)}</ul>
                  </Section>
                )}

                {a.doctor_notes && (
                  <div className="mt-4 rounded-2xl border border-teal-100 bg-teal-50/60 px-4 py-3">
                    <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-teal-700"><Stethoscope className="h-3.5 w-3.5" /> Your clinical notes</p>
                    <p className="whitespace-pre-line text-sm text-ink-2">{a.doctor_notes}</p>
                  </div>
                )}

                <div className="mt-auto flex flex-wrap gap-2 pt-5">
                  <Button size="sm" variant={a.is_reviewed ? 'outline' : 'brand'} icon={ClipboardPen} onClick={() => openNotes(a)}>
                    {a.doctor_notes ? 'Edit notes' : 'Add clinical notes'}
                  </Button>
                  <Button size="sm" variant="ghost" icon={Download} loading={downloading === a.id} onClick={() => pdf(a)}>PDF report</Button>
                  {v.source && v.source !== 'model' && <span className="self-center text-[0.7rem] text-ink-4">Pose-engine fallback</span>}
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
            <Button variant="ghost" size="sm" onClick={() => setEditing(null)} disabled={review.isPending}>Cancel</Button>
            <Button variant="brand" size="sm" loading={review.isPending} disabled={!notes.trim()} onClick={() => review.mutate({ id: editing.id, text: notes.trim() })}>Save & mark reviewed</Button>
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

function Section({ icon: Icon, title, children }) {
  return (
    <div className="mt-4">
      <p className="mb-1.5 flex items-center gap-1.5 text-[0.7rem] font-semibold uppercase tracking-[.12em] text-ink-4"><Icon className="h-3 w-3" /> {title}</p>
      {children}
    </div>
  )
}
