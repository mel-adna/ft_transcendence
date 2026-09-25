import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, UserPlus, X } from 'lucide-react';
import api, { getErrorMessage } from '../lib/api';
import { useWorkspace } from '../context/useWorkspace';
import {
  NAME_MAX,
  DESCRIPTION_MAX,
  TYPE_OPTIONS,
  validateTeamForm,
} from '../features/teams/teamForm';
import Field from '../components/Field';
import Spinner from '../components/Spinner';
import ErrorBanner from '../components/ErrorBanner';
import { inputClass } from '../components/inputClass';

function CharCount({ value, max }) {
  return (
    <span className="text-[11px] tabular-nums text-muted">
      {value.length}/{max}
    </span>
  );
}

export default function CreateTeamPage() {
  const navigate = useNavigate();
  const { workspaces, selectWorkspace, refresh } = useWorkspace();
  const canCancel = workspaces.length > 0;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('ORGANIZATION');
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  function goToTeams() {
    navigate('/teams');
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const nextErrors = validateTeamForm({ name, description });

    setErrors(nextErrors);
    setServerError(null);

    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      const response = await api.post('/workspaces', {
        name: name.trim(),
        description: description.trim(),
        type,
      });
      selectWorkspace(response.data.id);
      await refresh();
      navigate('/', { replace: true });
    } catch (error) {
      setServerError(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto w-full max-w-2xl rounded-2xl border border-card bg-panel p-6 sm:p-8">
        <div className="flex items-center justify-between gap-4 border-b border-card pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/20">
              <UserPlus size={20} className="text-primary" />
            </div>
            <h1 className="text-lg font-bold text-white">Create New Team</h1>
          </div>
          {canCancel && (
            <button
              type="button"
              onClick={goToTeams}
              aria-label="Close"
              className="text-muted transition-colors hover:text-white"
            >
              <X size={20} />
            </button>
          )}
        </div>

        <form className="mt-6 space-y-5" onSubmit={handleSubmit} noValidate>
          <Field
            label="Team Name"
            id="name"
            error={errors.name}
            action={<CharCount value={name} max={NAME_MAX} />}
          >
            <input
              id="name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Design Systems"
              maxLength={NAME_MAX}
              className={inputClass}
            />
          </Field>

          <Field
            label={
              <>
                Description <span className="font-normal text-muted">(Optional)</span>
              </>
            }
            id="description"
            error={errors.description}
            action={<CharCount value={description} max={DESCRIPTION_MAX} />}
          >
            <textarea
              id="description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What is the primary objective of this team?"
              rows={4}
              maxLength={DESCRIPTION_MAX}
              className={`${inputClass} resize-none`}
            />
          </Field>

          <fieldset>
            <legend className="mb-1.5 block text-xs font-semibold text-muted">
              Team Type
            </legend>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {TYPE_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={`flex cursor-pointer flex-col gap-1 rounded-lg border px-4 py-3 text-sm transition-colors focus-within:border-primary ${
                    type === option.value
                      ? 'border-primary bg-primary/10'
                      : 'border-muted/25 bg-canvas hover:border-muted/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="type"
                    value={option.value}
                    checked={type === option.value}
                    onChange={() => setType(option.value)}
                    className="sr-only"
                  />
                  <span className="font-semibold text-white">{option.label}</span>
                  <span className="text-xs text-muted">{option.hint}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <ErrorBanner message={serverError} />

          <div className="flex items-center justify-end gap-3 border-t border-card pt-5">
            {canCancel && (
              <button
                type="button"
                onClick={goToTeams}
                disabled={submitting}
                className="rounded-lg border border-muted/30 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <Spinner />
              ) : (
                <>
                  Create Team
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
