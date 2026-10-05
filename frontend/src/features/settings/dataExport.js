import { fetchWorkspaceTasks } from '../tasks/fetchWorkspaceTasks';

export async function buildDataExport(user, workspaces) {
  const tasksByWorkspace = {};

  for (const workspace of workspaces) {
    tasksByWorkspace[workspace.name] = await fetchWorkspaceTasks(workspace.id);
  }

  return {
    exportedAt: new Date().toISOString(),
    profile: user,
    teams: workspaces,
    tasks: tasksByWorkspace,
  };
}
