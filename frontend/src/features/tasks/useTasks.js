import { useCallback } from 'react';
import api from '../../lib/api';
import { useList } from '../../hooks/useList';

export function useTasks(workspaceId) {
  const load = useCallback(async () => {
    if (!workspaceId) return [];
    const response = await api.get(`/tasks/workspace/${workspaceId}`);
    return response.data;
  }, [workspaceId]);

  const { items: tasks, setItems: setTasks, loading, error, reload } = useList(load);

  const createTask = useCallback(
    async (payload) => {
      const response = await api.post(`/tasks/workspace/${workspaceId}`, payload);
      setTasks((previous) => [...previous, response.data]);
      return response.data;
    },
    [workspaceId, setTasks],
  );

  const updateTask = useCallback(
    async (taskId, payload) => {
      const response = await api.put(`/tasks/${taskId}`, payload);
      setTasks((previous) => previous.map((task) => (task.id === taskId ? response.data : task)));
      return response.data;
    },
    [setTasks],
  );

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
      } catch (requestError) {
        setTasks((previous) =>
          previous.map((task) =>
            task.id === taskId ? { ...task, status: previousStatus } : task,
          ),
        );
        throw requestError;
      }
    },
    [tasks, setTasks],
  );

  const removeTask = useCallback(
    async (taskId) => {
      await api.delete(`/tasks/${taskId}`);
      setTasks((previous) => previous.filter((task) => task.id !== taskId));
    },
    [setTasks],
  );

  return { tasks, loading, error, reload, createTask, updateTask, moveTask, removeTask };
}
