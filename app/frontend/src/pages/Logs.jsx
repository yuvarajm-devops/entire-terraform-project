import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api/client';
import Layout from '../components/Layout';
import { 
  FileText, 
  Search, 
  Filter, 
  Download, 
  Trash2, 
  RefreshCw, 
  Server,
  Terminal,
  Play,
  Pause
} from 'lucide-react';

export default function Logs() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialServerId = searchParams.get('serverId') || '';

  const [logs, setLogs] = useState([]);
  const [servers, setServers] = useState([]);
  const [selectedServer, setSelectedServer] = useState(initialServerId);
  const [selectedLevel, setSelectedLevel] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLogs = async () => {
    try {
      let url = `/logs?limit=250`;
      if (selectedServer) url += `&serverId=${selectedServer}`;
      if (selectedLevel !== 'ALL') url += `&level=${selectedLevel}`;
      if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;

      const res = await api.get(url);
      if (res.data.success) {
        setLogs(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load logs:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchServers = async () => {
    try {
      const res = await api.get('/servers');
      if (res.data.success) {
        setServers(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch servers for filter:', err);
    }
  };

  useEffect(() => {
    fetchServers();
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [selectedServer, selectedLevel, searchQuery]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, selectedServer, selectedLevel, searchQuery]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchLogs();
  };

  const handleExport = () => {
    const textData = logs.map(l => `[${l.timestamp}] [${l.level}] [${l.hostname || l.server_id}] [${l.source}]: ${l.message}`).join('\n');
    const blob = new Blob([textData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `system-logs-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Layout activeTitle="System Logs Viewer" onRefresh={handleRefresh} refreshing={refreshing}>
      <div className="space-y-6 max-w-7xl mx-auto flex flex-col h-[calc(100vh-8rem)]">
        {/* Controls Bar */}
        <div className="glass-panel rounded-2xl p-4 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            {/* Search Input */}
            <div className="relative min-w-[220px] flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search log messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
            </div>

            {/* Server Selector */}
            <select
              value={selectedServer}
              onChange={(e) => {
                setSelectedServer(e.target.value);
                setSearchParams(e.target.value ? { serverId: e.target.value } : {});
              }}
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-brand-500"
            >
              <option value="">All Servers</option>
              {servers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.display_name || s.hostname} ({s.ip_address})
                </option>
              ))}
            </select>

            {/* Level Selector */}
            <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
              {['ALL', 'INFO', 'WARN', 'ERROR', 'CRITICAL'].map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setSelectedLevel(lvl)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                    selectedLevel === lvl
                      ? 'bg-brand-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                autoRefresh
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              {autoRefresh ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{autoRefresh ? 'Live Stream On' : 'Paused'}</span>
            </button>

            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
              title="Export as Text"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* Terminal Log Console */}
        <div className="flex-1 glass-panel rounded-2xl border border-slate-800 flex flex-col overflow-hidden shadow-2xl">
          {/* Console Top Bar */}
          <div className="h-10 px-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
              <span className="ml-2 font-semibold text-slate-300">pulseops-daemon: /var/log/syslog</span>
            </div>
            <span>Showing {logs.length} events</span>
          </div>

          {/* Console Body */}
          <div className="flex-1 p-4 bg-slate-950 font-mono text-xs overflow-y-auto space-y-1 select-text">
            {logs.map((log) => {
              const lvl = log.level;
              const colorClass =
                lvl === 'CRITICAL' || lvl === 'ERROR'
                  ? 'text-rose-400'
                  : lvl === 'WARN'
                  ? 'text-amber-400'
                  : 'text-slate-300';

              const badgeClass =
                lvl === 'CRITICAL' || lvl === 'ERROR'
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                  : lvl === 'WARN'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  : 'bg-slate-800 text-slate-400 border-slate-700';

              return (
                <div key={log.id} className="flex items-start gap-3 py-1 px-2 rounded hover:bg-slate-900/70 transition-colors group">
                  <span className="text-slate-500 text-[11px] shrink-0 font-mono select-none">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                  <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold border uppercase shrink-0 ${badgeClass}`}>
                    {lvl}
                  </span>
                  <span className="text-brand-400 shrink-0 font-semibold text-[11px]">
                    [{log.hostname || 'system'}]
                  </span>
                  <span className="text-slate-400 shrink-0 text-[11px]">
                    {log.source}:
                  </span>
                  <span className={`flex-1 break-all ${colorClass}`}>
                    {log.message}
                  </span>
                </div>
              );
            })}

            {logs.length === 0 && !loading && (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 py-16">
                <Terminal className="w-8 h-8 mb-2 text-slate-600" />
                <p>No log records matching filter conditions.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
