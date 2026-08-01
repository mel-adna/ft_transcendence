import { describe, it, expect } from 'vitest';
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

  it('buckets completed tasks by the day they were updated', () => {
    const today = new Date().toISOString().slice(0, 10);
    const result = computeStats(
      [task({ status: 'DONE', updatedAt: `${today}T09:00:00` })],
      7,
    );
    const last = result.completionTrend[result.completionTrend.length - 1];

    expect(last.completed).toBe(1);
  });

  it('handles an empty task list without throwing', () => {
    const result = computeStats([]);
    expect(result.total).toBe(0);
    expect(result.activeColleagues).toBe(0);
    expect(result.recentActivity).toEqual([]);
  });
});
