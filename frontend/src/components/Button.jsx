import Spinner from './Spinner';

const VARIANTS = {
  primary: 'bg-primary text-white hover:opacity-90',
  secondary: 'border border-muted/30 text-white hover:bg-white/5',
  danger: 'bg-danger text-white hover:opacity-90',
  quiet: 'text-muted hover:bg-white/5 hover:text-white',
};

const SIZES = {
  md: 'px-4 py-2.5 text-sm',
  sm: 'px-3 py-2 text-xs',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  busy = false,
  disabled = false,
  className = '',
  children,
  ...props
}) {
  return (
    <button
      type="button"
      {...props}
      disabled={disabled || busy}
      className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-lg font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTS[variant] ?? VARIANTS.primary} ${SIZES[size] ?? SIZES.md} ${className}`}
    >
      {busy ? <Spinner /> : Icon ? <Icon size={size === 'sm' ? 14 : 16} /> : null}
      {children}
    </button>
  );
}
