import { useEffect, useState, useCallback } from 'react';
import api from '../lib/api';
import { useAuth } from './useAuth';
import { WorkspaceContext } from './useWorkspace';
import { useDataChanged } from '../lib/useDataChanged';

const STORAGE_KEY = 'workspaceId';

export function WorkspaceProvider({ children }) {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState([]);
  const [currentId, setCurrentId] = useState(() => localStorage.getItem(STORAGE_KEY));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // `quiet` skips the loading flag: a push-triggered background refresh
  // shouldn't blank the page out behind a spinner the user didn't ask for.
  const load = useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) setLoading(true);
    setError(null);
    try {
      const response = await api.get('/workspaces');
      setWorkspaces(response.data);
      setCurrentId((previous) => {
        const stillExists = response.data.some((item) => item.id === previous);
        return stillExists ? previous : (response.data[0]?.id ?? null);
      });
    } catch (requestError) {
      setError(requestError);
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  useEffect(() => {
    function sync() {
      if (user) load();
    }
    sync();
  }, [user, load]);

  // Someone added us to (or removed us from) a workspace elsewhere.
  useDataChanged('workspaces', useCallback(() => load({ quiet: true }), [load]));

  const selectWorkspace = useCallback((id) => {
    localStorage.setItem(STORAGE_KEY, id);
    setCurrentId(id);
  }, []);

  const current = workspaces.find((item) => item.id === currentId) ?? null;

  return (
    <WorkspaceContext.Provider
      value={{ workspaces, current, loading, error, selectWorkspace, refresh: load }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}
