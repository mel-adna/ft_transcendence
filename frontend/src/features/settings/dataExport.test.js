import { describe, it, expect, vi } from 'vitest';
import { buildDataExport } from './dataExport';

const user = {
  id: 'u1',
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
  avatarUrl: null,
};

function workspace(overrides) {
  return { id: 'w1', name: 'Team A', ...overrides };
}

describe('buildDataExport', () => {
  it('aggregates profile, teams and tasks keyed by workspace name', async () => {
    const tasksA = [{ id: 't1', title: 'Task A' }];
    const tasksB = [{ id: 't2', title: 'Task B' }];
    const workspaces = [
      workspace({ id: 'w1', name: 'Team A' }),
      workspace({ id: 'w2', name: 'Team B' }),
    ];

    const apiClient = {
      get: vi.fn((url) => {
        if (url === '/tasks/workspace/w1') return Promise.resolve({ data: tasksA });
        if (url === '/tasks/workspace/w2') return Promise.resolve({ data: tasksB });
        throw new Error(`unexpected url ${url}`);
      }),
    };

    const result = await buildDataExport(apiClient, user, workspaces);

    expect(apiClient.get).toHaveBeenCalledTimes(2);
    expect(apiClient.get).toHaveBeenNthCalledWith(1, '/tasks/workspace/w1');
    expect(apiClient.get).toHaveBeenNthCalledWith(2, '/tasks/workspace/w2');
    expect(result.profile).toBe(user);
    expect(result.teams).toBe(workspaces);
    expect(result.tasks).toEqual({ 'Team A': tasksA, 'Team B': tasksB });
    expect(typeof result.exportedAt).toBe('string');
    expect(new Date(result.exportedAt).toString()).not.toBe('Invalid Date');
  });

  it('returns an empty tasks map and calls the api zero times when there are no workspaces', async () => {
    const apiClient = { get: vi.fn() };

    const result = await buildDataExport(apiClient, user, []);

    expect(apiClient.get).not.toHaveBeenCalled();
    expect(result.tasks).toEqual({});
    expect(result.teams).toEqual([]);
  });

  it('stops at the failing workspace and propagates the error instead of returning a partial file', async () => {
    const workspaces = [
      workspace({ id: 'w1', name: 'Team A' }),
      workspace({ id: 'w2', name: 'Team B' }),
      workspace({ id: 'w3', name: 'Team C' }),
    ];
    const failure = new Error('network down');

    const apiClient = {
      get: vi.fn((url) => {
        if (url === '/tasks/workspace/w1') return Promise.resolve({ data: [] });
        if (url === '/tasks/workspace/w2') return Promise.reject(failure);
        return Promise.resolve({ data: [] });
      }),
    };

    await expect(buildDataExport(apiClient, user, workspaces)).rejects.toBe(failure);
    expect(apiClient.get).toHaveBeenCalledTimes(2);
  });
});
