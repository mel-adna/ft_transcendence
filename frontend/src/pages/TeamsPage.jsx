import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Trash2, Users, AlertTriangle } from 'lucide-react';
import api, { getErrorMessage } from '../lib/api';
import { useAuth } from '../context/useAuth';
import { useWorkspace } from '../context/useWorkspace';
import Spinner from '../components/Spinner';
import Avatar from '../components/Avatar';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';

const TYPE_LABEL = {
  PERSONAL: 'Personal',
  ORGANIZATION: 'Organization',
};

function ownerName(owner) {
  const name = [owner?.firstName, owner?.lastName].filter(Boolean).join(' ');
  return name || owner?.email || 'Unknown owner';
}

function TeamCard({ workspace, canDelete, onOpen, onDelete }) {
  const isOrganization = workspace.type === 'ORGANIZATION';

  return (
    <div className="flex flex-col justify-between rounded-2xl border border-[#27273a] bg-[#181824] p-5">
      <div>
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-bold text-white">{workspace.name}</h3>
          <span
            className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
              isOrganization
                ? 'border-[#3B82F6]/30 bg-[#3B82F6]/10 text-[#3B82F6]'
                : 'border-[#71717A]/30 bg-[#71717A]/10 text-[#71717A]'
            }`}
          >
            {TYPE_LABEL[workspace.type] ?? workspace.type}
          </span>
        </div>

        <div className="mt-5 flex items-center gap-2.5 border-t border-[#27273a] pt-4">
          <Avatar user={workspace.owner} size={28} />
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-white">
              {ownerName(workspace.owner)}
            </p>
            <p className="truncate text-[11px] text-[#71717A]">Owner</p>
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-2">
        <button
          type="button"
          onClick={onOpen}
          className="flex-1 rounded-lg bg-[#3B82F6] py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          Open
        </button>
        {canDelete && (
          <button
            type="button"
            onClick={onDelete}
            aria-label={`Delete ${workspace.name}`}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#71717A]/25 text-[#71717A] transition-colors hover:border-rose-500/40 hover:text-rose-400"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

export default function TeamsPage() {
  const { user } = useAuth();
  const { workspaces, loading, error, selectWorkspace, refresh } = useWorkspace();
  const navigate = useNavigate();

  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  function openTeam(workspace) {
    selectWorkspace(workspace.id);
    navigate('/');
  }

  function requestDelete(workspace) {
    setDeleteError(null);
    setPendingDelete(workspace);
  }

  function closeDeleteModal() {
    if (deleting) return;
    setPendingDelete(null);
    setDeleteError(null);
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await api.delete(`/workspaces/${pendingDelete.id}`);
      setPendingDelete(null);
      await refresh();
    } catch (requestError) {
      setDeleteError(getErrorMessage(requestError));
    } finally {
      setDeleting(false);
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
          title="Could not load teams"
          message={getErrorMessage(error)}
          action={
            <button
              type="button"
              onClick={refresh}
              className="rounded-lg bg-[#3B82F6] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              Try again
            </button>
          }
        />
      );
    }

    if (workspaces.length === 0) {
      return (
        <EmptyState
          icon={Users}
          title="No teams yet"
          message="Create a team to start organizing tasks and collaborating with colleagues."
          action={
            <Link
              to="/teams/new"
              className="rounded-lg bg-[#3B82F6] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              Create New Team
            </Link>
          }
        />
      );
    }

    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {workspaces.map((workspace) => (
          <TeamCard
            key={workspace.id}
            workspace={workspace}
            canDelete={workspace.owner?.id === user?.id}
            onOpen={() => openTeam(workspace)}
            onDelete={() => requestDelete(workspace)}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">Teams Overview</h1>
          <p className="mt-2 max-w-2xl text-sm text-[#71717A]">
            Manage collaborative groups, monitor cross-functional task loads, and organize
            workspace members.
          </p>
        </div>
        <Link
          to="/teams/new"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          <Plus size={16} />
          Create New Team
        </Link>
      </div>

      <div className="mt-6">{renderBody()}</div>

      <Modal open={Boolean(pendingDelete)} onClose={closeDeleteModal} title="Delete team">
        <p className="text-sm text-[#71717A]">
          Are you sure you want to delete{' '}
          <span className="font-semibold text-white">{pendingDelete?.name}</span>? This action
          cannot be undone.
        </p>

        {deleteError && (
          <div
            role="alert"
            className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-300"
          >
            {deleteError}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={closeDeleteModal}
            disabled={deleting}
            className="rounded-lg border border-[#71717A]/30 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirmDelete}
            disabled={deleting}
            className="flex items-center justify-center gap-2 rounded-lg bg-rose-500 px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {deleting ? <Spinner /> : 'Delete'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
