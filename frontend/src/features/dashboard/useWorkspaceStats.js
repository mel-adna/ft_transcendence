import { useCallback } from 'react';
import api from '../../lib/api';
import { useList } from '../../hooks/useList';
import { computeStats } from '../../lib/stats';
import { useDataChanged } from '../../lib/useDataChanged';

export function useWorkspaceStats(workspaceId, tasks = [], range = 7) {
  const load = useCallback(async () => {
    if (!workspaceId) return null;
    const response = await api.get(`/workspaces/${workspaceId}/stats`, {
      params: { days: range },
    });
    return response.data;
  }, [workspaceId, range]);

  const { items: statsData, loading, error, reload } = useList(load);

  useDataChanged('tasks', () => reload({ quiet: true }));

  const stats = statsData ?? computeStats(tasks, range);

  return { stats, loading, error, reload };
}
