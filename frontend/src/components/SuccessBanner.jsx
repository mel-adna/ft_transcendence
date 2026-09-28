export default function SuccessBanner({ message, className = '' }) {
  if (!message) return null;
  return (
    <div
      role="status"
      className={`rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-xs font-medium text-success ${className}`}
    >
      {message}
    </div>
  );
}
