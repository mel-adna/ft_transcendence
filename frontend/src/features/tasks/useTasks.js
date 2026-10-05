import { useCallback } from 'react';
import api from '../../lib/api';
import { useDataChanged } from '../../lib/useDataChanged';
import { notifyDataChanged } from '../../lib/realtimeNotify';
import { useList } from '../../hooks/useList';
import { fetchWorkspaceTasks } from './fetchWorkspaceTasks';

export function useTasks(workspaceId) {
  const announceChange = useCallback(() => {
    if (workspaceId) notifyDataChanged('tasks', null, { workspaceId });
  }, [workspaceId]);

  const load = useCallback(async () => {
    if (!workspaceId) return [];
    return fetchWorkspaceTasks(workspaceId);
  }, [workspaceId]);

  const { items: tasks, setItems: setTasks, loading, error, reload } = useList(load);

  const createTask = useCallback(
    async (payload) => {
      const response = await api.post(`/tasks/workspace/${workspaceId}`, payload);
      setTasks((previous) => [...previous, response.data]);
      announceChange();
      return response.data;
    },
    [workspaceId, setTasks, announceChange],
  );

  const updateTask = useCallback(
    async (taskId, payload) => {
      const response = await api.put(`/tasks/${taskId}`, payload);
      setTasks((previous) => previous.map((task) => (task.id === taskId ? response.data : task)));
      announceChange();
      return response.data;
    },
    [setTasks, announceChange],
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
    [tasks, setTasks, announceChange],
  );

  const removeTask = useCallback(
    async (taskId) => {
      await api.delete(`/tasks/${taskId}`);
      setTasks((previous) => previous.filter((task) => task.id !== taskId));
      announceChange();
    },
    [setTasks, announceChange],
  );

  useDataChanged('tasks', () => reload({ quiet: true }));

  return { tasks, loading, error, reload, createTask, updateTask, moveTask, removeTask };
}
