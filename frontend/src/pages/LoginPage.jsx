import { useCallback, useState } from 'react';
import { Navigate, useNavigate, Link } from 'react-router-dom';
import { LayoutGrid, Mail, Lock, User, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/useAuth';
import { getErrorMessage, isEmailNotVerified } from '../lib/api';
import { getGoogleClientId } from '../lib/googleIdentity';
import { PASSWORD_HINT, validateEmail, validatePassword, validateRequired } from '../lib/validation';
import GoogleSignInButton from '../components/GoogleSignInButton';
import AuthCard from '../components/AuthCard';
import Field from '../components/Field';
import IconInput from '../components/IconInput';
import ErrorBanner from '../components/ErrorBanner';
import LegalLinks from '../components/LegalLinks';
import Spinner from '../components/Spinner';

export default function LoginPage() {
  const { user, login, signup, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState('login');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleGoogleCredential = useCallback(
    async (idToken) => {
      if (!idToken) {
        setServerError('Google did not return a sign in token. Try again.');
        return;
      }
      setServerError(null);
      setSubmitting(true);
      try {
        await loginWithGoogle(idToken);
        navigate('/', { replace: true });
      } catch (error) {
        setServerError(getErrorMessage(error));
      } finally {
        setSubmitting(false);
      }
    },
    [loginWithGoogle, navigate],
  );

  const googleEnabled = Boolean(getGoogleClientId());

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
        navigate('/verify-email', { replace: true, state: { email, codeSent: true } });
        return;
      }
      await login(email, password);
      navigate('/', { replace: true });
    } catch (error) {
      if (isEmailNotVerified(error)) {
        navigate('/verify-email', {
          replace: true,
          state: { email, codeSent: true, fromLogin: true },
        });
        return;
      }
      setServerError(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthCard
      icon={LayoutGrid}
      title="Team Pulse"
      subtitle="SaaS Workspace"
      footer={<LegalLinks className="mt-6" />}
    >
      <div className="mt-6 flex rounded-lg border border-muted/20 bg-canvas p-1">
        <button
          type="button"
          onClick={() => switchMode('login')}
          className={`flex-1 rounded-md py-2 text-sm font-semibold transition-colors ${
            mode === 'login' ? 'bg-card text-white' : 'text-muted hover:text-white'
          }`}
        >
          Log In
        </button>
        <button
          type="button"
          onClick={() => switchMode('signup')}
          className={`flex-1 rounded-md py-2 text-sm font-semibold transition-colors ${
            mode === 'signup' ? 'bg-card text-white' : 'text-muted hover:text-white'
          }`}
        >
          Sign Up
        </button>
      </div>

      {googleEnabled && (
        <div className="mt-6 space-y-4">
          <GoogleSignInButton
            onCredential={handleGoogleCredential}
            text={mode === 'signup' ? 'signup_with' : 'signin_with'}
          />
          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-muted/20" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
              or
            </span>
            <span className="h-px flex-1 bg-muted/20" />
          </div>
        </div>
      )}

      <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
        {mode === 'signup' && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="First Name" id="firstName" error={errors.firstName}>
              <IconInput
                icon={User}
                id="firstName"
                type="text"
                autoComplete="given-name"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                placeholder="Jane"
              />
            </Field>
            <Field label="Last Name" id="lastName" error={errors.lastName}>
              <IconInput
                icon={User}
                id="lastName"
                type="text"
                autoComplete="family-name"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                placeholder="Doe"
              />
            </Field>
          </div>
        )}

        <Field label="Email Address" id="email" error={errors.email}>
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

        <Field
          label="Password"
          id="password"
          error={errors.password}
          hint={mode === 'signup' ? PASSWORD_HINT : undefined}
          action={
            mode === 'login' ? (
              <Link
                to="/forgot-password"
                className="text-[11px] font-semibold text-primary transition-opacity hover:opacity-80"
              >
                Forgot?
              </Link>
            ) : null
          }
        >
          <IconInput
            icon={Lock}
            id="password"
            type="password"
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </Field>

        <ErrorBanner message={serverError} />

        <button
          type="submit"
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
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
    </AuthCard>
  );
}
