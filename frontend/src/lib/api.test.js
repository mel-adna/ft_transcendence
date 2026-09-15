import { describe, it, expect } from 'vitest';
import { isAuthPath, isEmailNotVerified, isSessionExpired, shouldRefresh } from './api';

const base = { status: 401, url: '/tasks/workspace/1', hasRetried: false, hasRefreshToken: true };

describe('isAuthPath', () => {
  it('recognises the auth endpoints', () => {
    expect(isAuthPath('/auth/login')).toBe(true);
    expect(isAuthPath('/auth/signup')).toBe(true);
    expect(isAuthPath('/auth/refresh')).toBe(true);
  });

  it('does not match ordinary endpoints or missing urls', () => {
    expect(isAuthPath('/tasks/workspace/1')).toBe(false);
    expect(isAuthPath('/users/me')).toBe(false);
    expect(isAuthPath(undefined)).toBe(false);
  });
});

describe('isSessionExpired', () => {
  it('treats a 401 as an ended session whatever the body says', () => {
    expect(isSessionExpired({ status: 401 })).toBe(true);
    expect(isSessionExpired({ status: 401, message: 'anything' })).toBe(true);
  });

  it('treats only the generic Forbidden body as an ended session', () => {
    expect(isSessionExpired({ status: 403, message: 'Forbidden' })).toBe(true);
    expect(isSessionExpired({ status: 403, message: 'Only ADMINs can delete workspaces' })).toBe(false);
    expect(isSessionExpired({ status: 403 })).toBe(false);
  });

  it('ignores every other status', () => {
    expect(isSessionExpired({ status: 500, message: 'Forbidden' })).toBe(false);
    expect(isSessionExpired({ status: 200 })).toBe(false);
  });
});

describe('shouldRefresh', () => {
  it('refreshes an expired access token on a normal request', () => {
    expect(shouldRefresh(base)).toBe(true);
  });

  it('ignores statuses that do not mean the session ended', () => {
    expect(shouldRefresh({ ...base, status: 500 })).toBe(false);
    expect(shouldRefresh({ ...base, status: 404 })).toBe(false);
    expect(shouldRefresh({ ...base, status: 403 })).toBe(false);
  });

  it('refreshes on the generic 403 the backend sends for an expired token', () => {
    expect(shouldRefresh({ ...base, status: 403, message: 'Forbidden' })).toBe(true);
  });

  it('leaves the application own 403s alone', () => {
    expect(shouldRefresh({
      ...base,
      status: 403,
      message: 'Account is not verified. A new verification code has been sent to your email.',
    })).toBe(false);
    expect(shouldRefresh({
      ...base,
      status: 403,
      message: "You don't have permission to update task status!",
    })).toBe(false);
  });

  it('never retries the same request twice, so a bad refresh cannot loop', () => {
    expect(shouldRefresh({ ...base, hasRetried: true })).toBe(false);
  });

  it('never refreshes for the auth endpoints themselves', () => {
    expect(shouldRefresh({ ...base, url: '/auth/login' })).toBe(false);
    expect(shouldRefresh({ ...base, url: '/auth/refresh' })).toBe(false);
  });

  it('cannot refresh without a stored refresh token', () => {
    expect(shouldRefresh({ ...base, hasRefreshToken: false })).toBe(false);
  });
});

describe('isEmailNotVerified', () => {
  const res = (status, data) => ({ response: { status, data } });

  it('matches the errorCode the backend sends on an unverified login', () => {
    expect(isEmailNotVerified(res(403, {
      message: 'Account is not verified. A new verification code has been sent to your email.',
      errors: { errorCode: 'EMAIL_NOT_VERIFIED' },
    }))).toBe(true);
  });

  it('still matches on the message alone, for a backend without the errorCode', () => {
    expect(isEmailNotVerified(res(403, {
      message: 'Account is disabled. Please verify your email first.',
    }))).toBe(true);
  });

  it('does not match other 403s', () => {
    expect(isEmailNotVerified(res(403, { message: 'Forbidden' }))).toBe(false);
    expect(isEmailNotVerified(res(403, { message: 'Only ADMINs can delete workspaces' }))).toBe(false);
  });

  it('does not match wrong credentials or a missing response', () => {
    expect(isEmailNotVerified(res(401, { message: 'Invalid email or password. Please try again.' }))).toBe(false);
    expect(isEmailNotVerified(new Error('Network Error'))).toBe(false);
  });
});
