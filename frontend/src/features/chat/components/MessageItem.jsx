import React, { useState } from 'react';

/**
 * MessageItem
 * Renders a single message with inline edit/delete for own messages.
 *
 * @param {{
 *   message: object,
 *   isOwn: boolean,
 *   onEdit: (messageId: string, newContent: string) => void,
 *   onDelete: (messageId: string) => void,
 * }} props
 */
export function MessageItem({ message, isOwn, onEdit, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);

  const handleEditSubmit = (e) => {
    e.preventDefault();
    if (editContent.trim() && editContent.trim() !== message.content) {
      onEdit(message.id, editContent.trim());
    }
    setEditing(false);
  };

  const handleEditKeyDown = (e) => {
    if (e.key === 'Escape') setEditing(false);
    if (e.key === 'Enter' && !e.shiftKey) handleEditSubmit(e);
  };

  const formattedTime = new Date(message.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isOwn ? 'flex-end' : 'flex-start',
        padding: '4px 12px',
        opacity: message._optimistic ? 0.6 : 1,
      }}
    >
      {/* Sender name (only for others) */}
      {!isOwn && (
        <span style={{ fontSize: '11px', marginBottom: '2px', fontWeight: 600 }}>
          {message.sender?.username ?? 'Unknown'}
        </span>
      )}

      <div
        style={{
          maxWidth: '70%',
          background: isOwn ? '#3B82F6' : '#181824',
          color: isOwn ? '#fff' : '#e2e8f0',
          padding: '8px 12px',
          borderRadius: isOwn ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
          wordBreak: 'break-word',
        }}
      >
        {editing ? (
          <form onSubmit={handleEditSubmit}>
            <textarea
              autoFocus
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onKeyDown={handleEditKeyDown}
              style={{ width: '100%', resize: 'none', background: 'transparent', border: 'none', color: 'inherit', outline: 'none' }}
              rows={2}
            />
          </form>
        ) : (
          <span style={{ whiteSpace: 'pre-wrap' }}>{message.content}</span>
        )}
      </div>

      {/* Meta: time + edited badge + actions */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 2 }}>
        <span style={{ fontSize: '10px', opacity: 0.5 }}>{formattedTime}</span>
        {message.isEdited && (
          <span style={{ fontSize: '10px', opacity: 0.4 }}>(edited)</span>
        )}
        {isOwn && !editing && (
          <>
            <button
              onClick={() => { setEditContent(message.content); setEditing(true); }}
              style={actionButtonStyle}
            >
              Edit
            </button>
            <button
              onClick={() => onDelete(message.id)}
              style={{ ...actionButtonStyle, color: '#ef4444' }}
            >
              Delete
            </button>
          </>
        )}
      </div>
    </div>
  );
}

const actionButtonStyle = {
  background: 'none',
  border: 'none',
  fontSize: '10px',
  cursor: 'pointer',
  opacity: 0.6,
  padding: '0 2px',
};
