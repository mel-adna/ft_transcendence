/**
 * PresenceIndicator
 * Colored dot showing user online status.
 *
 * @param {{ status: string, size?: number, showLabel?: boolean }} props
 */
export function PresenceIndicator({ status, size = 8, showLabel = false }) {
  const colors = {
    ONLINE: 'bg-emerald-400',
    AWAY: 'bg-amber-400',
    OFFLINE: 'bg-[#71717A]',
  };

  const labels = {
    ONLINE: 'Online',
    AWAY: 'Away',
    OFFLINE: 'Offline',
  };

  const color = colors[status] ?? colors.OFFLINE;

  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`rounded-full shrink-0 ${color}`}
        style={{ width: size, height: size }}
        title={labels[status] ?? status}
      />
      {showLabel && (
        <span className="text-[10px] text-[#71717A]">{labels[status] ?? status}</span>
      )}
    </span>
  );
}
