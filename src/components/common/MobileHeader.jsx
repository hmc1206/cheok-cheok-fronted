/** Design reminder — product utility header: quiet, white, and task-first. */
import { motion, useReducedMotion } from 'framer-motion'

export function MobileHeader({ title, onBack, trailing = null }) {
  const reducedMotion = useReducedMotion()
  return <header className="salad-header flex min-h-[64px] shrink-0 items-center justify-between px-5"><motion.button type="button" onClick={onBack} whileTap={reducedMotion ? undefined : { scale: 0.96 }} className="flex min-h-12 items-center gap-1 text-[16px] font-bold tracking-[-0.03em] text-[#111] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#13bd7e]"><span aria-hidden="true" className="text-[21px] text-[#13bd7e]">‹</span><span>이전</span></motion.button><p className="text-[18px] font-bold tracking-[-0.04em] text-[#111]">{title}</p><div className="flex min-w-[48px] justify-end">{trailing}</div></header>
}
