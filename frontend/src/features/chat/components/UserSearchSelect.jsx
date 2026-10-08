import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { chatApi } from '../services/chatApi';

/**
 * UserSearchSelect
 * Debounced (~300ms) username/email search with selectable chips.
 * Used in the create-channel flow and the invite-to-existing-channel flow.
 *
 * @param {{
 *   roomId?: string | null,            // exclude users already in this room
 *   selected: Array<{id:string, username:string, avatarUrl?:string|null}>,
 *   onChange: (next: Array<object>) => void,
 *   autoFocus?: boolean,
 *   placeholder?: string,
 * }} props
 */
export function UserSearchSelect({
  roomId = null,
  selected,
  onChange,
  autoFocus = false,
  placeholder = 'Search people by name or email…',
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Debounced search — cancels the previous timer on each keystroke.
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    let cancelled = false;
    const handle = setTimeout(async () => {
      try {
        const { users } = await chatApi.searchUsers(q, roomId ? { roomId } : {});
        if (!cancelled) {
          setResults(users);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [query, roomId]);

  const selectedIds = new Set(selected.map((u) => u.id));
  const visibleResults = results.filter((u) => !selectedIds.has(u.id));

  const addUser = (user) => {
    if (selectedIds.has(user.id)) return;
    onChange([...selected, user]);
    setQuery('');
    setResults([]);
  };

  const removeUser = (id) => onChange(selected.filter((u) => u.id !== id));

  // Prevent Enter from submitting a parent <form>; add the top result instead.
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (visibleResults.length > 0) addUser(visibleResults[0]);
    }
  };

  return (
    <div className="space-y-2">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((u) => (
            <span
              key={u.id}
              className="inline-flex items-center gap-1 rounded-full bg-[#3B82F6]/15 text-[#3B82F6] pl-2 pr-1 py-0.5 text-xs font-semibold"
            >
              {u.username}
              <button
                type="button"
                onClick={() => removeUser(u.id)}
                className="rounded-full hover:bg-[#3B82F6]/25 p-0.5 cursor-pointer"
                aria-label={`Remove ${u.username}`}
              >
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}

      <input
        autoFocus={autoFocus}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full rounded-xl border border-[#71717A]/30 bg-[#181824] px-3 py-2 text-sm text-white outline-none placeholder-[#71717A] focus:border-[#3B82F6]/50"
      />

      {loading && <p className="text-[10px] text-[#71717A]">Searching…</p>}
      {error && <p className="text-xs text-red-400">{error}</p>}
      {query.trim() && !loading && !error && visibleResults.length === 0 && (
        <p className="text-[10px] text-[#71717A]">No users found</p>
      )}

      {visibleResults.length > 0 && (
        <ul className="max-h-40 overflow-y-auto rounded-xl border border-[#71717A]/25 bg-[#0e0e17] divide-y divide-[#71717A]/10">
          {visibleResults.map((u) => (
            <li key={u.id}>
              <button
                type="button"
                onClick={() => addUser(u)}
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs text-slate-200 hover:bg-[#181824] cursor-pointer"
              >
                <span className="w-6 h-6 rounded-full bg-[#181824] border border-[#71717A]/20 flex items-center justify-center text-[10px] font-bold text-[#71717A] shrink-0">
                  {(u.username ?? '?')[0].toUpperCase()}
                </span>
                <span className="truncate">{u.username}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
