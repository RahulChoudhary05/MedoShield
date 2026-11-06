import { forwardRef } from 'react'
import { Link } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { cn } from '../../lib/utils'

const VARIANTS = {
  primary: 'btn-primary', brand: 'btn-brand', apricot: 'btn-apricot', soft: 'btn-soft',
  outline: 'btn-outline', ghost: 'btn-ghost', danger: 'btn-danger', violet: 'btn-violet', dark: 'btn-dark',
}
const SIZES = { sm: 'btn-sm', md: 'btn-md', lg: 'btn-lg', icon: 'btn-icon' }

/**
 * <Button variant="brand" size="md" loading icon={Icon} to="/path">Label</Button>
 * `to` renders a router Link, `href` an <a>.
 */
const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', loading = false, icon: Icon, iconRight: IconRight, to, href, className, children, disabled, ...rest },
  ref,
) {
  const cls = cn('btn', VARIANTS[variant], SIZES[size], className)
  const content = (
    <>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : Icon ? <Icon className="h-[1.05em] w-[1.05em]" strokeWidth={2.2} /> : null}
      {children}
      {IconRight && !loading ? <IconRight className="h-[1.05em] w-[1.05em]" strokeWidth={2.2} /> : null}
    </>
  )
  if (to) return <Link ref={ref} to={to} className={cls} {...rest}>{content}</Link>
  if (href) return <a ref={ref} href={href} className={cls} {...rest}>{content}</a>
  return (
    <button ref={ref} className={cls} disabled={disabled || loading} {...rest}>
      {content}
    </button>
  )
})

export default Button
