export default function Field({ label, id, error, hint, action, children }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="block text-xs font-semibold text-[#71717A]">
          {label}
        </label>
        {action}
      </div>
      {children}
      {hint && !error && <p className="text-[11px] text-[#71717A]">{hint}</p>}
      {error && <p className="text-[11px] font-medium text-rose-400">{error}</p>}
    </div>
  );
}
