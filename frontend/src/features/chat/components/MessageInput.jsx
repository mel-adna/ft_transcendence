import React, { useState, useRef } from 'react';

/**
 * MessageInput
 * Text input bar. Enter to send, Shift+Enter for newline.
 *
 * @param {{
 *   onSend: (content: string) => void,
 *   disabled?: boolean,
 *   placeholder?: string,
 * }} props
 */
export function MessageInput({ onSend, disabled = false, placeholder = 'Message…' }) {
  const [value, setValue] = useState('');
  const textareaRef = useRef(null);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex gap-2 p-3 border-t border-[#71717A]/25 bg-[#0e0e17] shrink-0">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={disabled ? 'Connecting…' : placeholder}
        rows={1}
        className="flex-1 resize-none rounded-xl border border-[#71717A]/30 bg-[#181824] px-3 py-2 text-sm text-white outline-none placeholder-[#71717A] focus:border-[#3B82F6]/50"
      />
      <button
        onClick={handleSubmit}
        disabled={disabled || !value.trim()}
        className="rounded-xl bg-[#3B82F6] px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        Send
      </button>
    </div>
  );
}
