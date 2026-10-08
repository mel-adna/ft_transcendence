import { useCallback, useEffect, useState } from 'react';
import api, { getErrorMessage } from '../../lib/api';
import { notifyDataChanged } from '../../lib/realtimeNotify';
import { useSocketEvent } from '../../lib/useDataChanged';
import { formatDay } from '../../lib/dates';
import Button from '../../components/Button';
import ErrorBanner from '../../components/ErrorBanner';

export default function InvitationsPanel({ onAccepted, className = '' }) {
  const [invitations, setInvitations] = useState([]);
  const [error, setError] = useState(null);
  const [answeringId, setAnsweringId] = useState(null);

  const load = useCallback(async () => {
    try {
      const response = await api.get('/workspaces/users/me/invitations');
      setInvitations(Array.isArray(response.data) ? response.data : []);
      setError(null);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  }, []);

  useEffect(() => {
    function sync() {
      load();
    }
    sync();
  }, [load]);

  useSocketEvent('notification:new', (event) => {
    if (event?.type !== 'WORKSPACE') return;
    load();
  });

  async function answer(invitation, accept) {
    setAnsweringId(invitation.id);
    setError(null);
    try {
      await api.post(`/workspaces/invitations/${invitation.id}/${accept ? 'accept' : 'reject'}`);
      setInvitations((previous) => previous.filter((item) => item.id !== invitation.id));
      if (accept) {
        notifyDataChanged('members', null, { workspaceId: invitation.workspaceId });
        await onAccepted();
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError));
      await load();
    } finally {
      setAnsweringId(null);
    }
  }

  if (invitations.length === 0 && !error) return null;

  return (
    <section className={`rounded-2xl border border-primary/30 bg-primary/5 p-5 ${className}`}>
      <h2 className="text-base font-bold text-white">You have been invited</h2>
      <p className="mt-1 text-sm text-muted">
        Accept to join the team, or decline to make the invitation go away.
      </p>

      <ul className="mt-4 space-y-2">
        {invitations.map((invitation) => (
          <li
            key={invitation.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-card bg-panel px-3 py-2.5"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{invitation.workspaceName}</p>
              <p className="text-xs text-muted">
                From {invitation.inviterName ?? 'a teammate'}, as{' '}
                {invitation.role?.toLowerCase() ?? 'member'}. Expires{' '}
                {formatDay(invitation.expiresAt)}.
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={answeringId === invitation.id}
                onClick={() => answer(invitation, false)}
              >
                Decline
              </Button>
              <Button
                size="sm"
                busy={answeringId === invitation.id}
                onClick={() => answer(invitation, true)}
              >
                Accept
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <ErrorBanner message={error} className="mt-4" />
    </section>
  );
}
