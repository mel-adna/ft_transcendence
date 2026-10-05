import { useEffect, useState } from 'react';
import { Mail, Search } from 'lucide-react';
import api, { getErrorMessage } from '../../lib/api';
import { validateEmail } from '../../lib/validation';
import { useAuth } from '../../context/useAuth';
import { personName } from '../../lib/people';
import Modal from '../../components/Modal';
import Field from '../../components/Field';
import Button from '../../components/Button';
import Spinner from '../../components/Spinner';
import EmptyState from '../../components/EmptyState';
import Avatar from '../../components/Avatar';
import IconInput from '../../components/IconInput';
import ErrorBanner from '../../components/ErrorBanner';

const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 3;

export default function InviteMemberModal({
  open,
  onClose,
  workspaceId,
  rosterEmails = new Set(),
  invitedEmails = new Set(),
  onInvited,
}) {
  const { user: currentUser } = useAuth();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [sentEmails, setSentEmails] = useState(() => new Set());
  const [sendingEmail, setSendingEmail] = useState(null);
  const [inviteError, setInviteError] = useState(null);

  useEffect(() => {
    function sync() {
      if (!open) return;
      setQuery('');
      setResults([]);
      setSearching(false);
      setSearchError(null);
      setSentEmails(new Set());
      setSendingEmail(null);
      setInviteError(null);
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

    if (!open || trimmed.length < MIN_QUERY_LENGTH) {
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

  async function handleInvite(email) {
    const address = email.trim().toLowerCase();
    setInviteError(null);
    setSendingEmail(address);
    try {
      await api.post(`/workspaces/${workspaceId}/invitations`, { email: address, role: 'MEMBER' });
      setSentEmails((previous) => new Set(previous).add(address));
      await onInvited();
    } catch (requestError) {
      setInviteError(getErrorMessage(requestError));
    } finally {
      setSendingEmail(null);
    }
  }

  function statusOf(email) {
    const address = email.toLowerCase();
    if (rosterEmails.has(address)) return 'member';
    if (sentEmails.has(address) || invitedEmails.has(address)) return 'invited';
    return 'none';
  }

  const trimmedQuery = query.trim();
  const visibleResults = results.filter((candidate) => candidate.id !== currentUser?.id);
  const queryIsEmail = !validateEmail(trimmedQuery);
  const queryStatus = queryIsEmail ? statusOf(trimmedQuery) : 'none';

  function renderStatus(status) {
    if (status === 'member') {
      return <span className="shrink-0 text-[11px] font-semibold text-muted">In the team</span>;
    }
    return <span className="shrink-0 text-[11px] font-semibold text-success">Invited</span>;
  }

  function renderResults() {
    if (!trimmedQuery || searchError) return null;

    if (trimmedQuery.length < MIN_QUERY_LENGTH) {
      return <p className="text-xs text-muted">Type at least 3 characters to search.</p>;
    }

    if (searching) {
      return (
        <div className="flex items-center justify-center py-8">
          <Spinner />
        </div>
      );
    }

    if (visibleResults.length === 0) {
      if (queryIsEmail && queryStatus === 'none') {
        return (
          <div className="rounded-lg border border-card px-3 py-3">
            <p className="text-sm text-white">{trimmedQuery}</p>
            <p className="mt-1 text-xs text-muted">
              Nobody uses this address yet. They get an email, and join the team once they sign up
              and accept.
            </p>
            <Button
              size="sm"
              icon={Mail}
              busy={sendingEmail === trimmedQuery.toLowerCase()}
              onClick={() => handleInvite(trimmedQuery)}
              className="mt-3"
            >
              Send an invitation
            </Button>
          </div>
        );
      }

      if (queryIsEmail) {
        return (
          <div className="rounded-lg border border-card px-3 py-3">
            <p className="text-sm text-white">{trimmedQuery}</p>
            <p className="mt-1 text-xs text-muted">
              {queryStatus === 'member' ? 'Already in the team.' : 'Already invited.'}
            </p>
          </div>
        );
      }

      return (
        <EmptyState icon={Search} title="No users found" message="Try a full email address." />
      );
    }

    return (
      <ul className="max-h-64 space-y-2 overflow-y-auto">
        {visibleResults.map((candidate) => {
          const status = statusOf(candidate.email ?? '');

          return (
            <li
              key={candidate.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-card px-3 py-2.5"
            >
              <div className="flex min-w-0 items-center gap-3">
                <Avatar user={candidate} size={32} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">
                    {personName(candidate)}
                  </p>
                  <p className="truncate text-xs text-muted">{candidate.email}</p>
                </div>
              </div>
              {status === 'none' ? (
                <Button
                  size="sm"
                  icon={Mail}
                  busy={sendingEmail === candidate.email?.toLowerCase()}
                  onClick={() => handleInvite(candidate.email)}
                >
                  Invite
                </Button>
              ) : (
                renderStatus(status)
              )}
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <Modal open={open} onClose={onClose} title="Invite to the team">
      <div className="space-y-4">
        <Field
          label="Search by email"
          id="member-search"
          error={searchError}
          hint="They join the team once they accept the invitation."
        >
          <IconInput
            icon={Search}
            id="member-search"
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="e.g. jane@company.com"
          />
        </Field>

        <ErrorBanner message={inviteError} />

        <div className="border-t border-card pt-4">{renderResults()}</div>
      </div>
    </Modal>
  );
}
