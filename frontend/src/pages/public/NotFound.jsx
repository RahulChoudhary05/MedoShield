import { ArrowLeft, Compass } from 'lucide-react'
import Button from '../../components/ui/Button'
import { Blobs } from '../../components/ui/motion'
import Logo from '../../components/brand/Logo'
import { homeFor, useAuth } from '../../store/auth'

export default function NotFound() {
  const { status, role } = useAuth()
  return (
    <div className="relative grid min-h-dvh place-items-center overflow-hidden bg-canvas px-6">
      <Blobs />
      <div className="relative text-center">
        <Logo className="justify-center" />
        <p className="mt-10 font-display text-[7rem] font-semibold leading-none tracking-tighter text-teal-600/90">404</p>
        <h1 className="mt-2 text-3xl font-semibold">This page took a <span className="serif-accent text-apricot-500">wrong step</span></h1>
        <p className="mx-auto mt-3 max-w-sm text-ink-3">The link may be old, or the page has moved. Let's get you back on track.</p>
        <div className="mt-8 flex justify-center gap-3">
          <Button to={status === 'authenticated' ? homeFor(role) : '/'} icon={ArrowLeft}>Go home</Button>
          <Button to="/login" variant="outline" icon={Compass}>Sign in</Button>
        </div>
      </div>
    </div>
  )
}
