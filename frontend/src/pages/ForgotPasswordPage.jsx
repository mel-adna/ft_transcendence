import { useState } from 'react';
import { LayoutGrid, Mail } from 'lucide-react';
import api, { getErrorMessage } from '../lib/api';
import { validateEmail } from '../lib/validation';
import AuthCard from '../components/AuthCard';
import Field from '../components/Field';
import IconInput from '../components/IconInput';
import ErrorBanner from '../components/ErrorBanner';
import SuccessBanner from '../components/SuccessBanner';
import Spinner from '../components/Spinner';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState(null);
  const [serverError, setServerError] = useState(null);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    const emailError = validateEmail(email.trim());
    setFieldError(emailError);
    setServerError(null);
    if (emailError) return;

    setSubmitting(true);
    try {
      await api.post('/auth/forgot-password', { email: email.trim() });
      setSent(true);
    } catch (error) {
      setServerError(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthCard
      icon={LayoutGrid}
      title="Reset your password"
      subtitle="We will email you a link to choose a new one."
    >
      {sent ? (
        <div className="mt-6">
          <SuccessBanner message="If that email is registered, a reset link is on its way. The link is valid for 15 minutes." />
          <p className="mt-4 text-xs text-muted">
            Nothing arrived? Check your spam folder, or try again in a moment.
          </p>
        </div>
      ) : (
        <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
          <Field label="Email Address" id="email" error={fieldError}>
            <IconInput
              icon={Mail}
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@company.com"
            />
          </Field>

          <ErrorBanner message={serverError} />

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? <Spinner /> : 'Send reset link'}
          </button>
        </form>
      )}
    </AuthCard>
  );
}
