import { afterEach, describe, it, expect, vi } from 'vitest';
import { computeStats } from './stats';

const task = (overrides) => ({
  id: crypto.randomUUID(),
  title: 'Task',
  status: 'TODO',
  priority: 'MEDIUM',
  assignee: null,
  creator: null,
  createdAt: '2026-07-30T10:00:00',
  updatedAt: '2026-07-30T10:00:00',
  ...overrides,
});

afterEach(() => {
  vi.useRealTimers();
});

describe('computeStats', () => {
  it('counts tasks by status', () => {
    const result = computeStats([
      task({ status: 'TODO' }),
      task({ status: 'DOING' }),
      task({ status: 'DONE' }),
      task({ status: 'DONE' }),
    ]);

    expect(result.total).toBe(4);
    expect(result.todo).toBe(1);
    expect(result.inProgress).toBe(1);
    expect(result.completed).toBe(2);
  });

  it('counts distinct assignees as active colleagues', () => {
    const alice = { id: 'a', firstName: 'Alice', lastName: 'A' };
    const bob = { id: 'b', firstName: 'Bob', lastName: 'B' };
    const result = computeStats([
      task({ assignee: alice }),
      task({ assignee: alice }),
      task({ assignee: bob }),
      task({ assignee: null }),
    ]);

    expect(result.activeColleagues).toBe(2);
  });

  it('returns one trend bucket per day', () => {
    const result = computeStats([], 7);
    expect(result.completionTrend).toHaveLength(7);
    expect(result.completionTrend.every((bucket) => bucket.completed === 0)).toBe(true);
  });

  it('buckets a task updated just after local midnight into today, not yesterday', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 1, 0, 30));

    const result = computeStats(
      [task({ status: 'DONE', updatedAt: '2026-08-01T00:30:00' })],
      7,
    );
    const last = result.completionTrend[result.completionTrend.length - 1];

    expect(last.key).toBe('2026-08-01');
    expect(last.completed).toBe(1);
  });

  it('buckets a task updated just before local midnight into today, not tomorrow', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 1, 23, 30));

    const result = computeStats(
      [task({ status: 'DONE', updatedAt: '2026-08-01T23:30:00' })],
      7,
    );
    const last = result.completionTrend[result.completionTrend.length - 1];

    expect(last.key).toBe('2026-08-01');
    expect(last.completed).toBe(1);
  });

  it('returns recent activity sorted by updatedAt descending, capped at 6', () => {
    const tasks = [
      task({ id: '1', updatedAt: '2026-07-20T10:00:00' }),
      task({ id: '2', updatedAt: '2026-07-25T10:00:00' }),
      task({ id: '3', updatedAt: '2026-07-15T10:00:00' }),
      task({ id: '4', updatedAt: '2026-07-30T10:00:00' }),
      task({ id: '5', updatedAt: '2026-07-10T10:00:00' }),
      task({ id: '6', updatedAt: '2026-07-28T10:00:00' }),
      task({ id: '7', updatedAt: '2026-07-05T10:00:00' }),
      task({ id: '8', updatedAt: '2026-07-22T10:00:00' }),
    ];

    const result = computeStats(tasks);

    expect(result.recentActivity).toHaveLength(6);
    expect(result.recentActivity.map((item) => item.id)).toEqual([
      '4',
      '6',
      '2',
      '8',
      '1',
      '3',
    ]);
  });

  it('handles an empty task list without throwing', () => {
    const result = computeStats([]);
    expect(result.total).toBe(0);
    expect(result.activeColleagues).toBe(0);
    expect(result.recentActivity).toEqual([]);
  });
});
