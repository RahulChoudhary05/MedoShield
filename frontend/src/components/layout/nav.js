import {
  Activity, Bot, CalendarHeart, FileHeart, HeartPulse, History, LayoutGrid, MessagesSquare, Pill, ScanLine, Settings2,
  Stethoscope, UserRound, Users, Video,
} from 'lucide-react'

export const PATIENT_NAV = [
  { section: 'Overview', items: [{ to: '/app', label: 'Home', icon: LayoutGrid, end: true }] },
  {
    section: 'Monitor',
    items: [
      { to: '/app/check', label: 'Movement check', icon: ScanLine, badge: 'AI' },
      { to: '/app/video', label: 'Video review', icon: Video },
      { to: '/app/reports', label: 'Lab reports', icon: FileHeart },
      { to: '/app/timeline', label: 'Timeline', icon: History },
    ],
  },
  {
    section: 'Care',
    items: [
      { to: '/app/assistant', label: 'Ask Medo', icon: Bot },
      { to: '/app/medications', label: 'Medications', icon: Pill },
      { to: '/app/wellbeing', label: 'Wellbeing', icon: HeartPulse },
      { to: '/app/care', label: 'Care team', icon: CalendarHeart },
      { to: '/app/messages', label: 'Messages', icon: MessagesSquare },
    ],
  },
  { section: 'Account', items: [{ to: '/app/settings', label: 'Settings & privacy', icon: Settings2 }] },
]

export const DOCTOR_NAV = [
  { section: 'Clinic', items: [{ to: '/doctor', label: 'Overview', icon: LayoutGrid, end: true }] },
  {
    section: 'Patients',
    items: [
      { to: '/doctor/patients', label: 'My patients', icon: Users },
      { to: '/doctor/appointments', label: 'Appointments', icon: CalendarHeart },
      { to: '/doctor/messages', label: 'Messages', icon: MessagesSquare },
    ],
  },
  { section: 'Account', items: [{ to: '/doctor/settings', label: 'Profile & settings', icon: Stethoscope }] },
]

export const MOBILE_PATIENT = [
  { to: '/app', label: 'Home', icon: LayoutGrid, end: true },
  { to: '/app/check', label: 'Check', icon: ScanLine },
  { to: '/app/assistant', label: 'Medo', icon: Bot },
  { to: '/app/medications', label: 'Meds', icon: Pill },
  { to: '/app/settings', label: 'Me', icon: UserRound },
]
export const MOBILE_DOCTOR = [
  { to: '/doctor', label: 'Home', icon: LayoutGrid, end: true },
  { to: '/doctor/patients', label: 'Patients', icon: Users },
  { to: '/doctor/appointments', label: 'Visits', icon: CalendarHeart },
  { to: '/doctor/messages', label: 'Chat', icon: MessagesSquare },
  { to: '/doctor/settings', label: 'Me', icon: Activity },
]
