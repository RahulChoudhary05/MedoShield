import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { AlertTriangle, ArrowLeft, Lock, LogOut, Mail, MessageSquare, Pill, Sparkles, Stethoscope, Unlock } from 'lucide-react'
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
    <header className="mb-6">
      <Button variant="ghost" size="sm" icon={ArrowLeft} to="/doctor/patients" className="-ml-3 mb-4 h-11">All patients</Button>

      <div className="flex flex-col gap-5 border-b border-line pb-6 xl:flex-row xl:items-end xl:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <Avatar name={patient.full_name} size={64} className="text-[1.375rem]" />
          <div className="min-w-0">
            <p className="kicker">Patient chart</p>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
              <h1 className="page-title">{patient.full_name}</h1>
              <RiskBadge level={levelOf(latestRisk)} pulse />
            </div>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.9375rem] text-ink-3">
              <span>{patientMeta(patient) || 'Age and gender not shared'}</span>
              {patient.email && (
                <a href={`mailto:${patient.email}`} className="inline-flex min-h-[44px] min-w-0 items-center gap-1.5 hover:text-teal-700 sm:min-h-0">
                  <Mail aria-hidden className="h-4 w-4 shrink-0" strokeWidth={1.8} /> <span className="truncate">{patient.email}</span>
                </a>
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="primary" icon={Sparkles} onClick={() => setSummaryOpen(true)}>Write AI summary</Button>
          <Button variant="outline" icon={MessageSquare} to={`/doctor/messages/${patientId}`}>Message</Button>
          <Button
            variant={unlocked ? 'soft' : 'outline'}
            icon={unlocked ? Unlock : Lock}
            disabled={access.isLoading}
            onClick={() => setVideoConfirm(true)}
            aria-pressed={unlocked}
            title={unlocked ? 'AI video review is enabled for this patient' : 'AI video review is locked'}
          >
            {access.isLoading ? 'Video review…' : unlocked ? 'Video review on' : 'Video review off'}
          </Button>
          <Button variant="ghost" icon={LogOut} onClick={() => setEndConfirm(true)} className="text-rose-600 hover:bg-rose-50 hover:text-rose-600">End care</Button>
        </div>
      </div>

      <dl className="grid gap-5 border-b border-line py-5 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-line">
        <TagGroup label="Conditions" items={patient.conditions} tone="ink" empty="None recorded" icon={Stethoscope} className="sm:pr-5" />
        <TagGroup label="Allergies" items={patient.allergies} tone="apricot" empty="No known allergies" icon={AlertTriangle} className="sm:px-5" />
        <TagGroup label="Self-reported medicines" items={meds} tone="ink" empty="None listed" icon={Pill} className="sm:pl-5" />
      </dl>
      {patient.medical_history && (
        <p className="max-w-[75ch] border-b border-line py-4 text-[0.9375rem] leading-relaxed text-ink-2 text-pretty">
          <span className="kicker mr-2">History</span>{patient.medical_history}
        </p>
      )}

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

function TagGroup({ label, items = [], tone, empty, icon: Icon, className }) {
  return (
    <div className={className}>
      <dt className="kicker mb-2 flex items-center gap-1.5">
        {Icon && <Icon aria-hidden className="h-3.5 w-3.5" strokeWidth={1.8} />} {label}
      </dt>
      <dd className="flex flex-wrap gap-1.5">
        {items?.length ? items.map((x) => <Tag key={x} tone={tone}>{x}</Tag>) : <span className="text-[0.9375rem] text-ink-3">{empty}</span>}
      </dd>
    </div>
  )
}
