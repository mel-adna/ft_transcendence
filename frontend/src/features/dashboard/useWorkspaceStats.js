import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../../lib/api';
import { useDataChanged } from '../../lib/useDataChanged';

export const DEFAULT_STATS = {
  totalTasks: 0,
  todoCount: 0,
  inProgressCount: 0,
  completedCount: 0,
  completionRate: 0,
  activeColleaguesCount: 0,
  backlogCount: 0,
  tasksCompletedInPeriod: 0,
  averageCompletedPerDay: 0,
  statusDistribution: { todo: 0, inProgress: 0, completed: 0 },
  priorityDistribution: { low: 0, medium: 0, high: 0 },
  memberStats: [],
  completionTrend: [],
};

export function useWorkspaceStats(workspaceId, params) {
  const [stats, setStats] = useState(DEFAULT_STATS);
  const [loading, setLoading] = useState(Boolean(workspaceId));
  const [error, setError] = useState(null);
  const currentRequestRef = useRef(null);
  const loadingRef = useRef(Boolean(workspaceId));

  const reload = useCallback(
    async ({ quiet = false } = {}) => {
      if (!workspaceId) {
        setStats(DEFAULT_STATS);
        setLoading(false);
        setError(null);
        return;
      }

      const background = quiet && !loadingRef.current;
      const requestToken = {};
      currentRequestRef.current = requestToken;
      if (!background) {
        loadingRef.current = true;
        setLoading(true);
        setError(null);
      }

      try {
        const response = await api.get(`/workspaces/${workspaceId}/stats`, {
          params,
        });
        if (currentRequestRef.current !== requestToken) return;
        setStats(response.data ?? DEFAULT_STATS);
        setError(null);
      } catch (requestError) {
        if (currentRequestRef.current !== requestToken) return;
        if (background) return;
        setError(requestError);
      } finally {
        if (currentRequestRef.current === requestToken) {
          loadingRef.current = false;
          setLoading(false);
        }
      }
    },
    [workspaceId, params],
  );

  useEffect(() => {
    function sync() {
      reload();
    }
    sync();
  }, [reload]);

  useDataChanged('tasks', () => reload({ quiet: true }), workspaceId);

  return { stats, loading, error, reload };
}
