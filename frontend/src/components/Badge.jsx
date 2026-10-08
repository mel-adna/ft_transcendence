const TONES = {
  neutral: 'bg-white/5 text-muted',
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  danger: 'bg-danger/10 text-danger',
};

export default function Badge({ tone = 'neutral', icon: Icon, className = '', children }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${TONES[tone] ?? TONES.neutral} ${className}`}
    >
      {Icon ? <Icon size={12} /> : null}
      {children}
    </span>
  );
}
