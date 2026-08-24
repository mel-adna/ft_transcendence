export function fullName(user) {
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(' ');
  return name || user?.email || 'Unknown user';
}

export function buildRoster(members, ownerId) {
  const seen = new Map();

  for (const entry of members ?? []) {
    const user = entry?.member;
    if (!user?.id || seen.has(user.id)) continue;
    seen.set(user.id, {
      user,
      role: user.id === ownerId ? 'OWNER' : (entry.role ?? 'MEMBER'),
      joinedAt: entry.joinedAt ?? null,
    });
  }

  return [...seen.values()].sort((left, right) => {
    if (left.role === 'OWNER') return -1;
    if (right.role === 'OWNER') return 1;
    return fullName(left.user).localeCompare(fullName(right.user));
  });
}

export function inferRoster(workspace, tasks) {
  const people = new Map();

  if (workspace?.owner?.id) {
    people.set(workspace.owner.id, { user: workspace.owner, role: 'OWNER', joinedAt: null });
  }

  for (const task of tasks ?? []) {
    for (const person of [task.assignee, task.creator]) {
      if (person?.id && !people.has(person.id)) {
        people.set(person.id, { user: person, role: 'MEMBER', joinedAt: null });
      }
    }
  }

  return [...people.values()];
}
