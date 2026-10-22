import React, { useState } from 'react';
import api from '../api/client';
import { X, Copy, Check, Terminal, Server } from 'lucide-react';

export default function RegisterServerModal({ isOpen, onClose, onServerRegistered }) {
  const [formData, setFormData] = useState({
    hostname: '',
    displayName: '',
    ipAddress: '',
    osName: 'Ubuntu 24.04 LTS',
    cpuCores: 2,
    totalMemoryMb: 4096,
    totalDiskGb: 50.0
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [registeredServer, setRegisteredServer] = useState(null);
  const [copiedKey, setCopiedKey] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/servers', formData);
      if (res.data.success) {
        setRegisteredServer(res.data.data);
        if (onServerRegistered) onServerRegistered(res.data.data);
      } else {
        setError(res.data.error || 'Failed to register server');
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleClose = () => {
    setRegisteredServer(null);
    setFormData({
      hostname: '',
      displayName: '',
      ipAddress: '',
      osName: 'Ubuntu 24.04 LTS',
      cpuCores: 2,
      totalMemoryMb: 4096,
      totalDiskGb: 50.0
    });
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="glass-panel w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-slate-700/60">
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-brand-500/10 text-brand-400">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Register Monitored Server</h3>
              <p className="text-xs text-slate-400">Generate an agent credential to connect a Linux host</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {registeredServer ? (
          <div className="p-6 space-y-4">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs">
              Server <strong className="font-semibold text-emerald-200">{registeredServer.hostname}</strong> registered successfully!
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Agent Key (Credential)</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={registeredServer.agent_key}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 select-all"
                />
                <button
                  onClick={() => copyToClipboard(registeredServer.agent_key)}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-colors"
                >
                  {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Agent Quickstart Command</label>
              <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto space-y-1">
                <p className="text-slate-500"># Run on the Linux target host:</p>
                <p className="text-brand-300">
                  python3 monitoring/agent/agent.py --server-url http://&lt;ALB_OR_BACKEND_IP&gt;:8080 --agent-key {registeredServer.agent_key}
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={handleClose}
                className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Hostname *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. web-app-01.prod"
                  value={formData.hostname}
                  onChange={(e) => setFormData({ ...formData, hostname: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Display Name</label>
                <input
                  type="text"
                  placeholder="e.g. Web Node 1"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">IP Address *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 10.20.1.25"
                  value={formData.ipAddress}
                  onChange={(e) => setFormData({ ...formData, ipAddress: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Operating System</label>
                <input
                  type="text"
                  placeholder="e.g. Ubuntu 24.04 LTS"
                  value={formData.osName}
                  onChange={(e) => setFormData({ ...formData, osName: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">CPU Cores</label>
                <input
                  type="number"
                  min="1"
                  value={formData.cpuCores}
                  onChange={(e) => setFormData({ ...formData, cpuCores: parseInt(e.target.value, 10) })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Memory (MB)</label>
                <input
                  type="number"
                  min="512"
                  value={formData.totalMemoryMb}
                  onChange={(e) => setFormData({ ...formData, totalMemoryMb: parseInt(e.target.value, 10) })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Disk (GB)</label>
                <input
                  type="number"
                  min="5"
                  value={formData.totalDiskGb}
                  onChange={(e) => setFormData({ ...formData, totalDiskGb: parseFloat(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            <div className="pt-3 flex justify-end gap-3 border-t border-slate-800">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white transition-colors disabled:opacity-50"
              >
                {loading ? 'Registering...' : 'Register Server'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
