import React from 'react';
import { useAuth } from '../context/AuthContext';
import { RotateCw, LogOut, User, Bell } from 'lucide-react';

export default function TopNav({ onRefresh, refreshing, activeTitle = 'Dashboard' }) {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 px-8 border-b border-slate-800 bg-slate-900/60 backdrop-blur-md flex items-center justify-between sticky top-0 z-20">
      <div>
        <h2 className="text-lg font-bold text-white tracking-tight">{activeTitle}</h2>
      </div>

      <div className="flex items-center gap-4">
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors disabled:opacity-50"
            title="Refresh metrics data"
          >
            <RotateCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-brand-400' : ''}`} />
            <span>Refresh</span>
          </button>
        )}

        <div className="h-5 w-px bg-slate-800" />

        {/* User Badge */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
            <User className="w-4 h-4" />
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-xs font-semibold text-slate-200">{user?.fullName || 'Administrator'}</p>
            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">{user?.role || 'admin'}</p>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
          title="Sign out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
