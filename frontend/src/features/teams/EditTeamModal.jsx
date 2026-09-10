import { useEffect, useState } from 'react';
import api, { getErrorMessage } from '../../lib/api';
import { validateRequired } from '../../lib/validation';
import Modal from '../../components/Modal';
import Field from '../../components/Field';
import Spinner from '../../components/Spinner';

const NAME_MAX = 100;
const DESCRIPTION_MAX = 500;

const TYPE_OPTIONS = [
  { value: 'ORGANIZATION', label: 'Organization' },
  { value: 'PERSONAL', label: 'Personal' },
];

const inputClass =
  'w-full rounded-lg border border-[#71717A]/25 bg-[#0c0c14] px-3 py-2.5 text-sm text-white placeholder:text-[#71717A]/50 focus:border-[#3B82F6] focus:outline-none';

function validateName(value) {
  const requiredError = validateRequired(value, 'Team name');
  if (requiredError) return requiredError;
  if (value.trim().length > NAME_MAX) return `Team name must be ${NAME_MAX} characters or fewer.`;
  return null;
}

export default function EditTeamModal({ open, onClose, workspace, onSaved }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('ORGANIZATION');
  const [error, setError] = useState(null);
  const [serverError, setServerError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    function sync() {
      if (!open) return;
      setName(workspace?.name ?? '');
      setDescription('');
      setType(workspace?.type ?? 'ORGANIZATION');
      setError(null);
      setServerError(null);
      setSaving(false);
    }
    sync();
  }, [open, workspace]);

  async function handleSubmit(event) {
    event.preventDefault();

    const nameError = validateName(name);
    setError(nameError);
    setServerError(null);
    if (nameError) return;

    setSaving(true);
    try {
      await api.put(`/workspaces/${workspace.id}`, {
        name: name.trim(),
        description: description.trim(),
        type,
      });
      await onSaved();
      onClose();
    } catch (requestError) {
      setServerError(getErrorMessage(requestError));
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Edit team">
      <form className="space-y-5" onSubmit={handleSubmit} noValidate>
        <Field label="Team Name" id="edit-team-name" error={error}>
          <input
            id="edit-team-name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={NAME_MAX}
            className={inputClass}
          />
        </Field>

        <Field
          label="Description"
          id="edit-team-description"
          hint="The API does not return the current description, so this starts empty. Whatever you leave here replaces it."
        >
          <textarea
            id="edit-team-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="What is this team for?"
            rows={3}
            maxLength={DESCRIPTION_MAX}
            className={`${inputClass} resize-none`}
          />
        </Field>

        <Field label="Team Type" id="edit-team-type">
          <select
            id="edit-team-type"
            value={type}
            onChange={(event) => setType(event.target.value)}
            className={inputClass}
          >
            {TYPE_OPTIONS.map((option) => (
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

        <div className="flex justify-end gap-3 border-t border-[#27273a] pt-5">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border border-[#71717A]/30 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex min-w-[7rem] items-center justify-center rounded-lg bg-[#3B82F6] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? <Spinner /> : 'Save changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
