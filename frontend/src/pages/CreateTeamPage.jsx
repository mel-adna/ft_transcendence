import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, UserPlus, X } from 'lucide-react';
import api, { getErrorMessage } from '../lib/api';
import { validateRequired } from '../lib/validation';
import { useWorkspace } from '../context/useWorkspace';
import Field from '../components/Field';
import Spinner from '../components/Spinner';

const inputClass =
  'w-full rounded-lg border border-[#71717A]/25 bg-[#0c0c14] px-3 py-2.5 text-sm text-white placeholder:text-[#71717A]/50 focus:border-[#3B82F6] focus:outline-none';

const TYPE_OPTIONS = [
  {
    value: 'ORGANIZATION',
    label: 'Organization',
    hint: 'A shared workspace for a team or company.',
  },
  {
    value: 'PERSONAL',
    label: 'Personal',
    hint: 'A private workspace just for you.',
  },
];

function validateName(value) {
  const requiredError = validateRequired(value, 'Team name');
  if (requiredError) return requiredError;
  if (value.trim().length > 100) return 'Team name must be 100 characters or fewer.';
  return null;
}

export default function CreateTeamPage() {
  const navigate = useNavigate();
  const { selectWorkspace, refresh } = useWorkspace();

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

    const nextErrors = {};
    const nameError = validateName(name);
    if (nameError) nextErrors.name = nameError;

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
      <div className="mx-auto w-full max-w-2xl rounded-2xl border border-[#27273a] bg-[#181824] p-6 sm:p-8">
        <div className="flex items-center justify-between gap-4 border-b border-[#27273a] pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#3B82F6]/20">
              <UserPlus size={20} className="text-[#3B82F6]" />
            </div>
            <h1 className="text-lg font-bold text-white">Create New Team</h1>
          </div>
          <button
            type="button"
            onClick={goToTeams}
            aria-label="Close"
            className="text-[#71717A] transition-colors hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        <form className="mt-6 space-y-5" onSubmit={handleSubmit} noValidate>
          <Field label="Team Name" id="name" error={errors.name}>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Design Systems"
              maxLength={100}
              className={inputClass}
            />
          </Field>

          <Field
            label={
              <>
                Description <span className="font-normal text-[#71717A]">(Optional)</span>
              </>
            }
            id="description"
          >
            <textarea
              id="description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What is the primary objective of this team?"
              rows={4}
              className={`${inputClass} resize-none`}
            />
          </Field>

          <fieldset>
            <legend className="mb-1.5 block text-xs font-semibold text-[#71717A]">
              Team Type
            </legend>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {TYPE_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={`flex cursor-pointer flex-col gap-1 rounded-lg border px-4 py-3 text-sm transition-colors focus-within:border-[#3B82F6] ${
                    type === option.value
                      ? 'border-[#3B82F6] bg-[#3B82F6]/10'
                      : 'border-[#71717A]/25 bg-[#0c0c14] hover:border-[#71717A]/50'
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
                  <span className="text-xs text-[#71717A]">{option.hint}</span>
                </label>
              ))}
            </div>
          </fieldset>

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
              onClick={goToTeams}
              disabled={submitting}
              className="rounded-lg border border-[#71717A]/30 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center justify-center gap-2 rounded-lg bg-[#3B82F6] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
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
