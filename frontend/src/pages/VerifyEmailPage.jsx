import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { KeyRound, Mail, MailCheck } from 'lucide-react';
import { getErrorMessage, postWithoutSession } from '../lib/api';
import { validateEmail } from '../lib/validation';
import { useAuth } from '../context/useAuth';
import AuthCard from '../components/AuthCard';
import Field from '../components/Field';
import IconInput from '../components/IconInput';
import ErrorBanner from '../components/ErrorBanner';
import Spinner from '../components/Spinner';

const CODE_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;

function validateCode(value) {
  if (!value.trim()) return 'Verification code is required.';
  if (!/^\d{6}$/.test(value.trim())) return 'The code is 6 digits.';
  return null;
}

export default function VerifyEmailPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { verifyEmail } = useAuth();

  const emailFromRoute = location.state?.email ?? '';
  const arrivedFromLogin = Boolean(location.state?.fromLogin);
  const codeAlreadySent = Boolean(location.state?.codeSent);

  const [email, setEmail] = useState(emailFromRoute);
  const [code, setCode] = useState('');
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [notice, setNotice] = useState(
    arrivedFromLogin
      ? 'Your account is not verified yet. A new verification code has been sent to your email.'
      : null,
  );
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(codeAlreadySent ? RESEND_COOLDOWN_SECONDS : 0);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setTimeout(() => setCooldown((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function handleSubmit(event) {
    event.preventDefault();

    const nextErrors = {};
    const emailError = validateEmail(email);
    if (emailError) nextErrors.email = emailError;
    const codeError = validateCode(code);
    if (codeError) nextErrors.code = codeError;

    setErrors(nextErrors);
    setServerError(null);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      await verifyEmail(email.trim(), code.trim());
      navigate('/', { replace: true });
    } catch (error) {
      setServerError(getErrorMessage(error));
      setCode('');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    const emailError = validateEmail(email);
    if (emailError) {
      setErrors((current) => ({ ...current, email: emailError }));
      return;
    }

    setResending(true);
    setServerError(null);
    setNotice(null);
    try {
      await postWithoutSession('/auth/resend-verification', { email: email.trim() });
      setNotice('A new code is on its way. It expires 15 minutes from now.');
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (error) {
      setServerError(getErrorMessage(error));
    } finally {
      setResending(false);
    }
  }

  const resendLabel = resending
    ? 'Sending...'
    : cooldown > 0
      ? `Resend code in ${cooldown}s`
      : 'Resend code';

  return (
    <AuthCard
      icon={MailCheck}
      title="Confirm your email"
      subtitle={
        emailFromRoute
          ? `Enter the ${CODE_LENGTH} digit code we sent to ${emailFromRoute}.`
          : `Enter the email you signed up with and the ${CODE_LENGTH} digit code we sent you.`
      }
    >
      {notice && (
        <div
          role="status"
          className="mt-5 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2.5 text-xs font-medium text-primary"
        >
          {notice}
        </div>
      )}

      <form className="mt-5 space-y-4" onSubmit={handleSubmit} noValidate>
        {!emailFromRoute && (
          <Field label="Email" id="verify-email" error={errors.email}>
            <IconInput
              icon={Mail}
              id="verify-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
            />
          </Field>
        )}

        <Field
          label="Verification code"
          id="verify-code"
          error={errors.code}
          hint="The code expires 15 minutes after it is sent."
        >
          <IconInput
            icon={KeyRound}
            id="verify-code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
            maxLength={CODE_LENGTH}
            placeholder="123456"
            className="tracking-[0.4em]"
          />
        </Field>

        <ErrorBanner message={serverError} />

        <button
          type="submit"
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? <Spinner /> : 'Confirm email'}
        </button>

        <button
          type="button"
          onClick={handleResend}
          disabled={resending || cooldown > 0}
          className="w-full rounded-lg border border-muted/30 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {resendLabel}
        </button>
      </form>
    </AuthCard>
  );
}
