import { describe, it, expect } from 'vitest';
import { humanizeAction, actionTone, buildActivityFeed } from './activityLog';

describe('humanizeAction', () => {
  it('maps a known action to its label', () => {
    expect(humanizeAction('TASK_COMPLETED')).toBe('Completed');
    expect(humanizeAction('WORKSPACE_MEMBER_ADDED')).toBe('Member added');
  });

  it('humanizes an action the frontend does not know yet', () => {
    expect(humanizeAction('TASK_ARCHIVED')).toBe('Task archived');
  });

  it('falls back when the action is missing', () => {
    expect(humanizeAction(null)).toBe('Activity');
    expect(humanizeAction('')).toBe('Activity');
  });
});

describe('actionTone', () => {
  it('marks completions and deletions', () => {
    expect(actionTone('TASK_COMPLETED')).toBe('done');
    expect(actionTone('TASK_DELETED')).toBe('danger');
  });

  it('defaults unknown actions to neutral', () => {
    expect(actionTone('TASK_ARCHIVED')).toBe('neutral');
  });
});

describe('buildActivityFeed', () => {
  const logs = [
    {
      id: '1',
      actionType: 'TASK_COMPLETED',
      description: 'Completed the task: Ship login',
      createdAt: '2026-08-30T10:00:00Z',
      user: { id: 'u1', firstName: 'Said' },
    },
    { id: '2', actionType: 'TASK_ASSIGNED', description: 'Assigned', createdAt: null, user: null },
  ];

  it('keeps order and shapes each entry', () => {
    const feed = buildActivityFeed(logs);
    expect(feed).toHaveLength(2);
    expect(feed[0]).toEqual({
      id: '1',
      user: { id: 'u1', firstName: 'Said' },
      label: 'Completed',
      tone: 'done',
      description: 'Completed the task: Ship login',
      createdAt: '2026-08-30T10:00:00Z',
    });
  });

  it('drops entries with no id and respects the limit', () => {
    expect(buildActivityFeed([{ actionType: 'TASK_UPDATED' }, ...logs])).toHaveLength(2);
    expect(buildActivityFeed(logs, 1)).toHaveLength(1);
  });

  it('returns an empty feed when the API sent nothing', () => {
    expect(buildActivityFeed(null)).toEqual([]);
    expect(buildActivityFeed(undefined)).toEqual([]);
  });
});
