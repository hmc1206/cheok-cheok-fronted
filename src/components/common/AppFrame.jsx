/** Design reminder — one fixed 375 × 812 device canvas. Desktop never widens the app. */
export function AppFrame({ children }) {
  return (
    <div className="control-stage flex min-h-dvh items-center justify-center bg-[var(--cb-navy)]">
      <div className="control-shell h-[812px] w-[375px] max-h-dvh max-w-full overflow-hidden bg-[var(--cb-cream)] text-[var(--cb-navy)]">
        {children}
      </div>
    </div>
  )
}
