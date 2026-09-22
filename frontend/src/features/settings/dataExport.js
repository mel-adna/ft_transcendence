import api from '../../lib/api';

export async function buildDataExport(user, workspaces) {
  const tasksByWorkspace = {};

  for (const workspace of workspaces) {
    const response = await api.get(`/tasks/workspace/${workspace.id}`);
    tasksByWorkspace[workspace.name] = response.data;
  }

  return {
    exportedAt: new Date().toISOString(),
    profile: user,
    teams: workspaces,
    tasks: tasksByWorkspace,
  };
}
