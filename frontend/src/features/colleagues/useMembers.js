import { useCallback } from 'react';
import api from '../../lib/api';
import { useDataChanged } from '../../lib/useDataChanged';
import { useList } from '../../hooks/useList';

const NO_MEMBERS = [];

export function useMembers(workspaceId) {
  const load = useCallback(async () => {
    if (!workspaceId) return NO_MEMBERS;
    const response = await api.get(`/workspaces/${workspaceId}/members`);
    return { workspaceId, list: response.data };
  }, [workspaceId]);

  const { items, loading, error, reload } = useList(load);
  const members = items?.workspaceId === workspaceId ? items.list : NO_MEMBERS;

  useDataChanged('members', () => reload({ quiet: true }));

  return { members, loading, error, reload };
}
