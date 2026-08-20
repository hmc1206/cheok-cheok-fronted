/** Design reminder — a single decisive action bar, not a generic rounded SaaS button. */
import { motion, useReducedMotion } from 'framer-motion'

const base = 'control-button inline-flex min-h-14 items-center justify-center gap-3 rounded-none px-5 text-[18px] font-extrabold tracking-[-0.045em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cb-tomato)] focus-visible:ring-offset-3 disabled:cursor-not-allowed disabled:opacity-45'
const variants = { primary: 'control-button--primary text-white', secondary: 'control-button--secondary text-[var(--cb-navy)]', quiet: 'control-button--quiet text-[var(--cb-navy)]' }

export function SeniorButton({ children, className = '', variant = 'primary', leadingIcon = null, fullWidth = true, type = 'button', ...props }) {
  const reducedMotion = useReducedMotion()
  return <motion.button type={type} whileTap={reducedMotion ? undefined : { scale: 0.98 }} transition={{ duration: 0.14 }} className={`${base} ${fullWidth ? 'w-full' : 'w-auto'} ${variants[variant] ?? variants.primary} ${className}`} {...props}>{leadingIcon ? <span aria-hidden="true">{leadingIcon}</span> : null}<span>{children}</span></motion.button>
}
