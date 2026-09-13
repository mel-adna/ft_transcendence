export default function ErrorBanner({ message, className = '' }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className={`rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-300 ${className}`}
    >
      {message}
    </div>
  );
}
