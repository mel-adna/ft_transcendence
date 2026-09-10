import { describe, it, expect } from 'vitest';
import { isAuthPath, shouldRefresh } from './api';

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

describe('shouldRefresh', () => {
  it('refreshes an expired access token on a normal request', () => {
    expect(shouldRefresh(base)).toBe(true);
  });

  it('ignores anything that is not a 401', () => {
    expect(shouldRefresh({ ...base, status: 403 })).toBe(false);
    expect(shouldRefresh({ ...base, status: 500 })).toBe(false);
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
