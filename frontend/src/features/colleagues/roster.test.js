import { describe, it, expect } from 'vitest';
import { buildRoster, inferRoster, fullName } from './roster';

const user = (id, firstName, lastName = 'X') => ({
  id,
  firstName,
  lastName,
  email: `${firstName.toLowerCase()}@teampulse.local`,
  avatarUrl: null,
});

const entry = (member, role = 'MEMBER', joinedAt = '2026-08-01T10:00:00') => ({
  member,
  role,
  joinedAt,
});

describe('buildRoster', () => {
  it('maps the api shape to user and role', () => {
    const alice = user('a', 'Alice');
    const result = buildRoster([entry(alice, 'ADMIN')], null);

    expect(result).toEqual([
      { user: alice, role: 'ADMIN', joinedAt: '2026-08-01T10:00:00' },
    ]);
  });

  it('labels the workspace owner as OWNER regardless of stored role', () => {
    const owner = user('a', 'Alice');
    const result = buildRoster([entry(owner, 'ADMIN')], 'a');

    expect(result[0].role).toBe('OWNER');
  });

  it('puts the owner first and sorts everyone else by name', () => {
    const result = buildRoster(
      [
        entry(user('c', 'Carol')),
        entry(user('b', 'Bob')),
        entry(user('a', 'Alice')),
      ],
      'c',
    );

    expect(result.map((row) => row.user.firstName)).toEqual(['Carol', 'Alice', 'Bob']);
  });

  it('drops entries with no member and deduplicates by id', () => {
    const alice = user('a', 'Alice');
    const result = buildRoster(
      [entry(alice), { member: null, role: 'MEMBER' }, entry(alice, 'ADMIN')],
      null,
    );

    expect(result).toHaveLength(1);
    expect(result[0].role).toBe('MEMBER');
  });

  it('defaults a missing role to MEMBER', () => {
    const result = buildRoster([{ member: user('a', 'Alice') }], null);
    expect(result[0].role).toBe('MEMBER');
  });

  it('handles an empty or missing list', () => {
    expect(buildRoster([], 'a')).toEqual([]);
    expect(buildRoster(undefined, 'a')).toEqual([]);
  });
});

describe('fullName', () => {
  it('joins first and last name', () => {
    expect(fullName(user('a', 'Alice', 'Smith'))).toBe('Alice Smith');
  });

  it('falls back to the email, then to a placeholder', () => {
    expect(fullName({ email: 'x@y.z' })).toBe('x@y.z');
    expect(fullName(null)).toBe('Unknown user');
  });
});

describe('inferRoster', () => {
  const person = (id, firstName) => ({ id, firstName, lastName: 'X', email: `${id}@t.local` });

  it('starts from the workspace owner', () => {
    const owner = person('a', 'Alice');
    const result = inferRoster({ owner }, []);

    expect(result).toEqual([{ user: owner, role: 'OWNER', joinedAt: null }]);
  });

  it('adds task assignees and creators without duplicating them', () => {
    const owner = person('a', 'Alice');
    const bob = person('b', 'Bob');
    const result = inferRoster({ owner }, [
      { assignee: bob, creator: owner },
      { assignee: bob, creator: bob },
      { assignee: null, creator: null },
    ]);

    expect(result).toHaveLength(2);
    expect(result.find((row) => row.user.id === 'b').role).toBe('MEMBER');
    expect(result.find((row) => row.user.id === 'a').role).toBe('OWNER');
  });

  it('survives a missing workspace and task list', () => {
    expect(inferRoster(null, null)).toEqual([]);
  });
});
