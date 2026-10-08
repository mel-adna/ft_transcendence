import React, { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { UserSearchSelect } from './UserSearchSelect';

/**
 * InviteMembersModal
 * Invite users to an EXISTING group channel via the shared search UI.
 *
 * @param {{
 *   open: boolean,
 *   roomId: string,
 *   roomName?: string,
 *   onClose: () => void,
 *   onInvite: (userIds: string[]) => Promise<void>,
 * }} props
 */
export function InviteMembersModal({ open, roomId, roomName, onClose, onInvite }) {
  const [invitees, setInvitees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (invitees.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      await onInvite(invitees.map((u) => u.id));
      setInvitees([]);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md bg-[#0e0e17] border border-[#71717A]/25 rounded-xl shadow-xl">
        <div className="px-4 py-3 border-b border-[#71717A]/25 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
            <UserPlus size={14} />
            Invite to {roomName ?? 'channel'}
          </h3>
          <button
            onClick={onClose}
            className="text-[#71717A] hover:text-white text-lg leading-none cursor-pointer"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <UserSearchSelect
            roomId={roomId}
            selected={invitees}
            onChange={setInvitees}
            autoFocus
          />

          {error && <p className="text-xs text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading || invitees.length === 0}
            className="w-full rounded-xl bg-[#3B82F6] py-2 text-sm font-bold text-white disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          >
            {loading
              ? 'Inviting…'
              : `Invite ${invitees.length || ''}`.trim()}
          </button>
        </form>
      </div>
    </div>
  );
}
