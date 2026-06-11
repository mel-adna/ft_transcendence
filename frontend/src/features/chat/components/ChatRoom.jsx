import React, { useState } from 'react';
import { useChat } from '../hooks/useChat';
import { useSocket } from '../hooks/useSocket';
import { useRoomPresence } from '../hooks/useRoomPresence';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { MemberList } from './MemberList';
import { Search } from 'lucide-react';
import { chatApi } from '../services/chatApi';

/**
 * ChatRoom
 * Full-feature room view with optional members panel and search.
 */
export function ChatRoom({ roomId, currentUserId, roomName, showMembers = false }) {
  const { connected, status } = useSocket();
  const { members, onlineCount } = useRoomPresence(showMembers ? roomId : null);
  const { messages, isLoading, hasMore, sendMessage, editMessage, deleteMessage, loadMore } =
    useChat(roomId);

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const statusLabel = connected
    ? 'Connected'
    : status === 'connecting'
      ? 'Connecting…'
      : status === 'error'
        ? 'Connection error'
        : 'Disconnected';

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const { messages: results } = await chatApi.searchMessages(roomId, searchQuery.trim());
      setSearchResults(results);
    } catch (err) {
      console.error('[ChatRoom] search error:', err.message);
    } finally {
      setSearching(false);
    }
  };

  const displayMessages = searchOpen && searchResults.length > 0 ? searchResults : messages;

  return (
    <div className="flex h-full min-h-0">
      <div className="flex flex-col flex-1 min-w-0 bg-[#0c0c14] text-slate-100">
        <div className="px-4 py-3 border-b border-[#71717A]/25 flex items-center gap-2 shrink-0">
          <span className="font-bold text-sm flex-1 truncate">{roomName ?? roomId}</span>
          <button
            onClick={() => {
              setSearchOpen((v) => !v);
              setSearchResults([]);
              setSearchQuery('');
            }}
            className="p-1.5 rounded-lg text-[#71717A] hover:text-white hover:bg-[#181824] cursor-pointer"
            title="Search messages"
          >
            <Search size={14} />
          </button>
          <span
            className={`text-[11px] px-2 py-0.5 rounded-full shrink-0 ${
              connected
                ? 'bg-emerald-500/15 text-emerald-400'
                : 'bg-red-500/15 text-red-400'
            }`}
          >
            {statusLabel}
          </span>
        </div>

        {searchOpen && (
          <form onSubmit={handleSearch} className="px-4 py-2 border-b border-[#71717A]/25 shrink-0">
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search messages…"
              className="w-full rounded-lg border border-[#71717A]/30 bg-[#181824] px-3 py-1.5 text-xs text-white outline-none placeholder-[#71717A] focus:border-[#3B82F6]/50"
            />
            {searching && (
              <p className="text-[10px] text-[#71717A] mt-1">Searching…</p>
            )}
            {searchResults.length > 0 && (
              <p className="text-[10px] text-[#71717A] mt-1">
                {searchResults.length} result(s) — close search to return to live chat
              </p>
            )}
          </form>
        )}

        <MessageList
          messages={displayMessages}
          currentUserId={currentUserId}
          isLoading={isLoading && !searchOpen}
          hasMore={searchOpen ? false : hasMore}
          onLoadMore={loadMore}
          onEdit={editMessage}
          onDelete={deleteMessage}
        />

        <MessageInput onSend={sendMessage} disabled={!connected} />
      </div>

      {showMembers && (
        <aside className="w-48 shrink-0 border-l border-[#71717A]/25 bg-[#0e0e17] hidden md:flex flex-col">
          <MemberList
            members={members}
            currentUserId={currentUserId}
            onlineCount={onlineCount}
          />
        </aside>
      )}
    </div>
  );
}
