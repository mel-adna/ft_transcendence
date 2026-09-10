export function taskRef(task) {
  const id = task?.id;
  if (typeof id !== 'string' || id.length < 4) return '';
  return `#TP-${id.replace(/-/g, '').slice(0, 4).toUpperCase()}`;
}

export function shortDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function fullDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function personName(person) {
  const name = [person?.firstName, person?.lastName].filter(Boolean).join(' ');
  return name || person?.email || 'Unassigned';
}
