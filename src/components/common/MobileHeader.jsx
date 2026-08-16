/** Design reminder — product utility header: quiet, white, and task-first. */
import { motion, useReducedMotion } from 'framer-motion'

// 뒤로가기 화살표/포커스 링 색상은 원래 초록(#13bd7e, 뱅크샐러드풍 시안 때 색)이
// 하드코딩돼 있었는데, 실제 채택된 최종 시안(토스풍, --cb-tomato = #3182f6)의
// 버튼/accent 색과 어긋나 보이는 문제가 있었다. 하드코딩된 hex 대신 토큰을 참조해서
// 앞으로 accent 색이 또 바뀌어도 이 헤더만 따로 뒤처지지 않게 했다.
export function MobileHeader({ title, onBack, trailing = null }) {
  const reducedMotion = useReducedMotion()
  return <header className="salad-header flex min-h-[64px] shrink-0 items-center justify-between px-5"><motion.button type="button" onClick={onBack} whileTap={reducedMotion ? undefined : { scale: 0.96 }} className="flex min-h-12 items-center gap-1 text-[16px] font-bold tracking-[-0.03em] text-[#111] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cb-tomato)]"><span aria-hidden="true" className="text-[21px] text-[var(--cb-tomato)]">‹</span><span>이전</span></motion.button><p className="text-[18px] font-bold tracking-[-0.04em] text-[#111]">{title}</p><div className="flex min-w-[48px] justify-end">{trailing}</div></header>
}
