import api from '../../lib/api';

const PAGE_SIZE = 100;

export async function fetchWorkspaceTasks(workspaceId) {
  const tasks = [];

  for (let page = 0; ; page += 1) {
    const { data } = await api.get(`/tasks/workspace/${workspaceId}`, {
      params: { page, size: PAGE_SIZE, sort: 'createdAt,asc' },
    });

    if (Array.isArray(data)) return data;

    tasks.push(...(data?.content ?? []));
    if (data?.last !== false) return tasks;
  }
}
