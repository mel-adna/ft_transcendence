import React, { useState, useMemo } from 'react';
import { useChat } from '../hooks/useChat';
import { useSocket } from '../hooks/useSocket';
import { useRoomPresence } from '../hooks/useRoomPresence';
import { useTyping } from '../hooks/useTyping';
import { useReadReceipts } from '../hooks/useReadReceipts';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { TypingIndicator } from './TypingIndicator';
import { MemberList } from './MemberList';
import { InviteMembersModal } from './InviteMembersModal';
import { Search, Trash2, LogOut, MoreVertical, ArrowLeft, Users } from 'lucide-react';
import { chatApi } from '../services/chatApi';

/**
 * ChatRoom
 * Full-feature room view with optional members panel and search.
 */
export function ChatRoom({
  roomId,
  currentUserId,
  roomName,
  roomType,
  showMembers = false,
  canDelete = false,
  canLeave = false,
  onDeleteRoom,
  onLeaveRoom,
  onBack,
}) {
  const { connected, status } = useSocket();
  const { members, onlineCount, refresh: refreshMembers } = useRoomPresence(
    showMembers ? roomId : null,
  );
  const {
    messages,
    isLoading,
    hasMore,
    sendMessage,
    retryMessage,
    discardMessage,
    loadMore,
  } = useChat(roomId, currentUserId);

  const { typingUsers, notifyTyping, stopTyping } = useTyping(roomId);
  const { isReadByOthers } = useReadReceipts(roomId, currentUserId, messages, connected);

  // Show a read/sent indicator only on the most recent message *I* sent, like
  // iMessage/WhatsApp — avoids cluttering every bubble.
  const lastOwnMessageId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].sender?.id === currentUserId) return messages[i].id;
    }
    return null;
  }, [messages, currentUserId]);

  const lastOwnMessageRead = useMemo(() => {
    if (!lastOwnMessageId) return false;
    const msg = messages.find((m) => m.id === lastOwnMessageId);
    return msg ? isReadByOthers(msg) : false;
  }, [lastOwnMessageId, messages, isReadByOthers]);

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false); // mobile drawer
  // null | 'delete' | 'leave'
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);

  const canInvite = showMembers && roomType === 'GROUP';
  const hasMenuActions = canDelete || canLeave;

  const handleConfirm = async () => {
    const action = confirm === 'delete' ? onDeleteRoom : onLeaveRoom;
    if (!action) return;
    setBusy(true);
    try {
      await action();
      // On success the room unmounts — no state reset needed.
    } catch (err) {
      console.error(`[ChatRoom] ${confirm} failed:`, err.message);
      setBusy(false);
      setConfirm(null);
    }
  };

  const handleInvite = async (userIds) => {
    await chatApi.inviteToRoom(roomId, userIds);
    await refreshMembers();
  };

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

  const isSearchView = searchOpen && searchResults.length > 0;
  const displayMessages = isSearchView ? searchResults : messages;

  return (
    <div className="flex h-full min-h-0">
      <div className="flex flex-col flex-1 min-w-0 bg-[#0c0c14] text-slate-100">
        <div className="px-3 sm:px-4 py-3 border-b border-[#71717A]/25 flex items-center gap-1.5 shrink-0">
          {/* Mobile back button */}
          {onBack && (
            <button
              onClick={onBack}
              className="md:hidden p-1.5 -ml-1 rounded-lg text-[#71717A] hover:text-white hover:bg-[#181824] cursor-pointer"
              title="Back to channels"
            >
              <ArrowLeft size={16} />
            </button>
          )}

          <span className="font-bold text-sm flex-1 truncate">{roomName ?? roomId}</span>

          {/* Connection dot — compact on mobile, labelled pill on sm+ */}
          <span
            className={`shrink-0 w-2 h-2 rounded-full sm:hidden ${
              connected ? 'bg-emerald-400' : 'bg-red-400'
            }`}
            title={statusLabel}
          />

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

          {/* Mobile members toggle */}
          {showMembers && (
            <button
              onClick={() => setMembersOpen(true)}
              className="md:hidden p-1.5 rounded-lg text-[#71717A] hover:text-white hover:bg-[#181824] cursor-pointer"
              title="Members"
            >
              <Users size={14} />
            </button>
          )}

          {/* Overflow menu: delete / leave */}
          {hasMenuActions && (
            <div className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="p-1.5 rounded-lg text-[#71717A] hover:text-white hover:bg-[#181824] cursor-pointer"
                title="More"
              >
                <MoreVertical size={14} />
              </button>
              {menuOpen && (
                <>
                  {/* click-away backdrop */}
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 mt-1 z-20 w-40 rounded-lg border border-[#71717A]/25 bg-[#181824] shadow-xl py-1">
                    {canLeave && (
                      <button
                        onClick={() => { setMenuOpen(false); setConfirm('leave'); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-200 hover:bg-[#0e0e17] cursor-pointer"
                      >
                        <LogOut size={13} /> Leave channel
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => { setMenuOpen(false); setConfirm('delete'); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-[#0e0e17] cursor-pointer"
                      >
                        <Trash2 size={13} /> Delete channel
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          <span
            className={`hidden sm:inline text-[11px] px-2 py-0.5 rounded-full shrink-0 ${
              connected
                ? 'bg-emerald-500/15 text-emerald-400'
                : 'bg-red-500/15 text-red-400'
            }`}
          >
            {statusLabel}
          </span>
        </div>

        {confirm && (
          <div
            className={`px-4 py-3 border-b flex flex-wrap items-center gap-3 shrink-0 ${
              confirm === 'delete'
                ? 'border-red-500/25 bg-red-500/10'
                : 'border-amber-500/25 bg-amber-500/10'
            }`}
          >
            <span className={`text-xs flex-1 min-w-[180px] ${confirm === 'delete' ? 'text-red-300' : 'text-amber-200'}`}>
              {confirm === 'delete' ? (
                <>Delete <strong>{roomName}</strong> for everyone? This can't be undone.</>
              ) : (
                <>Leave <strong>{roomName}</strong>? You'll need to be re-invited to rejoin.</>
              )}
            </span>
            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={handleConfirm}
                disabled={busy}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50 cursor-pointer ${
                  confirm === 'delete' ? 'bg-red-500 hover:bg-red-600' : 'bg-amber-500 hover:bg-amber-600'
                }`}
              >
                {busy ? 'Working…' : confirm === 'delete' ? 'Delete' : 'Leave'}
              </button>
              <button
                onClick={() => setConfirm(null)}
                disabled={busy}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-[#71717A] hover:text-white cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

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
          onRetry={isSearchView ? undefined : retryMessage}
          onDiscard={isSearchView ? undefined : discardMessage}
          emptyLabel={isSearchView ? 'No matching messages' : undefined}
          lastOwnMessageId={isSearchView ? null : lastOwnMessageId}
          lastOwnMessageRead={lastOwnMessageRead}
        />

        <TypingIndicator users={typingUsers} />

        <MessageInput
          onSend={sendMessage}
          onTyping={notifyTyping}
          onStopTyping={stopTyping}
          disabled={!connected}
        />
      </div>

      {/* Desktop members panel */}
      {showMembers && (
        <aside className="w-48 shrink-0 border-l border-[#71717A]/25 bg-[#0e0e17] hidden md:flex flex-col">
          <MemberList
            members={members}
            currentUserId={currentUserId}
            onlineCount={onlineCount}
            onInvite={canInvite ? () => setInviteOpen(true) : undefined}
          />
        </aside>
      )}

      {/* Mobile members drawer */}
      {showMembers && membersOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="flex-1 bg-black/50" onClick={() => setMembersOpen(false)} />
          <aside className="w-64 max-w-[80%] bg-[#0e0e17] border-l border-[#71717A]/25 flex flex-col relative">
            <button
              onClick={() => setMembersOpen(false)}
              className="absolute top-1.5 right-2 z-10 text-[#71717A] hover:text-white text-lg leading-none cursor-pointer"
              aria-label="Close members"
            >
              ×
            </button>
            <MemberList
              members={members}
              currentUserId={currentUserId}
              onlineCount={onlineCount}
              onInvite={canInvite ? () => { setMembersOpen(false); setInviteOpen(true); } : undefined}
            />
          </aside>
        </div>
      )}

      {canInvite && (
        <InviteMembersModal
          open={inviteOpen}
          roomId={roomId}
          roomName={roomName}
          onClose={() => setInviteOpen(false)}
          onInvite={handleInvite}
        />
      )}
    </div>
  );
}
