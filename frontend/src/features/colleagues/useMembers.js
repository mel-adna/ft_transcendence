import { useCallback } from 'react';
import api from '../../lib/api';
import { useDataChanged } from '../../lib/useDataChanged';
import { useList } from '../../hooks/useList';

export function useMembers(workspaceId) {
  const load = useCallback(async () => {
    if (!workspaceId) return [];
    const response = await api.get(`/workspaces/${workspaceId}/members`);
    return response.data;
  }, [workspaceId]);

  const { items: members, loading, error, reload } = useList(load);

  // The roster changed elsewhere (someone was added or removed).
  useDataChanged('members', reload);

  return { members, loading, error, reload };
}
