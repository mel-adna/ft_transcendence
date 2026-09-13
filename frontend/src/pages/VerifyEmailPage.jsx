import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, KeyRound, Mail, MailCheck } from 'lucide-react';
import { getErrorMessage, postWithoutSession } from '../lib/api';
import { validateEmail } from '../lib/validation';
import { useAuth } from '../context/useAuth';
import Field from '../components/Field';
import Spinner from '../components/Spinner';

const CODE_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;

const inputClass =
  'w-full rounded-lg border border-muted/25 bg-canvas py-2.5 pl-10 pr-3 text-sm text-white placeholder:text-muted/50 focus:border-primary focus:outline-none';

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
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-muted/20 bg-panel p-8 shadow-2xl">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/20">
            <MailCheck size={24} className="text-primary" />
          </div>
          <h1 className="mt-4 text-xl font-bold text-white">Confirm your email</h1>
          <p className="mt-2 text-xs text-muted">
            {emailFromRoute
              ? `Enter the ${CODE_LENGTH} digit code we sent to ${emailFromRoute}.`
              : `Enter the email you signed up with and the ${CODE_LENGTH} digit code we sent you.`}
          </p>
        </div>

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
              <div className="relative">
                <Mail
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                />
                <input
                  id="verify-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  className={inputClass}
                />
              </div>
            </Field>
          )}

          <Field
            label="Verification code"
            id="verify-code"
            error={errors.code}
            hint="The code expires 15 minutes after it is sent."
          >
            <div className="relative">
              <KeyRound
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
              />
              <input
                id="verify-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
                maxLength={CODE_LENGTH}
                placeholder="123456"
                className={`${inputClass} tracking-[0.4em]`}
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

        <div className="mt-6 border-t border-card pt-4 text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted transition-colors hover:text-white"
          >
            <ArrowLeft size={14} />
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
