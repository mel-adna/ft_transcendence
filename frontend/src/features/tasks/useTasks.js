import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../lib/api';
import { useDataChanged } from '../../lib/useDataChanged';
import { notifyDataChanged } from '../../lib/realtimeNotify';

export function useTasks(workspaceId) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const currentRequestRef = useRef(null);

  // Ask the chat service to tell everyone else in this workspace to refetch;
  // the Java backend has no realtime channel of its own. Audience is resolved
  // server-side from workspaceId (null = "the whole team").
  const announceChange = useCallback(() => {
    if (workspaceId) notifyDataChanged('tasks', null, { workspaceId });
  }, [workspaceId]);

  const reload = useCallback(async () => {
    if (!workspaceId) return;
    const requestToken = {};
    currentRequestRef.current = requestToken;
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/tasks/workspace/${workspaceId}`);
      if (currentRequestRef.current !== requestToken) return;
      setTasks(response.data);
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

  const createTask = useCallback(
    async (payload) => {
      const response = await api.post(`/tasks/workspace/${workspaceId}`, payload);
      setTasks((previous) => [...previous, response.data]);
      announceChange();
      return response.data;
    },
    [workspaceId, announceChange],
  );

  const updateTask = useCallback(async (taskId, payload) => {
    const response = await api.put(`/tasks/${taskId}`, payload);
    setTasks((previous) => previous.map((task) => (task.id === taskId ? response.data : task)));
    announceChange();
    return response.data;
  }, [announceChange]);

  const moveTask = useCallback(
    async (taskId, status) => {
      const previousStatus = tasks.find((task) => task.id === taskId)?.status;
      setTasks((previous) =>
        previous.map((task) => (task.id === taskId ? { ...task, status } : task)),
      );
      try {
        const response = await api.patch(`/tasks/${taskId}/status`, { status });
        setTasks((previous) =>
          previous.map((task) => (task.id === taskId ? response.data : task)),
        );
        announceChange();
      } catch (requestError) {
        setTasks((previous) =>
          previous.map((task) =>
            task.id === taskId ? { ...task, status: previousStatus } : task,
          ),
        );
        throw requestError;
      }
    },
    [tasks, announceChange],
  );

  const removeTask = useCallback(async (taskId) => {
    await api.delete(`/tasks/${taskId}`);
    setTasks((previous) => previous.filter((task) => task.id !== taskId));
    announceChange();
  }, [announceChange]);

  // A task was created/moved/edited/deleted by someone else in this workspace.
  useDataChanged('tasks', reload);

  return { tasks, loading, error, reload, createTask, updateTask, moveTask, removeTask };
}
