import { useCallback } from 'react';
import api from '../../lib/api';
import { useList } from '../../hooks/useList';

export function useActivityLogs(workspaceId, size = 20) {
  const load = useCallback(async () => {
    if (!workspaceId) return [];
    const response = await api.get(`/activity-logs/workspace/${workspaceId}`, {
      params: { size },
    });
    return response.data?.content ?? [];
  }, [workspaceId, size]);

  const { items: logs, loading, error, reload } = useList(load);

  return { logs, loading, error, reload };
}
