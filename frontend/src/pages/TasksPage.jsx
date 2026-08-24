import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertTriangle, ClipboardList, Plus, X } from 'lucide-react';
import { getErrorMessage } from '../lib/api';
import { useWorkspace } from '../context/useWorkspace';
import { useTasks } from '../features/tasks/useTasks';
import TaskCard from '../features/tasks/TaskCard';
import TaskFormModal from '../features/tasks/TaskFormModal';
import TaskDetailModal from '../features/tasks/TaskDetailModal';
import Spinner from '../components/Spinner';
import EmptyState from '../components/EmptyState';

const COLUMNS = [
  { status: 'TODO', label: 'To-Do', dotClass: 'bg-[#71717A]' },
  { status: 'DOING', label: 'Doing', dotClass: 'bg-[#3B82F6]' },
  { status: 'DONE', label: 'Done', dotClass: 'bg-emerald-500' },
];

export default function TasksPage() {
  const { current } = useWorkspace();
  const workspaceId = current?.id ?? null;
  const { tasks, loading, error, reload, createTask, updateTask, moveTask, removeTask } =
    useTasks(workspaceId);

  const location = useLocation();
  const navigate = useNavigate();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [detailTask, setDetailTask] = useState(null);
  const [createStatus, setCreateStatus] = useState('TODO');
  const [actionError, setActionError] = useState(null);
  const [dragOverStatus, setDragOverStatus] = useState(null);
  const [handledNewTaskKey, setHandledNewTaskKey] = useState(null);

  if (location.state?.newTask && location.key !== handledNewTaskKey) {
    setHandledNewTaskKey(location.key);
    setEditingTask(null);
    setCreateStatus('TODO');
    setModalOpen(true);
  }

  useEffect(() => {
    if (!location.state?.newTask) return;
    navigate(location.pathname, { replace: true, state: null });
  }, [location, navigate]);

  const tasksByStatus = useMemo(() => {
    const grouped = { TODO: [], DOING: [], DONE: [] };
    tasks.forEach((task) => {
      if (grouped[task.status]) grouped[task.status].push(task);
    });
    return grouped;
  }, [tasks]);

  function openCreateModal(status) {
    setEditingTask(null);
    setCreateStatus(status);
    setModalOpen(true);
  }

  function openEditModal(task) {
    setEditingTask(task);
    setCreateStatus(task.status);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingTask(null);
  }

  function openDetail(task) {
    setDetailTask(task);
  }

  function closeDetail() {
    setDetailTask(null);
  }

  function editFromDetail() {
    const task = detailTask;
    setDetailTask(null);
    openEditModal(task);
  }

  async function deleteFromDetail() {
    const task = detailTask;
    setDetailTask(null);
    await handleDelete(task);
  }

  async function handleFormSubmit(payload) {
    if (editingTask) {
      await updateTask(editingTask.id, { ...payload, status: editingTask.status });
      closeModal();
      return;
    }

    const created = await createTask(payload);
    closeModal();

    if (created && created.status !== createStatus) {
      try {
        await moveTask(created.id, createStatus);
      } catch (moveError) {
        setActionError(getErrorMessage(moveError));
      }
    }
  }

  function handleMove(task, status) {
    setActionError(null);
    moveTask(task.id, status).catch((moveError) => {
      setActionError(getErrorMessage(moveError));
    });
  }

  async function handleDelete(task) {
    setActionError(null);
    try {
      await removeTask(task.id);
    } catch (deleteError) {
      setActionError(getErrorMessage(deleteError));
    }
  }

  function handleDragOver(event, status) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    if (dragOverStatus !== status) setDragOverStatus(status);
  }

  function handleDragLeave(event, status) {
    if (event.currentTarget.contains(event.relatedTarget)) return;
    setDragOverStatus((previous) => (previous === status ? null : previous));
  }

  function handleDrop(event, status) {
    event.preventDefault();
    setDragOverStatus(null);
    const taskId = event.dataTransfer.getData('text/plain');
    if (!taskId) return;
    const task = tasks.find((item) => String(item.id) === taskId);
    if (!task || task.status === status) return;
    handleMove(task, status);
  }

  function dismissActionError() {
    setActionError(null);
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-4 sm:p-6 lg:p-8">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <EmptyState
          icon={AlertTriangle}
          title="Could not load tasks"
          message={getErrorMessage(error)}
          action={
            <button
              type="button"
              onClick={reload}
              className="rounded-lg bg-[#3B82F6] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              Retry
            </button>
          }
        />
      </div>
    );
  }

  const boardIsEmpty = tasks.length === 0;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-bold text-white sm:text-3xl">Task Management</h1>
        <p className="mt-2 text-sm text-[#71717A]">Manage project workflow and team assignments.</p>
      </div>

      {actionError && (
        <div
          role="alert"
          className="mt-4 flex items-start justify-between gap-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-300"
        >
          <span>{actionError}</span>
          <button
            type="button"
            onClick={dismissActionError}
            aria-label="Dismiss error"
            className="shrink-0 text-rose-300 transition-colors hover:text-white"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-3">
        {COLUMNS.map((column) => {
          const columnTasks = tasksByStatus[column.status];
          const showEmptyState = boardIsEmpty && column.status === 'TODO';

          return (
            <div
              key={column.status}
              onDragOver={(event) => handleDragOver(event, column.status)}
              onDragLeave={(event) => handleDragLeave(event, column.status)}
              onDrop={(event) => handleDrop(event, column.status)}
              className={`flex flex-col gap-3 rounded-2xl border p-3 transition-colors ${
                dragOverStatus === column.status
                  ? 'border-[#3B82F6]/60 bg-[#3B82F6]/5'
                  : 'border-[#27273a] bg-transparent'
              }`}
            >
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${column.dotClass}`} />
                  <h2 className="text-xs font-bold uppercase tracking-wide text-white">
                    {column.label}
                  </h2>
                  <span className="rounded-full bg-[#181824] px-2 py-0.5 text-[11px] font-semibold text-[#71717A]">
                    {columnTasks.length}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => openCreateModal(column.status)}
                  aria-label={`Add task to ${column.label}`}
                  className="rounded-md p-1 text-[#71717A] transition-colors hover:bg-white/5 hover:text-white"
                >
                  <Plus size={16} />
                </button>
              </div>

              <div className="flex flex-1 flex-col gap-3">
                {showEmptyState && (
                  <EmptyState
                    icon={ClipboardList}
                    title="No tasks yet"
                    message="Create your first task to get this workspace moving."
                    action={
                      <button
                        type="button"
                        onClick={() => openCreateModal('TODO')}
                        className="rounded-lg bg-[#3B82F6] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                      >
                        New Task
                      </button>
                    }
                  />
                )}

                {!showEmptyState && columnTasks.length === 0 && (
                  <p className="rounded-xl border border-dashed border-[#27273a] px-4 py-6 text-center text-xs text-[#71717A]">
                    No tasks here yet.
                  </p>
                )}

                {columnTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onEdit={() => openEditModal(task)}
                    onDelete={() => handleDelete(task)}
                    onMove={(status) => handleMove(task, status)}
                    onOpen={() => openDetail(task)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <TaskFormModal open={modalOpen} onClose={closeModal} onSubmit={handleFormSubmit} task={editingTask} />

      <TaskDetailModal
        open={Boolean(detailTask)}
        onClose={closeDetail}
        task={detailTask}
        onEdit={editFromDetail}
        onDelete={deleteFromDetail}
      />
    </div>
  );
}
