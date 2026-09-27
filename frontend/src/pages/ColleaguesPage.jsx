import { useCallback, useEffect, useMemo, useState } from 'react';
import { MailPlus, UserMinus, Users } from 'lucide-react';
import api, { getErrorMessage } from '../lib/api';
import { notifyDataChanged } from '../lib/realtimeNotify';
import { useSocketEvent } from '../lib/useDataChanged';
import { useAuth } from '../context/useAuth';
import { useWorkspace } from '../context/useWorkspace';
import { useMembers } from '../features/colleagues/useMembers';
import { useTasks } from '../features/tasks/useTasks';
import { buildRoster, inferRoster } from '../features/colleagues/roster';
import { personName } from '../lib/people';
import { formatDay } from '../lib/dates';
import InviteMemberModal from '../features/colleagues/InviteMemberModal';
import Button from '../components/Button';
import Avatar from '../components/Avatar';
import ConfirmModal from '../components/ConfirmModal';
import Spinner from '../components/Spinner';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import PageHeader from '../components/PageHeader';
import ErrorBanner from '../components/ErrorBanner';

const ROLE_STYLE = {
  OWNER: 'border-primary/30 bg-primary/10 text-primary',
  ADMIN: 'border-warning/30 bg-warning/10 text-warning',
  MEMBER: 'border-muted/30 bg-muted/10 text-muted',
  VIEWER: 'border-muted/30 bg-muted/10 text-muted',
};

const ROLE_OPTIONS = ['ADMIN', 'MEMBER', 'VIEWER'];

