function dayKey(value) {
  return String(value).slice(0, 10);
}

function lastDays(count) {
  const days = [];
  const today = new Date();
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - offset);
    days.push(date.toISOString().slice(0, 10));
  }
  return days;
}

function labelFor(key, count) {
  const date = new Date(`${key}T00:00:00`);
  if (count <= 7) return date.toLocaleDateString(undefined, { weekday: 'short' });
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export function computeStats(tasks = [], days = 7) {
  const byStatus = { TODO: 0, DOING: 0, DONE: 0 };
  const assignees = new Set();
  const completedPerDay = new Map();

  for (const task of tasks) {
    if (byStatus[task.status] !== undefined) byStatus[task.status] += 1;
    if (task.assignee?.id) assignees.add(task.assignee.id);
    if (task.status === 'DONE' && task.updatedAt) {
      const key = dayKey(task.updatedAt);
      completedPerDay.set(key, (completedPerDay.get(key) ?? 0) + 1);
    }
  }

  const completionTrend = lastDays(days).map((key) => ({
    label: labelFor(key, days),
    completed: completedPerDay.get(key) ?? 0,
  }));

  const recentActivity = [...tasks]
    .filter((task) => task.updatedAt)
    .sort((left, right) => String(right.updatedAt).localeCompare(String(left.updatedAt)))
    .slice(0, 6);

  return {
    total: tasks.length,
    todo: byStatus.TODO,
    inProgress: byStatus.DOING,
    completed: byStatus.DONE,
    activeColleagues: assignees.size,
    completionTrend,
    recentActivity,
  };
}
