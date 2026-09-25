import { useCallback } from 'react';
import api from '../../lib/api';
import { useList } from '../../hooks/useList';

export function useMembers(workspaceId) {
  const load = useCallback(async () => {
    if (!workspaceId) return [];
    const response = await api.get(`/workspaces/${workspaceId}/members`);
    return response.data;
  }, [workspaceId]);

  const { items: members, loading, error, reload } = useList(load);

  return { members, loading, error, reload };
}
