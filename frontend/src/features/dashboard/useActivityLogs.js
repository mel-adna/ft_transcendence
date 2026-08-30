import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../lib/api';

export function useActivityLogs(workspaceId, size = 20) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const currentRequestRef = useRef(null);

  const reload = useCallback(async () => {
    if (!workspaceId) {
      setLogs([]);
      setLoading(false);
      return;
    }
    const requestToken = {};
    currentRequestRef.current = requestToken;
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/activity-logs/workspace/${workspaceId}`, {
        params: { size },
      });
      if (currentRequestRef.current !== requestToken) return;
      setLogs(response.data?.content ?? []);
    } catch (requestError) {
      if (currentRequestRef.current !== requestToken) return;
      setError(requestError);
      setLogs([]);
    } finally {
      if (currentRequestRef.current === requestToken) setLoading(false);
    }
  }, [workspaceId, size]);

  useEffect(() => {
    function sync() {
      reload();
    }
    sync();
  }, [reload]);

  return { logs, loading, error, reload };
}
