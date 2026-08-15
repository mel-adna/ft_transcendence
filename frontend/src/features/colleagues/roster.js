export function buildRoster(workspace, tasks) {
  const people = new Map();
  const list = tasks ?? [];

  if (workspace?.owner?.id) {
    people.set(workspace.owner.id, { user: workspace.owner, role: 'OWNER' });
  }

  for (const task of list) {
    for (const person of [task.assignee, task.creator]) {
      if (person?.id && !people.has(person.id)) {
        people.set(person.id, { user: person, role: 'MEMBER' });
      }
    }
  }

  return [...people.values()];
}

export function fullName(user) {
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(' ');
  return name || user?.email || 'Unknown user';
}
