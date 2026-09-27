import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Copy, Download, KeyRound, LogOut, Trash2, Upload } from 'lucide-react';
import api, { getErrorMessage } from '../lib/api';
import { downloadFile } from '../lib/csv';
import { formatDay } from '../lib/dates';
import { PASSWORD_HINT, validatePassword, validateRequired } from '../lib/validation';
import { useAuth } from '../context/useAuth';
import { useWorkspace } from '../context/useWorkspace';
import { buildDataExport } from '../features/settings/dataExport';
import Button from '../components/Button';
import Field from '../components/Field';
import Spinner from '../components/Spinner';
import Avatar from '../components/Avatar';
import ConfirmModal from '../components/ConfirmModal';
import PageHeader from '../components/PageHeader';
import ErrorBanner from '../components/ErrorBanner';
import SuccessBanner from '../components/SuccessBanner';
import { inputClass } from '../components/inputClass';

const EXPORT_FILENAME = 'team-pulse-my-data.json';
const DELETE_CONFIRMATION_WORD = 'DELETE';
const API_DOCS_URL = '/api/v1/swagger-ui/index.html';

const cardClass = 'rounded-2xl border border-card bg-panel p-5 sm:p-6';

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
      await api.put('/users/me', {
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
      <p className="mt-1 text-sm text-muted">
        Update your name and avatar. This is how you appear to the rest of your team.
      </p>

      <form
        className="mt-5 space-y-4 border-t border-card pt-5"
        onSubmit={handleSubmit}
        noValidate
      >
        <div className="flex items-center gap-4">
          <Avatar user={previewUser} size={56} />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-muted">Profile photo</p>
            <Button
              variant="secondary"
              size="sm"
              icon={Upload}
              busy={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="mt-2"
            >
              {uploading ? 'Uploading' : 'Upload a photo'}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
            <p className="mt-2 text-[11px] text-muted">
              JPEG or PNG, up to 5 MB. Saved as soon as you pick it.
            </p>
            {avatarError && (
              <p className="mt-1 text-[11px] font-medium text-danger">{avatarError}</p>
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
        {success && <SuccessBanner message="Profile updated." />}

        <div className="flex justify-end border-t border-card pt-4">
          <Button type="submit" busy={submitting}>
            Save changes
          </Button>
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
      await api.post('/auth/change-password', { currentPassword, newPassword });
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
      <p className="mt-1 text-sm text-muted">Change the password used to sign in.</p>

      <form
        className="mt-5 space-y-4 border-t border-card pt-5"
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
          hint={PASSWORD_HINT}
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
        {success && <SuccessBanner message="Password updated." />}

        <div className="flex justify-end border-t border-card pt-4">
          <Button type="submit" busy={submitting}>
            Update password
          </Button>
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
      const payload = await buildDataExport(user, workspaces);
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
      <p className="mt-1 text-sm text-muted">
        Download a copy of everything Team Pulse stores about you: your profile, your teams and
        their tasks.
      </p>

      <div className="mt-5 flex flex-col gap-3 border-t border-card pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted">Saved as a single JSON file.</p>
        <Button variant="secondary" icon={Download} busy={exporting} onClick={handleExport}>
          Download my data
        </Button>
      </div>

      <ErrorBanner message={error} className="mt-4" />
    </section>
  );
}

function ApiKeyCard() {
  const [key, setKey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [copied, setCopied] = useState(false);
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    api
      .get('/api-key')
      .then((response) => {
        if (!cancelled) setKey(response.data);
      })
      .catch((requestError) => {
        if (cancelled) return;
        if (requestError?.response?.status === 404) setKey(null);
        else setError(getErrorMessage(requestError));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleCreate() {
    setBusy(true);
    setError(null);
    setCopied(false);
    try {
      const created = await api.post('/api-key/rotate');
      setNewKey(created.data?.apiKey ?? '');
      const current = await api.get('/api-key');
      setKey(current.data);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  }

  async function handleRevoke() {
    setBusy(true);
    setError(null);
    try {
      await api.delete('/api-key');
      setKey(null);
      setNewKey('');
      setRevokeOpen(false);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(newKey);
      setCopied(true);
    } catch {
      setError('Copying failed. Select the key and copy it by hand.');
    }
  }

  const lastUsed = formatDay(key?.lastUsedAt);
  const created = formatDay(key?.createdAt);

  return (
    <section className={cardClass}>
      <h2 className="text-base font-bold text-white">API key</h2>
      <p className="mt-1 text-sm text-muted">
        Call the public API from your own scripts with an <span className="font-mono">X-API-Key</span>{' '}
        header, without signing in.{' '}
        <a
          href={API_DOCS_URL}
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-primary hover:underline"
        >
          See what it can do
        </a>
        .
      </p>

      <div className="mt-5 border-t border-card pt-5">
        {loading ? (
          <p className="flex items-center gap-2 text-sm text-muted">
            <Spinner />
            Loading your key
          </p>
        ) : key ? (
          <dl className="grid gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-xs text-muted">Key</dt>
              <dd className="mt-1 font-mono text-sm text-white">{key.keyPrefix}...</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Created</dt>
              <dd className="mt-1 text-sm text-white">{created ?? 'Unknown'}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Last used</dt>
              <dd className="mt-1 text-sm text-white">{lastUsed ?? 'Never'}</dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-muted">You do not have a key yet.</p>
        )}

        {newKey ? (
          <div className="mt-5 rounded-lg border border-primary/40 bg-primary/5 p-4">
            <p className="text-sm font-semibold text-white">Copy it now. It is shown only once.</p>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
              <code className="flex-1 overflow-x-auto rounded-lg bg-canvas px-3 py-2 font-mono text-xs text-white">
                {newKey}
              </code>
              <Button variant="secondary" icon={copied ? Check : Copy} onClick={handleCopy}>
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
          </div>
        ) : null}

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          {key ? (
            <Button variant="secondary" icon={Trash2} disabled={busy} onClick={() => setRevokeOpen(true)}>
              Revoke
            </Button>
          ) : null}
          <Button icon={KeyRound} busy={busy} onClick={handleCreate}>
            {key ? 'Replace key' : 'Create key'}
          </Button>
        </div>
      </div>

      <ErrorBanner message={error} className="mt-4" />

      <ConfirmModal
        open={revokeOpen}
        onClose={() => (busy ? null : setRevokeOpen(false))}
        title="Revoke API key"
        confirmLabel="Revoke key"
        onConfirm={handleRevoke}
        busy={busy}
      >
        <p className="text-sm text-muted">
          Any script using this key stops working straight away. You can create a new one whenever
          you need it.
        </p>
      </ConfirmModal>
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
    <section className="rounded-2xl border border-danger/30 bg-danger/5 p-5 sm:p-6">
      <h2 className="text-base font-bold text-danger">Delete account</h2>
      <p className="mt-1 text-sm text-muted">
        Permanently delete your account and everything tied to it. This action is irreversible.
      </p>

      <div className="mt-5 border-t border-danger/20 pt-5">
        <Button variant="danger" icon={Trash2} onClick={openModal}>
          Delete account
        </Button>
      </div>

      <ConfirmModal
        open={open}
        onClose={closeModal}
        title="Delete account"
        confirmLabel="Delete account"
        onConfirm={confirmDelete}
        busy={deleting}
        disabled={!canConfirm}
        error={error}
      >
        <div className="space-y-4">
          <p className="text-sm text-muted">
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
        </div>
      </ConfirmModal>
    </section>
  );
}

export default function SettingsPage() {
  const { user, refreshUser, logout } = useAuth();
  const { workspaces } = useWorkspace();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-2xl">
        <PageHeader title="Account Settings" description="Manage your profile, password and data.">
          <Button variant="secondary" icon={LogOut} onClick={handleLogout}>
            Log out
          </Button>
        </PageHeader>

        <div className="mt-6 space-y-6">
          <ProfileCard user={user} onSaved={refreshUser} />
          <PasswordCard />
          <DataExportCard user={user} workspaces={workspaces} />
          <ApiKeyCard />
          <DeleteAccountCard onDeleted={handleLogout} />
        </div>
      </div>
    </div>
  );
}
