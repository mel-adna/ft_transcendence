import React from 'react';
import { useChat } from '../hooks/useChat';
import { useSocket } from '../hooks/useSocket';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';

/**
 * ChatRoom
 * Full-feature room view. Compose into your layout.
 *
 * @param {{
 *   roomId: string,
 *   currentUserId: string,
 *   roomName?: string,
 * }} props
 */
export function ChatRoom({ roomId, currentUserId, roomName }) {
  const { connected } = useSocket();
  const { messages, isLoading, hasMore, sendMessage, editMessage, deleteMessage, loadMore } =
    useChat(roomId);

  return (
    <div className="flex flex-col h-full bg-[#0c0c14] text-slate-100 rounded-xl border border-[#71717A]/25 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#71717A]/25 flex items-center gap-2 shrink-0">
        <span className="font-bold text-sm">{roomName ?? roomId}</span>
        <span
          className={`text-[11px] px-2 py-0.5 rounded-full ${
            connected
              ? 'bg-emerald-500/15 text-emerald-400'
              : 'bg-red-500/15 text-red-400'
          }`}
        >
          {connected ? 'Connected' : 'Disconnected'}
        </span>
      </div>

      {/* Messages */}
      <MessageList
        messages={messages}
        currentUserId={currentUserId}
        isLoading={isLoading}
        hasMore={hasMore}
        onLoadMore={loadMore}
        onEdit={editMessage}
        onDelete={deleteMessage}
      />

      {/* Input */}
      <MessageInput onSend={sendMessage} disabled={!connected} />
    </div>
  );
}
