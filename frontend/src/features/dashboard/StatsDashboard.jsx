import { useMemo, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { List, CheckCircle, Users, Activity, AlertTriangle } from 'lucide-react';
import { computeStats } from '../../lib/stats';
import { getErrorMessage } from '../../lib/api';
import { buildActivityFeed, deriveActivityFeed } from './activityLog';
import Avatar from '../../components/Avatar';
import EmptyState from '../../components/EmptyState';
import Spinner from '../../components/Spinner';

const RANGE_OPTIONS = [
  { value: 7, label: '7 Days' },
  { value: 30, label: '30 Days' },
];

const TONE_STYLE = {
  done: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  active: 'border-[#3B82F6]/30 bg-[#3B82F6]/10 text-[#3B82F6]',
  danger: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
  neutral: 'border-[#71717A]/30 bg-[#71717A]/10 text-[#71717A]',
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

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="flex h-36 flex-col justify-between rounded-2xl border border-[#27273a] bg-[#181824] p-6 shadow-lg md:h-44">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#71717A]/20 bg-[#0c0c14]/60 text-[#3B82F6]">
        <Icon size={22} />
      </div>
      <div>
        <span className="block text-[10px] font-bold uppercase tracking-widest text-[#71717A]">
          {label}
        </span>
        <h3 className="mt-2 text-[28px] font-bold leading-none tracking-tight text-white md:text-[34px]">
          {value.toLocaleString()}
        </h3>
      </div>
    </div>
  );
}

export default function StatsDashboard({
  tasks,
  activityLogs,
  activityLoading,
  activityError,
  onRetryActivity,
}) {
  const [range, setRange] = useState(7);
  const stats = useMemo(() => computeStats(tasks, range), [tasks, range]);
  const activity = useMemo(() => {
    const fromApi = buildActivityFeed(activityLogs);
    return fromApi.length > 0 ? fromApi : deriveActivityFeed(tasks);
  }, [activityLogs, tasks]);

  return (
    <div className="space-y-6 text-left md:space-y-7">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
        <StatCard icon={List} label="Total Tasks" value={stats.total} />
        <StatCard icon={CheckCircle} label="Completed Tasks" value={stats.completed} />
        <StatCard icon={Users} label="Active Colleagues" value={stats.activeColleagues} />
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-[#27273a] bg-[#181824] p-6 shadow-lg lg:col-span-2">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-base font-bold text-white">Task Completion Trends</h3>
            <div className="flex items-center gap-1 rounded-xl border border-[#71717A]/25 bg-[#0c0c14]/60 p-1">
              {RANGE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setRange(option.value)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                    range === option.value
                      ? 'border border-[#71717A]/20 bg-[#181824] text-[#3B82F6]'
                      : 'text-[#71717A] hover:text-slate-200'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 h-64 w-full md:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.completionTrend}>
                <defs>
                  <linearGradient id="completionGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#71717A" opacity={0.12} vertical={false} />
                <XAxis
                  dataKey="label"
                  stroke="#71717A"
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
                  stroke="#71717A"
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
                    background: '#181824',
                    border: '1px solid rgba(113, 113, 122, 0.2)',
                    borderRadius: '12px',
                    color: '#fff',
                  }}
                  labelStyle={{ color: '#71717A' }}
                />
                <Area
                  type="monotone"
                  dataKey="completed"
                  stroke="#3B82F6"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#completionGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-[#27273a] bg-[#181824] p-6 shadow-lg">
          <h3 className="text-base font-bold text-white">Recent Activity</h3>

          {activityLoading ? (
            <div className="mt-6 flex min-h-[12rem] items-center justify-center">
              <Spinner />
            </div>
          ) : activityError ? (
            <div className="mt-6">
              <EmptyState
                icon={AlertTriangle}
                title="Could not load activity"
                message={getErrorMessage(activityError)}
                action={
                  <button
                    type="button"
                    onClick={onRetryActivity}
                    className="rounded-lg bg-[#3B82F6] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                  >
                    Retry
                  </button>
                }
              />
            </div>
          ) : activity.length === 0 ? (
            <div className="mt-6">
              <EmptyState
                icon={Activity}
                title="No activity yet"
                message="Task updates and comments will show up here once work starts moving."
              />
            </div>
          ) : (
            <ul className="mt-6 space-y-5">
              {activity.map((entry) => (
                <li key={entry.id} className="flex items-start gap-3">
                  <Avatar user={entry.user} size={32} />
                  <div className="min-w-0 flex-1">
                    {entry.description && (
                      <p className="break-words text-xs font-semibold text-white">
                        {entry.description}
                      </p>
                    )}
                    <div className="mt-1.5 flex items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${
                          TONE_STYLE[entry.tone] ?? TONE_STYLE.neutral
                        }`}
                      >
                        {entry.label}
                      </span>
                      <span className="text-[10px] text-[#71717A]">
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
    </div>
  );
}
