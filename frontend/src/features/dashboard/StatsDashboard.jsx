import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar, Cell } from 'recharts';
import { List, CheckCircle, Users, Upload, Download, Calendar, Award, MessageSquare, MoreHorizontal, FileText, Check } from 'lucide-react';

const mock7DaysData = [
  { name: 'Mon', completion: 32 },
  { name: 'Tue', completion: 48 },
  { name: 'Wed', completion: 42 },
  { name: 'Thu', completion: 68 },
  { name: 'Fri', completion: 52 },
  { name: 'Sat', completion: 78 },
  { name: 'Sun', completion: 94 },
];

const mock30DaysData = [
  { name: 'W1', completion: 24 },
  { name: 'W2', completion: 48 },
  { name: 'W3', completion: 72 },
  { name: 'W4', completion: 94 },
];

// Exact daily bar data matching mobile mockup (Mon-Fri)
const mockMobileBarData = [
  { name: 'Mon', completion: 25 },
  { name: 'Tue', completion: 42 },
  { name: 'Wed', completion: 30 },
  { name: 'Thu', completion: 60 },
  { name: 'Fri', completion: 50 },
];

export const StatsDashboard = () => {
  const [stats, setStats] = useState({
    totalTasks: '1,284',
    doneTasks: '942',
    activeColleagues: '12'
  });
  const [timeRange, setTimeRange] = useState('7d');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL || 'https://localhost/api';
        const res = await axios.get(`${API_URL}/stats/summary`, {
          headers: {
            'x-api-key': 'team_pulse_public_api_secret_token'
          }
        });
        setStats(res.data.stats);
      } catch (err) {
        console.error('Failed to fetch summary stats, loading defaults:', err.message);
        setStats({
          totalTasks: '1,284',
          doneTasks: '942',
          activeColleagues: '12'
        });
      }
    };
    fetchStats();
  }, []);

  const handleExportCSV = () => {
    const API_URL = import.meta.env.VITE_API_URL || 'https://localhost/api';
    window.open(`${API_URL}/stats/export/tasks?apiKey=team_pulse_public_api_secret_token`, '_blank');
  };

  return (
    <div className="space-y-6 md:space-y-7 animate-fade-in text-left">
      
      {/* ========================================================================= */}
      {/* 💻 DESKTOP ONLY VIEW CONTROLS */}
      {/* ========================================================================= */}
      <div className="hidden md:flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-[28px] font-bold text-white tracking-tight leading-none">Analytics Overview</h2>
          <p className="text-sm text-[#71717A] mt-2 font-medium">Track your team's performance and activity.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button className="bg-[#181824] hover:bg-[#181824]/80 text-[#71717A] hover:text-slate-200 border border-[#71717A]/25 rounded-xl py-2.5 px-4 font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md">
            <Upload size={14} className="text-[#71717A]" /> Import CSV
          </button>
          <button
            onClick={handleExportCSV}
            className="bg-[#181824] hover:bg-[#181824]/80 text-[#71717A] hover:text-slate-200 border border-[#71717A]/25 rounded-xl py-2.5 px-4 font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md"
          >
            <Download size={14} className="text-[#71717A]" /> Export to CSV
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 🖥️ DESKTOP METRICS (Cards side-by-side) */}
      {/* ========================================================================= */}
      <div className="hidden md:grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Tasks */}
        <div className="bg-[#181824] border border-[#71717A]/20 rounded-2xl p-6 shadow-lg flex flex-col justify-between h-44">
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 bg-[#0c0c14]/60 border border-[#71717A]/20 rounded-xl flex items-center justify-center text-[#71717A]">
              <List size={22} className="text-[#3B82F6]" />
            </div>
            <span className="text-[11px] font-bold text-[#3B82F6] bg-[#3B82F6]/10 px-2.5 py-1 rounded-lg border border-[#3B82F6]/20">
              +12%
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-[#71717A] uppercase tracking-widest block">Total Tasks</span>
            <h3 className="text-[34px] font-bold text-white leading-none mt-2 tracking-tight">{stats.totalTasks}</h3>
          </div>
        </div>

        {/* Completed Tasks */}
        <div className="bg-[#181824] border border-[#71717A]/20 rounded-2xl p-6 shadow-lg flex flex-col justify-between h-44">
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 bg-[#0c0c14]/60 border border-[#71717A]/20 rounded-xl flex items-center justify-center text-[#71717A]">
              <CheckCircle size={22} className="text-[#0EA5E9]" />
            </div>
            <span className="text-[11px] font-bold text-[#0EA5E9] bg-[#0EA5E9]/10 px-2.5 py-1 rounded-lg border border-[#0EA5E9]/20">
              +8%
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-[#71717A] uppercase tracking-widest block">Completed Tasks</span>
            <h3 className="text-[34px] font-bold text-white leading-none mt-2 tracking-tight">{stats.doneTasks}</h3>
          </div>
        </div>

        {/* Active Colleagues */}
        <div className="bg-[#181824] border border-[#71717A]/20 rounded-2xl p-6 shadow-lg flex flex-col justify-between h-44">
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 bg-[#0c0c14]/60 border border-[#71717A]/20 rounded-xl flex items-center justify-center text-[#71717A]">
              <Users size={22} className="text-[#71717A]" />
            </div>
            <span className="text-[11px] font-bold text-[#71717A] bg-[#71717A]/10 px-2.5 py-1 rounded-lg border border-[#71717A]/20">
              Stable
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-[#71717A] uppercase tracking-widest block">Active Colleagues</span>
            <h3 className="text-[34px] font-bold text-white leading-none mt-2 tracking-tight">{stats.activeColleagues}</h3>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 📱 MOBILE METRICS (Stacked horizontally, exact match to mobile mockup) */}
      {/* ========================================================================= */}
      <div className="flex flex-col md:hidden gap-3">
        {/* Total Tasks (Mobile Mockup: 1,248) */}
        <div className="bg-[#181824] border border-[#71717A]/15 rounded-xl p-5 flex items-center justify-between shadow-md">
          <div className="text-left space-y-1">
            <span className="text-[10px] font-bold text-[#71717A] uppercase tracking-wider block">Total Tasks</span>
            <h3 className="text-2xl font-bold text-white tracking-tight">1,248</h3>
          </div>
          <div className="w-10 h-10 bg-[#0c0c14]/80 border border-[#71717A]/20 rounded-lg flex items-center justify-center text-indigo-400">
            <List size={18} />
          </div>
        </div>

        {/* Completed Tasks (Mobile Mockup: 892) */}
        <div className="bg-[#181824] border border-[#71717A]/15 rounded-xl p-5 flex items-center justify-between shadow-md">
          <div className="text-left space-y-1">
            <span className="text-[10px] font-bold text-[#71717A] uppercase tracking-wider block">Completed Tasks</span>
            <h3 className="text-2xl font-bold text-white tracking-tight">892</h3>
          </div>
          <div className="w-10 h-10 bg-[#0c0c14]/80 border border-[#71717A]/20 rounded-lg flex items-center justify-center text-sky-400">
            <CheckCircle size={18} />
          </div>
        </div>

        {/* Active Colleagues (Mobile Mockup: 34) */}
        <div className="bg-[#181824] border border-[#71717A]/15 rounded-xl p-5 flex items-center justify-between shadow-md">
          <div className="text-left space-y-1">
            <span className="text-[10px] font-bold text-[#71717A] uppercase tracking-wider block">Active Colleagues</span>
            <h3 className="text-2xl font-bold text-white tracking-tight">34</h3>
          </div>
          <div className="w-10 h-10 bg-[#0c0c14]/80 border border-[#71717A]/20 rounded-lg flex items-center justify-center text-[#71717A]">
            <Users size={18} />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* Dynamic split grid: Desktop (Split cols) / Mobile (Stacked rows) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* ========================================================================= */}
        {/* CHART SECTION: Desktop (AreaChart) / Mobile (BarChart, exact match) */}
        {/* ========================================================================= */}
        
        {/* Desktop AreaChart */}
        <div className="hidden md:block lg:col-span-2 bg-[#181824] border border-[#71717A]/20 rounded-2xl p-6 shadow-lg space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white">Task Completion Trends</h3>
            <div className="bg-[#0c0c14]/60 border border-[#71717A]/25 rounded-xl p-1 flex items-center gap-1">
              <button
                onClick={() => setTimeRange('7d')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${timeRange === '7d' ? 'bg-[#181824] text-[#3B82F6] border border-[#71717A]/20' : 'text-[#71717A] hover:text-slate-200'}`}
              >
                7 Days
              </button>
              <button
                onClick={() => setTimeRange('30d')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${timeRange === '30d' ? 'bg-[#181824] text-[#3B82F6] border border-[#71717A]/20' : 'text-[#71717A] hover:text-slate-200'}`}
              >
                30 Days
              </button>
            </div>
          </div>

          <div className="h-72 w-full pr-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeRange === '7d' ? mock7DaysData : mock30DaysData}>
                <defs>
                  <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#71717A" opacity={0.12} vertical={false} />
                <XAxis dataKey="name" stroke="#71717A" opacity={0.8} fontSize={11} fontWeight={600} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="#71717A" opacity={0.8} fontSize={11} fontWeight={600} tickLine={false} axisLine={false} domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} dx={-10} />
                <Tooltip contentStyle={{ background: '#181824', border: '1px solid rgba(113, 113, 122, 0.2)', borderRadius: '12px', color: '#fff' }} />
                <Area type="monotone" dataKey="completion" stroke="#3B82F6" strokeWidth={2.5} fillOpacity={1} fill="url(#chartGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Mobile BarChart (Exact Match to Mobile Mockup with Fri highlighted) */}
        <div className="block md:hidden bg-[#181824] border border-[#71717A]/15 rounded-xl p-5 shadow-md space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Task Completion Trends</h3>
            <button className="text-slate-500 hover:text-white transition-colors cursor-pointer">
              <MoreHorizontal size={18} />
            </button>
          </div>

          <div className="h-60 w-full pr-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockMobileBarData} barSize={26}>
                <CartesianGrid strokeDasharray="3 3" stroke="#71717A" opacity={0.1} vertical={false} />
                <XAxis dataKey="name" stroke="#71717A" fontSize={10} fontWeight={600} tickLine={false} axisLine={false} dy={5} />
                <Tooltip cursor={{ fill: 'rgba(255, 255, 255, 0.03)' }} contentStyle={{ background: '#181824', border: '1px solid rgba(113, 113, 122, 0.2)', borderRadius: '10px' }} />
                <Bar dataKey="completion" radius={[4, 4, 0, 0]}>
                  {mockMobileBarData.map((entry, index) => {
                    // Highlight the last bar (Friday) in light blue exactly like the mockup!
                    const isLast = index === mockMobileBarData.length - 1;
                    return (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={isLast ? '#93C5FD' : '#27273a'} 
                        stroke={isLast ? '#93C5FD' : 'none'}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RECENT ACTIVITY SECTION: Desktop / Mobile Timeline layout */}
        {/* ========================================================================= */}
        
        {/* Desktop Recent Activity Feed */}
        <div className="hidden md:block bg-[#181824] border border-[#71717A]/20 rounded-2xl p-6 shadow-lg space-y-6">
          <h3 className="text-base font-bold text-white">Recent Activity</h3>
          
          <div className="relative pl-6 border-l border-[#71717A]/20 space-y-6 text-sm text-left">
            <div className="relative">
              <div className="absolute -left-[31px] top-1.5 w-2.5 h-2.5 bg-[#3B82F6] rounded-full border-2 border-[#181824]" />
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[#0c0c14]/80 flex items-center justify-center overflow-hidden border border-[#71717A]/20">
                  <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150" alt="Sarah" className="w-full h-full object-cover" />
                </div>
                <div>
                  <p className="text-slate-350 text-xs">
                    <span className="font-semibold text-white">Sarah</span> completed <span className="text-[#3B82F6] font-semibold cursor-pointer">Task X</span>
                  </p>
                  <span className="text-[10px] text-[#71717A] block mt-1 font-medium">10 mins ago</span>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -left-[31px] top-1.5 w-2.5 h-2.5 bg-[#3B82F6] rounded-full border-2 border-[#181824]" />
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[#0c0c14]/60 border border-[#71717A]/20 flex items-center justify-center text-[#3B82F6]">
                  <Calendar size={14} />
                </div>
                <div>
                  <p className="text-slate-350 text-xs">
                    <span className="font-semibold text-white">Meeting scheduled</span> for 2 PM
                  </p>
                  <span className="text-[10px] text-[#71717A] block mt-1 font-medium">45 mins ago</span>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -left-[31px] top-1.5 w-2.5 h-2.5 bg-[#3B82F6] rounded-full border-2 border-[#181824]" />
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[#0c0c14]/80 flex items-center justify-center text-[10px] font-bold text-slate-350 border border-[#71717A]/20">
                  JD
                </div>
                <div className="flex-1 space-y-2">
                  <p className="text-slate-350 text-xs">
                    <span className="font-semibold text-white">John Doe</span> added a comment on <span className="text-[#3B82F6] font-semibold cursor-pointer">Project Alpha</span>
                  </p>
                  <div className="bg-[#0c0c14] border border-[#71717A]/20 rounded-xl p-3 text-[11px] text-slate-300 italic font-medium leading-relaxed shadow-sm">
                    "Looks good, let's proceed with the deployment."
                  </div>
                  <span className="text-[10px] text-[#71717A] block font-medium">2 hours ago</span>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -left-[31px] top-1.5 w-2.5 h-2.5 bg-[#3B82F6] rounded-full border-2 border-[#181824]" />
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[#0c0c14]/60 border border-[#71717A]/20 flex items-center justify-center text-[#D16900]">
                  <Award size={14} />
                </div>
                <div>
                  <p className="text-slate-350 text-xs">
                    New milestone reached: <span className="font-semibold text-white text-[#D16900]">Beta Launch</span>
                  </p>
                  <span className="text-[10px] text-[#71717A] block mt-1 font-medium">2 hours ago</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Recent Activity Feed (Exact Match to Mobile Mockup) */}
        <div className="block md:hidden bg-[#181824] border border-[#71717A]/15 rounded-xl p-5 shadow-md space-y-4">
          <div className="flex items-center justify-between pb-2">
            <h3 className="text-sm font-bold text-white">Recent Activity</h3>
            <button className="text-xs font-semibold text-[#3B82F6] hover:text-[#3B82F6]/80 transition-colors cursor-pointer">
              View All
            </button>
          </div>

          <div className="divide-y divide-slate-800/80 text-left text-xs text-slate-300">
            {/* Mobile Item 1 */}
            <div className="py-3 flex items-center gap-3.5 first:pt-0 last:pb-0">
              <div className="w-9 h-9 rounded-lg bg-[#0c0c14]/80 border border-[#71717A]/15 flex items-center justify-center text-indigo-400 shrink-0">
                <FileText size={15} />
              </div>
              <div className="space-y-0.5">
                <p className="leading-tight text-white/90">
                  <span className="font-semibold text-white">Sarah J.</span> updated the Q3 Marketing Deck
                </p>
                <span className="text-[10px] text-[#71717A] font-medium block">2 hours ago</span>
              </div>
            </div>

            {/* Mobile Item 2 */}
            <div className="py-3 flex items-center gap-3.5 first:pt-0 last:pb-0">
              <div className="w-9 h-9 rounded-lg bg-[#0c0c14]/80 border border-[#71717A]/15 flex items-center justify-center text-amber-500 shrink-0">
                <MessageSquare size={15} />
              </div>
              <div className="space-y-0.5">
                <p className="leading-tight text-white/90">
                  <span className="font-semibold text-white">Mike T.</span> commented on "Homepage Redesign"
                </p>
                <span className="text-[10px] text-[#71717A] font-medium block">4 hours ago</span>
              </div>
            </div>

            {/* Mobile Item 3 */}
            <div className="py-3 flex items-center gap-3.5 first:pt-0 last:pb-0">
              <div className="w-9 h-9 rounded-lg bg-[#0c0c14]/80 border border-[#71717A]/15 flex items-center justify-center text-emerald-400 shrink-0">
                <Check size={15} />
              </div>
              <div className="space-y-0.5">
                <p className="leading-tight text-white/90">
                  <span className="font-semibold text-white">You</span> completed task "Server Migration Prep"
                </p>
                <span className="text-[10px] text-[#71717A] font-medium block">Yesterday</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
