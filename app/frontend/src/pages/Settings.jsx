import React, { useState, useEffect } from 'react';
import api from '../api/client';
import Layout from '../components/Layout';
import { 
  Settings as SettingsIcon, 
  Bell, 
  ShieldCheck, 
  Save, 
  Plus, 
  Trash2, 
  Sliders, 
  Mail, 
  Globe,
  Clock,
  Check
} from 'lucide-react';

export default function Settings() {
  const [settings, setSettings] = useState({
    heartbeat_interval_seconds: 30,
    offline_threshold_seconds: 90,
    retention_days: 30,
    webhook_url: '',
    notification_email: '',
    enable_notifications: true
  });

  const [rules, setRules] = useState([]);
  const [newRule, setNewRule] = useState({
    name: '',
    metricType: 'cpu',
    conditionOperator: '>',
    thresholdValue: 80,
    severity: 'warning'
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  const fetchData = async () => {
    try {
      const [settingsRes, rulesRes] = await Promise.all([
        api.get('/settings'),
        api.get('/alert-rules')
      ]);

      if (settingsRes.data.success) {
        setSettings(settingsRes.data.data);
      }
      if (rulesRes.data.success) {
        setRules(rulesRes.data.data);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.put('/settings', {
        heartbeatIntervalSeconds: settings.heartbeat_interval_seconds,
        offlineThresholdSeconds: settings.offline_threshold_seconds,
        retentionDays: settings.retention_days,
        webhookUrl: settings.webhook_url,
        notificationEmail: settings.notification_email,
        enableNotifications: settings.enable_notifications
      });

      if (res.data.success) {
        setToast('Monitoring settings saved successfully.');
        setTimeout(() => setToast(''), 4000);
      }
    } catch (err) {
      alert('Save failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateRule = async (e) => {
    e.preventDefault();
    if (!newRule.name || !newRule.thresholdValue) return;

    try {
      const res = await api.post('/alert-rules', newRule);
      if (res.data.success) {
        setRules([res.data.data, ...rules]);
        setNewRule({
          name: '',
          metricType: 'cpu',
          conditionOperator: '>',
          thresholdValue: 80,
          severity: 'warning'
        });
        setToast('Alert rule created.');
        setTimeout(() => setToast(''), 3000);
      }
    } catch (err) {
      alert('Rule creation failed: ' + err.message);
    }
  };

  const handleDeleteRule = async (id) => {
    if (!window.confirm('Delete this alert rule?')) return;
    try {
      const res = await api.delete(`/alert-rules/${id}`);
      if (res.data.success) {
        setRules(rules.filter(r => r.id !== id));
        setToast('Alert rule deleted.');
        setTimeout(() => setToast(''), 3000);
      }
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  };

  return (
    <Layout activeTitle="Monitoring Settings">
      <div className="space-y-8 max-w-5xl mx-auto">
        {toast && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{toast}</span>
          </div>
        )}

        {/* Global Agent Timers & Retention Settings */}
        <form onSubmit={handleSaveSettings} className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
            <div className="p-2.5 rounded-xl bg-brand-500/10 text-brand-400 border border-brand-500/20">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Agent & Retention Parameters</h3>
              <p className="text-xs text-slate-400">Configure global agent intervals, heartbeat thresholds and data life cycles</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Heartbeat Interval (sec)
              </label>
              <input
                type="number"
                min="5"
                max="300"
                value={settings.heartbeat_interval_seconds}
                onChange={(e) => setSettings({ ...settings, heartbeat_interval_seconds: parseInt(e.target.value, 10) })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">Expected agent ping frequency</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Offline Threshold (sec)
              </label>
              <input
                type="number"
                min="10"
                max="600"
                value={settings.offline_threshold_seconds}
                onChange={(e) => setSettings({ ...settings, offline_threshold_seconds: parseInt(e.target.value, 10) })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">Time before marking node offline</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Metric Retention (days)
              </label>
              <input
                type="number"
                min="1"
                max="365"
                value={settings.retention_days}
                onChange={(e) => setSettings({ ...settings, retention_days: parseInt(e.target.value, 10) })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">Time-series history retention</span>
            </div>
          </div>

          {/* Notifications config */}
          <div className="pt-4 border-t border-slate-800 space-y-4">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-400" />
              <span>Incident Notification Channels</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Webhook URL (Slack / Teams / Discord)</label>
                <div className="relative">
                  <Globe className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="url"
                    placeholder="https://hooks.slack.com/services/..."
                    value={settings.webhook_url || ''}
                    onChange={(e) => setSettings({ ...settings, webhook_url: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Alert Notification Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="email"
                    placeholder="devops-alerts@company.com"
                    value={settings.notification_email || ''}
                    onChange={(e) => setSettings({ ...settings, notification_email: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-500/20 transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
            </button>
          </div>
        </form>

        {/* Alert Rules Manager */}
        <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Alert Threshold Rules</h3>
                <p className="text-xs text-slate-400">Manage metric evaluation rules and triggers</p>
              </div>
            </div>
          </div>

          {/* Add Rule Form */}
          <form onSubmit={handleCreateRule} className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-medium text-slate-300 mb-1">Rule Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Critical High Memory"
                value={newRule.name}
                onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-300 mb-1">Metric Type</label>
              <select
                value={newRule.metricType}
                onChange={(e) => setNewRule({ ...newRule, metricType: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-brand-500"
              >
                <option value="cpu">CPU Usage (%)</option>
                <option value="memory">Memory Usage (%)</option>
                <option value="disk">Disk Usage (%)</option>
                <option value="load">System Load (1m)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-300 mb-1">Threshold (%)</label>
              <input
                type="number"
                required
                min="1"
                max="100"
                value={newRule.thresholdValue}
                onChange={(e) => setNewRule({ ...newRule, thresholdValue: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500"
              />
            </div>

            <button
              type="submit"
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white flex items-center justify-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Rule</span>
            </button>
          </form>

          {/* Rules Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-medium uppercase text-[10px] tracking-wider">
                  <th className="pb-3">Rule Name</th>
                  <th className="pb-3">Metric</th>
                  <th className="pb-3">Condition</th>
                  <th className="pb-3">Severity</th>
                  <th className="pb-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {rules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 font-semibold text-slate-200 font-sans">{rule.name}</td>
                    <td className="py-3 uppercase text-brand-400">{rule.metric_type}</td>
                    <td className="py-3 text-slate-300">
                      {rule.condition_operator} {rule.threshold_value}%
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                        rule.severity === 'critical' ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        {rule.severity}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => handleDeleteRule(rule.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                        title="Delete Rule"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}
