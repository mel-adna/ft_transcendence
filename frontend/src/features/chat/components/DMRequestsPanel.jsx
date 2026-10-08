import React, { useState } from 'react';
import { MessageCircle, Check, X } from 'lucide-react';

/**
 * DMRequestsPanel
 * Incoming "someone wants to DM you" requests, sitting above the room list.
 * Collapsed to a single badge/toggle when there's nothing to review.
 *
 * @param {{
 *   requests: Array<{ id: string, requester: { id: string, username: string, avatarUrl?: string|null } }>,
 *   onRespond: (roomId: string, action: 'ACCEPT'|'REJECT') => Promise<void>,
 * }} props
 */
export function DMRequestsPanel({ requests, onRespond }) {
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState(null);

  if (!requests || requests.length === 0) return null;

  const handleRespond = async (roomId, action) => {
    setBusyId(roomId);
    try {
      await onRespond(roomId, action);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="border-b border-[#71717A]/25 shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-semibold text-white hover:bg-[#181824] cursor-pointer"
      >
        <MessageCircle size={14} className="shrink-0 text-[#3B82F6]" />
        <span className="flex-1 text-left">Message requests</span>
        <span className="shrink-0 min-w-[18px] h-[18px] px-1.5 flex items-center justify-center rounded-full bg-[#3B82F6] text-[10px] font-bold text-white">
          {requests.length}
        </span>
      </button>

      {open && (
        <ul className="max-h-48 overflow-y-auto divide-y divide-[#71717A]/10">
          {requests.map((req) => (
            <li key={req.id} className="flex items-center gap-2 px-3 py-2">
              <span className="w-7 h-7 rounded-full bg-[#181824] border border-[#71717A]/20 flex items-center justify-center text-[10px] font-bold text-[#71717A] shrink-0">
                {(req.requester?.username ?? '?')[0].toUpperCase()}
              </span>
              <span className="flex-1 min-w-0 truncate text-xs text-slate-200">
                {req.requester?.username ?? 'Someone'}
              </span>
              <button
                type="button"
                disabled={busyId === req.id}
                onClick={() => handleRespond(req.id, 'ACCEPT')}
                aria-label={`Accept request from ${req.requester?.username ?? 'user'}`}
                className="p-1 rounded-lg text-emerald-400 hover:bg-emerald-400/10 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Check size={14} />
              </button>
              <button
                type="button"
                disabled={busyId === req.id}
                onClick={() => handleRespond(req.id, 'REJECT')}
                aria-label={`Reject request from ${req.requester?.username ?? 'user'}`}
                className="p-1 rounded-lg text-red-400 hover:bg-red-400/10 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
