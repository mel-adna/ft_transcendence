import { useMemo, useState } from 'react';
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
} from 'lucide-react';
import { useWorkspaceStats } from './useWorkspaceStats';
import { buildActivityFeed, deriveActivityFeed } from './activityLog';
import Avatar from '../../components/Avatar';
import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';
import Spinner from '../../components/Spinner';

const CHART_HEIGHT = 240;

const CHART = {
  primary: '#3B82F6',
  muted: '#71717A',
  panel: '#181824',
  mutedLine: 'rgba(113, 113, 122, 0.2)',
};

const RANGE_OPTIONS = [
  { value: 7, label: '7 Days' },
  { value: 14, label: '14 Days' },
  { value: 30, label: '30 Days' },
  { value: 0, label: 'All Time' },
];

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
    <div className="flex flex-col justify-between rounded-2xl border border-card bg-panel p-5 shadow-lg transition-all hover:border-muted/30">
      <div className="flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-muted/20 bg-canvas/60 text-primary">
          <Icon size={19} />
        </div>
        {badge && (
          <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
            {badge}
          </span>
        )}
      </div>
      <div className="mt-4">
        <span className="block text-[10px] font-bold uppercase tracking-widest text-muted">
          {label}
        </span>
        <h3 className="mt-1 text-2xl font-bold leading-tight tracking-tight text-white md:text-[28px]">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </h3>
        {subtitle && (
          <p className="mt-1 text-[11px] text-muted">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

export default function StatsDashboard({
  workspaceId,
  tasks,
  activityLogs,
  activityLoading,
  activityError,
  onRetryActivity,
}) {
  const [range, setRange] = useState(7);
  const { stats, loading: statsLoading } = useWorkspaceStats(workspaceId, tasks, range);

  const activity = useMemo(() => {
    const fromApi = buildActivityFeed(activityLogs);
    return fromApi.length > 0 ? fromApi : deriveActivityFeed(tasks);
  }, [activityLogs, tasks]);

  const totalTasks = stats.totalTasks ?? stats.total ?? 0;
  const completedCount = stats.completedCount ?? stats.completed ?? 0;
  const inProgressCount = stats.inProgressCount ?? stats.inProgress ?? 0;
  const todoCount = stats.todoCount ?? stats.todo ?? 0;
  const backlogCount = stats.backlogCount ?? todoCount;
  const completionRate = stats.completionRate ?? (totalTasks > 0 ? Math.round((completedCount / totalTasks) * 1000) / 10 : 0);
  const tasksCompletedInPeriod = stats.tasksCompletedInPeriod ?? completedCount;
  const averageCompletedPerDay = stats.averageCompletedPerDay ?? 0;

  // Status Distribution Data
  const statusData = useMemo(() => {
    const dist = stats.statusDistribution ?? {
      todo: todoCount,
      inProgress: inProgressCount,
      completed: completedCount,
    };
    return [
      { key: 'TODO', name: 'To Do', value: dist.todo ?? 0, color: STATUS_COLORS.TODO },
      { key: 'DOING', name: 'In Progress', value: dist.inProgress ?? 0, color: STATUS_COLORS.DOING },
      { key: 'DONE', name: 'Done', value: dist.completed ?? 0, color: STATUS_COLORS.DONE },
    ];
  }, [stats.statusDistribution, todoCount, inProgressCount, completedCount]);

  // Priority Distribution Data
  const priorityData = useMemo(() => {
    const dist = stats.priorityDistribution ?? { low: 0, medium: 0, high: 0 };
    return [
      { key: 'LOW', name: 'Low', count: dist.low ?? 0, color: PRIORITY_COLORS.LOW },
      { key: 'MEDIUM', name: 'Medium', count: dist.medium ?? 0, color: PRIORITY_COLORS.MEDIUM },
      { key: 'HIGH', name: 'High', count: dist.high ?? 0, color: PRIORITY_COLORS.HIGH },
    ];
  }, [stats.priorityDistribution]);

  // Member stats array
  const memberStats = stats.memberStats ?? [];

  const rangeLabel = RANGE_OPTIONS.find((opt) => opt.value === range)?.label ?? `${range} Days`;

  return (
    <div className="space-y-6 text-left md:space-y-7">
      {/* Date Range Selector Header */}
      <div className="flex flex-col gap-3 rounded-2xl border border-card bg-panel p-4 shadow-lg sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div>
          <h2 className="text-base font-bold text-white">Performance Metrics</h2>
          <p className="text-xs text-muted">
            Viewing workspace data for <span className="font-semibold text-primary">{rangeLabel}</span>
          </p>
        </div>
        <div className="flex items-center gap-1 self-start rounded-xl border border-muted/25 bg-canvas/60 p-1 sm:self-auto">
          {RANGE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setRange(option.value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                range === option.value
                  ? 'border border-muted/20 bg-panel text-primary shadow-xs'
                  : 'text-muted hover:text-slate-200'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Top Derived Metrics Row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 md:gap-4">
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
          subtitle="Throughput rate"
        />
      </div>

      {/* Charts Grid: Completion Trend (2 cols) & Status Distribution (1 col) */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
        {/* Trend Area Chart */}
        <div className="rounded-2xl border border-card bg-panel p-6 shadow-lg lg:col-span-2">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <TrendingUp size={18} className="text-primary" />
              <h3 className="text-base font-bold text-white">Task Completion Trends</h3>
            </div>
            <span className="text-xs font-semibold text-muted">{rangeLabel}</span>
          </div>

          <div className="mt-6 w-full">
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
                  stroke={CHART.muted}
                  opacity={0.8}
                  fontSize={11}
                  fontWeight={600}
                  tickLine={false}
                  axisLine={false}
                  dy={10}
                />
                <YAxis
                  allowDecimals={false}
                  domain={[0, 'auto']}
                  stroke={CHART.muted}
                  opacity={0.8}
                  fontSize={11}
                  fontWeight={600}
                  tickLine={false}
                  axisLine={false}
                  dx={-10}
                  width={30}
                />
                <Tooltip
                  contentStyle={{
                    background: CHART.panel,
                    border: `1px solid ${CHART.mutedLine}`,
                    borderRadius: '12px',
                    color: '#fff',
                  }}
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
        </div>

        {/* Status Distribution Donut Chart */}
        <div className="flex flex-col justify-between rounded-2xl border border-card bg-panel p-6 shadow-lg">
          <div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <PieIcon size={18} className="text-primary" />
                <h3 className="text-base font-bold text-white">Status Distribution</h3>
              </div>
              <span className="text-xs text-muted">{totalTasks} tasks</span>
            </div>

            {totalTasks === 0 ? (
              <div className="mt-8 flex min-h-[180px] items-center justify-center">
                <p className="text-xs text-muted">No tasks in workspace</p>
              </div>
            ) : (
              <div className="mt-4 w-full">
                <ResponsiveContainer width="100%" height={170}>
                  <PieChart>
                    <Tooltip
                      contentStyle={{
                        background: CHART.panel,
                        border: `1px solid ${CHART.mutedLine}`,
                        borderRadius: '12px',
                        color: '#fff',
                      }}
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

          <div className="mt-4 grid grid-cols-3 gap-2 border-t border-card/60 pt-3 text-center">
            {statusData.map((item) => (
              <div key={item.key} className="flex flex-col items-center">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-[11px] font-semibold text-muted">{item.name}</span>
                </div>
                <span className="mt-1 text-sm font-bold text-white">{item.value}</span>
                <span className="text-[10px] text-muted">
                  {totalTasks > 0 ? `${Math.round((item.value / totalTasks) * 100)}%` : '0%'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 2: Priority Distribution (1 col) & Recent Activity (2 cols) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Priority Distribution Bar Chart */}
        <div className="flex h-full flex-col justify-between rounded-2xl border border-card bg-panel p-6 shadow-lg lg:h-[380px]">
          <div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <BarChart3 size={18} className="text-primary" />
                <h3 className="text-base font-bold text-white">Priority Breakdown</h3>
              </div>
              <span className="text-xs text-muted">Task urgency</span>
            </div>

            {totalTasks === 0 ? (
              <div className="mt-8 flex min-h-[180px] items-center justify-center">
                <p className="text-xs text-muted">No tasks in workspace</p>
              </div>
            ) : (
              <div className="mt-4 w-full">
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={priorityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART.muted} opacity={0.12} vertical={false} />
                    <XAxis
                      dataKey="name"
                      stroke={CHART.muted}
                      opacity={0.8}
                      fontSize={11}
                      fontWeight={600}
                      tickLine={false}
                      axisLine={false}
                      dy={8}
                    />
                    <YAxis
                      allowDecimals={false}
                      domain={[0, 'auto']}
                      stroke={CHART.muted}
                      opacity={0.8}
                      fontSize={11}
                      fontWeight={600}
                      tickLine={false}
                      axisLine={false}
                      width={30}
                    />
                    <Tooltip
                      contentStyle={{
                        background: CHART.panel,
                        border: `1px solid ${CHART.mutedLine}`,
                        borderRadius: '12px',
                        color: '#fff',
                      }}
                      labelStyle={{ color: CHART.muted }}
                      formatter={(val) => [`${val} task${val === 1 ? '' : 's'}`, 'Count']}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {priorityData.map((entry) => (
                        <Cell key={entry.key} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 border-t border-card/60 pt-3 text-center">
            {priorityData.map((item) => (
              <div key={item.key} className="flex flex-col items-center">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-[11px] font-semibold text-muted">{item.name}</span>
                </div>
                <span className="mt-1 text-sm font-bold text-white">{item.count}</span>
                <span className="text-[10px] text-muted">
                  {totalTasks > 0 ? `${Math.round((item.count / totalTasks) * 100)}%` : '0%'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity Feed */}
        <div className="flex h-[360px] flex-col rounded-2xl border border-card bg-panel p-6 shadow-lg lg:col-span-2 lg:h-[380px]">
          <div className="flex shrink-0 items-center justify-between">
            <h3 className="text-base font-bold text-white">Recent Activity</h3>
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
            <ul className="mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1.5 [scrollbar-color:rgba(113,113,122,0.3)_transparent] [scrollbar-width:thin]">
              {activity.map((entry) => (
                <li key={entry.id} className="flex items-start gap-3 rounded-xl p-1.5 transition-colors hover:bg-white/[0.02]">
                  <Avatar user={entry.user} size={32} />
                  <div className="min-w-0 flex-1">
                    {entry.description && (
                      <p className="break-words text-xs font-semibold text-white">
                        {entry.description}
                      </p>
                    )}
                    <div className="mt-1 flex items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${
                          TONE_STYLE[entry.tone] ?? TONE_STYLE.neutral
                        }`}
                      >
                        {entry.label}
                      </span>
                      <span className="text-[10px] text-muted">
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
      <div className="rounded-2xl border border-card bg-panel p-6 shadow-lg">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-primary" />
            <h3 className="text-base font-bold text-white">Team Member Activity</h3>
          </div>
          <span className="text-xs text-muted">
            Factual task distribution and completion across workspace members
          </span>
        </div>

        {memberStats.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              icon={Users}
              title="No member activity"
              message="No members or assigned tasks found in this workspace."
            />
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-card/80 text-[11px] font-bold uppercase tracking-wider text-muted">
                  <th scope="col" className="pb-3 pr-4">Member</th>
                  <th scope="col" className="pb-3 px-3 text-center">Total Assigned</th>
                  <th scope="col" className="pb-3 px-3 text-center">Done</th>
                  <th scope="col" className="pb-3 px-3 text-center">In Progress</th>
                  <th scope="col" className="pb-3 px-3 text-center">To Do</th>
                  <th scope="col" className="pb-3 pl-3 text-right">Completion Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-card/40">
                {memberStats.map((member, idx) => {
                  const isUnassigned = member.userId == null;
                  return (
                    <tr key={member.userId ?? `unassigned-${idx}`} className="transition-colors hover:bg-white/[0.02]">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-3">
                          {isUnassigned ? (
                            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-muted/30 bg-muted/10 text-muted">
                              <UserX size={15} />
                            </div>
                          ) : (
                            <Avatar
                              user={{
                                id: member.userId,
                                firstName: member.name?.split(' ')[0] ?? '',
                                lastName: member.name?.split(' ').slice(1).join(' ') ?? '',
                                avatarUrl: member.avatarUrl,
                              }}
                              size={32}
                            />
                          )}
                          <div className="min-w-0">
                            <span className="block truncate font-semibold text-white">
                              {member.name}
                            </span>
                            {member.email && (
                              <span className="block truncate text-[11px] text-muted">
                                {member.email}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-white">
                        {member.totalAssigned}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="inline-flex min-w-[28px] items-center justify-center rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 font-semibold text-emerald-400">
                          {member.completed}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="inline-flex min-w-[28px] items-center justify-center rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 font-semibold text-primary">
                          {member.inProgress}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="inline-flex min-w-[28px] items-center justify-center rounded-md border border-muted/20 bg-muted/10 px-2 py-0.5 font-semibold text-muted">
                          {member.todo}
                        </span>
                      </td>
                      <td className="py-3 pl-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-canvas/80 sm:block">
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
