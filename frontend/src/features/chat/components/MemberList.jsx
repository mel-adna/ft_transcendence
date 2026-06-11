import React from 'react';
import { PresenceIndicator } from './PresenceIndicator';

/**
 * MemberList
 * Shows room members with live presence status.
 *
 * @param {{
 *   members: object[],
 *   currentUserId: string,
 *   onlineCount?: number,
 * }} props
 */
export function MemberList({ members, currentUserId, onlineCount }) {
  const sorted = [...members].sort((a, b) => {
    const order = { ONLINE: 0, AWAY: 1, OFFLINE: 2 };
    const diff = (order[a.status] ?? 2) - (order[b.status] ?? 2);
    if (diff !== 0) return diff;
    return (a.username ?? '').localeCompare(b.username ?? '');
  });

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-[#71717A]/25 shrink-0">
        <span className="text-[10px] font-semibold text-[#71717A] uppercase tracking-wider">
          Members
        </span>
        {onlineCount != null && (
          <span className="ml-2 text-[10px] text-emerald-400">{onlineCount} online</span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {sorted.length === 0 && (
          <p className="text-xs text-[#71717A] px-2 py-4 text-center">No members</p>
        )}
        {sorted.map((member) => (
          <div
            key={member.userId}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[#181824]"
          >
            <div className="w-7 h-7 rounded-full bg-[#181824] border border-[#71717A]/20 flex items-center justify-center text-[10px] font-bold text-[#71717A] shrink-0">
              {(member.username ?? '?')[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs font-semibold text-slate-200 truncate block">
                {member.username ?? 'Unknown'}
                {member.userId === currentUserId && (
                  <span className="text-[#71717A] font-normal ml-1">(you)</span>
                )}
              </span>
            </div>
            <PresenceIndicator status={member.status} />
          </div>
        ))}
      </div>
    </div>
  );
}
