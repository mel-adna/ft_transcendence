import { useMemo, useRef, useState } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import {
  List,
  CheckCircle,
  Clock,
  Layers,
  CheckSquare,
  Activity,
  UserX,
  PieChart as PieIcon,
  BarChart3,
  TrendingUp,
  Users,
  FileDown,
  Loader2,
} from 'lucide-react';
import { useWorkspaceStats } from './useWorkspaceStats';
import { buildActivityFeed } from './activityLog';
import Avatar from '../../components/Avatar';
import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';
import Spinner from '../../components/Spinner';

const CHART_HEIGHT = 240;

const CHART = {
  primary: '#3B82F6',
  muted: '#71717A',
  panel: '#181824',
  canvas: '#0c0c14',
  mutedLine: 'rgba(113, 113, 122, 0.2)',
};

const TOOLTIP_STYLE = {
  background: CHART.panel,
  border: `1px solid ${CHART.mutedLine}`,
  borderRadius: '12px',
  color: '#fff',
};

const AXIS_PROPS = {
  stroke: CHART.muted,
  opacity: 0.8,
  fontSize: 11,
  fontWeight: 600,
  tickLine: false,
  axisLine: false,
};

const RANGE_OPTIONS = [
  { value: 7, label: '7 Days' },
  { value: 14, label: '14 Days' },
  { value: 30, label: '30 Days' },
  { value: 0, label: 'All Time' },
];

const STATUS_FILTERS = [
  { value: 'TODO', label: 'To Do' },
  { value: 'DOING', label: 'In Progress' },
  { value: 'DONE', label: 'Done' },
];

const PRIORITY_FILTERS = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
];

const NO_FILTERS = { status: '', priority: '', assigneeId: '' };

const controlClass =
  'rounded-lg border border-muted/20 bg-canvas/60 px-2 py-1 text-xs font-semibold text-white focus:border-primary focus:outline-none';

// <input type="date"> needs YYYY-MM-DD in local time; the en-CA locale uses that format.
function toDateInput(date) {
  return date.toLocaleDateString('en-CA');
}

const TONE_STYLE = {
  done: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  active: 'border-primary/30 bg-primary/10 text-primary',
  danger: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
  neutral: 'border-muted/30 bg-muted/10 text-muted',
};

const STATUS_COLORS = {
  TODO: '#71717A',
  DOING: '#3B82F6',
  DONE: '#34D399',
};

const PRIORITY_COLORS = {
  LOW: '#38BDF8',
  MEDIUM: '#FBBF24',
  HIGH: '#F43F5E',
};

function formatRelativeTime(value) {
  if (!value) return '';
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return '';
  const diffMs = Math.max(0, Date.now() - then);
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function StatCard({ icon: Icon, label, value, badge, subtitle }) {
  return (
    <div className="flex flex-col justify-between rounded-2xl border border-card bg-panel p-4 sm:p-5 shadow-lg transition-all hover:border-muted/30 min-h-[124px]">
      <div className="flex items-center justify-between gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-muted/20 bg-canvas/60 text-primary shrink-0">
          <Icon size={18} />
        </div>
        {badge ? (
          <span className="truncate rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
            {badge}
          </span>
        ) : subtitle ? (
          <span className="truncate text-[11px] font-medium text-muted">
            {subtitle}
          </span>
        ) : null}
      </div>
      <div className="mt-3.5">
        <span className="block text-[10px] font-bold uppercase tracking-wider text-muted">
          {label}
        </span>
        <div className="mt-0.5 text-2xl font-extrabold tracking-tight text-white sm:text-[26px]">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
      </div>
    </div>
  );
}

// One filter <select>: an "All" option followed by the given { value, label } options.
function FilterSelect({ label, allLabel, value, options, onChange, className = '' }) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-label={label}
      className={`${controlClass} ${className}`}
    >
      <option value="">{allLabel}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>{option.label}</option>
      ))}
    </select>
  );
}

