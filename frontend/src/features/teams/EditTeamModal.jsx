import { useEffect, useState } from 'react';
import api, { getErrorMessage } from '../../lib/api';
import {
  NAME_MAX,
  DESCRIPTION_MAX,
  TYPE_OPTIONS,
  validateName,
  validateDescription,
} from './teamForm';
import Modal from '../../components/Modal';
import Field from '../../components/Field';
import Spinner from '../../components/Spinner';
import ErrorBanner from '../../components/ErrorBanner';
import { inputClass } from '../../components/inputClass';

export default function EditTeamModal({ open, onClose, workspace, onSaved }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('ORGANIZATION');
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    function sync() {
      if (!open) return;
      setName(workspace?.name ?? '');
      setDescription(workspace?.description ?? '');
      setType(workspace?.type ?? 'ORGANIZATION');
      setErrors({});
      setServerError(null);
      setSaving(false);
    }
    sync();
  }, [open, workspace]);

  async function handleSubmit(event) {
    event.preventDefault();

    const nextErrors = {};
    const nameError = validateName(name);
    if (nameError) nextErrors.name = nameError;
    const descriptionError = validateDescription(description);
    if (descriptionError) nextErrors.description = descriptionError;

    setErrors(nextErrors);
    setServerError(null);
    if (Object.keys(nextErrors).length > 0) return;

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
        <Field label="Team Name" id="edit-team-name" error={errors.name}>
          <input
            id="edit-team-name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={NAME_MAX}
            className={inputClass}
          />
        </Field>

        <Field label="Description" id="edit-team-description" error={errors.description}>
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

        <ErrorBanner message={serverError} />

        <div className="flex justify-end gap-3 border-t border-card pt-5">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border border-muted/30 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex min-w-[7rem] items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? <Spinner /> : 'Save changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
