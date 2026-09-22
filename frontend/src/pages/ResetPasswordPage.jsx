import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { LayoutGrid, Lock } from 'lucide-react';
import { getErrorMessage, postWithoutSession } from '../lib/api';
import { PASSWORD_HINT, validatePassword } from '../lib/validation';
import AuthCard from '../components/AuthCard';
import Field from '../components/Field';
import IconInput from '../components/IconInput';
import ErrorBanner from '../components/ErrorBanner';
import SuccessBanner from '../components/SuccessBanner';
import Spinner from '../components/Spinner';

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token')?.trim() ?? '';

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
      await postWithoutSession('/auth/reset-password', { token, newPassword });
      setDone(true);
      setTimeout(() => navigate('/login', { replace: true }), 2000);
    } catch (error) {
      setServerError(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthCard icon={LayoutGrid} title="Choose a new password">
      {!token ? (
        <ErrorBanner
          className="mt-6"
          message="This link is missing its reset token. Request a new link from the sign in page."
        />
      ) : done ? (
        <SuccessBanner
          className="mt-6"
          message="Password updated. Taking you to the sign in page."
        />
      ) : (
        <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
          <Field
            label="New Password"
            id="newPassword"
            error={errors.newPassword}
            hint={PASSWORD_HINT}
          >
            <IconInput
              icon={Lock}
              id="newPassword"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
          </Field>

          <Field label="Confirm New Password" id="confirmPassword" error={errors.confirmPassword}>
            <IconInput
              icon={Lock}
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </Field>

          <ErrorBanner message={serverError} />

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? <Spinner /> : 'Update password'}
          </button>
        </form>
      )}
    </AuthCard>
  );
}
