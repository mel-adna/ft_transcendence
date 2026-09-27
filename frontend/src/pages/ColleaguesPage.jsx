import { useMemo, useState } from 'react';
import { UserMinus, UserPlus, Users } from 'lucide-react';
import api, { getErrorMessage } from '../lib/api';
import { notifyDataChanged } from '../lib/realtimeNotify';
import { useAuth } from '../context/useAuth';
import { useWorkspace } from '../context/useWorkspace';
import { useMembers } from '../features/colleagues/useMembers';
import { useTasks } from '../features/tasks/useTasks';
import { buildRoster, inferRoster } from '../features/colleagues/roster';
import { personName } from '../lib/people';
import AddMemberModal from '../features/colleagues/AddMemberModal';
import Avatar from '../components/Avatar';
import ConfirmModal from '../components/ConfirmModal';
import Spinner from '../components/Spinner';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import PageHeader from '../components/PageHeader';
import ErrorBanner from '../components/ErrorBanner';

const ROLE_STYLE = {
  OWNER: 'border-primary/30 bg-primary/10 text-primary',
  ADMIN: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
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
            className="inline-flex items-center gap-1.5 rounded-lg border border-muted/25 px-3 py-1.5 text-xs font-semibold text-muted transition-colors hover:border-rose-500/40 hover:text-rose-400"
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

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [pendingRemove, setPendingRemove] = useState(null);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState(null);
  const [roleSavingId, setRoleSavingId] = useState(null);
  const [roleError, setRoleError] = useState(null);

  const roster = useMemo(() => {
    const fromApi = buildRoster(members, current?.owner?.id);
    return fromApi.length > 0 ? fromApi : inferRoster(current, tasks);
  }, [members, current, tasks]);
  const rosterIds = useMemo(() => new Set(roster.map((member) => member.user.id)), [roster]);

  function openAddModal() {
    setAddModalOpen(true);
  }

  function closeAddModal() {
    setAddModalOpen(false);
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
      // Everyone's roster shows this role; the member themselves also needs it
      // because their own permissions in the UI depend on it.
      notifyDataChanged('members', null, { workspaceId });
      await reload();
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
      // Capture the audience BEFORE the delete: afterwards the removed user is
      // no longer in the workspace, so the server could not resolve them and
      // they'd never learn the team disappeared.
      const removedId = pendingRemove.user.id;
      const remainingIds = roster
        .map((m) => m.user.id)
        .filter((id) => id !== removedId);

      await api.delete(
        `/workspaces/${workspaceId}/members/${encodeURIComponent(pendingRemove.user.email)}`,
      );

      // The removed member drops the whole team; everyone else just updates
      // the roster.
      notifyDataChanged('workspaces', [removedId], { workspaceId });
      notifyDataChanged('members', [removedId, ...remainingIds], { workspaceId });

      setPendingRemove(null);
      await reload();
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
            <button
              type="button"
              onClick={openAddModal}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              Add Member
            </button>
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
        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          <UserPlus size={16} />
          Add Member
        </button>
      </PageHeader>

      <ErrorBanner message={roleError} className="mt-4" />

      <div className="mt-6">{renderBody()}</div>

      <AddMemberModal
        open={addModalOpen}
        onClose={closeAddModal}
        workspaceId={workspaceId}
        rosterIds={rosterIds}
        onAdded={reload}
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
