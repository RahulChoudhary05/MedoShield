import {
  Activity, Bot, CalendarHeart, FileHeart, HeartPulse, History, LayoutGrid, MessagesSquare, Pill, ScanLine, Settings2,
  Stethoscope, UserRound, Users, Video,
} from 'lucide-react'

export const PATIENT_NAV = [
  { section: 'Overview', items: [{ to: '/app', label: 'Home', icon: LayoutGrid, end: true, hotkey: 'g h' }] },
  {
    section: 'Monitor',
    items: [
      { to: '/app/check', label: 'Movement check', icon: ScanLine, badge: 'AI', hotkey: 'g c' },
      { to: '/app/video', label: 'Video review', icon: Video, hotkey: 'g v' },
      { to: '/app/reports', label: 'Lab reports', icon: FileHeart, hotkey: 'g r' },
      { to: '/app/timeline', label: 'Timeline', icon: History, hotkey: 'g t' },
    ],
  },
  {
    section: 'Care',
    items: [
      { to: '/app/assistant', label: 'Ask Medo', icon: Bot, hotkey: 'g a' },
      { to: '/app/medications', label: 'Medications', icon: Pill, hotkey: 'g m' },
      { to: '/app/wellbeing', label: 'Wellbeing', icon: HeartPulse, hotkey: 'g w' },
      { to: '/app/care', label: 'Care team', icon: CalendarHeart, hotkey: 'g d' },
      { to: '/app/messages', label: 'Messages', icon: MessagesSquare, hotkey: 'g i' },
    ],
  },
  { section: 'Account', items: [{ to: '/app/settings', label: 'Settings & privacy', icon: Settings2, hotkey: 'g s' }] },
]

export const DOCTOR_NAV = [
  { section: 'Clinic', items: [{ to: '/doctor', label: 'Overview', icon: LayoutGrid, end: true, hotkey: 'g h' }] },
  {
    section: 'Patients',
    items: [
      { to: '/doctor/patients', label: 'My patients', icon: Users, hotkey: 'g p' },
      { to: '/doctor/appointments', label: 'Appointments', icon: CalendarHeart, hotkey: 'g a' },
      { to: '/doctor/messages', label: 'Messages', icon: MessagesSquare, hotkey: 'g i' },
    ],
  },
  { section: 'Account', items: [{ to: '/doctor/settings', label: 'Profile & settings', icon: Stethoscope, hotkey: 'g s' }] },
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

/** Quick actions offered in the command palette (besides plain navigation). */
export const PATIENT_ACTIONS = [
  { id: 'check', label: 'Start a movement check', to: '/app/check', hotkey: 'c' },
  { id: 'med', label: 'Add a medicine', to: '/app/medications?add=1' },
  { id: 'log', label: 'Log today’s wellbeing', to: '/app/wellbeing' },
  { id: 'ask', label: 'Ask Medo a question', to: '/app/assistant' },
  { id: 'book', label: 'Request an appointment', to: '/app/care' },
  { id: 'refer', label: 'Invite someone to MedoShield', to: '/refer' },
]
export const DOCTOR_ACTIONS = [
  { id: 'requests', label: 'Review appointment requests', to: '/doctor/appointments' },
  { id: 'triage', label: 'Open patients needing review', to: '/doctor/patients?risk=HIGH' },
  { id: 'refer', label: 'Invite a colleague', to: '/refer' },
]
