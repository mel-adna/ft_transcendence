import React, { useState, useCallback } from 'react';
import { StatsDashboard } from './features/dashboard/StatsDashboard';
import { SocketProvider, ChatLayout } from './features/chat';
import {
  LayoutGrid,
  LayoutDashboard,
  CheckSquare,
  MessageSquare,
  Users,
  Settings,
  User,
  Search,
  Bell,
  Plus,
} from 'lucide-react';

const DEV_USERS = {
  alice: {
    id: import.meta.env.VITE_DEV_USER_ID ?? '11111111-1111-1111-1111-111111111111',
    token: import.meta.env.VITE_DEV_TOKEN,
  },
  bob: {
    id: '22222222-2222-2222-2222-222222222222',
    token: import.meta.env.VITE_DEV_TOKEN_BOB,
  },
};

// Set dev token before SocketProvider mounts (useEffect runs too late)
if (import.meta.env.DEV && !localStorage.getItem('token') && DEV_USERS.alice.token) {
  localStorage.setItem('token', DEV_USERS.alice.token);
}

function ChatTab({ activeUser, onSwitchUser }) {
  const user = DEV_USERS[activeUser];

  return (
    <div className="flex flex-col h-full p-4 md:p-6 gap-3">
      {import.meta.env.DEV && (DEV_USERS.alice.token || DEV_USERS.bob.token) && (
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] font-semibold text-[#71717A] uppercase tracking-wider">
            Dev user
          </span>
          {(['alice', 'bob']).map((name) => (
            <button
              key={name}
              onClick={() => onSwitchUser(name)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                activeUser === name
                  ? 'bg-[#3B82F6] text-white'
                  : 'bg-[#181824] text-[#71717A] hover:text-slate-200 border border-[#71717A]/25'
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      )}
      <div className="flex-1 min-h-0">
        <ChatLayout currentUserId={user.id} />
      </div>
    </div>
  );
}

function PlaceholderTab({ title }) {
  return (
    <div className="flex items-center justify-center h-64 text-[#71717A] text-sm">
      {title} — coming soon
    </div>
  );
}

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeUser, setActiveUser] = useState('alice');
  const [socketKey, setSocketKey] = useState(0);

  const getToken = useCallback(() => localStorage.getItem('token'), []);

  const handleSwitchUser = (name) => {
    const user = DEV_USERS[name];
    if (!user?.token) return;
    localStorage.setItem('token', user.token);
    setActiveUser(name);
    setSocketKey((k) => k + 1);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'chat':
        return <ChatTab activeUser={activeUser} onSwitchUser={handleSwitchUser} />;
      case 'tasks':
        return <PlaceholderTab title="Tasks" />;
      case 'colleagues':
        return <PlaceholderTab title="Colleagues" />;
      case 'settings':
        return <PlaceholderTab title="Settings" />;
      default:
        return <StatsDashboard />;
    }
  };

  return (
    <SocketProvider key={socketKey} getToken={getToken}>
      <div className="w-screen h-screen bg-[#0c0c14] text-slate-100 flex overflow-hidden font-sans select-none">

        {/* Desktop Left Sidebar */}
        <aside className="w-64 bg-[#0e0e17] border-r border-[#71717A]/25 flex flex-col justify-between p-5 hidden md:flex shrink-0">
          <div className="space-y-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#3B82F6] rounded-xl flex items-center justify-center text-white shadow-[0_4px_10px_rgba(59,130,246,0.3)]">
                <LayoutGrid size={20} />
              </div>
              <div className="text-left">
                <h2 className="text-sm font-bold text-white tracking-tight leading-none">Team Pulse</h2>
                <span className="text-[10px] font-semibold text-[#71717A] mt-1 block">SaaS Workspace</span>
              </div>
            </div>

            <nav className="space-y-1.5 text-left">
              {[
                { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={16} /> },
                { id: 'tasks', label: 'Tasks', icon: <CheckSquare size={16} /> },
                { id: 'chat', label: 'Chat', icon: <MessageSquare size={16} /> },
                { id: 'colleagues', label: 'Colleagues', icon: <Users size={16} /> },
                { id: 'settings', label: 'Settings', icon: <Settings size={16} /> },
              ].map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3.5 px-4.5 py-3.5 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#181824] text-white border border-[#71717A]/25 shadow-inner'
                        : 'text-[#71717A] hover:text-slate-200'
                    }`}
                  >
                    <span className={isActive ? 'text-[#3B82F6]' : 'text-[#71717A]'}>
                      {item.icon}
                    </span>
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-3 pt-4 border-t border-[#71717A]/15 text-left">
            <div className="w-9 h-9 rounded-full bg-[#181824] border border-[#71717A]/20 flex items-center justify-center text-[#71717A]">
              <User size={16} />
            </div>
            <div>
              <span className="text-xs font-bold text-white block capitalize">{activeUser}</span>
            </div>
          </div>
        </aside>

        {/* Main Right Area */}
        <div className="flex-1 flex flex-col overflow-hidden bg-[#0c0c14]">

          <header className="h-20 border-b border-[#71717A]/20 bg-[#0e0e17]/80 px-8 hidden md:flex items-center justify-between sticky top-0 z-30 shrink-0">
            <div className="relative w-64">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[#71717A]">
                <Search size={14} />
              </span>
              <input
                type="text"
                className="w-full bg-[#181824] border border-[#71717A]/30 rounded-xl py-2 px-3 pl-9 text-xs text-white focus:outline-none focus:border-[#3B82F6]/50 placeholder-[#71717A]"
                placeholder="Search..."
              />
            </div>

            <div className="flex items-center gap-4">
              <button className="p-2 text-[#71717A] hover:text-white transition-colors cursor-pointer relative">
                <Bell size={16} />
                <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-[#3B82F6] rounded-full" />
              </button>
              <button className="bg-[#3B82F6] hover:bg-[#3B82F6]/90 text-white rounded-xl py-2 px-3.5 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-lg hover:shadow-[#3B82F6]/20">
                <Plus size={14} /> Add Task
              </button>
              <div className="w-8 h-8 rounded-full overflow-hidden border border-[#71717A]/30">
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </header>

          <header className="h-16 border-b border-[#71717A]/15 bg-[#0e0e17] px-5 flex md:hidden items-center justify-between shrink-0">
            <button className="text-slate-400">
              <LayoutGrid size={20} />
            </button>
            <h2 className="text-sm font-bold text-white tracking-wider capitalize">{activeTab}</h2>
            <div className="w-7 h-7 rounded-full overflow-hidden border border-slate-700/60">
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            </div>
          </header>

          <div
            className={`flex-1 min-h-0 ${
              activeTab === 'chat'
                ? 'overflow-hidden'
                : 'overflow-y-auto p-5 md:p-8 pb-24 md:pb-8'
            }`}
          >
            {renderContent()}
          </div>

          <nav className="h-20 bg-[#0e0e17] border-t border-[#71717A]/15 flex md:hidden items-center justify-around fixed bottom-0 left-0 right-0 z-40 px-3">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
              { id: 'tasks', label: 'Tasks', icon: <CheckSquare size={20} /> },
              { id: 'chat', label: 'Chat', icon: <MessageSquare size={20} /> },
              { id: 'settings', label: 'Settings', icon: <Settings size={20} /> },
            ].map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className="flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  {isActive ? (
                    <div className="w-16 h-10 bg-[#3B82F6] rounded-xl flex items-center justify-center text-white shadow-md shadow-[#3B82F6]/20">
                      {item.icon}
                    </div>
                  ) : (
                    <div className="w-16 h-10 flex items-center justify-center text-[#71717A]">
                      {item.icon}
                    </div>
                  )}
                  <span className={`text-[10px] font-bold ${isActive ? 'text-[#3B82F6]' : 'text-[#71717A]'}`}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </nav>

        </div>
      </div>
    </SocketProvider>
  );
}

export default App;
