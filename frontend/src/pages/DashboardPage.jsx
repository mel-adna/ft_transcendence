import { AlertTriangle } from 'lucide-react';
import { useWorkspace } from '../context/useWorkspace';
import { useTasks } from '../features/tasks/useTasks';
import { getErrorMessage } from '../lib/api';
import Spinner from '../components/Spinner';
import EmptyState from '../components/EmptyState';
import StatsDashboard from '../features/dashboard/StatsDashboard';

export default function DashboardPage() {
  const { current } = useWorkspace();
  const workspaceId = current?.id ?? null;
  const { tasks, loading, error, reload } = useTasks(workspaceId);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-4 sm:p-6 lg:p-8">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <EmptyState
          icon={AlertTriangle}
          title="Could not load dashboard"
          message={getErrorMessage(error)}
          action={
            <button
              type="button"
              onClick={reload}
              className="rounded-lg bg-[#3B82F6] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              Retry
            </button>
          }
        />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">Analytics Overview</h1>
          <p className="mt-2 text-sm text-[#71717A]">
            Track your team's performance and activity.
          </p>
        </div>
        <div className="hidden shrink-0 items-center gap-3 md:flex" />
      </div>

      <div className="mt-6">
        <StatsDashboard tasks={tasks} />
      </div>
    </div>
  );
}
