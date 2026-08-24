import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, LogOut, Trash2, Upload } from 'lucide-react';
import api, { getErrorMessage } from '../lib/api';
import { downloadFile } from '../lib/csv';
import { validatePassword, validateRequired } from '../lib/validation';
import { useAuth } from '../context/useAuth';
import { useWorkspace } from '../context/useWorkspace';
import { buildDataExport } from '../features/settings/dataExport';
import Field from '../components/Field';
import Spinner from '../components/Spinner';
import Avatar from '../components/Avatar';
import Modal from '../components/Modal';

const EXPORT_FILENAME = 'team-pulse-my-data.json';
const DELETE_CONFIRMATION_WORD = 'DELETE';

const passwordHint =
  'At least 8 characters, with an uppercase letter, a number and a special character (@$!%*?&#).';

const inputClass =
  'w-full rounded-lg border border-[#71717A]/25 bg-[#0c0c14] px-3 py-2.5 text-sm text-white placeholder:text-[#71717A]/50 focus:border-[#3B82F6] focus:outline-none';

const cardClass = 'rounded-2xl border border-[#27273a] bg-[#181824] p-5 sm:p-6';

const primaryButtonClass =
  'flex items-center justify-center gap-2 rounded-lg bg-[#3B82F6] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60';

function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-300"
    >
      {message}
    </div>
  );
}

function SuccessBanner({ show, message }) {
  if (!show) return null;
  return (
    <div
      role="status"
      className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-400"
    >
      {message}
    </div>
  );
}

const AVATAR_MAX_BYTES = 5 * 1024 * 1024;

