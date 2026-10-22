const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

/**
 * In-memory fallback store when PostgreSQL is not connected.
 * Ensures local testing and offline execution run reliably.
 */
class MemoryStore {
  constructor() {
    this.tenants = [
      {
        id: '00000000-0000-0000-0000-000000000001',
        name: 'Default Organization',
        slug: 'default',
        created_at: new Date()
      }
    ];

    const passwordHash = bcrypt.hashSync('AdminPassword123!', 10);
    this.users = [
      {
        id: '00000000-0000-0000-0000-000000000002',
        tenant_id: '00000000-0000-0000-0000-000000000001',
        email: 'admin@monitoring.local',
        password_hash: passwordHash,
        full_name: 'DevOps Administrator',
        role: 'admin',
        is_active: true,
        created_at: new Date()
      }
    ];

    this.servers = [
      {
        id: '11111111-1111-1111-1111-111111111111',
        tenant_id: '00000000-0000-0000-0000-000000000001',
        hostname: 'prod-web-01.aws.internal',
        display_name: 'Production Web Front 01',
        ip_address: '10.20.1.45',
        os_name: 'Ubuntu Linux 24.04 LTS',
        os_version: '6.8.0-40-generic',
        cpu_cores: 4,
        total_memory_mb: 8192,
        total_disk_gb: 80.0,
        agent_key: 'agent-key-prod-web-01',
        agent_version: '1.2.0',
        status: 'online',
        last_heartbeat: new Date(),
        uptime_seconds: 432000,
        created_at: new Date()
      },
      {
        id: '22222222-2222-2222-2222-222222222222',
        tenant_id: '00000000-0000-0000-0000-000000000001',
        hostname: 'prod-db-01.aws.internal',
        display_name: 'Primary PostgreSQL Database',
        ip_address: '10.20.2.12',
        os_name: 'Debian GNU/Linux 12',
        os_version: '6.1.0-18-amd64',
        cpu_cores: 8,
        total_memory_mb: 16384,
        total_disk_gb: 250.0,
        agent_key: 'agent-key-prod-db-01',
        agent_version: '1.2.0',
        status: 'online',
        last_heartbeat: new Date(),
        uptime_seconds: 1209600,
        created_at: new Date()
      },
      {
        id: '33333333-3333-3333-3333-333333333333',
        tenant_id: '00000000-0000-0000-0000-000000000001',
        hostname: 'worker-node-03.aws.internal',
        display_name: 'Background Celery Worker 03',
        ip_address: '10.20.2.89',
        os_name: 'Amazon Linux 2023',
        os_version: '6.1.75-99.163.amzn2023',
        cpu_cores: 2,
        total_memory_mb: 4096,
        total_disk_gb: 40.0,
        agent_key: 'agent-key-worker-03',
        agent_version: '1.2.0',
        status: 'offline',
        last_heartbeat: new Date(Date.now() - 3600000), // 1 hour ago
        uptime_seconds: 52000,
        created_at: new Date()
      }
    ];

    this.metrics = [];
    this.seedHistoricalMetrics();

    this.system_logs = [
      {
        id: 1,
        server_id: '11111111-1111-1111-1111-111111111111',
        level: 'INFO',
        source: 'systemd',
        message: 'Started System Logging Service and Monitoring Agent daemon.',
        timestamp: new Date(Date.now() - 1800000)
      },
      {
        id: 2,
        server_id: '11111111-1111-1111-1111-111111111111',
        level: 'WARN',
        source: 'nginx',
        message: 'Upstream server response time exceeded 450ms on endpoint /api/metrics',
        timestamp: new Date(Date.now() - 1200000)
      },
      {
        id: 3,
        server_id: '33333333-3333-3333-3333-333333333333',
        level: 'CRITICAL',
        source: 'kernel',
        message: 'Network interface eth0 dropped connection. Heartbeat lost.',
        timestamp: new Date(Date.now() - 3600000)
      }
    ];

    this.alert_rules = [
      {
        id: '44444444-4444-4444-4444-444444444441',
        tenant_id: '00000000-0000-0000-0000-000000000001',
        name: 'High CPU Utilization',
        metric_type: 'cpu',
        condition_operator: '>',
        threshold_value: 85.0,
        duration_minutes: 2,
        severity: 'critical',
        is_enabled: true,
        created_at: new Date()
      },
      {
        id: '44444444-4444-4444-4444-444444444442',
        tenant_id: '00000000-0000-0000-0000-000000000001',
        name: 'High Memory Usage',
        metric_type: 'memory',
        condition_operator: '>',
        threshold_value: 90.0,
        duration_minutes: 5,
        severity: 'critical',
        is_enabled: true,
        created_at: new Date()
      },
      {
        id: '44444444-4444-4444-4444-444444444443',
        tenant_id: '00000000-0000-0000-0000-000000000001',
        name: 'Disk Space Alert',
        metric_type: 'disk',
        condition_operator: '>',
        threshold_value: 85.0,
        duration_minutes: 10,
        severity: 'warning',
        is_enabled: true,
        created_at: new Date()
      }
    ];

    this.alerts = [
      {
        id: '55555555-5555-5555-5555-555555555551',
        tenant_id: '00000000-0000-0000-0000-000000000001',
        rule_id: '44444444-4444-4444-4444-444444444441',
        server_id: '33333333-3333-3333-3333-333333333333',
        title: 'Server Heartbeat Lost',
        message: 'Host worker-node-03.aws.internal missed heartbeats for over 60 seconds.',
        severity: 'critical',
        current_value: 0,
        threshold_value: 0,
        status: 'active',
        acknowledged_at: null,
        resolved_at: null,
        created_at: new Date(Date.now() - 3600000)
      }
    ];

    this.settings = {
      tenant_id: '00000000-0000-0000-0000-000000000001',
      heartbeat_interval_seconds: 30,
      offline_threshold_seconds: 90,
      retention_days: 30,
      webhook_url: 'https://hooks.slack.com/services/T00/B00/XXXX',
      notification_email: 'alerts@monitoring.local',
      enable_notifications: true
    };
  }

