import { useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, FileHeart, HeartPulse, History, LayoutGrid, Pill, ScanLine, ShieldOff, Video } from 'lucide-react'
import { api } from '../../lib/api'
import { errorMessage } from '../../lib/utils'
import Button from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/Feedback'
import Segmented from '../../components/ui/Segmented'
import PatientHeader from '../../features/doctor/PatientHeader'
import OverviewTab from '../../features/doctor/tabs/OverviewTab'
import MovementTab from '../../features/doctor/tabs/MovementTab'
import VideoTab from '../../features/doctor/tabs/VideoTab'
import LabsTab from '../../features/doctor/tabs/LabsTab'
import MedsTab from '../../features/doctor/tabs/MedsTab'
import LifestyleTab from '../../features/doctor/tabs/LifestyleTab'
import TimelineTab from '../../features/doctor/tabs/TimelineTab'

const TABS = [
  { value: 'overview', label: 'Overview', icon: LayoutGrid },
  { value: 'movement', label: 'Movement', icon: ScanLine },
  { value: 'video', label: 'Video reviews', icon: Video },
  { value: 'labs', label: 'Lab reports', icon: FileHeart },
  { value: 'meds', label: 'Medications', icon: Pill },
  { value: 'lifestyle', label: 'Lifestyle', icon: HeartPulse },
  { value: 'timeline', label: 'Timeline', icon: History },
]

export default function PatientDetail() {
  const { patientId } = useParams()
  const [params, setParams] = useSearchParams()
  const tab = TABS.some((t) => t.value === params.get('tab')) ? params.get('tab') : 'overview'
  const setTab = (t) => {
    setParams(t === 'overview' ? {} : { tab: t }, { replace: true })
  }

  const q = useQuery({ queryKey: ['doctor', 'overview', patientId], queryFn: () => api.doctors.overview(patientId), enabled: !!patientId })

  if (q.isLoading) return <DetailSkeleton />

  if (q.isError) {
    const status = q.error?.response?.status
    if (status === 403 || status === 404) {
      return (
        <Card className="mx-auto mt-6 max-w-xl">
          <EmptyState
            icon={ShieldOff}
            tone="apricot"
            title={status === 403 ? 'This patient isn’t under your care' : 'Patient not found'}
            text={
              status === 403
                ? 'For privacy, a chart is only visible while you have an active care link. The link may have ended, or the patient hasn’t chosen you yet.'
                : errorMessage(q.error, 'We couldn’t find that patient.')
            }
            action={<Button variant="primary" size="sm" icon={ArrowLeft} to="/doctor/patients">Back to my patients</Button>}
          />
        </Card>
      )
    }
    return <ErrorState error={q.error} onRetry={() => q.refetch()} className="mt-6" />
  }

  const overview = q.data
  const patient = overview.patient || {}

  return (
    <div>
      <PatientHeader patient={patient} latestRisk={overview.latest_risk} patientId={patientId} />

      <div className="sticky top-16 z-10 -mx-4 mb-5 bg-canvas/85 px-4 py-2 backdrop-blur-md sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:bg-transparent lg:px-0 lg:py-0 lg:backdrop-blur-none">
        <Segmented value={tab} onChange={setTab} options={TABS} size="sm" />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          role="tabpanel"
          aria-label={TABS.find((t) => t.value === tab)?.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.25, ease: [0.2, 0.7, 0.2, 1] }}
        >
          {tab === 'overview' && <OverviewTab overview={overview} onTab={setTab} />}
          {tab === 'movement' && <MovementTab patientId={patientId} />}
          {tab === 'video' && <VideoTab patientId={patientId} />}
          {tab === 'labs' && <LabsTab patientId={patientId} />}
          {tab === 'meds' && <MedsTab patientId={patientId} patientName={patient.full_name || 'the patient'} />}
          {tab === 'lifestyle' && <LifestyleTab patientId={patientId} />}
          {tab === 'timeline' && <TimelineTab patientId={patientId} />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading patient chart">
      <div className="card card-pad mb-6">
        <Skeleton className="mb-4 h-8 w-28 rounded-full" />
        <div className="flex items-center gap-4">
          <Skeleton className="h-[68px] w-[68px] rounded-full" />
          <div className="flex-1 space-y-2"><Skeleton className="h-8 w-56" /><Skeleton className="h-4 w-40" /></div>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-3"><Skeleton className="h-12" /><Skeleton className="h-12" /><Skeleton className="h-12" /></div>
      </div>
      <Skeleton className="mb-5 h-11 w-full max-w-2xl rounded-full" />
      <div className="grid gap-5 lg:grid-cols-[320px_1fr]"><Skeleton className="h-80 rounded-3xl" /><Skeleton className="h-80 rounded-3xl" /></div>
    </div>
  )
}
