import { useEffect, useState } from 'react';
import { getErrorMessage } from '../../lib/api';
import { validateRequired } from '../../lib/validation';
import Modal from '../../components/Modal';
import Field from '../../components/Field';
import Spinner from '../../components/Spinner';

const PRIORITY_OPTIONS = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
];

const TITLE_MAX = 150;
const DESCRIPTION_MAX = 40000;

const inputClass =
  'w-full rounded-lg border border-[#71717A]/25 bg-[#0c0c14] px-3 py-2.5 text-sm text-white placeholder:text-[#71717A]/50 focus:border-[#3B82F6] focus:outline-none';

function validateTitle(value) {
  const requiredError = validateRequired(value, 'Title');
  if (requiredError) return requiredError;
  if (value.trim().length > TITLE_MAX) return `Title must be ${TITLE_MAX} characters or fewer.`;
  return null;
}

function validateDescription(value) {
  if (value.trim().length > DESCRIPTION_MAX) {
    return `Description must be ${DESCRIPTION_MAX} characters or fewer.`;
  }
  return null;
}

export default function TaskFormModal({ open, onClose, onSubmit, task }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    function sync() {
      if (!open) return;
      setTitle(task?.title ?? '');
      setDescription(task?.description ?? '');
      setPriority(task?.priority ?? 'MEDIUM');
      setErrors({});
      setServerError(null);
      setSubmitting(false);
    }
    sync();
  }, [open, task]);

  async function handleSubmit(event) {
    event.preventDefault();

    const nextErrors = {};
    const titleError = validateTitle(title);
    if (titleError) nextErrors.title = titleError;
    const descriptionError = validateDescription(description);
    if (descriptionError) nextErrors.description = descriptionError;

    setErrors(nextErrors);
    setServerError(null);

    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        priority,
        assigneeId: task?.assignee?.id ?? null,
      });
    } catch (submitError) {
      setServerError(getErrorMessage(submitError));
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={task ? 'Edit task' : 'New task'}>
      <form className="space-y-5" onSubmit={handleSubmit} noValidate>
        <Field label="Title" id="task-title" error={errors.title}>
          <input
            id="task-title"
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="e.g. Draft the onboarding checklist"
            maxLength={TITLE_MAX}
            className={inputClass}
          />
        </Field>

        <Field
          label={
            <>
              Description <span className="font-normal text-[#71717A]">(optional)</span>
            </>
          }
          id="task-description"
          error={errors.description}
        >
          <textarea
            id="task-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Add more detail for this task"
            rows={4}
            maxLength={DESCRIPTION_MAX}
            className={`${inputClass} resize-none`}
          />
        </Field>

        <Field label="Priority" id="task-priority">
          <select
            id="task-priority"
            value={priority}
            onChange={(event) => setPriority(event.target.value)}
            className={inputClass}
          >
            {PRIORITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>

        {serverError && (
          <div
            role="alert"
            className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-300"
          >
            {serverError}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 border-t border-[#27273a] pt-5">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg border border-[#71717A]/30 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex min-w-[7rem] items-center justify-center gap-2 rounded-lg bg-[#3B82F6] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? <Spinner /> : task ? 'Save changes' : 'Create task'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
