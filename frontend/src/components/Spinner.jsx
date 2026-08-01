export default function Spinner({ className = '' }) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={`h-5 w-5 animate-spin rounded-full border-2 border-[#71717A]/30 border-t-[#3B82F6] ${className}`}
    />
  );
}
