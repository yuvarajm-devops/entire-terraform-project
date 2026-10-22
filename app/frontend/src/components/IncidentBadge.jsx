import React from 'react';

export default function IncidentBadge({ severity }) {
  const s = (severity || 'info').toLowerCase();

  switch (s) {
    case 'critical':
      return (
        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase tracking-wider">
          CRITICAL
        </span>
      );
    case 'warning':
      return (
        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-wider">
          WARNING
        </span>
      );
    case 'info':
    default:
      return (
        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/30 uppercase tracking-wider">
          INFO
        </span>
      );
  }
}
