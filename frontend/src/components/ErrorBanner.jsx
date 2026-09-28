export default function ErrorBanner({ message, className = '' }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className={`rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs font-medium text-danger ${className}`}
    >
      {message}
    </div>
  );
}
