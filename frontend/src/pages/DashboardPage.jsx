import { useRef, useState } from 'react';
import { AlertTriangle, Download, Loader2, Upload } from 'lucide-react';
import { useWorkspace } from '../context/useWorkspace';
import { useTasks } from '../features/tasks/useTasks';
import { getErrorMessage } from '../lib/api';
import { downloadFile, parseTasksCsv, tasksToCsv } from '../lib/csv';
import Spinner from '../components/Spinner';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import StatsDashboard from '../features/dashboard/StatsDashboard';
import { useActivityLogs } from '../features/dashboard/useActivityLogs';
import { ACTIVITY_FEED_LIMIT } from '../features/dashboard/activityLog';

const CSV_FILENAME = 'team-pulse-tasks.csv';

const outlineButtonClass =
  'inline-flex items-center gap-2 rounded-lg border border-[#71717A]/30 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60';

export default function DashboardPage() {
  const { current } = useWorkspace();
  const workspaceId = current?.id ?? null;
  const { tasks, loading, error, reload, createTask, moveTask } = useTasks(workspaceId);
  const {
    logs: activityLogs,
    loading: activityLoading,
    error: activityError,
    reload: reloadActivity,
  } = useActivityLogs(workspaceId, ACTIVITY_FEED_LIMIT);

  const fileInputRef = useRef(null);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(null);
  const [importSummary, setImportSummary] = useState(null);

  function handleExport() {
    downloadFile(CSV_FILENAME, tasksToCsv(tasks));
  }

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  function closeImportSummary() {
    setImportSummary(null);
  }

  async function handleFileChange(event) {
    const input = event.target;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    setImporting(true);
    setImportProgress(null);

    let rows;
    let rowErrors;

    try {
      const text = await file.text();
      const parsed = parseTasksCsv(text);
      rows = parsed.rows;
      rowErrors = [...parsed.errors];
    } catch (readError) {
      rows = [];
      rowErrors = [getErrorMessage(readError)];
    }

    let created = 0;

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      setImportProgress({ done: index, total: rows.length });

      try {
        const newTask = await createTask({
          title: row.title,
          description: row.description,
          priority: row.priority,
          assigneeId: null,
        });
        created += 1;

        if (row.status !== 'TODO') {
          try {
            await moveTask(newTask.id, row.status);
          } catch (moveError) {
            rowErrors.push(
              `"${row.title}" was imported but stayed as To-Do because its status could not be updated: ${getErrorMessage(moveError)}`,
            );
          }
        }
      } catch (createError) {
        rowErrors.push(`"${row.title}" was not imported: ${getErrorMessage(createError)}`);
      }
    }

    setImportProgress(null);
    if (created > 0) {
      await Promise.all([reload(), reloadActivity()]);
    }

    setImporting(false);
    setImportSummary({ created, total: rows.length, errors: rowErrors });
  }

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

  const importResultMessage =
    importSummary && importSummary.total === 0 && importSummary.errors.length === 0
      ? 'No tasks were found in that file.'
      : `${importSummary?.created ?? 0} of ${importSummary?.total ?? 0} task${
          importSummary?.total === 1 ? '' : 's'
        } imported.`;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">Analytics Overview</h1>
          <p className="mt-2 text-sm text-[#71717A]">
            Track your team's performance and activity.
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleImportClick}
              disabled={importing}
              className={outlineButtonClass}
            >
              {importing ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              Import CSV
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={handleExport}
              disabled={importing}
              className={outlineButtonClass}
            >
              <Download size={16} />
              Export to CSV
            </button>
          </div>
          {importing && importProgress && (
            <span aria-live="polite" className="text-xs font-medium text-[#71717A]">
              Importing {Math.min(importProgress.done + 1, importProgress.total)} of{' '}
              {importProgress.total}...
            </span>
          )}
        </div>
      </div>

      <div className="mt-6">
        <StatsDashboard
          tasks={tasks}
          activityLogs={activityLogs}
          activityLoading={activityLoading}
          activityError={activityError}
          onRetryActivity={reloadActivity}
        />
      </div>

      <Modal open={Boolean(importSummary)} onClose={closeImportSummary} title="Import results">
        <div className="space-y-4">
          <p className="text-sm text-white">{importResultMessage}</p>
          {importSummary?.errors?.length > 0 && (
            <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-rose-500/30 bg-rose-500/10 p-3">
              {importSummary.errors.map((message, index) => (
                <p key={index} className="text-xs font-medium text-rose-300">
                  {message}
                </p>
              ))}
            </div>
          )}
          <div className="flex justify-end border-t border-[#27273a] pt-4">
            <button
              type="button"
              onClick={closeImportSummary}
              className="rounded-lg bg-[#3B82F6] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              Done
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
