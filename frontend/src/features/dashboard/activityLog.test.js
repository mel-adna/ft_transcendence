import { describe, it, expect } from 'vitest';
import {
  humanizeAction,
  actionTone,
  buildActivityFeed,
  deriveActivityFeed,
} from './activityLog';

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
    expect(actionTone('TASK_COMMENT_DELETED')).toBe('danger');
  });

  it('does not read inherited Object properties as labels or tones', () => {
    expect(humanizeAction('constructor')).toBe('Constructor');
    expect(humanizeAction('toString')).toBe('Tostring');
    expect(actionTone('constructor')).toBe('neutral');
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

describe('deriveActivityFeed', () => {
  const tasks = [
    { id: 'a', title: 'Older', status: 'TODO', updatedAt: '2026-08-28T10:00:00Z' },
    {
      id: 'b',
      title: 'Newest',
      status: 'DONE',
      updatedAt: '2026-08-30T10:00:00Z',
      assignee: { id: 'u1', firstName: 'Said' },
    },
    { id: 'c', title: 'Middle', status: 'DOING', updatedAt: '2026-08-29T10:00:00Z' },
  ];

  it('orders by most recently updated and labels by status', () => {
    const feed = deriveActivityFeed(tasks);
    expect(feed.map((entry) => entry.description)).toEqual(['Newest', 'Middle', 'Older']);
    expect(feed[0]).toEqual({
      id: 'task-b',
      user: { id: 'u1', firstName: 'Said' },
      label: 'Completed',
      tone: 'done',
      description: 'Newest',
      createdAt: '2026-08-30T10:00:00Z',
    });
    expect(feed[1].label).toBe('In progress');
    expect(feed[2].label).toBe('To do');
  });

  it('does not mutate the array it was given', () => {
    const input = [...tasks];
    deriveActivityFeed(input);
    expect(input.map((task) => task.id)).toEqual(['a', 'b', 'c']);
  });

  it('skips tasks with no timestamp and respects the limit', () => {
    expect(deriveActivityFeed([{ id: 'x', title: 'No date' }])).toEqual([]);
    expect(deriveActivityFeed(tasks, 1)).toHaveLength(1);
    expect(deriveActivityFeed(null)).toEqual([]);
  });

  it('falls back to the creator when nobody is assigned', () => {
    const feed = deriveActivityFeed([
      { id: 'd', title: 'T', status: 'TODO', updatedAt: '2026-08-30T10:00:00Z', creator: { id: 'c1' } },
    ]);
    expect(feed[0].user).toEqual({ id: 'c1' });
  });
});
