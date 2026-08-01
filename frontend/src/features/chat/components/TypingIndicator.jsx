import React from 'react';

/**
 * TypingIndicator
 * Renders "X is typing…" / "X and Y are typing…" / "Several people are typing…"
 * with an animated dot. Reserves a fixed height so the message list doesn't
 * jump when it appears/disappears.
 *
 * @param {{ users: { userId: string, username: string }[] }} props
 */
export function TypingIndicator({ users }) {
  const label = buildLabel(users);

  return (
    <div className="h-5 px-4 flex items-center shrink-0" aria-live="polite">
      {label && (
        <span className="flex items-center gap-1.5 text-[11px] italic text-[#71717A]">
          <span className="typing-dots inline-flex gap-0.5">
            <span className="w-1 h-1 rounded-full bg-[#71717A] animate-bounce [animation-delay:-0.3s]" />
            <span className="w-1 h-1 rounded-full bg-[#71717A] animate-bounce [animation-delay:-0.15s]" />
            <span className="w-1 h-1 rounded-full bg-[#71717A] animate-bounce" />
          </span>
          {label}
        </span>
      )}
    </div>
  );
}

function buildLabel(users) {
  if (!users || users.length === 0) return '';
  const names = users.map((u) => u.username || 'Someone');
  if (names.length === 1) return `${names[0]} is typing…`;
  if (names.length === 2) return `${names[0]} and ${names[1]} are typing…`;
  return 'Several people are typing…';
}
