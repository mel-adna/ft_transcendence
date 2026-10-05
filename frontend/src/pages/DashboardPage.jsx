import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Download, Loader2, Upload } from 'lucide-react';
import { useWorkspace } from '../context/useWorkspace';
import { useTasks } from '../features/tasks/useTasks';
import { getErrorMessage } from '../lib/api';
import { downloadFile, parseTasksCsv, parseTasksJson, tasksToCsv, tasksToJson } from '../lib/csv';
import Spinner from '../components/Spinner';
import ErrorState from '../components/ErrorState';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import StatsDashboard from '../features/dashboard/StatsDashboard';
import { useActivityLogs } from '../features/dashboard/useActivityLogs';
import { ACTIVITY_FEED_LIMIT } from '../features/dashboard/activityLog';

const CSV_FILENAME = 'team-pulse-tasks.csv';
const JSON_FILENAME = 'team-pulse-tasks.json';
export const MAX_IMPORT_FILE_SIZE = 2 * 1024 * 1024; // 2 MB

const outlineButtonClass =
  'inline-flex items-center gap-2 rounded-lg border border-muted/30 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white transition-colors hover:bg-white/5 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer';

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
  const exportMenuRef = useRef(null);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(null);
  const [importSummary, setImportSummary] = useState(null);
  const [exportOpen, setExportOpen] = useState(false);

  useEffect(() => {
    function handleClickOutside(event) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target)) {
        setExportOpen(false);
      }
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setExportOpen(false);
      }
    }
    if (exportOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [exportOpen]);

  function handleExportCsv() {
    setExportOpen(false);
    downloadFile(CSV_FILENAME, tasksToCsv(tasks), 'text/csv;charset=utf-8');
  }

  function handleExportJson() {
    setExportOpen(false);
    downloadFile(JSON_FILENAME, tasksToJson(tasks), 'application/json;charset=utf-8');
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

    if (!workspaceId) {
      setImportSummary({
        created: 0,
        total: 0,
        errors: ['No active workspace selected. Please select a workspace before importing.'],
      });
      return;
    }

    // 1. File Size Limit (2 MB) - reject before reading into memory
    if (file.size > MAX_IMPORT_FILE_SIZE) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      setImportSummary({
        created: 0,
        total: 0,
        errors: [`"${file.name}" exceeds the maximum allowed file size of 2 MB (${sizeMb} MB).`],
      });
      return;
    }

    // 2. Strict Extension & MIME Validation
    const filename = file.name.toLowerCase();
    const hasJsonExt = filename.endsWith('.json');
    const hasCsvExt = filename.endsWith('.csv');

    if (!hasJsonExt && !hasCsvExt) {
      setImportSummary({
        created: 0,
        total: 0,
        errors: [`"${file.name}" is not supported. Only .csv and .json files are allowed.`],
      });
      return;
    }

    const mime = (file.type || '').toLowerCase();
    const validJsonMimes = ['application/json', 'text/json', 'text/plain', ''];
    const validCsvMimes = ['text/csv', 'application/csv', 'text/plain', 'application/vnd.ms-excel', ''];

    if (hasJsonExt && !validJsonMimes.includes(mime)) {
      setImportSummary({
        created: 0,
        total: 0,
        errors: [`"${file.name}" has an unexpected MIME type (${file.type}). Expected JSON.`],
      });
      return;
    }

    if (hasCsvExt && !validCsvMimes.includes(mime)) {
      setImportSummary({
        created: 0,
        total: 0,
        errors: [`"${file.name}" has an unexpected MIME type (${file.type}). Expected CSV.`],
      });
      return;
    }

    setImporting(true);
    setImportProgress(null);

    let rows;
    let rowErrors;

    try {
      const text = await file.text();
      const parsed = hasJsonExt ? parseTasksJson(text) : parseTasksCsv(text);
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
        const status = createError?.response?.status ?? createError?.status;
        rowErrors.push(`"${row.title}" was not imported: ${getErrorMessage(createError)}`);

        // Stop processing if rate limited by backend to avoid endless failed requests
        if (status === 429) {
          rowErrors.push(
            'Import stopped: Server rate limit reached. Please wait a minute and re-import remaining tasks.',
          );
          break;
        }
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
        <ErrorState title="Could not load dashboard" error={error} onRetry={reload} />
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
      <PageHeader
        title="Analytics Overview"
        description="Track your team's performance and activity."
      >
        <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleImportClick}
              disabled={importing}
              className={outlineButtonClass}
            >
              {importing ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
              <span>Import</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.json,text/csv,application/json"
              onChange={handleFileChange}
              className="hidden"
            />
            <div ref={exportMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setExportOpen((prev) => !prev)}
                disabled={importing}
                className={`${outlineButtonClass} gap-1.5`}
                aria-expanded={exportOpen}
                aria-haspopup="true"
              >
                <Download size={15} />
                <span>Export</span>
                <ChevronDown
                  size={14}
                  className={`text-muted transition-transform duration-150 ${exportOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {exportOpen && (
                <div
                  role="menu"
                  className="absolute right-0 z-20 mt-1.5 w-40 rounded-xl border border-card bg-panel p-1 shadow-xl backdrop-blur-md"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleExportCsv}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/5 focus-visible:outline-hidden focus-visible:bg-white/10 focus-visible:ring-1 focus-visible:ring-primary/50 cursor-pointer"
                  >
                    <span>Export as CSV</span>
                    <span className="text-[10px] text-muted">.csv</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleExportJson}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/5 focus-visible:outline-hidden focus-visible:bg-white/10 focus-visible:ring-1 focus-visible:ring-primary/50 cursor-pointer"
                  >
                    <span>Export as JSON</span>
                    <span className="text-[10px] text-muted">.json</span>
                  </button>
                </div>
              )}
            </div>
          </div>
          {importing && importProgress && (
            <span aria-live="polite" className="text-xs font-medium text-muted">
              Importing {Math.min(importProgress.done + 1, importProgress.total)} of{' '}
              {importProgress.total}...
            </span>
          )}
        </div>
      </PageHeader>

      <div className="mt-6">
        <StatsDashboard
          workspaceId={workspaceId}
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
            <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-danger/30 bg-danger/10 p-3">
              {importSummary.errors.map((message, index) => (
                <p key={index} className="text-xs font-medium text-danger">
                  {message}
                </p>
              ))}
            </div>
          )}
          <div className="flex justify-end border-t border-card pt-4">
            <button
              type="button"
              onClick={closeImportSummary}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              Done
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
