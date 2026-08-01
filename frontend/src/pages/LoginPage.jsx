import { useState } from 'react';
import { Navigate, useNavigate, Link } from 'react-router-dom';
import { LayoutGrid, Mail, Lock, User, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../lib/api';
import { validateEmail, validatePassword, validateRequired } from '../lib/validation';
import Field from '../components/Field';
import Spinner from '../components/Spinner';

const inputClass =
  'w-full rounded-lg border border-[#71717A]/25 bg-[#0c0c14] py-2.5 pl-9 pr-3 text-sm text-white placeholder:text-[#71717A]/50 focus:border-[#3B82F6] focus:outline-none';

const passwordHint =
  'At least 8 characters, with an uppercase letter, a number and a special character (@$!%*?&#).';

export default function LoginPage() {
  const { user, login, signup } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState('login');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/" replace />;

  function switchMode(nextMode) {
    setMode(nextMode);
    setErrors({});
    setServerError(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const nextErrors = {};
    const emailError = validateEmail(email);
    if (emailError) nextErrors.email = emailError;

    if (mode === 'signup') {
      const firstNameError = validateRequired(firstName, 'First name');
      if (firstNameError) nextErrors.firstName = firstNameError;

      const lastNameError = validateRequired(lastName, 'Last name');
      if (lastNameError) nextErrors.lastName = lastNameError;

      const passwordError = validatePassword(password);
      if (passwordError) nextErrors.password = passwordError;
    } else {
      const passwordError = validateRequired(password, 'Password');
      if (passwordError) nextErrors.password = passwordError;
    }

    setErrors(nextErrors);
    setServerError(null);

    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      if (mode === 'signup') {
        await signup({ firstName, lastName, email, password });
      } else {
        await login(email, password);
      }
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
            <LayoutGrid size={26} className="text-[#3B82F6]" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-white">Team Pulse</h1>
          <p className="mt-1 text-sm text-[#71717A]">SaaS Workspace</p>
        </div>

        <div className="mt-6 flex rounded-lg border border-[#71717A]/20 bg-[#0c0c14] p-1">
          <button
            type="button"
            onClick={() => switchMode('login')}
            className={`flex-1 rounded-md py-2 text-sm font-semibold transition-colors ${
              mode === 'login' ? 'bg-[#27273a] text-white' : 'text-[#71717A] hover:text-white'
            }`}
          >
            Log In
          </button>
          <button
            type="button"
            onClick={() => switchMode('signup')}
            className={`flex-1 rounded-md py-2 text-sm font-semibold transition-colors ${
              mode === 'signup' ? 'bg-[#27273a] text-white' : 'text-[#71717A] hover:text-white'
            }`}
          >
            Sign Up
          </button>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
          {mode === 'signup' && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="First Name" id="firstName" error={errors.firstName}>
                <div className="relative">
                  <User
                    size={16}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#71717A]"
                  />
                  <input
                    id="firstName"
                    type="text"
                    autoComplete="given-name"
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                    placeholder="Jane"
                    className={inputClass}
                  />
                </div>
              </Field>
              <Field label="Last Name" id="lastName" error={errors.lastName}>
                <div className="relative">
                  <User
                    size={16}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#71717A]"
                  />
                  <input
                    id="lastName"
                    type="text"
                    autoComplete="family-name"
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                    placeholder="Doe"
                    className={inputClass}
                  />
                </div>
              </Field>
            </div>
          )}

          <Field label="Email Address" id="email" error={errors.email}>
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

          <Field
            label="Password"
            id="password"
            error={errors.password}
            hint={mode === 'signup' ? passwordHint : undefined}
          >
            <div className="relative">
              <Lock
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#71717A]"
              />
              <input
                id="password"
                type="password"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
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
            {submitting ? (
              <Spinner />
            ) : (
              <>
                Continue
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-[#71717A]">
          <Link to="/privacy" className="transition-colors hover:text-white">
            Privacy Policy
          </Link>
          <span>&bull;</span>
          <Link to="/terms" className="transition-colors hover:text-white">
            Terms of Service
          </Link>
        </div>
      </div>
    </div>
  );
}