function MemberCard({ member, isSelf, onRemove, onRoleChange, roleSaving }) {
  const { user, role } = member;
  const canManage = role !== 'OWNER' && !isSelf;
  const name = personName(user);

  return (
    <div className="flex flex-col justify-between rounded-2xl border border-card bg-panel p-5">
      <div className="flex items-start gap-3">
        <Avatar user={user} size={40} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-white">{name}</p>
          <p className="truncate text-xs text-muted">{user.email}</p>
        </div>
        {canManage ? (
          <select
            value={role}
            onChange={(event) => onRoleChange(event.target.value)}
            disabled={roleSaving}
            aria-label={`Role for ${name}`}
            className={`shrink-0 cursor-pointer rounded-full border bg-transparent px-2.5 py-1 text-[11px] font-semibold focus:border-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 ${
              ROLE_STYLE[role] ?? ROLE_STYLE.MEMBER
            }`}
          >
            {ROLE_OPTIONS.map((option) => (
              <option key={option} value={option} className="bg-panel text-white">
                {option}
              </option>
            ))}
          </select>
        ) : (
          <span
            className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
              ROLE_STYLE[role] ?? ROLE_STYLE.MEMBER
            }`}
          >
            {role}
          </span>
        )}
      </div>

      <div className="mt-5 flex items-center justify-end border-t border-card pt-4">
        {canManage ? (
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove ${name}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-muted/25 px-3 py-1.5 text-xs font-semibold text-muted transition-colors hover:border-danger/40 hover:text-danger"
          >
            <UserMinus size={14} />
            Remove
          </button>
        ) : (
          <span className="text-[11px] text-muted">
            {role === 'OWNER' ? 'Workspace owner' : 'This is you'}
          </span>
        )}
      </div>
    </div>
  );
}

export default function ColleaguesPage() {
  const { user } = useAuth();
  const { current } = useWorkspace();
  const workspaceId = current?.id ?? null;
  const { members, loading, error, reload } = useMembers(workspaceId);
  const { tasks } = useTasks(workspaceId);

  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [invitations, setInvitations] = useState([]);
  const [invitationError, setInvitationError] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);
  const [pendingRemove, setPendingRemove] = useState(null);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState(null);
  const [roleSavingId, setRoleSavingId] = useState(null);
  const [roleError, setRoleError] = useState(null);

  const roster = useMemo(() => {
    const fromApi = buildRoster(members, current?.owner?.id);
    return fromApi.length > 0 ? fromApi : inferRoster(current, tasks);
  }, [members, current, tasks]);

  const myRole = roster.find((member) => member.user.id === user?.id)?.role ?? null;
  const canInvite = myRole === 'OWNER' || myRole === 'ADMIN';

  const rosterEmails = useMemo(
    () => new Set(roster.map((member) => member.user.email?.toLowerCase()).filter(Boolean)),
    [roster],
  );
  const invitedEmails = useMemo(
    () => new Set(invitations.map((invitation) => invitation.inviteeEmail?.toLowerCase())),
    [invitations],
  );

  const loadInvitations = useCallback(async () => {
    if (!workspaceId || !canInvite) {
      setInvitations([]);
      return;
    }
    try {
      const response = await api.get(`/workspaces/${workspaceId}/invitations`);
      const now = Date.now();
      const waiting = (Array.isArray(response.data) ? response.data : []).filter(
        (invitation) =>
          invitation.status === 'PENDING' && new Date(invitation.expiresAt).getTime() > now,
      );
      setInvitations(waiting);
      setInvitationError(null);
    } catch (requestError) {
      setInvitationError(getErrorMessage(requestError));
    }
  }, [workspaceId, canInvite]);

  useEffect(() => {
    function sync() {
      loadInvitations();
    }
    sync();
  }, [loadInvitations]);

  useSocketEvent('notification:new', (event) => {
    if (event?.type !== 'WORKSPACE') return;
    reload({ quiet: true });
    loadInvitations();
  });

  function openInviteModal() {
    setInviteModalOpen(true);
  }

  function closeInviteModal() {
    setInviteModalOpen(false);
  }

  async function cancelInvitation(invitation) {
    setCancellingId(invitation.id);
    setInvitationError(null);
    try {
      await api.delete(`/workspaces/${workspaceId}/invitations/${invitation.id}`);
      await loadInvitations();
    } catch (requestError) {
      setInvitationError(getErrorMessage(requestError));
    } finally {
      setCancellingId(null);
    }
  }

  async function changeRole(member, role) {
    if (!workspaceId || role === member.role) return;
    setRoleSavingId(member.user.id);
    setRoleError(null);
    try {
      await api.put(`/workspaces/${workspaceId}/members/role`, {
        email: member.user.email,
        role,
      });
      notifyDataChanged('members', null, { workspaceId });
      await reload({ quiet: true });
    } catch (requestError) {
      setRoleError(getErrorMessage(requestError));
    } finally {
      setRoleSavingId(null);
    }
  }

  function requestRemove(member) {
    setRemoveError(null);
    setPendingRemove(member);
  }

  function closeRemoveModal() {
    if (removing) return;
    setPendingRemove(null);
    setRemoveError(null);
  }

  async function confirmRemove() {
    if (!pendingRemove || !workspaceId) return;
    setRemoving(true);
    setRemoveError(null);
    try {
      const removedId = pendingRemove.user.id;
      const remainingIds = roster.map((member) => member.user.id).filter((id) => id !== removedId);

      await api.delete(
        `/workspaces/${workspaceId}/members/${encodeURIComponent(pendingRemove.user.email)}`,
      );

      notifyDataChanged('workspaces', [removedId], { workspaceId });
      notifyDataChanged('members', remainingIds, { workspaceId });

      setPendingRemove(null);
      await reload({ quiet: true });
    } catch (requestError) {
      setRemoveError(getErrorMessage(requestError));
    } finally {
      setRemoving(false);
    }
  }

  function renderBody() {
    if (loading) {
      return (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Spinner />
        </div>
      );
    }

    if (error) {
      return <ErrorState title="Could not load colleagues" error={error} onRetry={reload} />;
    }

    if (roster.length === 0) {
      return (
        <EmptyState
          icon={Users}
          title="No colleagues yet"
          message="Invite a teammate to get started."
          action={
            canInvite ? (
              <Button icon={MailPlus} onClick={openInviteModal}>
                Invite someone
              </Button>
            ) : null
          }
        />
      );
    }

    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {roster.map((member) => (
          <MemberCard
            key={member.user.id}
            member={member}
            isSelf={member.user.id === user?.id}
            roleSaving={roleSavingId === member.user.id}
            onRoleChange={(role) => changeRole(member, role)}
            onRemove={() => requestRemove(member)}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Colleagues"
        description="Everyone who belongs to this team, and what they can do here."
      >
        {canInvite ? (
          <Button icon={MailPlus} onClick={openInviteModal}>
            Invite someone
          </Button>
        ) : null}
      </PageHeader>

      <ErrorBanner message={roleError} className="mt-4" />
      <ErrorBanner message={invitationError} className="mt-4" />

      {canInvite && invitations.length > 0 ? (
        <section className="mt-6 rounded-2xl border border-card bg-panel p-5">
          <h2 className="text-base font-bold text-white">Waiting to accept</h2>
          <p className="mt-1 text-sm text-muted">
            They join the team as soon as they accept the invitation.
          </p>
          <ul className="mt-4 space-y-2">
            {invitations.map((invitation) => (
              <li
                key={invitation.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-card px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">
                    {invitation.inviteeEmail}
                  </p>
                  <p className="text-xs text-muted">
                    Invited as {invitation.role.toLowerCase()}, expires {formatDay(invitation.expiresAt)}
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  busy={cancellingId === invitation.id}
                  onClick={() => cancelInvitation(invitation)}
                >
                  Cancel
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="mt-6">{renderBody()}</div>

      <InviteMemberModal
        open={inviteModalOpen}
        onClose={closeInviteModal}
        workspaceId={workspaceId}
        rosterEmails={rosterEmails}
        invitedEmails={invitedEmails}
        onInvited={loadInvitations}
      />

      <ConfirmModal
        open={Boolean(pendingRemove)}
        onClose={closeRemoveModal}
        title="Remove member"
        confirmLabel="Remove"
        onConfirm={confirmRemove}
        busy={removing}
        error={removeError}
      >
        <p className="text-sm text-muted">
          Are you sure you want to remove{' '}
          <span className="font-semibold text-white">
            {pendingRemove ? personName(pendingRemove.user) : ''}
          </span>{' '}
          from this team?
        </p>
      </ConfirmModal>
    </div>
  );
}
