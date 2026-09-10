import { useEffect, useRef, useState } from 'react';
import { MoreVertical, Pencil, Trash2, ArrowRight, CalendarDays } from 'lucide-react';
import Avatar from '../../components/Avatar';
import { taskRef, shortDate } from './taskFormat';

const PRIORITY_STYLE = {
  HIGH: 'border-rose-500/30 bg-rose-500/10 text-rose-400',
  MEDIUM: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
  LOW: 'border-zinc-500/30 bg-zinc-500/10 text-zinc-400',
};

const PRIORITY_LABEL = {
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
};

const STATUS_LABEL = {
  TODO: 'To-Do',
  DOING: 'Doing',
  DONE: 'Done',
};

const STATUSES = ['TODO', 'DOING', 'DONE'];

function assigneeName(user) {
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(' ');
  return name || user?.email || 'Unassigned';
}

export default function TaskCard({ task, onEdit, onDelete, onMove, onOpen }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return undefined;

    function handlePointerDown(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') setMenuOpen(false);
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  const isDone = task.status === 'DONE';
  const otherStatuses = STATUSES.filter((status) => status !== task.status);

  function handleDragStart(event) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(task.id));
  }

  function runAction(action) {
    setMenuOpen(false);
    action();
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      role="button"
      tabIndex={0}
      aria-label={`Open ${task.title}`}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen();
        }
      }}
      className="cursor-grab rounded-xl border border-[#27273a] bg-[#181824] p-4 shadow-sm transition-colors hover:border-[#3B82F6]/40 focus:border-[#3B82F6] focus:outline-none active:cursor-grabbing"
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ${
            PRIORITY_STYLE[task.priority] ?? PRIORITY_STYLE.LOW
          }`}
        >
          {PRIORITY_LABEL[task.priority] ?? task.priority}
        </span>

        <div className="relative shrink-0" ref={menuRef} onClick={(event) => event.stopPropagation()}>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label="Task actions"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="rounded-md p-1 text-[#71717A] transition-colors hover:bg-white/5 hover:text-white"
          >
            <MoreVertical size={16} />
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-7 z-10 w-44 overflow-hidden rounded-lg border border-[#27273a] bg-[#0c0c14] py-1 shadow-xl"
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => runAction(onEdit)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-white hover:bg-white/5"
              >
                <Pencil size={14} />
                Edit
              </button>

              {otherStatuses.map((status) => (
                <button
                  key={status}
                  type="button"
                  role="menuitem"
                  onClick={() => runAction(() => onMove(status))}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-white hover:bg-white/5"
                >
                  <ArrowRight size={14} />
                  Move to {STATUS_LABEL[status]}
                </button>
              ))}

              <div className="my-1 border-t border-[#27273a]" />

              <button
                type="button"
                role="menuitem"
                onClick={() => runAction(onDelete)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-rose-400 hover:bg-rose-500/10"
              >
                <Trash2 size={14} />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      <h3
        className={`mt-3 text-sm font-bold ${isDone ? 'text-[#71717A] line-through' : 'text-white'}`}
      >
        {task.title}
      </h3>

      {task.description && (
        <p className="mt-1.5 line-clamp-2 text-xs text-[#71717A]">{task.description}</p>
      )}

      <div className="mt-4 flex items-center gap-3 border-t border-[#27273a] pt-3">
        <span className="inline-flex items-center gap-1.5 text-[11px] text-[#71717A]">
          <CalendarDays size={13} />
          {shortDate(task.createdAt)}
        </span>
        <span className="ml-auto font-mono text-[11px] text-[#71717A]">{taskRef(task)}</span>
        {task.assignee && (
          <>
            <Avatar user={task.assignee} size={26} />
            <span className="sr-only">{assigneeName(task.assignee)}</span>
          </>
        )}
      </div>
    </div>
  );
}
