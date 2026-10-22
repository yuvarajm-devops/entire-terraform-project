import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Server, 
  Activity, 
  FileText, 
  AlertTriangle, 
  Settings, 
  ShieldCheck,
  Terminal
} from 'lucide-react';

const navItems = [
  { name: 'Overview', path: '/', icon: LayoutDashboard },
  { name: 'Server Inventory', path: '/inventory', icon: Server },
  { name: 'Logs Viewer', path: '/logs', icon: FileText },
  { name: 'Alerts & Incidents', path: '/alerts', icon: AlertTriangle },
  { name: 'Monitoring Settings', path: '/settings', icon: Settings },
];

export default function Sidebar() {
  return (
    <aside className="w-64 border-r border-slate-800 bg-slate-900/80 flex flex-col h-screen sticky top-0 shrink-0 select-none">
      {/* Brand Header */}
      <div className="h-16 px-6 flex items-center gap-3 border-b border-slate-800/80">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-brand-600 to-sky-400 flex items-center justify-center text-white shadow-lg shadow-brand-500/20">
          <Activity className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-bold text-sm tracking-wide text-white">PulseOps</h1>
          <p className="text-[10px] uppercase font-semibold tracking-wider text-slate-400">DevOps Monitoring</p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
        <p className="px-3 pt-2 pb-1 text-[11px] font-semibold tracking-wider uppercase text-slate-500">Navigation</p>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-500/15 text-brand-400 border border-brand-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* System Status Footer */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span className="flex items-center gap-1.5 font-medium text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            ECS Fargate Active
          </span>
          <span className="text-[11px] font-mono text-slate-500">v1.2.0</span>
        </div>
        <div className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
          <Terminal className="w-3 h-3 text-slate-400" />
          <span>AWS ap-south-1</span>
        </div>
      </div>
    </aside>
  );
}