  seedHistoricalMetrics() {
    const now = Date.now();
    const serverIds = ['11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222'];
    
    // Seed 24 data points over the last 2 hours (every 5 minutes)
    for (const serverId of serverIds) {
      for (let i = 24; i >= 0; i--) {
        const time = new Date(now - i * 5 * 60 * 1000);
        const baseCpu = serverId === '11111111-1111-1111-1111-111111111111' ? 35 : 55;
        const cpu = Math.min(99, Math.max(10, baseCpu + Math.sin(i / 2) * 15 + Math.random() * 8));
        const memPercent = serverId === '11111111-1111-1111-1111-111111111111' ? 48.5 : 72.0;
        const totalMem = serverId === '11111111-1111-1111-1111-111111111111' ? 8192 : 16384;
        const usedMem = Math.round((memPercent / 100) * totalMem);

        this.metrics.push({
          id: this.metrics.length + 1,
          server_id: serverId,
          cpu_percent: parseFloat(cpu.toFixed(1)),
          memory_used_mb: usedMem,
          memory_total_mb: totalMem,
          memory_percent: parseFloat(memPercent.toFixed(1)),
          swap_percent: 2.1,
          disk_used_gb: serverId === '11111111-1111-1111-1111-111111111111' ? 32.4 : 142.8,
          disk_total_gb: serverId === '11111111-1111-1111-1111-111111111111' ? 80.0 : 250.0,
          disk_percent: serverId === '11111111-1111-1111-1111-111111111111' ? 40.5 : 57.1,
          load_1m: parseFloat((0.8 + Math.random() * 0.4).toFixed(2)),
          load_5m: parseFloat((0.75 + Math.random() * 0.3).toFixed(2)),
          load_15m: 0.65,
          network_rx_kbps: parseFloat((120 + Math.random() * 80).toFixed(1)),
          network_tx_kbps: parseFloat((340 + Math.random() * 150).toFixed(1)),
          timestamp: time
        });
      }
    }
  }
}

module.exports = new MemoryStore();
