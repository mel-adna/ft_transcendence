export function MessageItem({
  message,
  isOwn,
  onRetry,
  onDiscard,
  showReadStatus = false,
  isRead = false,
}) {
  const failed = !!message._failed;
  const sending = !!message._optimistic;

  const formattedTime = new Date(message.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      className="flex flex-col px-3 py-1"
      style={{
        alignItems: isOwn ? 'flex-end' : 'flex-start',
        opacity: sending ? 0.6 : 1,
      }}
    >
      {!isOwn && (
        <span className="text-[11px] mb-0.5 font-semibold text-slate-300">
          {message.sender?.username ?? 'Unknown'}
        </span>
      )}

      <div
        className="max-w-[85%] sm:max-w-[70%] px-3 py-2 text-sm break-words"
        style={{
          background: isOwn ? '#3B82F6' : '#181824',
          color: isOwn ? '#fff' : '#e2e8f0',
          borderRadius: isOwn ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
          border: failed ? '1px solid #ef4444' : '1px solid transparent',
        }}
      >
        <span style={{ whiteSpace: 'pre-wrap' }}>{message.content}</span>
      </div>

      {failed && (
        <div className="flex gap-2 items-center mt-0.5">
          <span className="text-[10px] text-red-400">Not sent</span>
          {onRetry && (
            <button onClick={() => onRetry(message.id)} className="text-[10px] text-[#3B82F6] cursor-pointer">
              Retry
            </button>
          )}
          {onDiscard && (
            <button onClick={() => onDiscard(message.id)} className="text-[10px] text-red-400 cursor-pointer">
              Discard
            </button>
          )}
        </div>
      )}

      {!failed && (
        <div className="flex gap-1.5 items-center mt-0.5">
          <span className="text-[10px] opacity-50">
            {sending ? 'Sending…' : formattedTime}
          </span>
          {message.isEdited && !sending && (
            <span className="text-[10px] opacity-40">(edited)</span>
          )}
          {isOwn && showReadStatus && !sending && (
            <span
              className="text-[10px]"
              style={{ color: isRead ? '#3B82F6' : '#71717A' }}
              title={isRead ? 'Read' : 'Delivered'}
            >
              {isRead ? '✓✓' : '✓'}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
