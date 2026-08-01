export default function EmptyState({ icon: Icon, title, message, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[#71717A]/25 p-10 text-center">
      {Icon && <Icon size={28} className="text-[#71717A]" />}
      <h3 className="text-sm font-bold text-white">{title}</h3>
      {message && <p className="max-w-sm text-xs text-[#71717A]">{message}</p>}
      {action}
    </div>
  );
}
