const ACTION_LABEL = {
  TASK_ASSIGNED: 'Assigned',
  TASK_UPDATED: 'Reassigned',
  TASK_COMPLETED: 'Completed',
  TASK_COMMENT_CREATED: 'New comment',
  TASK_COMMENT_UPDATED: 'Comment edited',
  TASK_COMMENT_DELETED: 'Comment removed',
  WORKSPACE_MEMBER_ADDED: 'Member added',
};

const ACTION_TONE = {
  TASK_COMPLETED: 'done',
  TASK_ASSIGNED: 'active',
  TASK_UPDATED: 'active',
  TASK_COMMENT_DELETED: 'danger',
};

const STATUS_LABEL = {
  TODO: 'To do',
  DOING: 'In progress',
  DONE: 'Completed',
};

const STATUS_TONE = {
  TODO: 'neutral',
  DOING: 'active',
  DONE: 'done',
};

export const ACTIVITY_FEED_LIMIT = 8;

export function humanizeAction(actionType) {
  if (!actionType) return 'Activity';
  if (Object.hasOwn(ACTION_LABEL, actionType)) return ACTION_LABEL[actionType];
  const words = String(actionType).toLowerCase().split('_').filter(Boolean);
  if (words.length === 0) return 'Activity';
  return words.join(' ').replace(/^./, (first) => first.toUpperCase());
}

export function actionTone(actionType) {
  if (!actionType) return 'neutral';
  return Object.hasOwn(ACTION_TONE, actionType) ? ACTION_TONE[actionType] : 'neutral';
}

export function buildActivityFeed(logs, limit = ACTIVITY_FEED_LIMIT) {
  return (logs ?? [])
    .filter((log) => log?.id)
    .slice(0, limit)
    .map((log) => ({
      id: log.id,
      user: log.user ?? null,
      label: humanizeAction(log.actionType),
      tone: actionTone(log.actionType),
      description: log.description ?? '',
      createdAt: log.createdAt ?? null,
    }));
}

export function deriveActivityFeed(tasks, limit = ACTIVITY_FEED_LIMIT) {
  return (tasks ?? [])
    .filter((task) => task?.id && task.updatedAt)
    .slice()
    .sort((left, right) => new Date(right.updatedAt) - new Date(left.updatedAt))
    .slice(0, limit)
    .map((task) => ({
      id: `task-${task.id}`,
      user: task.assignee ?? task.creator ?? null,
      label: STATUS_LABEL[task.status] ?? 'Updated',
      tone: STATUS_TONE[task.status] ?? 'neutral',
      description: task.title ?? '',
      createdAt: task.updatedAt,
    }));
}
