import { NavLink, Outlet, Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutGrid,
  LayoutDashboard,
  CheckSquare,
  MessageSquare,
  Users,
  Building2,
  Settings,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../context/useAuth';
import { useWorkspace } from '../context/useWorkspace';
import Avatar from './Avatar';
import Spinner from './Spinner';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true, mobile: true },
  { to: '/tasks', label: 'Tasks', icon: CheckSquare, mobile: true },
  { to: '/chat', label: 'Chat', icon: MessageSquare, mobile: true },
  { to: '/colleagues', label: 'Colleagues', icon: Users, mobile: true },
  { to: '/teams', label: 'Teams', icon: Building2, mobile: true },
  { to: '/settings', label: 'Settings', icon: Settings, mobile: true },
];

const MOBILE_NAV = NAV.filter((item) => item.mobile);

function desktopNavClass({ isActive }) {
  return `group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
    isActive ? 'bg-[#181824] text-white' : 'text-[#71717A] hover:bg-[#181824]/60 hover:text-white'
  }`;
}

export default function AppLayout() {
  const { user, logout } = useAuth();
  const { workspaces, current, loading, error, selectWorkspace, refresh } = useWorkspace();
  const location = useLocation();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0c0c14]">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-[#0c0c14] px-4 text-center">
        <p className="text-sm font-semibold text-white">Could not load your workspaces.</p>
        <button
          type="button"
          onClick={refresh}
          className="rounded-lg bg-[#3B82F6] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          Try again
        </button>
      </div>
    );
  }

  if (workspaces.length === 0 && location.pathname !== '/teams/new') {
    return <Navigate to="/teams/new" replace />;
  }

  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Account';

  return (
    <div className="flex min-h-screen bg-[#0c0c14] text-white">
      <aside className="hidden md:flex md:w-64 md:shrink-0 md:flex-col md:border-r md:border-[#27273a] md:bg-[#0e0e17]">
        <div className="flex items-center gap-3 px-5 py-6">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#3B82F6]">
            <LayoutGrid size={20} className="text-white" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-white">Team Pulse</p>
            <p className="truncate text-xs text-[#71717A]">SaaS Workspace</p>
          </div>
        </div>

        <div className="px-5 pb-4">
          <label htmlFor="workspace-switcher" className="sr-only">
            Switch team
          </label>
          <select
            id="workspace-switcher"
            value={current?.id ?? ''}
            onChange={(event) => selectWorkspace(event.target.value)}
            className="w-full rounded-lg border border-[#27273a] bg-[#0c0c14] px-3 py-2 text-sm text-white focus:border-[#3B82F6] focus:outline-none"
          >
            {workspaces.length === 0 && <option value="">No teams yet</option>}
            {workspaces.map((workspace) => (
              <option key={workspace.id} value={workspace.id}>
                {workspace.name}
              </option>
            ))}
          </select>
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-3">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={desktopNavClass}>
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-[#3B82F6]" />
                  )}
                  <item.icon
                    size={18}
                    className={isActive ? 'text-[#3B82F6]' : 'text-[#71717A] group-hover:text-white'}
                  />
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2 border-t border-[#27273a] px-5 py-4">
          <Link
            to="/settings"
            className="flex min-w-0 flex-1 items-center gap-3 rounded-lg text-sm transition-colors hover:bg-[#181824]"
          >
            <Avatar user={user} size={32} />
            <div className="min-w-0">
              <p className="truncate font-semibold text-white">{fullName}</p>
              <p className="truncate text-xs text-[#71717A]">{user?.email}</p>
            </div>
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            aria-label="Log out"
            title="Log out"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#71717A] transition-colors hover:bg-[#181824] hover:text-white"
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="hidden h-20 items-center justify-end gap-4 border-b border-[#27273a] px-8 md:flex">
          <Link
            to="/tasks"
            state={{ newTask: true }}
            className="rounded-lg bg-[#3B82F6] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            Add Task
          </Link>
          <Avatar user={user} size={36} />
        </header>

        <header className="grid h-16 shrink-0 grid-cols-3 items-center border-b border-[#27273a] px-4 md:hidden">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#3B82F6]">
            <LayoutGrid size={16} className="text-white" />
          </div>
          <p className="truncate text-center text-base font-bold text-white">
            {current?.name ?? 'Workspace'}
          </p>
          <div className="flex justify-end">
            <Avatar user={user} size={32} />
          </div>
        </header>

        <main className="flex flex-1 flex-col pb-24 md:pb-8">
          <div className="flex-1">
            <Outlet />
          </div>

          <footer className="flex items-center justify-center gap-2 px-4 py-6 text-[11px] text-[#71717A]">
            <Link to="/privacy" className="transition-colors hover:text-white">
              Privacy Policy
            </Link>
            <span>&bull;</span>
            <Link to="/terms" className="transition-colors hover:text-white">
              Terms of Service
            </Link>
          </footer>
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 flex items-stretch justify-around border-t border-[#27273a] bg-[#0e0e17] py-1.5 md:hidden">
        {MOBILE_NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className="flex min-w-0 flex-1 flex-col items-center gap-0.5 px-0.5 py-1 text-[10px] font-medium"
          >
            {({ isActive }) => (
              <>
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-xl transition-colors ${
                    isActive ? 'bg-[#3B82F6]' : ''
                  }`}
                >
                  <item.icon size={18} className={isActive ? 'text-white' : 'text-[#71717A]'} />
                </span>
                <span className={`w-full truncate text-center ${isActive ? 'text-[#3B82F6]' : 'text-[#71717A]'}`}>
                  {item.label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
