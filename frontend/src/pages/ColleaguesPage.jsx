import { useMemo, useState } from 'react';
import { AlertTriangle, UserMinus, UserPlus, Users } from 'lucide-react';
import api, { getErrorMessage } from '../lib/api';
import { useAuth } from '../context/useAuth';
import { useWorkspace } from '../context/useWorkspace';
import { useTasks } from '../features/tasks/useTasks';
import { buildRoster, fullName } from '../features/colleagues/roster';
import AddMemberModal from '../features/colleagues/AddMemberModal';
import Avatar from '../components/Avatar';
import Modal from '../components/Modal';
import Spinner from '../components/Spinner';
import EmptyState from '../components/EmptyState';

const ROLE_STYLE = {
  OWNER: 'border-[#3B82F6]/30 bg-[#3B82F6]/10 text-[#3B82F6]',
  MEMBER: 'border-[#71717A]/30 bg-[#71717A]/10 text-[#71717A]',
};

function MemberCard({ member, isSelf, onRemove }) {
  const { user, role } = member;
  const canRemove = role !== 'OWNER' && !isSelf;
  const name = fullName(user);

  return (
    <div className="flex flex-col justify-between rounded-2xl border border-[#27273a] bg-[#181824] p-5">
      <div className="flex items-start gap-3">
        <Avatar user={user} size={40} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-white">{name}</p>
          <p className="truncate text-xs text-[#71717A]">{user.email}</p>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
            ROLE_STYLE[role] ?? ROLE_STYLE.MEMBER
          }`}
        >
          {role}
        </span>
      </div>

      <div className="mt-5 flex items-center justify-end border-t border-[#27273a] pt-4">
        {canRemove ? (
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove ${name}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#71717A]/25 px-3 py-1.5 text-xs font-semibold text-[#71717A] transition-colors hover:border-rose-500/40 hover:text-rose-400"
          >
            <UserMinus size={14} />
            Remove
          </button>
        ) : (
          <span className="text-[11px] text-[#71717A]">
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
  const { tasks, loading, error, reload } = useTasks(workspaceId);

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [pendingRemove, setPendingRemove] = useState(null);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState(null);

  const roster = useMemo(() => buildRoster(current, tasks), [current, tasks]);
  const rosterIds = useMemo(() => new Set(roster.map((member) => member.user.id)), [roster]);

  function openAddModal() {
    setAddModalOpen(true);
  }

  function closeAddModal() {
    setAddModalOpen(false);
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
      await api.delete(
        `/workspaces/${workspaceId}/members/${encodeURIComponent(pendingRemove.user.email)}`,
      );
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
      return (
        <EmptyState
          icon={AlertTriangle}
          title="Could not load colleagues"
          message={getErrorMessage(error)}
          action={
            <button
              type="button"
              onClick={reload}
              className="rounded-lg bg-[#3B82F6] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              Try again
            </button>
          }
        />
      );
    }

    if (roster.length === 0) {
      return (
        <EmptyState
          icon={Users}
          title="No colleagues yet"
          message="Once someone creates or is assigned a task here, they will show up on this page."
          action={
            <button
              type="button"
              onClick={openAddModal}
              className="rounded-lg bg-[#3B82F6] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
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
            onRemove={() => requestRemove(member)}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">Colleagues</h1>
          <p className="mt-2 max-w-2xl text-sm text-[#71717A]">
            Showing the team owner and everyone with tasks here. A member with no tasks yet will
            appear once they create or are assigned one.
          </p>
        </div>
        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          <UserPlus size={16} />
          Add Member
        </button>
      </div>

      <div className="mt-6">{renderBody()}</div>

      <AddMemberModal
        open={addModalOpen}
        onClose={closeAddModal}
        workspaceId={workspaceId}
        rosterIds={rosterIds}
        onAdded={reload}
      />

      <Modal open={Boolean(pendingRemove)} onClose={closeRemoveModal} title="Remove member">
        <p className="text-sm text-[#71717A]">
          Are you sure you want to remove{' '}
          <span className="font-semibold text-white">
            {pendingRemove ? fullName(pendingRemove.user) : ''}
          </span>{' '}
          from this team?
        </p>

        {removeError && (
          <div
            role="alert"
            className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-300"
          >
            {removeError}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={closeRemoveModal}
            disabled={removing}
            className="rounded-lg border border-[#71717A]/30 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirmRemove}
            disabled={removing}
            className="flex items-center justify-center gap-2 rounded-lg bg-rose-500 px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {removing ? <Spinner /> : 'Remove'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
