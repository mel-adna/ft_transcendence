const ACTION_LABEL = {
  TASK_ASSIGNED: 'Assigned',
  TASK_STATUS_CHANGED: 'Status changed',
  TASK_COMMENTED: 'Commented',
  TASK_UPDATED: 'Updated',
  TASK_COMPLETED: 'Completed',
  TASK_DELETED: 'Deleted',
  TASK_COMMENT_CREATED: 'New comment',
  TASK_COMMENT_UPDATED: 'Comment edited',
  TASK_COMMENT_DELETED: 'Comment removed',
  WORKSPACE_MEMBER_ADDED: 'Member added',
  WORKSPACE_MEMBER_REMOVED: 'Member removed',
  WORKSPACE_ROLE_CHANGED: 'Role changed',
  WORKSPACE_DELETED: 'Team deleted',
};

const ACTION_TONE = {
  TASK_COMPLETED: 'done',
  TASK_ASSIGNED: 'active',
  TASK_STATUS_CHANGED: 'active',
  TASK_UPDATED: 'active',
  TASK_DELETED: 'danger',
  TASK_COMMENT_DELETED: 'danger',
  WORKSPACE_MEMBER_REMOVED: 'danger',
  WORKSPACE_DELETED: 'danger',
};

export function humanizeAction(actionType) {
  if (!actionType) return 'Activity';
  const known = ACTION_LABEL[actionType];
  if (known) return known;
  const words = String(actionType).toLowerCase().split('_').filter(Boolean);
  if (words.length === 0) return 'Activity';
  return words.join(' ').replace(/^./, (first) => first.toUpperCase());
}

export function actionTone(actionType) {
  return ACTION_TONE[actionType] ?? 'neutral';
}

export function buildActivityFeed(logs, limit = 8) {
  return (logs ?? [])
    .filter((log) => log?.id)
    .map((log) => ({
      id: log.id,
      user: log.user ?? null,
      label: humanizeAction(log.actionType),
      tone: actionTone(log.actionType),
      description: log.description ?? '',
      createdAt: log.createdAt ?? null,
    }))
    .slice(0, limit);
}