// Legend under a chart: color dot, name, count and share of all tasks.
function ChartLegend({ items, total }) {
  return (
    <div className="mt-4 grid grid-cols-3 gap-2 border-t border-card/60 pt-3 text-center">
      {items.map((item) => (
        <div key={item.key} className="flex flex-col items-center">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="text-[11px] font-semibold text-muted">{item.name}</span>
          </div>
          <span className="mt-1 text-sm font-bold text-white">{item.value}</span>
          <span className="text-[10px] text-muted">{Math.round((item.value / total) * 100)}%</span>
        </div>
      ))}
    </div>
  );
}

function labelOf(options, value) {
  return options.find((option) => option.value === value)?.label;
}

export default function StatsDashboard({
  workspaceId,
  activityLogs,
  activityLoading,
  activityError,
  onRetryActivity,
}) {
  const [range, setRange] = useState(7); // preset days (0 = All Time) or 'custom'
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [filters, setFilters] = useState(NO_FILTERS);
  const [filtersWorkspaceId, setFiltersWorkspaceId] = useState(workspaceId);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState(false);
  const dashboardRef = useRef(null);

  // A member from the previous workspace is not valid in the new one.
  if (filtersWorkspaceId !== workspaceId) {
    setFiltersWorkspaceId(workspaceId);
    setFilters(NO_FILTERS);
  }

  // Everything is sent to the backend; empty filters are left out of the query.
  const params = useMemo(
    () => ({
      ...(range === 'custom' ? { from, to } : { days: range }),
      status: filters.status || undefined,
      priority: filters.priority || undefined,
      assigneeId: filters.assigneeId || undefined,
    }),
    [range, from, to, filters],
  );

  const {
    stats,
    loading: statsLoading,
    error: statsError,
    reload: reloadStats,
  } = useWorkspaceStats(workspaceId, params);

  function selectCustomRange() {
    if (!from) {
      const start = new Date();
      start.setDate(start.getDate() - 6);
      setFrom(toDateInput(start));
      setTo(toDateInput(new Date()));
    }
    setRange('custom');
  }

  function updateFilter(name, value) {
    setFilters((previous) => ({ ...previous, [name]: value }));
  }

  function clearFilters() {
    setFilters(NO_FILTERS);
  }

  async function handleExportPdf() {
    const node = dashboardRef.current;
    if (!node) return;
    setExporting(true);
    setExportError(false);
    try {
      // Loaded on click so the PDF libraries stay out of the main bundle.
      const [{ toJpeg }, { jsPDF }] = await Promise.all([import('html-to-image'), import('jspdf')]);
      // JPEG is embedded as-is by jsPDF; a PNG is re-encoded and makes the file ~50x larger.
      const image = await toJpeg(node, {
        backgroundColor: CHART.canvas,
        pixelRatio: 2,
        quality: 0.92,
        filter: (element) => element.dataset?.pdfIgnore === undefined,
        skipFonts: true,
      });
      // One page sized to the dashboard keeps charts and tables unsplit.
      const width = node.offsetWidth;
      const height = node.offsetHeight;
      const pdf = new jsPDF({
        orientation: width > height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [width, height],
      });
      pdf.addImage(image, 'JPEG', 0, 0, width, height);
      pdf.save('team-pulse-analytics.pdf');
    } catch {
      setExportError(true);
    } finally {
      setExporting(false);
    }
  }

  const activity = useMemo(() => buildActivityFeed(activityLogs), [activityLogs]);

  const totalTasks = stats.totalTasks ?? 0;
  const completedCount = stats.completedCount ?? 0;
  const inProgressCount = stats.inProgressCount ?? 0;
  const backlogCount = stats.backlogCount ?? stats.todoCount ?? 0;
  const completionRate = stats.completionRate ?? 0;
  const tasksCompletedInPeriod = stats.tasksCompletedInPeriod ?? 0;
  const averageCompletedPerDay = stats.averageCompletedPerDay ?? 0;

  const statusDist = stats.statusDistribution ?? {};
  const statusData = [
    { key: 'TODO', name: 'To Do', value: statusDist.todo ?? 0, color: STATUS_COLORS.TODO },
    { key: 'DOING', name: 'In Progress', value: statusDist.inProgress ?? 0, color: STATUS_COLORS.DOING },
    { key: 'DONE', name: 'Done', value: statusDist.completed ?? 0, color: STATUS_COLORS.DONE },
  ];

  const priorityDist = stats.priorityDistribution ?? {};
  const priorityData = [
    { key: 'LOW', name: 'Low', value: priorityDist.low ?? 0, color: PRIORITY_COLORS.LOW },
    { key: 'MEDIUM', name: 'Medium', value: priorityDist.medium ?? 0, color: PRIORITY_COLORS.MEDIUM },
    { key: 'HIGH', name: 'High', value: priorityDist.high ?? 0, color: PRIORITY_COLORS.HIGH },
  ];

  const memberStats = stats.memberStats ?? [];
  const memberOptions = memberStats
    .filter((member) => member.userId != null)
    .map((member) => ({ value: member.userId, label: member.name }));

  const rangeLabel =
    range === 'custom'
      ? `${from} to ${to}`
      : RANGE_OPTIONS.find((opt) => opt.value === range)?.label ?? `${range} Days`;

  const filterLabel =
    [
      labelOf(STATUS_FILTERS, filters.status),
      labelOf(PRIORITY_FILTERS, filters.priority),
      labelOf(memberOptions, filters.assigneeId),
    ]
      .filter(Boolean)
      .join(' · ') || 'All tasks';

  return (
    <div ref={dashboardRef} className="space-y-5 text-left">
      {/* Date Range & Filters Header */}
      <div className="flex flex-col gap-3 rounded-2xl border border-card bg-panel px-4 py-3 sm:px-5 sm:py-3.5 shadow-lg">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-white">Performance Metrics</h2>
            <p className="text-xs text-muted">
              Viewing workspace data for <span className="font-semibold text-primary">{rangeLabel}</span>
              {' · '}
              <span className="font-semibold text-slate-200">{filterLabel}</span>
            </p>
          </div>
          <div data-pdf-ignore className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <div className="flex flex-wrap items-center gap-1 rounded-xl border border-muted/20 bg-canvas/60 p-1">
              {[...RANGE_OPTIONS, { value: 'custom', label: 'Custom' }].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => (option.value === 'custom' ? selectCustomRange() : setRange(option.value))}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                    range === option.value
                      ? 'border border-muted/20 bg-panel text-primary shadow-xs'
                      : 'text-muted hover:text-slate-200'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {range === 'custom' && (
              <div className="flex items-center gap-1.5 text-xs text-muted">
                <input
                  type="date"
                  value={from}
                  max={to}
                  onChange={(event) => event.target.value && setFrom(event.target.value)}
                  aria-label="Start date"
                  className={controlClass}
                />
                <span>to</span>
                <input
                  type="date"
                  value={to}
                  min={from}
                  onChange={(event) => event.target.value && setTo(event.target.value)}
                  aria-label="End date"
                  className={controlClass}
                />
              </div>
            )}
          </div>
        </div>

        <div data-pdf-ignore className="flex flex-wrap items-center gap-2">
          <FilterSelect
            label="Filter by status"
            allLabel="All statuses"
            value={filters.status}
            options={STATUS_FILTERS}
            onChange={(value) => updateFilter('status', value)}
          />
          <FilterSelect
            label="Filter by priority"
            allLabel="All priorities"
            value={filters.priority}
            options={PRIORITY_FILTERS}
            onChange={(value) => updateFilter('priority', value)}
          />
          <FilterSelect
            label="Filter by member"
            allLabel="All members"
            value={filters.assigneeId}
            options={memberOptions}
            onChange={(value) => updateFilter('assigneeId', value)}
            className="max-w-[11rem]"
          />
          {(filters.status || filters.priority || filters.assigneeId) && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs font-semibold text-muted transition-colors hover:text-white cursor-pointer"
            >
              Clear
            </button>
          )}
          <div className="flex items-center gap-2 sm:ml-auto">
            {exportError && <span className="text-xs text-rose-300">PDF export failed</span>}
            <button
              type="button"
              onClick={handleExportPdf}
              disabled={exporting}
              className="inline-flex items-center gap-1.5 rounded-lg border border-muted/30 px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
            >
              {exporting ? <Loader2 size={13} className="animate-spin" /> : <FileDown size={13} />}
              <span>Export PDF</span>
            </button>
          </div>
        </div>
      </div>

      {statsError && (
        <div className="rounded-2xl border border-card bg-panel p-5 shadow-lg">
          <ErrorState
            title="Could not load analytics"
            error={statsError}
            onRetry={() => reloadStats()}
          />
        </div>
      )}

      {/* Top Derived Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        <StatCard
          icon={List}
          label="Total Tasks"
          value={totalTasks}
          badge={statsLoading ? 'Updating...' : null}
        />
        <StatCard
          icon={CheckCircle}
          label="Completion Rate"
          value={`${completionRate}%`}
          badge={`${completedCount} / ${totalTasks}`}
        />
        <StatCard
          icon={Clock}
          label="Completed"
          value={tasksCompletedInPeriod}
          subtitle={`in ${rangeLabel.toLowerCase()}`}
        />
        <StatCard
          icon={Layers}
          label="In Progress"
          value={inProgressCount}
          badge="Active"
        />
        <StatCard
          icon={CheckSquare}
          label="Current Backlog"
          value={backlogCount}
          badge="To-Do"
        />
        <StatCard
          icon={Activity}
          label="Avg Done / Day"
          value={averageCompletedPerDay}
          subtitle="Throughput"
        />
      </div>

      {/* Charts Grid: Completion Trend (2 cols) & Status Distribution (1 col) */}
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-3">
        {/* Trend Area Chart */}
        <div
          className={`flex flex-col justify-between rounded-2xl border border-card bg-panel p-5 sm:p-6 shadow-lg lg:col-span-2 ${
            totalTasks === 0 ? 'min-h-[220px] lg:h-[240px]' : ''
          }`}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <TrendingUp size={18} className="text-primary" />
              <h3 className="text-sm sm:text-base font-bold text-white">Task Completion Trends</h3>
            </div>
            <span className="text-xs font-semibold text-muted">{rangeLabel}</span>
          </div>

          {totalTasks === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
              <p className="text-xs font-medium text-muted">No task completion data yet</p>
              <p className="text-[11px] text-muted/60 mt-1">Complete tasks in this workspace to see progress trends</p>
            </div>
          ) : (
            <div className="mt-5 w-full">
              <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                <AreaChart data={stats.completionTrend}>
                  <defs>
                    <linearGradient id="completionGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART.primary} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={CHART.primary} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART.muted} opacity={0.12} vertical={false} />
                  <XAxis
                    dataKey="label"
                    {...AXIS_PROPS}
                    dy={10}
                  />
                  <YAxis
                    allowDecimals={false}
                    domain={[0, 'auto']}
                    {...AXIS_PROPS}
                    dx={-10}
                    width={30}
                  />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    labelStyle={{ color: CHART.muted }}
                  />
                  <Area
                    type="monotone"
                    dataKey="completed"
                    stroke={CHART.primary}
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#completionGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Status Distribution Donut Chart */}
        <div
          className={`flex flex-col justify-between rounded-2xl border border-card bg-panel p-5 sm:p-6 shadow-lg ${
            totalTasks === 0 ? 'min-h-[220px] lg:h-[240px]' : ''
          }`}
        >
          <div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <PieIcon size={18} className="text-primary" />
                <h3 className="text-sm sm:text-base font-bold text-white">Status Distribution</h3>
              </div>
              <span className="text-xs text-muted">{totalTasks} tasks</span>
            </div>

            {totalTasks === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
                <p className="text-xs font-medium text-muted">No task data yet</p>
                <p className="text-[11px] text-muted/60 mt-1">Tasks will appear by status once created</p>
              </div>
            ) : (
              <div className="mt-4 w-full">
                <ResponsiveContainer width="100%" height={170}>
                  <PieChart>
                    <Tooltip
                      contentStyle={TOOLTIP_STYLE}
                      formatter={(val, name) => [`${val} task${val === 1 ? '' : 's'}`, name]}
                    />
                    <Pie
                      data={statusData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={70}
                      paddingAngle={4}
                    >
                      {statusData.map((entry) => (
                        <Cell key={entry.key} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {totalTasks > 0 && <ChartLegend items={statusData} total={totalTasks} />}
        </div>
      </div>

      {/* Row 2: Priority Distribution (1 col) & Recent Activity (2 cols) */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Priority Distribution Bar Chart */}
        <div
          className={`flex flex-col justify-between rounded-2xl border border-card bg-panel p-5 sm:p-6 shadow-lg ${
            totalTasks === 0 && activity.length === 0
              ? 'min-h-[220px] lg:h-[260px]'
              : 'h-[360px] lg:h-[380px]'
          }`}
        >
          <div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <BarChart3 size={18} className="text-primary" />
                <h3 className="text-sm sm:text-base font-bold text-white">Priority Breakdown</h3>
              </div>
              <span className="text-xs text-muted">Task urgency</span>
            </div>

            {totalTasks === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center pt-8 pb-4 text-center">
                <p className="text-xs font-medium text-muted">No task data yet</p>
                <p className="text-[11px] text-muted/60 mt-1">Assign priorities to view distribution</p>
              </div>
            ) : (
              <div className="mt-4 w-full">
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={priorityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART.muted} opacity={0.12} vertical={false} />
                    <XAxis
                      dataKey="name"
                      {...AXIS_PROPS}
                      dy={8}
                    />
                    <YAxis
                      allowDecimals={false}
                      domain={[0, 'auto']}
                      {...AXIS_PROPS}
                      width={30}
                    />
                    <Tooltip
                      contentStyle={TOOLTIP_STYLE}
                      labelStyle={{ color: CHART.muted }}
                      formatter={(val) => [`${val} task${val === 1 ? '' : 's'}`, 'Count']}
                    />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {priorityData.map((entry) => (
                        <Cell key={entry.key} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {totalTasks > 0 && <ChartLegend items={priorityData} total={totalTasks} />}
        </div>

        {/* Recent Activity Feed */}
        <div
          className={`flex flex-col rounded-2xl border border-card bg-panel p-5 sm:p-6 shadow-lg lg:col-span-2 ${
            totalTasks === 0 && activity.length === 0
              ? 'min-h-[220px] lg:h-[260px]'
              : 'h-[360px] lg:h-[380px]'
          }`}
        >
          <div className="flex shrink-0 items-center justify-between">
            <h3 className="text-sm sm:text-base font-bold text-white">Recent Activity</h3>
            <span className="text-xs text-muted">Latest task events</span>
          </div>

          {activityLoading ? (
            <div className="flex flex-1 items-center justify-center p-6">
              <Spinner />
            </div>
          ) : activityError ? (
            <div className="mt-4">
              <ErrorState
                title="Could not load activity"
                error={activityError}
                onRetry={onRetryActivity}
              />
            </div>
          ) : activity.length === 0 ? (
            <div className="flex flex-1 items-center justify-center p-6">
              <EmptyState
                icon={Activity}
                title="No activity yet"
                message="Task updates and comments will show up here once work starts moving."
              />
            </div>
          ) : (
            <ul className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto pb-3 pr-1.5 [scrollbar-color:rgba(113,113,122,0.3)_transparent] [scrollbar-width:thin]">
              {activity.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-start gap-3 rounded-xl p-2 transition-colors hover:bg-white/[0.02]"
                >
                  <Avatar user={entry.user} size={30} />
                  <div className="min-w-0 flex-1">
                    {entry.description && (
                      <p className="truncate text-xs font-semibold text-white">
                        {entry.description}
                      </p>
                    )}
                    <div className="mt-1 flex items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${
                          TONE_STYLE[entry.tone] ?? TONE_STYLE.neutral
                        }`}
                      >
                        {entry.label}
                      </span>
                      <span className="text-[10px] text-muted/70">
                        {formatRelativeTime(entry.createdAt)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Row 3: Per-Member Activity Breakdown */}
      <div className="rounded-2xl border border-card bg-panel p-5 sm:p-6 shadow-lg">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-primary" />
            <h3 className="text-sm sm:text-base font-bold text-white">Team Member Activity</h3>
          </div>
          <span className="text-xs text-muted">
            Workspace member task activity
          </span>
        </div>

        {memberStats.length === 0 ? (
          <div className="py-8">
            <EmptyState
              icon={Users}
              title="No member activity"
              message="No members or assigned tasks found in this workspace."
            />
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto [scrollbar-color:rgba(113,113,122,0.3)_transparent] [scrollbar-width:thin]">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-card/80 text-[10px] font-bold uppercase tracking-wider text-muted">
                  <th scope="col" className="pb-2.5 pr-4">Member</th>
                  <th scope="col" className="pb-2.5 px-3 text-center">Total Assigned</th>
                  <th scope="col" className="pb-2.5 px-3 text-center">Done</th>
                  <th scope="col" className="pb-2.5 px-3 text-center">In Progress</th>
                  <th scope="col" className="pb-2.5 px-3 text-center">To Do</th>
                  <th scope="col" className="pb-2.5 pl-3 text-right">Completion Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-card/40">
                {memberStats.map((member, idx) => {
                  const isUnassigned = member.userId == null;
                  return (
                    <tr
                      key={member.userId ?? `unassigned-${idx}`}
                      className="transition-colors hover:bg-white/[0.02]"
                    >
                      <td className="py-2.5 pr-4">
                        <div className="flex items-center gap-2.5">
                          {isUnassigned ? (
                            <div className="flex h-7 w-7 items-center justify-center rounded-full border border-muted/30 bg-muted/10 text-muted shrink-0">
                              <UserX size={14} />
                            </div>
                          ) : (
                            <Avatar
                              user={{
                                id: member.userId,
                                firstName: member.name?.split(' ')[0] ?? '',
                                lastName: member.name?.split(' ').slice(1).join(' ') ?? '',
                                avatarUrl: member.avatarUrl,
                              }}
                              size={28}
                            />
                          )}
                          <div className="min-w-0">
                            <span className="block truncate font-semibold text-white">
                              {member.name}
                            </span>
                            {member.email && (
                              <span className="block truncate text-[10px] text-muted">
                                {member.email}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-white">
                        {member.totalAssigned}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="inline-flex min-w-[26px] items-center justify-center rounded-md border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 text-xs font-semibold text-emerald-400">
                          {member.completed}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="inline-flex min-w-[26px] items-center justify-center rounded-md border border-primary/20 bg-primary/10 px-1.5 py-0.5 text-xs font-semibold text-primary">
                          {member.inProgress}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="inline-flex min-w-[26px] items-center justify-center rounded-md border border-muted/20 bg-muted/10 px-1.5 py-0.5 text-xs font-semibold text-muted">
                          {member.todo}
                        </span>
                      </td>
                      <td className="py-2.5 pl-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="hidden h-1.5 w-14 overflow-hidden rounded-full bg-canvas/80 sm:block">
                            <div
                              className="h-full rounded-full bg-emerald-400 transition-all"
                              style={{ width: `${Math.min(100, Math.max(0, member.completionRate))}%` }}
                            />
                          </div>
                          <span className="font-semibold text-white">
                            {member.completionRate}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
