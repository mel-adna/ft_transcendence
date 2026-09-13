import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, Users } from 'lucide-react';
import api, { getErrorMessage } from '../lib/api';
import { useAuth } from '../context/useAuth';
import { useWorkspace } from '../context/useWorkspace';
import { personName } from '../lib/people';
import Spinner from '../components/Spinner';
import Avatar from '../components/Avatar';
import ConfirmModal from '../components/ConfirmModal';
import EditTeamModal from '../features/teams/EditTeamModal';
import { TYPE_LABEL } from '../features/teams/teamForm';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';

function TeamCard({ workspace, canManage, onOpen, onEdit, onDelete }) {
  const isOrganization = workspace.type === 'ORGANIZATION';

  return (
    <div className="flex flex-col justify-between rounded-2xl border border-card bg-panel p-5">
      <div>
        <div className="flex items-start justify-between gap-3">
          <h3 className="min-w-0 break-words text-base font-bold text-white">{workspace.name}</h3>
          <span
            className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
              isOrganization
                ? 'border-primary/30 bg-primary/10 text-primary'
                : 'border-muted/30 bg-muted/10 text-muted'
            }`}
          >
            {TYPE_LABEL[workspace.type] ?? workspace.type}
          </span>
        </div>

        <div className="mt-5 flex items-center gap-2.5 border-t border-card pt-4">
          <Avatar user={workspace.owner} size={28} />
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-white">
              {personName(workspace.owner, 'Unknown owner')}
            </p>
            <p className="truncate text-[11px] text-muted">Owner</p>
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-2">
        <button
          type="button"
          onClick={onOpen}
          className="flex-1 rounded-lg bg-primary py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          Open
        </button>
        {canManage && (
          <button
            type="button"
            onClick={onEdit}
            aria-label={`Edit ${workspace.name}`}
            className="rounded-lg border border-muted/25 p-2 text-muted transition-colors hover:border-primary/40 hover:text-primary"
          >
            <Pencil size={16} />
          </button>
        )}
        {canManage && (
          <button
            type="button"
            onClick={onDelete}
            aria-label={`Delete ${workspace.name}`}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-muted/25 text-muted transition-colors hover:border-rose-500/40 hover:text-rose-400"
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
  const [editing, setEditing] = useState(null);
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
      return <ErrorState title="Could not load teams" error={error} onRetry={refresh} />;
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
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
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
            canManage={workspace.owner?.id === user?.id}
            onOpen={() => openTeam(workspace)}
            onEdit={() => setEditing(workspace)}
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
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Manage collaborative groups, monitor cross-functional task loads, and organize
            workspace members.
          </p>
        </div>
        <Link
          to="/teams/new"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          <Plus size={16} />
          Create New Team
        </Link>
      </div>

      <div className="mt-6">{renderBody()}</div>

      <EditTeamModal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        workspace={editing}
        onSaved={refresh}
      />

      <ConfirmModal
        open={Boolean(pendingDelete)}
        onClose={closeDeleteModal}
        title="Delete team"
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        busy={deleting}
        error={deleteError}
      >
        <p className="text-sm text-muted">
          Are you sure you want to delete{' '}
          <span className="font-semibold text-white">{pendingDelete?.name}</span>? This action
          cannot be undone.
        </p>
      </ConfirmModal>
    </div>
  );
}
