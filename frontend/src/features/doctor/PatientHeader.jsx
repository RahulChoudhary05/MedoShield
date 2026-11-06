import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { AlertTriangle, ArrowLeft, Lock, LogOut, Mail, MessageSquare, Pill, Sparkles, Unlock } from 'lucide-react'
import { api } from '../../lib/api'
import { errorMessage } from '../../lib/utils'
import Button from '../../components/ui/Button'
import { Avatar } from '../../components/ui/Data'
import { RiskBadge } from '../../components/ui/Badge'
import { ConfirmDialog, Tag, levelOf, patientMeta } from './shared'
import SummaryDialog from './SummaryDialog'

export default function PatientHeader({ patient, latestRisk, patientId }) {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [videoConfirm, setVideoConfirm] = useState(false)
  const [endConfirm, setEndConfirm] = useState(false)

  const access = useQuery({ queryKey: ['doctor', 'video-access', patientId], queryFn: () => api.video.access(patientId) })
  const unlocked = !!access.data?.is_unlocked

  const toggleVideo = useMutation({
    mutationFn: () => (unlocked ? api.video.lock(patientId) : api.video.unlock(patientId)),
    onSuccess: (r) => {
      toast.success(r.is_unlocked ? `AI video review unlocked for ${patient.first_name || patient.full_name}` : 'AI video review locked')
      setVideoConfirm(false)
      qc.invalidateQueries({ queryKey: ['doctor', 'video-access', patientId] })
      qc.invalidateQueries({ queryKey: ['doctor', 'patients'] })
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  const discharge = useMutation({
    mutationFn: () => api.doctors.discharge(patientId),
    onSuccess: () => {
      toast.success(`Care link with ${patient.full_name} ended`)
      qc.invalidateQueries({ queryKey: ['doctor'] })
      navigate('/doctor/patients', { replace: true })
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  const meds = patient.current_medications || []
  return (
    <header className="card mb-6 overflow-hidden">
      {/* Quiet tonal band with a faint trace line */}
      <div className="card-tint-teal relative h-20 overflow-hidden border-b border-line/60 sm:h-24">
        <svg aria-hidden viewBox="0 0 600 120" preserveAspectRatio="none" className="absolute inset-x-0 bottom-2 h-12 w-full text-teal-200">
          <path d="M0 70 L120 70 L140 48 L160 92 L180 34 L200 80 L220 70 L380 70 L395 58 L410 84 L425 70 L600 70" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
        <Button variant="ghost" size="sm" icon={ArrowLeft} to="/doctor/patients" className="absolute left-2 top-2 sm:left-3">All patients</Button>
      </div>

      <div className="relative card-pad pt-0 sm:pt-0">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex min-w-0 items-end gap-4">
            <motion.div className="-mt-8 shrink-0 rounded-full bg-paper p-1 shadow-soft" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 22 }}>
              <Avatar name={patient.full_name} size={80} />
            </motion.div>
            <div className="min-w-0 pt-3">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-[1.75rem] font-semibold leading-tight sm:text-[2.1rem]">{patient.full_name}</h1>
                <RiskBadge level={levelOf(latestRisk)} pulse />
              </div>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-3">
                <span>{patientMeta(patient) || 'Age and gender not shared'}</span>
                {patient.email && (
                  <a href={`mailto:${patient.email}`} className="inline-flex min-w-0 items-center gap-1 hover:text-teal-700">
                    <Mail className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{patient.email}</span>
                  </a>
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" icon={MessageSquare} to={`/doctor/messages/${patientId}`}>Message</Button>
            <Button variant="primary" size="sm" icon={Sparkles} onClick={() => setSummaryOpen(true)}>AI summary</Button>
            <Button
              variant={unlocked ? 'soft' : 'outline'}
              size="sm"
              icon={unlocked ? Unlock : Lock}
              disabled={access.isLoading}
              onClick={() => setVideoConfirm(true)}
              aria-pressed={unlocked}
              title={unlocked ? 'AI video review is enabled for this patient' : 'AI video review is locked'}
            >
              {access.isLoading ? 'Video review…' : unlocked ? 'Video review on' : 'Video review off'}
            </Button>
            <Button variant="ghost" size="sm" icon={LogOut} onClick={() => setEndConfirm(true)} className="text-rose-600 hover:bg-rose-50 hover:text-rose-600">End care</Button>
          </div>
        </div>

        <dl className="mt-5 grid gap-3 border-t border-line/70 pt-5 sm:grid-cols-3">
          <TagGroup label="Conditions" items={patient.conditions} tone="teal" empty="None recorded" />
          <TagGroup label="Allergies" items={patient.allergies} tone="teal" empty="No known allergies" icon={AlertTriangle} />
          <TagGroup label="Self-reported medicines" items={meds} tone="ink" empty="None listed" icon={Pill} />
        </dl>
        {patient.medical_history && (
          <p className="mt-4 rounded-2xl bg-cream px-4 py-3 text-sm text-ink-2 text-pretty">
            <span className="font-medium text-ink">History · </span>{patient.medical_history}
          </p>
        )}
      </div>

      <SummaryDialog open={summaryOpen} onOpenChange={setSummaryOpen} patientId={patientId} name={patient.full_name} />

      <ConfirmDialog
        open={videoConfirm}
        onOpenChange={setVideoConfirm}
        title={unlocked ? 'Lock AI video review?' : 'Unlock AI video review?'}
        description={
          unlocked
            ? `${patient.full_name} won’t be able to submit new movement videos for AI review. Existing reviews stay in their chart.`
            : `${patient.full_name} will be able to upload short movement videos for an AI gait and balance review. Videos are analysed in memory and never stored — you’ll be notified when one arrives.`
        }
        confirmLabel={unlocked ? 'Lock review' : 'Unlock review'}
        loading={toggleVideo.isPending}
        onConfirm={() => toggleVideo.mutate()}
      />

      <ConfirmDialog
        open={endConfirm}
        onOpenChange={setEndConfirm}
        tone="danger"
        title="End care for this patient?"
        description={`${patient.full_name} will be removed from your panel and you’ll lose access to their records. They’ll be notified, and can send you a new request later.`}
        confirmLabel="End care"
        loading={discharge.isPending}
        onConfirm={() => discharge.mutate()}
      />
    </header>
  )
}

function TagGroup({ label, items = [], tone, empty, icon: Icon }) {
  return (
    <div className="min-w-0">
      <dt className="mb-1.5 flex items-center gap-1.5 text-[0.7rem] font-semibold uppercase tracking-[.12em] text-ink-4">
        {Icon && <Icon className="h-3 w-3" />} {label}
      </dt>
      <dd className="flex flex-wrap gap-1.5">
        {items.length ? items.map((x) => <Tag key={x} tone={tone}>{x}</Tag>) : <span className="text-sm text-ink-4">{empty}</span>}
      </dd>
    </div>
  )
}
