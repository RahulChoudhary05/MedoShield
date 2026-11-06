import { Suspense, lazy, useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { bootstrapSession } from './lib/api'
import { homeFor, useAuth } from './store/auth'
import { LogoMark } from './components/brand/Logo'
import AppShell from './components/layout/AppShell'
import RouteMeta from './components/layout/RouteMeta'
import ErrorBoundary from './components/layout/ErrorBoundary'

const Landing = lazy(() => import('./pages/public/Landing'))
const Login = lazy(() => import('./pages/public/Login'))
const Register = lazy(() => import('./pages/public/Register'))
const DoctorJoin = lazy(() => import('./pages/public/DoctorJoin'))
const NotFound = lazy(() => import('./pages/public/NotFound'))

const Dashboard = lazy(() => import('./pages/patient/Dashboard'))
const MovementCheck = lazy(() => import('./pages/patient/MovementCheck'))
const VideoReview = lazy(() => import('./pages/patient/VideoReview'))
const LabReports = lazy(() => import('./pages/patient/LabReports'))
const Timeline = lazy(() => import('./pages/patient/Timeline'))
const Assistant = lazy(() => import('./pages/patient/Assistant'))
const Medications = lazy(() => import('./pages/patient/Medications'))
const Wellbeing = lazy(() => import('./pages/patient/Wellbeing'))
const CareTeam = lazy(() => import('./pages/patient/CareTeam'))
const PatientSettings = lazy(() => import('./pages/patient/Settings'))

const DoctorHome = lazy(() => import('./pages/doctor/DoctorHome'))
const DoctorPatients = lazy(() => import('./pages/doctor/Patients'))
const PatientDetail = lazy(() => import('./pages/doctor/PatientDetail'))
const DoctorAppointments = lazy(() => import('./pages/doctor/Appointments'))
const DoctorSettings = lazy(() => import('./pages/doctor/Settings'))

const Messages = lazy(() => import('./pages/shared/Messages'))

export function Splash() {
  return (
    <div className="grid min-h-dvh place-items-center bg-canvas">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-4">
        <LogoMark size={56} animated />
        <div className="h-1 w-24 overflow-hidden rounded-full bg-line">
          <motion.div className="h-full w-1/2 rounded-full bg-teal-500" animate={{ x: ['-100%', '200%'] }} transition={{ repeat: Infinity, duration: 1.1, ease: 'easeInOut' }} />
        </div>
      </motion.div>
    </div>
  )
}

function RequireRole({ role, children }) {
  const { status, role: current } = useAuth()
  const location = useLocation()
  if (status === 'loading') return <Splash />
  if (status !== 'authenticated') return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (current !== role) return <Navigate to={homeFor(current)} replace />
  return children
}

function GuestOnly({ children }) {
  const { status, role } = useAuth()
  if (status === 'loading') return <Splash />
  if (status === 'authenticated') return <Navigate to={homeFor(role)} replace />
  return children
}

export default function App() {
  useEffect(() => {
    bootstrapSession()
  }, [])

  return (
    <ErrorBoundary>
    <Suspense fallback={<Splash />}>
      <RouteMeta />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
        <Route path="/register" element={<GuestOnly><Register /></GuestOnly>} />
        <Route path="/join/doctor" element={<GuestOnly><DoctorJoin /></GuestOnly>} />

        <Route path="/app" element={<RequireRole role="patient"><AppShell /></RequireRole>}>
          <Route index element={<Dashboard />} />
          <Route path="check" element={<MovementCheck />} />
          <Route path="video" element={<VideoReview />} />
          <Route path="reports" element={<LabReports />} />
          <Route path="timeline" element={<Timeline />} />
          <Route path="assistant" element={<Assistant />} />
          <Route path="medications" element={<Medications />} />
          <Route path="wellbeing" element={<Wellbeing />} />
          <Route path="care" element={<CareTeam />} />
          <Route path="messages" element={<Messages />} />
          <Route path="messages/:otherId" element={<Messages />} />
          <Route path="settings" element={<PatientSettings />} />
        </Route>

        <Route path="/doctor" element={<RequireRole role="doctor"><AppShell /></RequireRole>}>
          <Route index element={<DoctorHome />} />
          <Route path="patients" element={<DoctorPatients />} />
          <Route path="patients/:patientId" element={<PatientDetail />} />
          <Route path="appointments" element={<DoctorAppointments />} />
          <Route path="messages" element={<Messages />} />
          <Route path="messages/:otherId" element={<Messages />} />
          <Route path="settings" element={<DoctorSettings />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
    </ErrorBoundary>
  )
}
