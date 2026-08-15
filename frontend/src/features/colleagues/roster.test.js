import { describe, it, expect } from 'vitest';
import { buildRoster, fullName } from './roster';

const user = (overrides) => ({
  id: 'u1',
  firstName: 'First',
  lastName: 'Last',
  email: 'first@example.com',
  avatarUrl: null,
  ...overrides,
});

const task = (overrides) => ({
  id: crypto.randomUUID(),
  assignee: null,
  creator: null,
  ...overrides,
});

describe('buildRoster', () => {
  it('includes the workspace owner with role OWNER even when there are no tasks', () => {
    const owner = user({ id: 'owner-1' });

    expect(buildRoster({ owner }, [])).toEqual([{ user: owner, role: 'OWNER' }]);
  });

  it('adds distinct assignees and creators as MEMBER, preserving owner-first order', () => {
    const owner = user({ id: 'owner-1' });
    const alice = user({ id: 'alice', email: 'alice@example.com' });
    const bob = user({ id: 'bob', email: 'bob@example.com' });

    const result = buildRoster({ owner }, [
      task({ assignee: alice, creator: owner }),
      task({ assignee: bob, creator: alice }),
    ]);

    expect(result).toEqual([
      { user: owner, role: 'OWNER' },
      { user: alice, role: 'MEMBER' },
      { user: bob, role: 'MEMBER' },
    ]);
  });

  it('deduplicates a person appearing as both assignee and creator across many tasks', () => {
    const owner = user({ id: 'owner-1' });
    const alice = user({ id: 'alice' });

    const result = buildRoster({ owner }, [
      task({ assignee: alice, creator: alice }),
      task({ assignee: alice, creator: owner }),
    ]);

    expect(result).toHaveLength(2);
    expect(result.filter((entry) => entry.user.id === 'alice')).toHaveLength(1);
  });

  it('does not downgrade the owner to MEMBER when the owner also created or was assigned a task', () => {
    const owner = user({ id: 'owner-1' });

    const result = buildRoster({ owner }, [task({ assignee: owner, creator: owner })]);

    expect(result).toEqual([{ user: owner, role: 'OWNER' }]);
  });

  it('ignores tasks with no assignee and no creator', () => {
    const owner = user({ id: 'owner-1' });

    const result = buildRoster({ owner }, [task({}), task({})]);

    expect(result).toEqual([{ user: owner, role: 'OWNER' }]);
  });

  it('returns an empty array when there is no owner and no tasks', () => {
    expect(buildRoster(null, [])).toEqual([]);
    expect(buildRoster(undefined, undefined)).toEqual([]);
  });

  it('includes task participants even when the workspace has no owner', () => {
    const alice = user({ id: 'alice' });

    const result = buildRoster({ owner: null }, [task({ assignee: alice })]);

    expect(result).toEqual([{ user: alice, role: 'MEMBER' }]);
  });
});

describe('fullName', () => {
  it('joins first and last name', () => {
    expect(fullName(user({ firstName: 'Ada', lastName: 'Lovelace' }))).toBe('Ada Lovelace');
  });

  it('falls back to email when a name part is missing', () => {
    expect(fullName(user({ firstName: '', lastName: '', email: 'ada@example.com' }))).toBe(
      'ada@example.com',
    );
  });

  it('falls back to a placeholder when there is no name or email', () => {
    expect(fullName({})).toBe('Unknown user');
  });
});
