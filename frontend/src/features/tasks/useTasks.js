import { useState, useEffect, useCallback } from 'react';
import api from '../../lib/api';

export function useTasks(workspaceId) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/tasks/workspace/${workspaceId}`);
      setTasks(response.data);
    } catch (requestError) {
      setError(requestError);
    } finally {
      setLoading(false);
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
      return response.data;
    },
    [workspaceId],
  );

  const updateTask = useCallback(async (taskId, payload) => {
    const response = await api.put(`/tasks/${taskId}`, payload);
    setTasks((previous) => previous.map((task) => (task.id === taskId ? response.data : task)));
    return response.data;
  }, []);

  const moveTask = useCallback(
    async (taskId, status) => {
      const snapshot = tasks;
      setTasks((previous) =>
        previous.map((task) => (task.id === taskId ? { ...task, status } : task)),
      );
      try {
        const response = await api.patch(`/tasks/${taskId}/status`, { status });
        setTasks((previous) =>
          previous.map((task) => (task.id === taskId ? response.data : task)),
        );
      } catch (requestError) {
        setTasks(snapshot);
        throw requestError;
      }
    },
    [tasks],
  );

  const removeTask = useCallback(async (taskId) => {
    await api.delete(`/tasks/${taskId}`);
    setTasks((previous) => previous.filter((task) => task.id !== taskId));
  }, []);

  return { tasks, loading, error, reload, createTask, updateTask, moveTask, removeTask };
}
