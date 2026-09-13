export default function SuccessBanner({ message, className = '' }) {
  if (!message) return null;
  return (
    <div
      role="status"
      className={`rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-400 ${className}`}
    >
      {message}
    </div>
  );
}
