import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import Layout from '../components/Layout';
import StatusBadge from '../components/StatusBadge';
import RegisterServerModal from '../components/RegisterServerModal';
import { 
  Server, 
  Plus, 
  Search, 
  Filter, 
  Activity, 
  Trash2, 
  Key, 
  Cpu, 
  HardDrive, 
  Clock, 
  Terminal,
  ExternalLink
} from 'lucide-react';

export default function Inventory() {
  const navigate = useNavigate();
  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [notification, setNotification] = useState('');

  const fetchServers = async () => {
    try {
      const res = await api.get('/servers');
      if (res.data.success) {
        setServers(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch servers:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchServers();
    const interval = setInterval(fetchServers, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchServers();
  };

  const handleDelete = async (id, hostname) => {
    if (!window.confirm(`Are you sure you want to delete server "${hostname}" from inventory?`)) return;

    try {
      const res = await api.delete(`/servers/${id}`);
      if (res.data.success) {
        setServers(servers.filter(s => s.id !== id));
        showToast(`Server ${hostname} removed.`);
      }
    } catch (err) {
      alert('Delete failed: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleRegenerateKey = async (id, hostname) => {
    if (!window.confirm(`Regenerate agent key for "${hostname}"? Current agent will disconnect until updated.`)) return;

    try {
      const res = await api.post(`/servers/${id}/regenerate-key`);
      if (res.data.success) {
        prompt(`New Agent Key for ${hostname}:`, res.data.data.agentKey);
        fetchServers();
      }
    } catch (err) {
      alert('Key rotation failed: ' + (err.response?.data?.error || err.message));
    }
  };

  const showToast = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 4000);
  };

  const filteredServers = servers.filter((s) => {
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    const q = search.toLowerCase();
    const matchesSearch =
      s.hostname.toLowerCase().includes(q) ||
      (s.display_name && s.display_name.toLowerCase().includes(q)) ||
      s.ip_address.includes(q);
    return matchesStatus && matchesSearch;
  });

  return (
    <Layout activeTitle="Server Inventory" onRefresh={handleRefresh} refreshing={refreshing}>
      <div className="space-y-6 max-w-7xl mx-auto">
        {notification && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs">
            {notification}
          </div>
        )}

        {/* Action Header & Search Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search by hostname, display name, IP..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-brand-500 transition-colors"
            >
              <option value="all">All Statuses</option>
              <option value="online">Online</option>
              <option value="warning">Warning</option>
              <option value="offline">Offline</option>
            </select>
          </div>

          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Register New Server</span>
          </button>
        </div>

        {/* Server Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredServers.map((s) => (
            <div key={s.id} className="glass-card rounded-2xl p-6 border border-slate-800 flex flex-col justify-between group">
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-brand-400">
                      <Server className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white group-hover:text-brand-300 transition-colors">
                        {s.display_name || s.hostname}
                      </h4>
                      <p className="text-[11px] font-mono text-slate-400">{s.hostname}</p>
                    </div>
                  </div>
                  <StatusBadge status={s.status} />
                </div>

                {/* Specs Pill List */}
                <div className="mt-5 grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800/80">
                    <span className="text-[10px] text-slate-500 block uppercase font-mono">IP Address</span>
                    <span className="font-mono text-slate-300 font-medium">{s.ip_address}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800/80">
                    <span className="text-[10px] text-slate-500 block uppercase font-mono">OS Platform</span>
                    <span className="text-slate-300 font-medium truncate block">{s.os_name || 'Linux'}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800/80">
                    <span className="text-[10px] text-slate-500 block uppercase font-mono">CPU / Cores</span>
                    <span className="text-slate-300 font-medium">{s.cpu_cores} Cores</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800/80">
                    <span className="text-[10px] text-slate-500 block uppercase font-mono">Memory / Disk</span>
                    <span className="text-slate-300 font-medium">
                      {Math.round(s.total_memory_mb / 1024)}GB / {Math.round(s.total_disk_gb)}GB
                    </span>
                  </div>
                </div>

                {/* Heartbeat Status */}
                <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 px-1 font-mono">
                  <span>Last Heartbeat:</span>
                  <span className={s.last_heartbeat ? 'text-slate-300' : 'text-slate-600'}>
                    {s.last_heartbeat ? new Date(s.last_heartbeat).toLocaleTimeString() : 'Never'}
                  </span>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleRegenerateKey(s.id, s.hostname)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors"
                    title="Rotate Agent Key"
                  >
                    <Key className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(s.id, s.hostname)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                    title="Delete Server"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <button
                  onClick={() => navigate(`/servers/${s.id}`)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 border border-brand-500/20 transition-all"
                >
                  <span>Metrics</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}

          {filteredServers.length === 0 && !loading && (
            <div className="col-span-full py-16 text-center glass-panel rounded-2xl border border-slate-800">
              <Server className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-300">No servers matching criteria</h3>
              <p className="text-xs text-slate-500 mt-1">Adjust search filter or register a new server to begin monitoring.</p>
            </div>
          )}
        </div>

        {/* Registration Modal */}
        <RegisterServerModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onServerRegistered={(newSrv) => {
            fetchServers();
            showToast(`Server ${newSrv.hostname} registered successfully.`);
          }}
        />
      </div>
    </Layout>
  );
}
