import { useEffect, useMemo, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import * as Popover from '@radix-ui/react-popover'
import * as DD from '@radix-ui/react-dropdown-menu'
import { Command } from 'cmdk'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, CheckCheck, ChevronDown, LogOut, Search, Settings2, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import Logo from '../brand/Logo'
import { Avatar } from '../ui/Data'
import { api } from '../../lib/api'
import { useAuth } from '../../store/auth'
import { cn, fmtRelative } from '../../lib/utils'
import ErrorBoundary from './ErrorBoundary'
import { DOCTOR_NAV, MOBILE_DOCTOR, MOBILE_PATIENT, PATIENT_NAV } from './nav'
import SOSButton from '../../features/sos/SOSButton'
import MedicationReminders from '../../features/medications/MedicationReminders'

const EASE = [0.2, 0.8, 0.2, 1]

function SideNav({ nav, onNavigate }) {
  return (
    <nav aria-label="App" className="flex flex-col gap-6">
      {nav.map((group) => (
        <div key={group.section}>
          <p className="mb-1.5 px-3 font-mono text-[0.75rem] text-ink-4">{group.section}</p>
          <ul className="space-y-0.5">
            {group.items.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn('group relative flex items-center gap-3 rounded-lg px-3 py-2 text-[0.9375rem] transition-colors duration-150', isActive ? 'font-medium text-ink' : 'text-ink-3 hover:bg-ink/[.04] hover:text-ink')
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <motion.span layoutId="nav-active" className="absolute inset-0 rounded-lg border border-line bg-paper" transition={{ duration: 0.24, ease: [0.65, 0, 0.35, 1] }}>
                          <span className="absolute inset-y-2 left-0 w-[2px] rounded-full bg-teal-700" />
                        </motion.span>
                      )}
                      <item.icon className={cn('relative z-10 h-[18px] w-[18px] transition-colors', isActive ? 'text-teal-700' : 'text-ink-4 group-hover:text-ink-2')} strokeWidth={1.8} />
                      <span className="relative z-10">{item.label}</span>
                      {item.badge && <span className="relative z-10 ml-auto rounded-md border border-apricot-200 bg-apricot-50 px-1.5 font-mono text-[0.7rem] text-apricot-600">{item.badge}</span>}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  )
}

function Notifications() {
  const qc = useQueryClient()
  const { data } = useQuery({ queryKey: ['notifications'], queryFn: api.notifications.list, refetchInterval: 30_000 })
  const unread = data?.unread || 0
  async function markRead() {
    await api.notifications.read()
    qc.invalidateQueries({ queryKey: ['notifications'] })
  }
  return (
    <Popover.Root onOpenChange={(o) => !o && unread && markRead()}>
      <Popover.Trigger className="relative grid h-10 w-10 place-items-center rounded-lg border border-line bg-paper text-ink-2 transition hover:border-ink-4 hover:text-ink" aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}>
        <Bell className="h-[18px] w-[18px]" strokeWidth={1.8} />
        {unread > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-apricot-500 px-1 text-[0.6875rem] font-semibold text-paper ring-2 ring-canvas">{unread > 9 ? '9+' : unread}</span>}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="end" sideOffset={10} className="z-50 w-[22rem] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-2xl border border-line bg-paper shadow-float data-[state=open]:animate-fade-up">
          <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
            <p className="font-medium">Notifications</p>
            {unread > 0 && (
              <button onClick={markRead} className="inline-flex items-center gap-1 text-[0.8125rem] font-medium text-teal-700 hover:underline">
                <CheckCheck className="h-3.5 w-3.5" /> Mark all read
              </button>
            )}
          </div>
          <ul className="max-h-[24rem] divide-y divide-line overflow-y-auto">
            {(data?.notifications || []).length === 0 && <li className="px-5 py-10 text-center text-sm text-ink-3">You are all caught up.</li>}
            {(data?.notifications || []).map((n) => (
              <li key={n.id} className={cn('flex gap-3 px-5 py-3.5', !n.is_read && 'bg-teal-50/50')}>
                <span className={cn('mt-2 h-1.5 w-1.5 shrink-0 rounded-full', n.is_read ? 'bg-line' : 'bg-teal-600')} />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">{n.title}</p>
                  <p className="line-clamp-2 text-[0.8125rem] text-ink-3">{n.message}</p>
                  <p className="mt-1 font-mono text-[0.75rem] text-ink-4">{fmtRelative(n.created_at)}</p>
                </div>
              </li>
            ))}
          </ul>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

function CommandPalette({ open, setOpen, nav }) {
  const navigate = useNavigate()
  const items = useMemo(() => nav.flatMap((g) => g.items.map((i) => ({ ...i, group: g.section }))), [nav])
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setOpen])
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[60] grid place-items-start bg-ink/25 px-4 pt-[14vh]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} onClick={() => setOpen(false)}>
          <motion.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 4, opacity: 0 }} transition={{ duration: 0.2, ease: EASE }} onClick={(e) => e.stopPropagation()} className="mx-auto w-full max-w-xl">
            <Command label="Quick navigation" className="overflow-hidden rounded-2xl border border-line bg-paper shadow-float">
              <div className="flex items-center gap-3 border-b border-line px-5">
                <Search className="h-4 w-4 text-ink-4" strokeWidth={1.8} />
                <Command.Input autoFocus placeholder="Jump to…" className="h-14 w-full bg-transparent text-base outline-none placeholder:text-ink-4" />
                <kbd className="rounded-md border border-line px-1.5 py-0.5 font-mono text-[0.7rem] text-ink-4">Esc</kbd>
              </div>
              <Command.List className="max-h-80 overflow-y-auto p-2">
                <Command.Empty className="px-4 py-8 text-center text-sm text-ink-3">No matches.</Command.Empty>
                {[...new Set(items.map((i) => i.group))].map((g) => (
                  <Command.Group key={g} heading={g} className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-[0.75rem] [&_[cmdk-group-heading]]:text-ink-4">
                    {items.filter((i) => i.group === g).map((i) => (
                      <Command.Item key={i.to} value={`${i.label} ${g}`} onSelect={() => { navigate(i.to); setOpen(false) }} className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-[0.9375rem] text-ink-2 data-[selected=true]:bg-cream data-[selected=true]:text-ink">
                        <i.icon className="h-4 w-4" strokeWidth={1.8} /> {i.label}
                      </Command.Item>
                    ))}
                  </Command.Group>
                ))}
              </Command.List>
            </Command>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function UserMenu({ user, role }) {
  const navigate = useNavigate()
  const clear = useAuth((s) => s.clear)
  const qc = useQueryClient()
  async function logout() {
    try { await api.auth.logout() } catch { /* ignore */ }
    qc.clear()
    clear()
    toast.success('Signed out safely')
    navigate('/login', { replace: true })
  }
  const name = role === 'doctor' ? user?.full_name : user?.full_name || user?.first_name
  return (
    <DD.Root>
      <DD.Trigger className="flex h-10 items-center gap-2.5 rounded-lg border border-line bg-paper pl-1 pr-2.5 transition hover:border-ink-4" aria-label="Account menu">
        <Avatar name={name} size={30} />
        <span className="hidden max-w-[9rem] truncate text-sm font-medium sm:block">{name}</span>
        <ChevronDown className="h-4 w-4 text-ink-4" strokeWidth={1.8} />
      </DD.Trigger>
      <DD.Portal>
        <DD.Content align="end" sideOffset={10} className="z-50 w-64 overflow-hidden rounded-2xl border border-line bg-paper p-1.5 shadow-float data-[state=open]:animate-fade-up">
          <div className="px-3 pb-3 pt-2">
            <p className="truncate font-medium">{name}</p>
            <p className="truncate text-[0.8125rem] text-ink-3">{user?.email}</p>
            <span className="mt-2 inline-flex items-center gap-1 rounded-md bg-teal-50 px-2 py-0.5 text-[0.75rem] font-medium text-teal-800">
              <ShieldCheck className="h-3 w-3" /> {role === 'doctor' ? 'Clinician' : 'Patient'} · secure session
            </span>
          </div>
          <DD.Separator className="my-1 h-px bg-line" />
          <DD.Item onSelect={() => navigate(role === 'doctor' ? '/doctor/settings' : '/app/settings')} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-ink-2 outline-none data-[highlighted]:bg-cream">
            <Settings2 className="h-4 w-4" strokeWidth={1.8} /> Settings
          </DD.Item>
          <DD.Item onSelect={logout} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-rose-600 outline-none data-[highlighted]:bg-rose-50">
            <LogOut className="h-4 w-4" strokeWidth={1.8} /> Sign out
          </DD.Item>
        </DD.Content>
      </DD.Portal>
    </DD.Root>
  )
}

export default function AppShell() {
  const { user, role } = useAuth()
  const [cmd, setCmd] = useState(false)
  const location = useLocation()
  const nav = role === 'doctor' ? DOCTOR_NAV : PATIENT_NAV
  const mobile = role === 'doctor' ? MOBILE_DOCTOR : MOBILE_PATIENT
  const home = role === 'doctor' ? '/doctor' : '/app'
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [location.pathname])

  return (
    <div className="min-h-dvh bg-canvas">
      <a href="#app-main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-ink focus:px-3 focus:py-2 focus:text-paper">Skip to content</a>

      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[16.5rem] flex-col border-r border-line bg-canvas px-4 py-5 lg:flex">
        <NavLink to={home} className="mb-8 px-3" aria-label="MedoShield home"><Logo tagline /></NavLink>
        <div className="no-scrollbar flex-1 overflow-y-auto">
          <SideNav nav={nav} />
        </div>
        <div className="mt-6 rounded-xl border border-line bg-paper p-4">
          <p className="flex items-center gap-1.5 text-[0.8125rem] font-medium text-teal-800"><ShieldCheck className="h-4 w-4" strokeWidth={1.8} /> Privacy-first</p>
          <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-ink-3">Video stays on your device. Only skeletal keypoints are analysed.</p>
        </div>
        <p className="mt-4 px-3 text-[0.75rem] text-ink-4">
          Built by <Link to="/about" className="underline decoration-line underline-offset-2 hover:text-ink-2">Rahul Choudhary</Link>
        </p>
      </aside>

      {/* Main column */}
      <div className="lg:pl-[16.5rem]">
        <header className="sticky top-0 z-20 border-b border-line bg-canvas/90 backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-[1240px] items-center gap-3 px-4 sm:px-6">
            <NavLink to={home} className="lg:hidden" aria-label="MedoShield home"><Logo size={28} /></NavLink>
            <button onClick={() => setCmd(true)} className="ml-auto hidden h-10 w-72 items-center gap-2.5 rounded-lg border border-line bg-paper px-3.5 text-sm text-ink-4 transition hover:border-ink-4 md:flex lg:ml-0">
              <Search className="h-4 w-4" strokeWidth={1.8} /> Search or jump to…
              <kbd className="ml-auto rounded-md border border-line px-1.5 font-mono text-[0.7rem]">Ctrl K</kbd>
            </button>
            <div className="ml-auto flex items-center gap-2">
              <Notifications />
              <UserMenu user={user} role={role} />
            </div>
          </div>
        </header>

        <main id="app-main" className="mx-auto max-w-[1240px] px-4 pb-28 pt-8 sm:px-6 lg:pb-16">
          <AnimatePresence mode="wait">
            <motion.div key={location.pathname.split('/').slice(0, 3).join('/')} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.22, ease: EASE }}>
              <ErrorBoundary><Outlet /></ErrorBoundary>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Mobile tab bar */}
      <nav aria-label="App" className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-line bg-canvas/95 px-2 pt-1.5 backdrop-blur-md lg:hidden">
        <ul className="grid grid-cols-5">
          {mobile.map((i) => (
            <li key={i.to}>
              <NavLink to={i.to} end={i.end} className={({ isActive }) => cn('flex min-h-[48px] flex-col items-center justify-center gap-0.5 rounded-lg text-[0.75rem] font-medium', isActive ? 'text-teal-800' : 'text-ink-4')}>
                <i.icon className="h-5 w-5" strokeWidth={1.8} /> {i.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {role === 'patient' && !/^\/app\/(assistant|messages)/.test(location.pathname) && <SOSButton />}
      {role === 'patient' && <MedicationReminders />}
      <CommandPalette open={cmd} setOpen={setCmd} nav={nav} />
    </div>
  )
}
