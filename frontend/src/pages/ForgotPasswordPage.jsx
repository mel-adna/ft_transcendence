import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, LayoutGrid, Mail } from 'lucide-react';
import api, { getErrorMessage } from '../lib/api';
import { validateEmail } from '../lib/validation';
import Field from '../components/Field';
import Spinner from '../components/Spinner';

const inputClass =
  'w-full rounded-lg border border-[#71717A]/25 bg-[#0c0c14] py-2.5 pl-10 pr-3 text-sm text-white placeholder:text-[#71717A]/50 focus:border-[#3B82F6] focus:outline-none';

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
    <div className="flex min-h-screen items-center justify-center bg-[#0c0c14] px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-[#71717A]/20 bg-[#181824] p-8 shadow-2xl">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#3B82F6]/20">
            <LayoutGrid size={24} className="text-[#3B82F6]" />
          </div>
          <h1 className="mt-4 text-xl font-bold text-white">Reset your password</h1>
          <p className="mt-1 text-sm text-[#71717A]">
            We will email you a link to choose a new one.
          </p>
        </div>

        {sent ? (
          <div className="mt-6">
            <div
              role="status"
              className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-3 text-xs font-medium text-emerald-400"
            >
              If that email is registered, a reset link is on its way. The link is valid for 15
              minutes.
            </div>
            <p className="mt-4 text-xs text-[#71717A]">
              Nothing arrived? Check your spam folder, or try again in a moment.
            </p>
          </div>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
            <Field label="Email Address" id="email" error={fieldError}>
              <div className="relative">
                <Mail
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#71717A]"
                />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@company.com"
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
              {submitting ? <Spinner /> : 'Send reset link'}
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
