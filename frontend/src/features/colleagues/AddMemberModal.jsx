import { useEffect, useState } from 'react';
import { Search, UserPlus } from 'lucide-react';
import api, { getErrorMessage } from '../../lib/api';
import { useAuth } from '../../context/useAuth';
import { fullName } from './roster';
import Modal from '../../components/Modal';
import Field from '../../components/Field';
import Spinner from '../../components/Spinner';
import EmptyState from '../../components/EmptyState';
import Avatar from '../../components/Avatar';

const DEBOUNCE_MS = 300;

const inputClass =
  'w-full rounded-lg border border-[#71717A]/25 bg-[#0c0c14] py-2.5 pl-9 pr-3 text-sm text-white placeholder:text-[#71717A]/50 focus:border-[#3B82F6] focus:outline-none';

export default function AddMemberModal({ open, onClose, workspaceId, rosterIds = new Set(), onAdded }) {
  const { user: currentUser } = useAuth();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [addedIds, setAddedIds] = useState(() => new Set());
  const [addingId, setAddingId] = useState(null);
  const [addError, setAddError] = useState(null);

  useEffect(() => {
    function sync() {
      if (!open) return;
      setQuery('');
      setResults([]);
      setSearching(false);
      setSearchError(null);
      setAddedIds(new Set());
      setAddingId(null);
      setAddError(null);
    }
    sync();
  }, [open]);

  useEffect(() => {
    const trimmed = query.trim();

    function reset() {
      setResults([]);
      setSearchError(null);
      setSearching(false);
    }

    function beginSearching() {
      setSearching(true);
      setSearchError(null);
    }

    if (!open || !trimmed) {
      reset();
      return undefined;
    }

    beginSearching();
    let ignore = false;

    const timer = setTimeout(() => {
      async function run() {
        try {
          const response = await api.get('/users/search', { params: { email: trimmed } });
          if (ignore) return;
          setResults(Array.isArray(response.data) ? response.data : []);
        } catch (requestError) {
          if (ignore) return;
          setSearchError(getErrorMessage(requestError));
          setResults([]);
        } finally {
          if (!ignore) setSearching(false);
        }
      }
      run();
    }, DEBOUNCE_MS);

    return () => {
      ignore = true;
      clearTimeout(timer);
    };
  }, [query, open]);

  async function handleAdd(candidate) {
    setAddError(null);
    setAddingId(candidate.id);
    try {
      await api.post(`/workspaces/${workspaceId}/members`, {
        email: candidate.email,
        role: 'MEMBER',
      });
      setAddedIds((previous) => new Set(previous).add(candidate.id));
      await onAdded();
    } catch (requestError) {
      setAddError(getErrorMessage(requestError));
    } finally {
      setAddingId(null);
    }
  }

  const trimmedQuery = query.trim();
  const visibleResults = results.filter((candidate) => candidate.id !== currentUser?.id);

  function renderResults() {
    if (!trimmedQuery || searchError) return null;

    if (searching) {
      return (
        <div className="flex items-center justify-center py-8">
          <Spinner />
        </div>
      );
    }

    if (visibleResults.length === 0) {
      return (
        <EmptyState
          icon={Search}
          title="No users found"
          message="Try a different email address."
        />
      );
    }

    return (
      <ul className="max-h-64 space-y-2 overflow-y-auto">
        {visibleResults.map((candidate) => {
          const alreadyMember = rosterIds.has(candidate.id) || addedIds.has(candidate.id);

          return (
            <li
              key={candidate.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-[#27273a] px-3 py-2.5"
            >
              <div className="flex min-w-0 items-center gap-3">
                <Avatar user={candidate} size={32} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">
                    {fullName(candidate)}
                  </p>
                  <p className="truncate text-xs text-[#71717A]">{candidate.email}</p>
                </div>
              </div>
              {alreadyMember ? (
                <span className="shrink-0 text-[11px] font-semibold text-[#71717A]">
                  Already added
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => handleAdd(candidate)}
                  disabled={addingId === candidate.id}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#3B82F6] px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {addingId === candidate.id ? (
                    <Spinner className="h-3.5 w-3.5 border-2" />
                  ) : (
                    <UserPlus size={14} />
                  )}
                  Add
                </button>
              )}
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <Modal open={open} onClose={onClose} title="Add member">
      <div className="space-y-4">
        <Field
          label="Search by email"
          id="member-search"
          error={searchError}
          hint="Type at least part of an email address."
        >
          <div className="relative">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#71717A]"
            />
            <input
              id="member-search"
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="e.g. jane@company.com"
              className={inputClass}
            />
          </div>
        </Field>

        {addError && (
          <div
            role="alert"
            className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-300"
          >
            {addError}
          </div>
        )}

        <div className="border-t border-[#27273a] pt-4">{renderResults()}</div>
      </div>
    </Modal>
  );
}
