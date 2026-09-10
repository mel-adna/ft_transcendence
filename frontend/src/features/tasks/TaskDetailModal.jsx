import { Calendar, Clock, Pencil, Trash2, User } from 'lucide-react';
import Modal from '../../components/Modal';
import Avatar from '../../components/Avatar';
import { taskRef, fullDateTime, personName } from './taskFormat';

const PRIORITY_STYLE = {
  HIGH: 'border-rose-500/30 bg-rose-500/10 text-rose-400',
  MEDIUM: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
  LOW: 'border-[#71717A]/30 bg-[#71717A]/10 text-[#71717A]',
};

const STATUS_LABEL = { TODO: 'To do', DOING: 'In progress', DONE: 'Done' };

function Row({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <Icon size={15} className="mt-0.5 shrink-0 text-[#71717A]" />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#71717A]">{label}</p>
        <div className="mt-0.5 text-sm text-white">{children}</div>
      </div>
    </div>
  );
}

export default function TaskDetailModal({ open, onClose, task, onEdit, onDelete }) {
  if (!task) return null;

  return (
    <Modal open={open} onClose={onClose} title="Task details">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ${
            PRIORITY_STYLE[task.priority] ?? PRIORITY_STYLE.LOW
          }`}
        >
          {task.priority}
        </span>
        <span className="rounded-md border border-[#71717A]/25 px-2 py-0.5 text-[11px] font-semibold text-[#71717A]">
          {STATUS_LABEL[task.status] ?? task.status}
        </span>
        <span className="ml-auto font-mono text-[11px] text-[#71717A]">{taskRef(task)}</span>
      </div>

      <h3 className="mt-4 text-lg font-bold text-white">{task.title}</h3>

      {task.description ? (
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[#c2c6d6]">
          {task.description}
        </p>
      ) : (
        <p className="mt-2 text-sm italic text-[#71717A]">No description.</p>
      )}

      <div className="mt-5 divide-y divide-[#27273a] border-t border-[#27273a]">
        <Row icon={User} label="Assignee">
          {task.assignee ? (
            <span className="flex items-center gap-2">
              <Avatar user={task.assignee} size={22} />
              {personName(task.assignee)}
            </span>
          ) : (
            <span className="text-[#71717A]">Nobody yet</span>
          )}
        </Row>
        <Row icon={User} label="Created by">
          {task.creator ? (
            <span className="flex items-center gap-2">
              <Avatar user={task.creator} size={22} />
              {personName(task.creator)}
            </span>
          ) : (
            <span className="text-[#71717A]">Unknown</span>
          )}
        </Row>
        <Row icon={Calendar} label="Created">{fullDateTime(task.createdAt) || 'Unknown'}</Row>
        <Row icon={Clock} label="Last updated">{fullDateTime(task.updatedAt) || 'Unknown'}</Row>
      </div>

      <div className="mt-6 flex justify-end gap-3 border-t border-[#27273a] pt-4">
        <button
          type="button"
          onClick={onDelete}
          className="inline-flex items-center gap-2 rounded-lg border border-[#71717A]/25 px-4 py-2 text-sm font-semibold text-[#71717A] transition-colors hover:border-rose-500/40 hover:text-rose-400"
        >
          <Trash2 size={14} />
          Delete
        </button>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          <Pencil size={14} />
          Edit
        </button>
      </div>
    </Modal>
  );
}
