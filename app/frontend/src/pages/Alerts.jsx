import React, { useState, useEffect } from 'react';
import api from '../api/client';
import Layout from '../components/Layout';
import IncidentBadge from '../components/IncidentBadge';
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  ShieldAlert, 
  Server, 
  Check, 
  Filter,
  Activity,
  Bell
} from 'lucide-react';

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [statusFilter, setStatusFilter] = useState('active');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');

  const fetchAlerts = async () => {
    try {
      const res = await api.get(`/alerts?status=${statusFilter}`);
      if (res.data.success) {
        setAlerts(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load alerts:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 10000);
    return () => clearInterval(interval);
  }, [statusFilter]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAlerts();
  };

  const handleAcknowledge = async (id) => {
    try {
      const res = await api.post(`/alerts/${id}/acknowledge`);
      if (res.data.success) {
        setActionSuccess('Incident acknowledged.');
        fetchAlerts();
        setTimeout(() => setActionSuccess(''), 3000);
      }
    } catch (err) {
      alert('Failed to acknowledge: ' + err.message);
    }
  };

  const handleResolve = async (id) => {
    try {
      const res = await api.post(`/alerts/${id}/resolve`);
      if (res.data.success) {
        setActionSuccess('Incident marked as resolved.');
        fetchAlerts();
        setTimeout(() => setActionSuccess(''), 3000);
      }
    } catch (err) {
      alert('Failed to resolve: ' + err.message);
    }
  };

  return (
    <Layout activeTitle="Alerts & Incidents" onRefresh={handleRefresh} refreshing={refreshing}>
      <div className="space-y-6 max-w-7xl mx-auto">
        {actionSuccess && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs">
            {actionSuccess}
          </div>
        )}

        {/* Top Status Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 p-1 bg-slate-900 rounded-xl border border-slate-800">
            {[
              { id: 'active', label: 'Active Incidents' },
              { id: 'acknowledged', label: 'Acknowledged' },
              { id: 'resolved', label: 'Resolved' },
              { id: 'all', label: 'All Incidents' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  statusFilter === tab.id
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <span className="text-xs text-slate-400 font-mono">
            {alerts.length} incident{alerts.length === 1 ? '' : 's'} displayed
          </span>
        </div>

        {/* Incidents List */}
        <div className="space-y-4">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="glass-card rounded-2xl p-6 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6"
            >
              <div className="space-y-3 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <IncidentBadge severity={alert.severity} />
                  <span className={`px-2 py-0.5 rounded text-xs font-mono font-medium ${
                    alert.status === 'active'
                      ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      : alert.status === 'acknowledged'
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  }`}>
                    {alert.status.toUpperCase()}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">
                    Triggered: {new Date(alert.created_at).toLocaleString()}
                  </span>
                </div>

                <div>
                  <h4 className="text-base font-bold text-white tracking-tight">{alert.title}</h4>
                  <p className="text-xs text-slate-400 mt-1">{alert.message}</p>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-400 pt-1">
                  <span className="flex items-center gap-1.5 text-slate-300">
                    <Server className="w-3.5 h-3.5 text-slate-500" />
                    <span>{alert.hostname} ({alert.ip_address})</span>
                  </span>
                  {alert.rule_name && (
                    <span className="flex items-center gap-1.5 text-slate-400">
                      <Activity className="w-3.5 h-3.5 text-brand-400" />
                      <span>Rule: {alert.rule_name}</span>
                    </span>
                  )}
                  {alert.current_value !== null && alert.threshold_value !== null && (
                    <span className="text-amber-400 font-semibold">
                      Value: {alert.current_value}% / Thresh: {alert.threshold_value}%
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5 self-end md:self-center">
                {alert.status === 'active' && (
                  <button
                    onClick={() => handleAcknowledge(alert.id)}
                    className="px-3 py-2 rounded-xl text-xs font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 transition-all flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Acknowledge</span>
                  </button>
                )}

                {alert.status !== 'resolved' && (
                  <button
                    onClick={() => handleResolve(alert.id)}
                    className="px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 transition-all flex items-center gap-1.5"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Resolve</span>
                  </button>
                )}
              </div>
            </div>
          ))}

          {alerts.length === 0 && !loading && (
            <div className="py-20 text-center glass-panel rounded-2xl border border-slate-800">
              <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
              <h3 className="text-base font-bold text-white">No incidents found</h3>
              <p className="text-xs text-slate-500 mt-1">There are no {statusFilter} incidents for this organization.</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
