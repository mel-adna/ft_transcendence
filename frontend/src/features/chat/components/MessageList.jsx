import React, { useEffect, useRef } from 'react';
import { MessageItem } from './MessageItem';

/**
 * MessageList
 * Renders the chat message list.
 * Auto-scrolls to bottom on new messages.
 * Exposes loadMore trigger at top for infinite scroll.
 *
 * @param {{
 *   messages: object[],
 *   currentUserId: string,
 *   isLoading: boolean,
 *   hasMore: boolean,
 *   onLoadMore: () => void,
 *   onEdit: (messageId: string, content: string) => void,
 *   onDelete: (messageId: string) => void,
 * }} props
 */
export function MessageList({
  messages,
  currentUserId,
  isLoading,
  hasMore,
  onLoadMore,
  onEdit,
  onDelete,
}) {
  const bottomRef = useRef(null);
  const listRef = useRef(null);
  const prevLengthRef = useRef(messages.length);

  // Auto-scroll to bottom only when new messages arrive at the bottom
  useEffect(() => {
    const prevLen = prevLengthRef.current;
    const newLen = messages.length;
    prevLengthRef.current = newLen;

    if (newLen > prevLen) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  // Intersection observer for infinite scroll trigger
  const topRef = useRef(null);
  useEffect(() => {
    if (!hasMore || isLoading) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) onLoadMore();
      },
      { threshold: 0.1 },
    );
    if (topRef.current) observer.observe(topRef.current);
    return () => observer.disconnect();
  }, [hasMore, isLoading, onLoadMore]);

  return (
    <div
      ref={listRef}
      style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', flex: 1 }}
    >
      {/* Load more trigger */}
      <div ref={topRef} style={{ minHeight: 1 }} />
      {isLoading && (
        <div style={{ textAlign: 'center', padding: '8px', fontSize: '12px', opacity: 0.5 }}>
          Loading…
        </div>
      )}

      {messages.map((msg) => (
        <MessageItem
          key={msg.id}
          message={msg}
          isOwn={msg.sender?.id === currentUserId}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}

      <div ref={bottomRef} />
    </div>
  );
}
