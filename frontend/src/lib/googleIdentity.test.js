import { describe, expect, it } from 'vitest';
import { readGoogleClientId } from './googleIdentity';

describe('readGoogleClientId', () => {
  it('returns the id when one is configured', () => {
    expect(readGoogleClientId({ VITE_GOOGLE_CLIENT_ID: '123-abc.apps.googleusercontent.com' }))
      .toBe('123-abc.apps.googleusercontent.com');
  });

  it('trims surrounding whitespace', () => {
    expect(readGoogleClientId({ VITE_GOOGLE_CLIENT_ID: '  123-abc  ' })).toBe('123-abc');
  });

  it('returns null when the variable is missing, empty or blank', () => {
    expect(readGoogleClientId({})).toBe(null);
    expect(readGoogleClientId({ VITE_GOOGLE_CLIENT_ID: '' })).toBe(null);
    expect(readGoogleClientId({ VITE_GOOGLE_CLIENT_ID: '   ' })).toBe(null);
    expect(readGoogleClientId(undefined)).toBe(null);
  });

  it('ignores a non-string value', () => {
    expect(readGoogleClientId({ VITE_GOOGLE_CLIENT_ID: 12345 })).toBe(null);
  });
});
