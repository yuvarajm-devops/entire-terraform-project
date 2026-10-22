import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import Layout from '../components/Layout';
import MetricCard from '../components/MetricCard';
import StatusBadge from '../components/StatusBadge';
import IncidentBadge from '../components/IncidentBadge';
import { 
  Server, 
  Cpu, 
  Activity, 
  HardDrive, 
  Clock, 
  ArrowLeft, 
  Network, 
  Copy, 
  Check, 
  Layers, 
  ShieldAlert,
  Terminal,
  Zap
} from 'lucide-react';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend
} from 'recharts';

export default function ServerDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [server, setServer] = useState(null);
  const [latestMetric, setLatestMetric] = useState(null);
  const [history, setHistory] = useState([]);
  const [serverLogs, setServerLogs] = useState([]);
  const [serverAlerts, setServerAlerts] = useState([]);
  const [range, setRange] = useState('1h');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  const fetchServerData = async () => {
    try {
      const [srvRes, metricRes, histRes, logsRes, alertsRes] = await Promise.all([
        api.get(`/servers/${id}`),
        api.get(`/metrics/${id}/latest`),
        api.get(`/metrics/${id}/history?range=${range}`),
        api.get(`/logs?serverId=${id}&limit=10`),
        api.get(`/alerts?serverId=${id}`)
      ]);

      if (srvRes.data.success) setServer(srvRes.data.data);
      if (metricRes.data.success) setLatestMetric(metricRes.data.data);
      if (histRes.data.success && histRes.data.data.dataPoints) {
        const formatted = histRes.data.data.dataPoints.map(p => ({
          time: new Date(p.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          cpu: p.cpu_percent,
          memory: p.memory_percent,
          disk: p.disk_percent,
          rx: p.network_rx_kbps,
          tx: p.network_tx_kbps,
          load1: p.load_1m
        }));
        setHistory(formatted);
      }
      if (logsRes.data.success) setServerLogs(logsRes.data.data);
      if (alertsRes.data.success) setServerAlerts(alertsRes.data.data);
    } catch (err) {
      console.error('Failed to load server details:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchServerData();
    const timer = setInterval(fetchServerData, 10000);
    return () => clearInterval(timer);
  }, [id, range]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchServerData();
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const formatUptime = (seconds) => {
    if (!seconds) return '0m';
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return d > 0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m`;
  };

  const metric = latestMetric || {
    cpu_percent: 0,
    memory_percent: 0,
    memory_used_mb: 0,
    memory_total_mb: server?.total_memory_mb || 4096,
    swap_percent: 0,
    disk_percent: 0,
    disk_used_gb: 0,
    disk_total_gb: server?.total_disk_gb || 50,
    load_1m: 0,
    load_5m: 0,
    load_15m: 0,
    network_rx_kbps: 0,
    network_tx_kbps: 0
  };

  const availableMemMb = Math.max(0, metric.memory_total_mb - metric.memory_used_mb);

  return (
    <Layout activeTitle="Host Performance Metrics" onRefresh={handleRefresh} refreshing={refreshing}>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Back Button & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/inventory')}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors"
              title="Return to inventory"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-white tracking-tight">
                  {server?.display_name || server?.hostname || 'Server Details'}
                </h2>
                <StatusBadge status={server?.status} />
              </div>
              <p className="text-xs font-mono text-slate-400 mt-0.5">
                {server?.hostname} • IP: {server?.ip_address}
              </p>
            </div>
          </div>

          {/* Time Range Selector */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-900/90 rounded-xl border border-slate-800 self-start sm:self-auto">
            {['1h', '6h', '24h', '7d'].map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  range === r
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Active Alerts Alert Banner if present */}
        {serverAlerts.filter(a => a.status === 'active').length > 0 && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 space-y-2">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-wider">
              <ShieldAlert className="w-4 h-4" />
              <span>Active Alerts Detected on this Host</span>
            </div>
            <div className="space-y-1">
              {serverAlerts.filter(a => a.status === 'active').map(a => (
                <div key={a.id} className="text-xs text-rose-300 flex items-center justify-between">
                  <span>• {a.title} &mdash; {a.message}</span>
                  <span className="font-mono text-[10px] text-slate-400">{new Date(a.created_at).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Real-time KPI Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="CPU Load"
            value={metric.cpu_percent}
            unit="%"
            subtitle={`Load Avg: ${metric.load_1m} / ${metric.load_5m} / ${metric.load_15m}`}
            icon={Cpu}
            progress={metric.cpu_percent}
            alertThreshold={85}
          />
          <MetricCard
            title="Memory Usage"
            value={metric.memory_percent}
            unit="%"
            subtitle={`${Math.round(metric.memory_used_mb)} MB / ${Math.round(metric.memory_total_mb)} MB (${Math.round(availableMemMb)} MB Free)`}
            icon={Activity}
            progress={metric.memory_percent}
            alertThreshold={90}
          />
          <MetricCard
            title="Disk Utilization"
            value={metric.disk_percent}
            unit="%"
            subtitle={`${metric.disk_used_gb} GB used of ${metric.disk_total_gb} GB`}
            icon={HardDrive}
            progress={metric.disk_percent}
            alertThreshold={85}
          />
          <MetricCard
            title="Uptime & Network"
            value={formatUptime(server?.uptime_seconds)}
            unit=""
            subtitle={`RX: ${metric.network_rx_kbps} kB/s • TX: ${metric.network_tx_kbps} kB/s`}
            icon={Clock}
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* CPU Chart */}
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-brand-400" />
                <h4 className="text-sm font-bold text-white">CPU Utilization History ({range})</h4>
              </div>
              <span className="text-xs font-mono text-brand-400 font-semibold">{metric.cpu_percent}% Current</span>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history}>
                  <defs>
                    <linearGradient id="srvCpuGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0284c7" stopOpacity={0.6}/>
                      <stop offset="95%" stopColor="#0284c7" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="time" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} domain={[0, 100]} unit="%" tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }} />
                  <Area type="monotone" dataKey="cpu" stroke="#38bdf8" strokeWidth={2} fillOpacity={1} fill="url(#srvCpuGrad)" name="CPU %" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Memory Chart */}
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <h4 className="text-sm font-bold text-white">Memory Allocation ({range})</h4>
              </div>
              <span className="text-xs font-mono text-emerald-400 font-semibold">{metric.memory_percent}% Current</span>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history}>
                  <defs>
                    <linearGradient id="srvMemGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.6}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="time" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} domain={[0, 100]} unit="%" tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }} />
                  <Area type="monotone" dataKey="memory" stroke="#34d399" strokeWidth={2} fillOpacity={1} fill="url(#srvMemGrad)" name="Memory %" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Network & Load Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Network I/O Chart */}
          <div className="lg:col-span-2 glass-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Network className="w-4 h-4 text-sky-400" />
                <h4 className="text-sm font-bold text-white">Network Bandwidth (kB/s)</h4>
              </div>
              <div className="flex items-center gap-4 text-xs font-mono">
                <span className="text-sky-400">RX: {metric.network_rx_kbps} kB/s</span>
                <span className="text-indigo-400">TX: {metric.network_tx_kbps} kB/s</span>
              </div>
            </div>
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="time" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} unit="kB/s" tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }} />
                  <Legend />
                  <Line type="monotone" dataKey="rx" stroke="#38bdf8" strokeWidth={2} dot={false} name="Inbound (RX)" />
                  <Line type="monotone" dataKey="tx" stroke="#818cf8" strokeWidth={2} dot={false} name="Outbound (TX)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* System Information & Agent Metadata Card */}
          <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Terminal className="w-4 h-4 text-brand-400" />
              <span>Host Specifications</span>
            </h4>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">Operating System</span>
                <span className="text-slate-200 font-medium">{server?.os_name || 'Linux'}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">Kernel Release</span>
                <span className="text-slate-200 font-mono text-[11px]">{server?.os_version || '6.8.0-generic'}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">CPU Compute</span>
                <span className="text-slate-200 font-medium">{server?.cpu_cores} vCPU Core(s)</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">Installed Memory</span>
                <span className="text-slate-200 font-medium">{server?.total_memory_mb} MB</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">Disk Storage</span>
                <span className="text-slate-200 font-medium">{server?.total_disk_gb} GB</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">Agent Version</span>
                <span className="text-slate-200 font-mono">{server?.agent_version || '1.0.0'}</span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-slate-400">Swap Usage</span>
                <span className="text-slate-200 font-medium">{metric.swap_percent}%</span>
              </div>
            </div>

            {/* Agent Key snippet */}
            <div className="pt-2 border-t border-slate-800">
              <span className="text-[10px] uppercase font-mono text-slate-500 block mb-1">Agent Key</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-slate-400 truncate bg-slate-900 px-2 py-1.5 rounded flex-1">
                  {server?.agent_key || '••••••••••••••••'}
                </span>
                <button
                  onClick={() => copyToClipboard(server?.agent_key)}
                  className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                  title="Copy Agent Key"
                >
                  {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Server-specific Recent Logs */}
        <div className="glass-panel rounded-2xl p-6 border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span>Node System Logs (Last 10 events)</span>
            </h4>
            <button
              onClick={() => navigate(`/logs?serverId=${id}`)}
              className="text-xs text-brand-400 hover:text-brand-300 font-medium"
            >
              Filter in Log Viewer →
            </button>
          </div>
          <div className="space-y-2 font-mono text-xs max-h-56 overflow-y-auto">
            {serverLogs.map((log) => (
              <div key={log.id} className="p-2 rounded bg-slate-900/60 border border-slate-800 flex items-start gap-3 text-[11px]">
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  log.level === 'CRITICAL' || log.level === 'ERROR' ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-700 text-slate-300'
                }`}>
                  {log.level}
                </span>
                <span className="text-slate-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                <span className="text-slate-400 font-semibold">{log.source}:</span>
                <span className="text-slate-300 flex-1">{log.message}</span>
              </div>
            ))}
            {serverLogs.length === 0 && (
              <p className="text-slate-500 text-xs py-3 text-center">No logs recorded for this host.</p>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
