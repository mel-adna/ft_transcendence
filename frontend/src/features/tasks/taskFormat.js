export const STATUSES = ['TODO', 'DOING', 'DONE'];

export const STATUS_LABEL = {
  TODO: 'To-Do',
  DOING: 'Doing',
  DONE: 'Done',
};

export const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'];

export const PRIORITY_LABEL = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
};

export const PRIORITY_STYLE = {
  HIGH: 'border-danger/30 bg-danger/10 text-danger',
  MEDIUM: 'border-warning/30 bg-warning/10 text-warning',
  LOW: 'border-muted/30 bg-muted/10 text-muted',
};

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
