/** Design reminder — numbered input rows use typography and rules rather than cards. */
export function SeniorInput({ id, label, hint, error, className = '', inputClassName = '', ...props }) {
  const fieldId = id ?? props.name
  const describedBy = error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined
  return <div className={`control-field ${className}`}><label htmlFor={fieldId} className="block text-[18px] font-extrabold tracking-[-0.045em]">{label}</label><input id={fieldId} aria-describedby={describedBy} aria-invalid={Boolean(error)} className={`control-input mt-2 min-h-14 w-full rounded-none px-0 text-[18px] font-medium outline-none placeholder:text-[var(--cb-slate)] ${error ? 'control-input--error' : ''} ${inputClassName}`} {...props} />{error ? <p id={`${fieldId}-error`} role="alert" className="mt-2 text-[15px] font-bold leading-6 text-[var(--cb-error)]">{error}</p> : hint ? <p id={`${fieldId}-hint`} className="mt-2 text-[15px] font-semibold leading-6 text-[var(--cb-slate)]">{hint}</p> : null}</div>
}
