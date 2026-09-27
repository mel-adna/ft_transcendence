function pad(value) {
  return String(value).padStart(2, '0');
}

function localDayKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function labelFor(key, count) {
  const date = new Date(`${key}T00:00:00`);
  if (count <= 7) return date.toLocaleDateString(undefined, { weekday: 'short' });
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export function computeStats(tasks = [], days = 7) {
  const totalTasks = tasks.length;
  const statusCounts = { TODO: 0, DOING: 0, DONE: 0 };
  const priorityCounts = { LOW: 0, MEDIUM: 0, HIGH: 0 };
  const completedPerDay = new Map();
  const completedPerMonth = new Map();
  const memberMap = new Map();

  let unassignedTotal = 0;
  let unassignedCompleted = 0;
  let unassignedInProgress = 0;
  let unassignedTodo = 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const effectiveDays = days < 0 ? 7 : days;
  const periodStart = effectiveDays > 0 ? new Date(today) : null;
  if (periodStart) {
    periodStart.setDate(periodStart.getDate() - (effectiveDays - 1));
  }

  let tasksCompletedInPeriod = 0;
  let earliestDate = today;

  for (const task of tasks) {
    // Status
    const status = task.status === 'DOING' || task.status === 'DONE' ? task.status : 'TODO';
    statusCounts[status] = (statusCounts[status] ?? 0) + 1;

    // Priority
    const priority = task.priority === 'LOW' || task.priority === 'HIGH' ? task.priority : 'MEDIUM';
    priorityCounts[priority] = (priorityCounts[priority] ?? 0) + 1;

    // Assignee
    const assignee = task.assignee;
    if (assignee?.id) {
      if (!memberMap.has(assignee.id)) {
        const name = [assignee.firstName, assignee.lastName].filter(Boolean).join(' ').trim() ||
          assignee.email ||
          'Member';
        memberMap.set(assignee.id, {
          userId: assignee.id,
          name,
          email: assignee.email ?? null,
          avatarUrl: assignee.avatarUrl ?? null,
          totalAssigned: 0,
          completed: 0,
          inProgress: 0,
          todo: 0,
          completionRate: 0,
        });
      }
      const member = memberMap.get(assignee.id);
      member.totalAssigned += 1;
      if (status === 'DONE') member.completed += 1;
      else if (status === 'DOING') member.inProgress += 1;
      else member.todo += 1;
    } else {
      unassignedTotal += 1;
      if (status === 'DONE') unassignedCompleted += 1;
      else if (status === 'DOING') unassignedInProgress += 1;
      else unassignedTodo += 1;
    }

    // Completion dates
    if (status === 'DONE' && task.updatedAt) {
      const taskDate = new Date(task.updatedAt);
      if (!Number.isNaN(taskDate.getTime())) {
        const k = localDayKey(taskDate);
        completedPerDay.set(k, (completedPerDay.get(k) ?? 0) + 1);

        const mKey = `${taskDate.getFullYear()}-${pad(taskDate.getMonth() + 1)}`;
        completedPerMonth.set(mKey, (completedPerMonth.get(mKey) ?? 0) + 1);

        if (periodStart && taskDate >= periodStart) {
          tasksCompletedInPeriod += 1;
        } else if (!periodStart) {
          tasksCompletedInPeriod += 1;
        }
      }
    }

    // Earliest date tracking
    if (task.createdAt || task.updatedAt) {
      const d = new Date(task.createdAt || task.updatedAt);
      if (!Number.isNaN(d.getTime()) && d < earliestDate) {
        earliestDate = d;
      }
    }
  }

  // Completion rate
  const completedCount = statusCounts.DONE;
  const todoCount = statusCounts.TODO;
  const inProgressCount = statusCounts.DOING;
  const completionRate = totalTasks > 0
    ? Math.round(((completedCount / totalTasks) * 100) * 10) / 10
    : 0;

  // Member stats array
  const memberStats = Array.from(memberMap.values()).map((m) => ({
    ...m,
    completionRate: m.totalAssigned > 0
      ? Math.round(((m.completed / m.totalAssigned) * 100) * 10) / 10
      : 0,
  }));
  memberStats.sort((a, b) => b.totalAssigned - a.totalAssigned || a.name.localeCompare(b.name));

  if (unassignedTotal > 0) {
    memberStats.push({
      userId: null,
      name: 'Unassigned',
      email: null,
      avatarUrl: null,
      totalAssigned: unassignedTotal,
      completed: unassignedCompleted,
      inProgress: unassignedInProgress,
      todo: unassignedTodo,
      completionRate: Math.round(((unassignedCompleted / unassignedTotal) * 100) * 10) / 10,
    });
  }

  // Average completed per day
  const averageCompletedPerDay = effectiveDays > 0
    ? Math.round((tasksCompletedInPeriod / effectiveDays) * 100) / 100
    : Math.round((completedCount / Math.max(1, Math.round((today - earliestDate) / (1000 * 60 * 60 * 24)) + 1)) * 100) / 100;

  // Completion trend
  const completionTrend = [];
  if (effectiveDays > 0) {
    for (let offset = effectiveDays - 1; offset >= 0; offset -= 1) {
      const d = new Date(today);
      d.setDate(today.getDate() - offset);
      const key = localDayKey(d);
      const count = completedPerDay.get(key) ?? 0;
      completionTrend.push({
        key,
        label: labelFor(key, effectiveDays),
        count,
        completed: count,
      });
    }
  } else {
    // All time
    const daysSpan = Math.max(1, Math.round((today - earliestDate) / (1000 * 60 * 60 * 24)) + 1);
    if (daysSpan <= 60) {
      const curr = new Date(earliestDate);
      curr.setHours(0, 0, 0, 0);
      while (curr <= today) {
        const key = localDayKey(curr);
        const count = completedPerDay.get(key) ?? 0;
        completionTrend.push({
          key,
          label: curr.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
          count,
          completed: count,
        });
        curr.setDate(curr.getDate() + 1);
      }
    } else {
      const curr = new Date(earliestDate.getFullYear(), earliestDate.getMonth(), 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 1);
      while (curr <= end) {
        const mKey = `${curr.getFullYear()}-${pad(curr.getMonth() + 1)}`;
        const count = completedPerMonth.get(mKey) ?? 0;
        completionTrend.push({
          key: mKey,
          label: curr.toLocaleDateString(undefined, { month: 'short', year: 'numeric' }),
          count,
          completed: count,
        });
        curr.setMonth(curr.getMonth() + 1);
      }
    }
    if (completionTrend.length === 0) {
      const key = localDayKey(today);
      completionTrend.push({ key, label: 'Today', count: 0, completed: 0 });
    }
  }

  return {
    totalTasks,
    todoCount,
    inProgressCount,
    completedCount,
    completionRate,
    activeColleaguesCount: memberMap.size,
    tasksCompletedInPeriod,
    averageCompletedPerDay,
    backlogCount: todoCount,
    statusDistribution: {
      todo: todoCount,
      inProgress: inProgressCount,
      completed: completedCount,
    },
    priorityDistribution: {
      low: priorityCounts.LOW,
      medium: priorityCounts.MEDIUM,
      high: priorityCounts.HIGH,
    },
    memberStats,
    completionTrend,
    // Backward compatibility aliases
    total: totalTasks,
    todo: todoCount,
    inProgress: inProgressCount,
    completed: completedCount,
    activeColleagues: memberMap.size,
  };
}
