import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, KeyRound, Mail, MailCheck } from 'lucide-react';
import { getErrorMessage } from '../lib/api';
import { validateEmail } from '../lib/validation';
import { useAuth } from '../context/useAuth';
import Field from '../components/Field';
import Spinner from '../components/Spinner';

const CODE_LENGTH = 6;

const inputClass =
  'w-full rounded-lg border border-[#71717A]/25 bg-[#0c0c14] py-2.5 pl-10 pr-3 text-sm text-white placeholder:text-[#71717A]/50 focus:border-[#3B82F6] focus:outline-none';

function validateCode(value) {
  if (!value.trim()) return 'Verification code is required.';
  if (!/^\d{6}$/.test(value.trim())) return 'The code is 6 digits.';
  return null;
}

export default function VerifyEmailPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { verifyEmail } = useAuth();

  const emailFromSignup = location.state?.email ?? '';
  const [email, setEmail] = useState(emailFromSignup);
  const [code, setCode] = useState('');
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

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
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0c0c14] px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-[#71717A]/20 bg-[#181824] p-8 shadow-2xl">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#3B82F6]/20">
            <MailCheck size={24} className="text-[#3B82F6]" />
          </div>
          <h1 className="mt-4 text-xl font-bold text-white">Confirm your email</h1>
          <p className="mt-2 text-xs text-[#71717A]">
            {emailFromSignup
              ? `We sent a ${CODE_LENGTH} digit code to ${emailFromSignup}. Enter it below to finish setting up your account.`
              : `Enter the email you signed up with and the ${CODE_LENGTH} digit code we sent you.`}
          </p>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
          {!emailFromSignup && (
            <Field label="Email" id="verify-email" error={errors.email}>
              <div className="relative">
                <Mail
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#71717A]"
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
            hint="The code expires 15 minutes after you sign up."
          >
            <div className="relative">
              <KeyRound
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#71717A]"
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
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#3B82F6] py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? <Spinner /> : 'Confirm email'}
          </button>
        </form>

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
