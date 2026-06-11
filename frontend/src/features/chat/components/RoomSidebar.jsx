import React, { useState, useEffect } from 'react';
import { Plus, Hash, MessageCircle } from 'lucide-react';
import { chatApi } from '../services/chatApi';

/**
 * CreateRoomModal
 * Create a GROUP channel or DIRECT message.
 *
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   onCreated: (room: object) => void,
 *   createGroup: (name: string) => Promise<object>,
 *   createDM: (targetUserId: string) => Promise<object>,
 * }} props
 */
export function CreateRoomModal({ open, onClose, onCreated, createGroup, createDM }) {
  const [tab, setTab] = useState('group');
  const [name, setName] = useState('');
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    chatApi
      .listUsers()
      .then(({ users: fetched }) => setUsers(fetched))
      .catch((err) => setError(err.message));
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const room =
        tab === 'group'
          ? await createGroup(name.trim())
          : await createDM(selectedUserId);
      onCreated(room);
      setName('');
      setSelectedUserId('');
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
          <h3 className="text-sm font-bold text-white">New conversation</h3>
          <button
            onClick={onClose}
            className="text-[#71717A] hover:text-white text-lg leading-none cursor-pointer"
          >
            ×
          </button>
        </div>

        <div className="flex border-b border-[#71717A]/25">
          {[
            { id: 'group', label: 'Channel', icon: <Hash size={14} /> },
            { id: 'dm', label: 'Direct', icon: <MessageCircle size={14} /> },
          ].map(({ id, label, icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold cursor-pointer ${
                tab === id
                  ? 'text-[#3B82F6] border-b-2 border-[#3B82F6]'
                  : 'text-[#71717A] hover:text-slate-200'
              }`}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          {tab === 'group' ? (
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Channel name…"
              className="w-full rounded-xl border border-[#71717A]/30 bg-[#181824] px-3 py-2 text-sm text-white outline-none placeholder-[#71717A] focus:border-[#3B82F6]/50"
            />
          ) : (
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full rounded-xl border border-[#71717A]/30 bg-[#181824] px-3 py-2 text-sm text-white outline-none focus:border-[#3B82F6]/50"
            >
              <option value="">Select a user…</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.username}
                </option>
              ))}
            </select>
          )}

          {error && <p className="text-xs text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading || (tab === 'group' ? !name.trim() : !selectedUserId)}
            className="w-full rounded-xl bg-[#3B82F6] py-2 text-sm font-bold text-white disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          >
            {loading ? 'Creating…' : 'Create'}
          </button>
        </form>
      </div>
    </div>
  );
}

/**
 * RoomSidebar
 * Room list with create button.
 */
export function RoomSidebar({ rooms, selectedRoomId, onSelect, displayName, onCreateClick, isLoading }) {
  return (
    <aside className="w-56 shrink-0 flex flex-col border-r border-[#71717A]/25 bg-[#0e0e17]">
      <div className="px-3 py-3 border-b border-[#71717A]/25 flex items-center justify-between shrink-0">
        <span className="text-xs font-bold text-white">Channels</span>
        <button
          onClick={onCreateClick}
          className="p-1 rounded-lg text-[#71717A] hover:text-white hover:bg-[#181824] cursor-pointer"
          title="New channel or DM"
        >
          <Plus size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {isLoading && (
          <p className="text-xs text-[#71717A] px-2 py-4 text-center">Loading…</p>
        )}
        {!isLoading && rooms.length === 0 && (
          <p className="text-xs text-[#71717A] px-2 py-4 text-center">No rooms yet</p>
        )}
        {rooms.map((room) => {
          const isActive = room.id === selectedRoomId;
          const Icon = room.type === 'DIRECT' ? MessageCircle : Hash;
          return (
            <button
              key={room.id}
              onClick={() => onSelect(room)}
              className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-xs font-semibold cursor-pointer transition-colors ${
                isActive
                  ? 'bg-[#3B82F6]/15 text-[#3B82F6]'
                  : 'text-[#71717A] hover:text-slate-200 hover:bg-[#181824]'
              }`}
            >
              <Icon size={14} className="shrink-0" />
              <span className="truncate">{displayName(room)}</span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
