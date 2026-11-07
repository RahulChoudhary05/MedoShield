import { motion } from 'framer-motion'
import { BadgeCheck, Building2, CalendarPlus } from 'lucide-react'
import { Avatar } from '../../../components/ui/Data'
import Button from '../../../components/ui/Button'

export default function DoctorCard({ d, index = 0, relation, onRequest }) {
  const accepting = d.accepting_patients !== false
  const fee = Number(d.appointment_fee || 0)
  const status = relation === 'accepted' ? { t: 'In your care team', c: 'text-teal-700' }
    : relation === 'pending' ? { t: 'Request pending', c: 'text-apricot-600' }
      : !accepting ? { t: 'Not taking requests', c: 'text-ink-3' }
        : { t: 'Accepting new patients', c: 'text-teal-700' }
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ delay: Math.min(index, 8) * 0.04, duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
      className="card flex flex-col p-5 transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lift"
    >
      <div className="flex items-start gap-3.5">
        <Avatar name={d.full_name} size={48} />
        <div className="min-w-0 flex-1">
          <h3 className="flex items-center gap-1.5 text-[1.0625rem] font-semibold leading-tight">
            <span className="truncate">{d.full_name}</span>
            {d.license_verified && <BadgeCheck className="h-4 w-4 shrink-0 text-teal-700" strokeWidth={1.8} aria-label="Licence verified" />}
          </h3>
          <p className="mt-0.5 text-[0.9375rem] text-teal-700">{d.specialty}</p>
          {d.clinic_name && <p className="mt-0.5 flex items-center gap-1 truncate text-[0.8125rem] text-ink-3"><Building2 className="h-3.5 w-3.5 shrink-0" strokeWidth={1.8} aria-hidden /> <span className="truncate">{d.clinic_name}</span></p>}
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-3 divide-x divide-line border-y border-line py-3 text-center">
        <div>
          <dt className="kicker">Rating</dt>
          <dd className="num mt-0.5 text-ink">{d.rating ? Number(d.rating).toFixed(1) : 'New'}</dd>
        </div>
        <div>
          <dt className="kicker">Experience</dt>
          <dd className="num mt-0.5 text-ink">{d.experience_years != null ? `${d.experience_years} y` : '—'}</dd>
        </div>
        <div>
          <dt className="kicker">Fee</dt>
          <dd className="num mt-0.5 text-ink">{fee > 0 ? `₹${fee.toLocaleString('en-IN')}` : 'Free'}</dd>
        </div>
      </dl>

      {d.bio && <p className="mt-3 line-clamp-3 text-[0.9375rem] text-ink-3">{d.bio}</p>}

      <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[0.8125rem]">
        <span className={status.c}>{status.t}</span>
        <span className="text-ink-3">{d.license_verified ? 'Verified licence' : 'Licence pending review'}</span>
      </p>

      <div className="mt-auto pt-5">
        <Button
          variant={accepting && !relation ? 'primary' : 'outline'}
          icon={CalendarPlus}
          className="w-full"
          disabled={!accepting || relation === 'pending'}
          onClick={() => onRequest(d)}
        >
          {relation === 'pending' ? 'Awaiting reply' : relation === 'accepted' ? 'Book another visit' : 'Request appointment'}
        </Button>
      </div>
    </motion.article>
  )
}
