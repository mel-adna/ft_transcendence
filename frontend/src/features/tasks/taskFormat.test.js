import { describe, it, expect } from 'vitest';
import { taskRef, shortDate, fullDateTime, personName } from './taskFormat';

describe('taskRef', () => {
  it('builds a short stable reference from the task id', () => {
    expect(taskRef({ id: '92fe7a1b-4982-44ae-b477-24b02e687285' })).toBe('#TP-92FE');
  });

  it('is stable for the same id and different for another', () => {
    const a = taskRef({ id: 'aaaabbbb-0000-0000-0000-000000000000' });
    expect(a).toBe(taskRef({ id: 'aaaabbbb-0000-0000-0000-000000000000' }));
    expect(a).not.toBe(taskRef({ id: 'ccccdddd-0000-0000-0000-000000000000' }));
  });

  it('returns an empty string when there is no usable id', () => {
    expect(taskRef({})).toBe('');
    expect(taskRef(null)).toBe('');
    expect(taskRef({ id: 'ab' })).toBe('');
  });
});

describe('shortDate', () => {
  it('formats a naive backend timestamp', () => {
    expect(shortDate('2026-08-18T10:00:00')).toBe(
      new Date(2026, 7, 18).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    );
  });

  it('returns an empty string for missing or unparseable input', () => {
    expect(shortDate(null)).toBe('');
    expect(shortDate('not a date')).toBe('');
  });
});

describe('fullDateTime', () => {
  it('returns an empty string for missing input', () => {
    expect(fullDateTime(undefined)).toBe('');
  });

  it('produces something for a valid timestamp', () => {
    expect(fullDateTime('2026-08-18T14:30:00')).not.toBe('');
  });
});

describe('personName', () => {
  it('joins the name, falls back to email, then to Unassigned', () => {
    expect(personName({ firstName: 'Said', lastName: 'Test' })).toBe('Said Test');
    expect(personName({ email: 'a@b.c' })).toBe('a@b.c');
    expect(personName(null)).toBe('Unassigned');
  });
});
