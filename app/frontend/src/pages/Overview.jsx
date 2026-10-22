import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import Layout from '../components/Layout';
import MetricCard from '../components/MetricCard';
import StatusBadge from '../components/StatusBadge';
import IncidentBadge from '../components/IncidentBadge';
import { 
  Server, 
  Cpu, 
  HardDrive, 
  Activity, 
  Clock, 
  AlertTriangle, 
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Radio
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';

export default function Overview() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [servers, setServers] = useState([]);
  const [historicalData, setHistoricalData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOverview = async () => {
    try {
      const [overviewRes, serversRes] = await Promise.all([
        api.get('/overview'),
        api.get('/servers')
      ]);

      if (overviewRes.data.success) {
        setData(overviewRes.data.data);
      }

      if (serversRes.data.success) {
        setServers(serversRes.data.data);

        // Fetch history for the first online server or primary node
        const activeServer = serversRes.data.data.find(s => s.status === 'online') || serversRes.data.data[0];
        if (activeServer) {
          const histRes = await api.get(`/metrics/${activeServer.id}/history?range=1h`);
          if (histRes.data.success && histRes.data.data.dataPoints && histRes.data.data.dataPoints.length > 0) {
            const formatted = histRes.data.data.dataPoints.map(p => ({
              time: new Date(p.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              cpu: p.cpu_percent,
              memory: p.memory_percent,
              disk: p.disk_percent
            }));
            setHistoricalData(formatted);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load overview data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOverview();
    const timer = setInterval(fetchOverview, 15000);
    return () => clearInterval(timer);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchOverview();
  };

  const overview = data || {
    totalServers: 0,
    onlineServers: 0,
    offlineServers: 0,
    warningServers: 0,
    averageUptimeHours: 0,
    averageCpu: 0,
    averageMemory: 0,
    averageDisk: 0,
    activeAlertsCount: 0,
    recentAlerts: [],
    recentLogs: []
  };

  return (
    <Layout activeTitle="Fleet Overview" onRefresh={handleRefresh} refreshing={refreshing}>
      <div className="space-y-8 max-w-7xl mx-auto">
        {/* Top KPI Metrics Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <MetricCard
            title="Cluster CPU Usage"
            value={overview.averageCpu}
            unit="%"
            subtitle="Fleet-wide average load"
            icon={Cpu}
            progress={overview.averageCpu}
            alertThreshold={80}
          />
          <MetricCard
            title="Cluster Memory Usage"
            value={overview.averageMemory}
            unit="%"
            subtitle="Fleet-wide RAM allocation"
            icon={Activity}
            progress={overview.averageMemory}
            alertThreshold={85}
          />
          <MetricCard
            title="Storage Consumption"
            value={overview.averageDisk}
            unit="%"
            subtitle="Primary mount usage"
            icon={HardDrive}
            progress={overview.averageDisk}
            alertThreshold={85}
          />
          <MetricCard
            title="Average Host Uptime"
            value={overview.averageUptimeHours}
            unit="hrs"
            subtitle="Continuity index"
            icon={Clock}
          />
        </div>

        {/* Fleet Status Summary Banner */}
        <div className="glass-panel rounded-2xl p-6 flex flex-wrap items-center justify-between gap-6 border border-slate-800">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400">
              <Server className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Monitored Fleet Health</h3>
              <p className="text-xs text-slate-400">Real-time availability status across all provisioned nodes</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-center px-4 py-2 rounded-xl bg-slate-900/80 border border-slate-800">
              <p className="text-xs text-slate-400 font-medium">Total Hosts</p>
              <p className="text-2xl font-bold text-white mt-0.5">{overview.totalServers}</p>
            </div>
            <div className="text-center px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <p className="text-xs text-emerald-400 font-medium">Online</p>
              <p className="text-2xl font-bold text-emerald-400 mt-0.5">{overview.onlineServers}</p>
            </div>
            <div className="text-center px-4 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20">
              <p className="text-xs text-rose-400 font-medium">Offline</p>
              <p className="text-2xl font-bold text-rose-400 mt-0.5">{overview.offlineServers}</p>
            </div>
            <div className="text-center px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <p className="text-xs text-amber-400 font-medium">Active Alerts</p>
              <p className="text-2xl font-bold text-amber-400 mt-0.5">{overview.activeAlertsCount}</p>
            </div>
          </div>
        </div>

        {/* Charts & Graphs Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* CPU Historical Chart */}
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-brand-400" />
                <h4 className="text-sm font-bold text-white">CPU Utilization Trend (1 Hour)</h4>
              </div>
              <span className="text-[11px] font-mono text-slate-400">Real-time samples</span>
            </div>
            <div className="h-64 w-full">
              {historicalData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={historicalData}>
                    <defs>
                      <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0284c7" stopOpacity={0.6}/>
                        <stop offset="95%" stopColor="#0284c7" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="time" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} domain={[0, 100]} unit="%" tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                    />
                    <Area type="monotone" dataKey="cpu" stroke="#38bdf8" strokeWidth={2} fillOpacity={1} fill="url(#cpuGradient)" name="CPU %" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-500">
                  Waiting for agent metric streams...
                </div>
              )}
            </div>
          </div>

          {/* Memory Historical Chart */}
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <h4 className="text-sm font-bold text-white">Memory Allocation Trend (1 Hour)</h4>
              </div>
              <span className="text-[11px] font-mono text-slate-400">Real-time samples</span>
            </div>
            <div className="h-64 w-full">
              {historicalData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={historicalData}>
                    <defs>
                      <linearGradient id="memGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.6}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="time" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} domain={[0, 100]} unit="%" tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                    />
                    <Area type="monotone" dataKey="memory" stroke="#34d399" strokeWidth={2} fillOpacity={1} fill="url(#memGradient)" name="RAM %" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-500">
                  Waiting for agent metric streams...
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Lower Grid: Server Inventory Snapshot & Incidents / Logs */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Server Inventory Snippet */}
          <div className="lg:col-span-2 glass-panel rounded-2xl p-6 border border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-bold text-white">Registered Infrastructure Nodes</h4>
              <button
                onClick={() => navigate('/inventory')}
                className="text-xs text-brand-400 hover:text-brand-300 font-medium flex items-center gap-1 transition-colors"
              >
                <span>View Full Inventory</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-medium uppercase tracking-wider text-[10px]">
                    <th className="pb-3">Hostname</th>
                    <th className="pb-3">IP Address</th>
                    <th className="pb-3">OS / Spec</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {servers.slice(0, 5).map((srv) => (
                    <tr key={srv.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 font-semibold text-slate-200">
                        <div>{srv.display_name || srv.hostname}</div>
                        <div className="text-[10px] font-mono text-slate-500">{srv.hostname}</div>
                      </td>
                      <td className="py-3 font-mono text-slate-400">{srv.ip_address}</td>
                      <td className="py-3 text-slate-400">
                        {srv.os_name} • {srv.cpu_cores} Cores / {Math.round(srv.total_memory_mb / 1024)}GB
                      </td>
                      <td className="py-3">
                        <StatusBadge status={srv.status} />
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => navigate(`/servers/${srv.id}`)}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-[11px] transition-colors"
                        >
                          Metrics
                        </button>
                      </td>
                    </tr>
                  ))}
                  {servers.length === 0 && (
                    <tr>
                      <td colSpan="5" className="py-6 text-center text-slate-500">
                        No servers registered yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Alerts & Incidents */}
          <div className="glass-panel rounded-2xl p-6 border border-slate-800 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <h4 className="text-sm font-bold text-white">Active Incidents</h4>
              </div>
              <button
                onClick={() => navigate('/alerts')}
                className="text-xs text-brand-400 hover:text-brand-300 font-medium flex items-center gap-1 transition-colors"
              >
                <span>All Alerts</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3 flex-1">
              {overview.recentAlerts.slice(0, 4).map((alert) => (
                <div key={alert.id} className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <IncidentBadge severity={alert.severity} />
                    <span className="text-[10px] text-slate-500">
                      {new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-200 line-clamp-1">{alert.title}</p>
                  <p className="text-[11px] text-slate-400 line-clamp-2">{alert.message}</p>
                </div>
              ))}
              {overview.recentAlerts.length === 0 && (
                <div className="h-full min-h-[160px] flex flex-col items-center justify-center text-center p-4">
                  <ShieldCheck className="w-8 h-8 text-emerald-400 mb-2" />
                  <p className="text-xs font-semibold text-slate-300">All Systems Operational</p>
                  <p className="text-[11px] text-slate-500">No active incidents detected</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Critical Logs Bar */}
        <div className="glass-panel rounded-2xl p-5 border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Recent Critical & Warning Events</h4>
            <button
              onClick={() => navigate('/logs')}
              className="text-xs text-brand-400 hover:text-brand-300 font-medium"
            >
              Open Log Viewer →
            </button>
          </div>
          <div className="space-y-2 font-mono text-xs">
            {overview.recentLogs.map((log) => (
              <div key={log.id} className="flex items-center gap-3 p-2 rounded bg-slate-900/60 border border-slate-800/80 text-[11px]">
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  log.level === 'CRITICAL' || log.level === 'ERROR' ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'
                }`}>
                  {log.level}
                </span>
                <span className="text-slate-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                <span className="text-slate-300 font-semibold">{log.hostname || 'node'}</span>
                <span className="text-slate-400 truncate flex-1">{log.message}</span>
              </div>
            ))}
            {overview.recentLogs.length === 0 && (
              <p className="text-slate-500 text-xs py-2">No warning or critical logs in recent stream.</p>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
