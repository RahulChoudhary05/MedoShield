import { motion } from 'framer-motion'
import { BadgeCheck, Briefcase, Building2, CalendarPlus, Clock, Star } from 'lucide-react'
import { Avatar } from '../../../components/ui/Data'
import { Badge } from '../../../components/ui/Badge'
import Button from '../../../components/ui/Button'
import { cn } from '../../../lib/utils'

export default function DoctorCard({ d, index = 0, relation, onRequest }) {
  const accepting = d.accepting_patients !== false
  const fee = Number(d.appointment_fee || 0)
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ delay: Math.min(index, 8) * 0.04, ease: [0.2, 0.7, 0.2, 1] }}
      whileHover={{ y: -3 }}
      className="card card-pad card-glow group flex flex-col overflow-hidden transition-shadow hover:shadow-lift"
    >
            <div className="relative flex items-start gap-3.5">
        <div className="relative rounded-full bg-paper p-[3px] ring-1 ring-line">
          <Avatar name={d.full_name} size={56} />
          {accepting && <span className="absolute bottom-0.5 right-0.5 h-3.5 w-3.5 rounded-full bg-teal-400 ring-[3px] ring-paper" title="Accepting new patients" />}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="flex items-center gap-1.5 text-[1.05rem] font-semibold leading-tight">
            <span className="truncate">{d.full_name}</span>
            {d.license_verified && <BadgeCheck className="h-4 w-4 shrink-0 text-teal-500" aria-label="Licence verified" />}
          </h3>
          <p className="mt-0.5 text-sm font-semibold"><span className="text-teal-700">{d.specialty}</span></p>
          {d.clinic_name && <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-ink-3"><Building2 className="h-3 w-3 shrink-0" /> <span className="truncate">{d.clinic_name}</span></p>}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 divide-x divide-line/70 rounded-2xl bg-cream py-2.5 text-center ring-1 ring-inset ring-line/60">
        <div>
          <p className="num flex items-center justify-center gap-1 font-semibold text-ink"><Star className="h-3.5 w-3.5 fill-apricot-300 text-apricot-300" />{d.rating ? Number(d.rating).toFixed(1) : 'New'}</p>
          <p className="text-[0.68rem] text-ink-4">Rating</p>
        </div>
        <div>
          <p className="num flex items-center justify-center gap-1 font-semibold text-ink"><Briefcase className="h-3.5 w-3.5 text-ink-4" />{d.experience_years != null ? `${d.experience_years}y` : '—'}</p>
          <p className="text-[0.68rem] text-ink-4">Experience</p>
        </div>
        <div>
          <p className="num font-semibold text-ink">{fee > 0 ? `₹${fee.toLocaleString('en-IN')}` : 'Free'}</p>
          <p className="text-[0.68rem] text-ink-4">Consult fee</p>
        </div>
      </div>

      {d.bio && <p className="mt-3 line-clamp-3 text-sm text-ink-3">{d.bio}</p>}

      <div className="mt-3 flex flex-wrap gap-1.5">
        {d.license_verified ? <Badge tone="teal"><BadgeCheck className="h-3 w-3" /> Verified licence</Badge> : <Badge tone="ink">Licence pending review</Badge>}
        {!accepting && <Badge tone="apricot"><Clock className="h-3 w-3" /> Not taking requests</Badge>}
        {relation === 'accepted' && <Badge tone="teal">In your care team</Badge>}
        {relation === 'pending' && <Badge tone="teal">Request pending</Badge>}
      </div>

      <div className="mt-auto pt-5">
        <Button
          variant={accepting && !relation ? 'primary' : 'outline'}
          size="md"
          icon={CalendarPlus}
          className={cn('w-full')}
          disabled={!accepting || relation === 'pending'}
          onClick={() => onRequest(d)}
        >
          {relation === 'pending' ? 'Awaiting reply' : relation === 'accepted' ? 'Book another visit' : 'Request appointment'}
        </Button>
      </div>
    </motion.article>
  )
}
