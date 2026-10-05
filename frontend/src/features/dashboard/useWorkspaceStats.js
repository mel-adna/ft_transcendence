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

export function useWorkspaceStats(workspaceId, range = 7) {
  const [stats, setStats] = useState(DEFAULT_STATS);
  const [loading, setLoading] = useState(Boolean(workspaceId));
  const [error, setError] = useState(null);
  const currentRequestRef = useRef(null);

  const reload = useCallback(
    async ({ quiet = false } = {}) => {
      if (!workspaceId) {
        setStats(DEFAULT_STATS);
        setLoading(false);
        setError(null);
        return;
      }

      const requestToken = {};
      currentRequestRef.current = requestToken;
      if (!quiet) setLoading(true);
      setError(null);

      try {
        const response = await api.get(`/workspaces/${workspaceId}/stats`, {
          params: { days: range },
        });
        if (currentRequestRef.current !== requestToken) return;
        setStats(response.data ?? DEFAULT_STATS);
      } catch (requestError) {
        if (currentRequestRef.current !== requestToken) return;
        setError(requestError);
      } finally {
        if (currentRequestRef.current === requestToken) setLoading(false);
      }
    },
    [workspaceId, range],
  );

  useEffect(() => {
    function sync() {
      reload();
    }
    sync();
  }, [reload]);

  useDataChanged('tasks', () => reload({ quiet: true }));

  return { stats, loading, error, reload };
}
