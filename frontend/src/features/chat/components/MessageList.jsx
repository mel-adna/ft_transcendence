import React, { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react';
import { MessageItem } from './MessageItem';

/**
 * MessageList
 * Renders the chat message list with smart scrolling:
 *   - Appends (new messages at bottom): auto-scroll only if the user is already
 *     near the bottom; otherwise surface a "New messages" pill.
 *   - Prepends (history loaded at top): preserve the user's scroll position so
 *     the viewport doesn't jump.
 *
 * All scroll/identity bookkeeping happens in a useLayoutEffect (post-DOM,
 * pre-paint) — never during render — so refs stay React-safe and the user
 * never sees an intermediate scroll position.
 *
 * @param {{
 *   messages: object[],
 *   currentUserId: string,
 *   isLoading: boolean,
 *   hasMore: boolean,
 *   onLoadMore: () => void,
 *   onRetry?: (tempId: string) => void,
 *   onDiscard?: (tempId: string) => void,
 *   emptyLabel?: string,
 * }} props
 */
const NEAR_BOTTOM_PX = 120;

export function MessageList({
  messages,
  currentUserId,
  isLoading,
  hasMore,
  onLoadMore,
  onRetry,
  onDiscard,
  lastOwnMessageId = null,
  lastOwnMessageRead = false,
  emptyLabel = 'No messages yet — say hi 👋',
}) {
  const listRef = useRef(null);
  const bottomRef = useRef(null);
  const topRef = useRef(null);

  // Snapshot of the previous render's list identity + scroll metrics, read and
  // written only inside the layout effect below.
  const prevRef = useRef({ firstId: null, lastId: null, len: 0, scrollHeight: 0 });

  const [showNewPill, setShowNewPill] = useState(false);

  const isNearBottom = useCallback(() => {
    const el = listRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
  }, []);

  const scrollToBottom = useCallback((behavior = 'smooth') => {
    bottomRef.current?.scrollIntoView({ behavior });
    setShowNewPill(false);
  }, []);

  useLayoutEffect(() => {
    const el = listRef.current;
    const prev = prevRef.current;
    const firstId = messages[0]?.id ?? null;
    const lastId = messages[messages.length - 1]?.id ?? null;
    const len = messages.length;

    // Classify the change by comparing identity against the prior snapshot.
    const grew = len > prev.len;
    const isPrepend =
      grew && prev.firstId !== null && firstId !== prev.firstId && lastId === prev.lastId;
    const isAppend = grew && lastId !== prev.lastId;

    if (el) {
      if (isPrepend) {
        // Keep the previously-top message visually anchored.
        const delta = el.scrollHeight - prev.scrollHeight;
        el.scrollTop = el.scrollTop + delta;
      } else if (isAppend) {
        const last = messages[len - 1];
        const ownMessage = last?.sender?.id === currentUserId;
        const wasNearBottom =
          prev.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;

        if (prev.len === 0) {
          scrollToBottom('auto');
        } else if (ownMessage || wasNearBottom) {
          scrollToBottom('smooth');
        } else {
          setShowNewPill(true);
        }
      }
    }

    prevRef.current = {
      firstId,
      lastId,
      len,
      scrollHeight: el ? el.scrollHeight : 0,
    };
  }, [messages, currentUserId, scrollToBottom]);

  // Hide the pill once the user scrolls back down on their own.
  const handleScroll = useCallback(() => {
    if (showNewPill && isNearBottom()) setShowNewPill(false);
  }, [showNewPill, isNearBottom]);

  // Infinite-scroll trigger at the top.
  useEffect(() => {
    if (!hasMore || isLoading) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) onLoadMore();
      },
      { root: listRef.current, threshold: 0.1 },
    );
    if (topRef.current) observer.observe(topRef.current);
    return () => observer.disconnect();
  }, [hasMore, isLoading, onLoadMore]);

  const isEmpty = !isLoading && messages.length === 0;

  return (
    <div className="relative flex-1 min-h-0">
      <div
        ref={listRef}
        onScroll={handleScroll}
        style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', height: '100%' }}
      >
        {/* Load-more sentinel */}
        <div ref={topRef} style={{ minHeight: 1 }} />
        {isLoading && (
          <div style={{ textAlign: 'center', padding: '8px', fontSize: '12px', opacity: 0.5 }}>
            Loading…
          </div>
        )}

        {isEmpty && (
          <div className="flex-1 flex items-center justify-center text-[#71717A] text-sm px-4 text-center">
            {emptyLabel}
          </div>
        )}

        {messages.map((msg) => (
          <MessageItem
            key={msg.id}
            message={msg}
            isOwn={msg.sender?.id === currentUserId}
            onRetry={onRetry}
            onDiscard={onDiscard}
            showReadStatus={msg.id === lastOwnMessageId}
            isRead={lastOwnMessageRead}
          />
        ))}

        <div ref={bottomRef} />
      </div>

      {showNewPill && (
        <button
          onClick={() => scrollToBottom('smooth')}
          className="absolute left-1/2 -translate-x-1/2 bottom-3 z-10 flex items-center gap-1 rounded-full bg-[#3B82F6] px-3 py-1.5 text-xs font-semibold text-white shadow-lg hover:bg-[#2563eb] cursor-pointer"
        >
          ↓ New messages
        </button>
      )}
    </div>
  );
}
