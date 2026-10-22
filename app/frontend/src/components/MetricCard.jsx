import React from 'react';

export default function MetricCard({ title, value, unit = '%', subtitle, icon: Icon, progress, alertThreshold = 80 }) {
  const numVal = parseFloat(value || 0);
  const isHigh = numVal >= alertThreshold;
  const isWarn = numVal >= alertThreshold * 0.85 && !isHigh;

  const barColor = isHigh ? 'bg-rose-500' : isWarn ? 'bg-amber-500' : 'bg-brand-500';
  const textColor = isHigh ? 'text-rose-400' : isWarn ? 'text-amber-400' : 'text-slate-100';

  return (
    <div className="glass-card rounded-xl p-5 relative overflow-hidden group">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{title}</p>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className={`text-3xl font-bold tracking-tight ${textColor}`}>{value}</span>
            {unit && <span className="text-sm font-semibold text-slate-400">{unit}</span>}
          </div>
          {subtitle && <p className="mt-1 text-xs text-slate-400">{subtitle}</p>}
        </div>
        {Icon && (
          <div className="p-2.5 rounded-lg bg-slate-800/80 text-brand-400 border border-slate-700/50 group-hover:scale-110 transition-transform">
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      {progress !== undefined && (
        <div className="mt-4">
          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full ${barColor} transition-all duration-500 rounded-full`}
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