function ProfileCard({ user, onSaved }) {
  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarError, setAvatarError] = useState(null);
  const fileInputRef = useRef(null);

  async function handleAvatarChange(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setAvatarError(null);
    setSuccess(false);

    if (!file.type.startsWith('image/')) {
      setAvatarError('Choose an image file.');
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      setAvatarError('That image is larger than 5 MB. Pick a smaller one.');
      return;
    }

    const body = new FormData();
    body.append('file', file);

    setUploading(true);
    try {
      await api.post('/users/me/avatar', body, {
        headers: { 'Content-Type': undefined },
      });
      await onSaved();
    } catch (uploadError) {
      setAvatarError(getErrorMessage(uploadError));
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const nextErrors = {};
    const firstNameError = validateRequired(firstName, 'First name');
    if (firstNameError) nextErrors.firstName = firstNameError;
    const lastNameError = validateRequired(lastName, 'Last name');
    if (lastNameError) nextErrors.lastName = lastNameError;

    setErrors(nextErrors);
    setServerError(null);
    setSuccess(false);

    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      await api.put('/users/profile', {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        avatarUrl: user?.avatarUrl ?? null,
      });
      setSuccess(true);
      await onSaved();
    } catch (error) {
      setServerError(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  const previewUser = { firstName, lastName, avatarUrl: user?.avatarUrl ?? null };

  return (
    <section className={cardClass}>
      <h2 className="text-base font-bold text-white">Profile</h2>
      <p className="mt-1 text-sm text-[#71717A]">
        Update your name and avatar. This is how you appear to the rest of your team.
      </p>

      <form
        className="mt-5 space-y-4 border-t border-[#27273a] pt-5"
        onSubmit={handleSubmit}
        noValidate
      >
        <div className="flex items-center gap-4">
          <Avatar user={previewUser} size={56} />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-[#71717A]">Profile photo</p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="mt-2 inline-flex items-center gap-2 rounded-lg border border-[#71717A]/25 px-3 py-2 text-xs font-semibold text-[#71717A] transition-colors hover:border-[#3B82F6]/40 hover:text-white disabled:opacity-60"
            >
              {uploading ? <Spinner /> : <Upload size={14} />}
              {uploading ? 'Uploading' : 'Upload a photo'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
            <p className="mt-2 text-[11px] text-[#71717A]">
              JPEG or PNG, up to 5 MB. Saved as soon as you pick it.
            </p>
            {avatarError && (
              <p className="mt-1 text-[11px] font-medium text-rose-400">{avatarError}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="First Name" id="firstName" error={errors.firstName}>
            <input
              id="firstName"
              type="text"
              autoComplete="given-name"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              maxLength={50}
              className={inputClass}
            />
          </Field>
          <Field label="Last Name" id="lastName" error={errors.lastName}>
            <input
              id="lastName"
              type="text"
              autoComplete="family-name"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              maxLength={50}
              className={inputClass}
            />
          </Field>
        </div>

        <Field label="Email Address" id="email" hint="Your email cannot be changed here.">
          <input
            id="email"
            type="email"
            value={user?.email ?? ''}
            disabled
            className={`${inputClass} cursor-not-allowed opacity-60`}
          />
        </Field>

        <ErrorBanner message={serverError} />
        <SuccessBanner show={success} message="Profile updated." />

        <div className="flex justify-end border-t border-[#27273a] pt-4">
          <button type="submit" disabled={submitting} className={primaryButtonClass}>
            {submitting ? <Spinner /> : 'Save changes'}
          </button>
        </div>
      </form>
    </section>
  );
}

function PasswordCard() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    const nextErrors = {};
    const currentError = validateRequired(currentPassword, 'Current password');
    if (currentError) nextErrors.currentPassword = currentError;

    const newPasswordError = validatePassword(newPassword);
    if (newPasswordError) nextErrors.newPassword = newPasswordError;

    if (newPassword !== confirmPassword) {
      nextErrors.confirmPassword = 'New passwords do not match.';
    }

    setErrors(nextErrors);
    setServerError(null);
    setSuccess(false);

    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      await api.post('/users/change-password', { currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccess(true);
    } catch (error) {
      setServerError(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className={cardClass}>
      <h2 className="text-base font-bold text-white">Password</h2>
      <p className="mt-1 text-sm text-[#71717A]">Change the password used to sign in.</p>

      <form
        className="mt-5 space-y-4 border-t border-[#27273a] pt-5"
        onSubmit={handleSubmit}
        noValidate
      >
        <Field label="Current Password" id="currentPassword" error={errors.currentPassword}>
          <input
            id="currentPassword"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            className={inputClass}
          />
        </Field>

        <Field
          label="New Password"
          id="newPassword"
          error={errors.newPassword}
          hint={passwordHint}
        >
          <input
            id="newPassword"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="Confirm New Password" id="confirmPassword" error={errors.confirmPassword}>
          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className={inputClass}
          />
        </Field>

        <ErrorBanner message={serverError} />
        <SuccessBanner show={success} message="Password updated." />

        <div className="flex justify-end border-t border-[#27273a] pt-4">
          <button type="submit" disabled={submitting} className={primaryButtonClass}>
            {submitting ? <Spinner /> : 'Update password'}
          </button>
        </div>
      </form>
    </section>
  );
}

function DataExportCard({ user, workspaces }) {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);

  async function handleExport() {
    setExporting(true);
    setError(null);
    try {
      const payload = await buildDataExport(api, user, workspaces);
      downloadFile(EXPORT_FILENAME, JSON.stringify(payload, null, 2), 'application/json');
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setExporting(false);
    }
  }

  return (
    <section className={cardClass}>
      <h2 className="text-base font-bold text-white">Your data</h2>
      <p className="mt-1 text-sm text-[#71717A]">
        Download a copy of everything Team Pulse stores about you: your profile, your teams and
        their tasks.
      </p>

      <div className="mt-5 flex flex-col gap-3 border-t border-[#27273a] pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-[#71717A]">Saved as a single JSON file.</p>
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-[#71717A]/30 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {exporting ? <Spinner /> : <Download size={16} />}
          Download my data
        </button>
      </div>

      {error && (
        <div className="mt-4">
          <ErrorBanner message={error} />
        </div>
      )}
    </section>
  );
}

function DeleteAccountCard({ onDeleted }) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);

  function openModal() {
    setConfirmText('');
    setError(null);
    setOpen(true);
  }

  function closeModal() {
    if (deleting) return;
    setOpen(false);
  }

  async function confirmDelete() {
    setDeleting(true);
    setError(null);
    try {
      await api.delete('/users/me');
      onDeleted();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
      setDeleting(false);
    }
  }

  const canConfirm = confirmText === DELETE_CONFIRMATION_WORD;

  return (
    <section className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-5 sm:p-6">
      <h2 className="text-base font-bold text-rose-400">Delete account</h2>
      <p className="mt-1 text-sm text-[#71717A]">
        Permanently delete your account and everything tied to it. This action is irreversible.
      </p>

      <div className="mt-5 border-t border-rose-500/20 pt-5">
        <button
          type="button"
          onClick={openModal}
          className="inline-flex items-center gap-2 rounded-lg bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          <Trash2 size={16} />
          Delete account
        </button>
      </div>

      <Modal open={open} onClose={closeModal} title="Delete account">
        <div className="space-y-4">
          <p className="text-sm text-[#71717A]">
            This permanently deletes your account, signs you out everywhere, and cannot be
            undone. Type <span className="font-semibold text-white">DELETE</span> to confirm.
          </p>

          <Field label="Confirmation" id="delete-confirm">
            <input
              id="delete-confirm"
              type="text"
              autoComplete="off"
              value={confirmText}
              onChange={(event) => setConfirmText(event.target.value)}
              placeholder="DELETE"
              disabled={deleting}
              className={inputClass}
            />
          </Field>

          <ErrorBanner message={error} />

          <div className="flex justify-end gap-3 border-t border-[#27273a] pt-4">
            <button
              type="button"
              onClick={closeModal}
              disabled={deleting}
              className="rounded-lg border border-[#71717A]/30 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmDelete}
              disabled={!canConfirm || deleting}
              className="flex items-center justify-center gap-2 rounded-lg bg-rose-500 px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {deleting ? <Spinner /> : 'Delete account'}
            </button>
          </div>
        </div>
      </Modal>
    </section>
  );
}

export default function SettingsPage() {
  const { user, refreshUser, logout } = useAuth();
  const { workspaces } = useWorkspace();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  function handleAccountDeleted() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-2xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white sm:text-3xl">Account Settings</h1>
            <p className="mt-2 text-sm text-[#71717A]">Manage your profile, password and data.</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-[#71717A]/30 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/5"
          >
            <LogOut size={16} />
            Log out
          </button>
        </div>

        <div className="mt-6 space-y-6">
          <ProfileCard user={user} onSaved={refreshUser} />
          <PasswordCard />
          <DataExportCard user={user} workspaces={workspaces} />
          <DeleteAccountCard onDeleted={handleAccountDeleted} />
        </div>
      </div>
    </div>
  );
}
