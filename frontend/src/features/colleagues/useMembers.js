import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../lib/api';

export function useMembers(workspaceId) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const currentRequestRef = useRef(null);

  const reload = useCallback(async () => {
    if (!workspaceId) return;
    const requestToken = {};
    currentRequestRef.current = requestToken;
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/workspaces/${workspaceId}/members`);
      if (currentRequestRef.current !== requestToken) return;
      setMembers(response.data);
    } catch (requestError) {
      if (currentRequestRef.current !== requestToken) return;
      setError(requestError);
    } finally {
      if (currentRequestRef.current === requestToken) setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    function sync() {
      reload();
    }
    sync();
  }, [reload]);

  return { members, loading, error, reload };
}
