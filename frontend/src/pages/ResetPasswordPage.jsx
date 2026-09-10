import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, LayoutGrid, Lock } from 'lucide-react';
import api, { getErrorMessage } from '../lib/api';
import { validatePassword } from '../lib/validation';
import Field from '../components/Field';
import Spinner from '../components/Spinner';

const inputClass =
  'w-full rounded-lg border border-[#71717A]/25 bg-[#0c0c14] py-2.5 pl-10 pr-3 text-sm text-white placeholder:text-[#71717A]/50 focus:border-[#3B82F6] focus:outline-none';

const passwordHint =
  'At least 8 characters, with an uppercase letter, a number and a special character (@$!%*?&#).';

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') ?? '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    const nextErrors = {};
    const passwordError = validatePassword(newPassword);
    if (passwordError) nextErrors.newPassword = passwordError;
    if (newPassword !== confirmPassword) {
      nextErrors.confirmPassword = 'The two passwords do not match.';
    }

    setErrors(nextErrors);
    setServerError(null);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      await api.post('/auth/reset-password', { token, newPassword });
      setDone(true);
      setTimeout(() => navigate('/login', { replace: true }), 2000);
    } catch (error) {
      setServerError(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0c0c14] px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-[#71717A]/20 bg-[#181824] p-8 shadow-2xl">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#3B82F6]/20">
            <LayoutGrid size={24} className="text-[#3B82F6]" />
          </div>
          <h1 className="mt-4 text-xl font-bold text-white">Choose a new password</h1>
        </div>

        {!token ? (
          <div
            role="alert"
            className="mt-6 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-3 text-xs font-medium text-rose-300"
          >
            This link is missing its reset token. Request a new link from the sign in page.
          </div>
        ) : done ? (
          <div
            role="status"
            className="mt-6 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-3 text-xs font-medium text-emerald-400"
          >
            Password updated. Taking you to the sign in page.
          </div>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
            <Field
              label="New Password"
              id="newPassword"
              error={errors.newPassword}
              hint={passwordHint}
            >
              <div className="relative">
                <Lock
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#71717A]"
                />
                <input
                  id="newPassword"
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className={inputClass}
                />
              </div>
            </Field>

            <Field label="Confirm New Password" id="confirmPassword" error={errors.confirmPassword}>
              <div className="relative">
                <Lock
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#71717A]"
                />
                <input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className={inputClass}
                />
              </div>
            </Field>

            {serverError && (
              <div
                role="alert"
                className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-300"
              >
                {serverError}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#3B82F6] py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? <Spinner /> : 'Update password'}
            </button>
          </form>
        )}

        <div className="mt-6 border-t border-[#27273a] pt-4 text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#71717A] transition-colors hover:text-white"
          >
            <ArrowLeft size={14} />
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
