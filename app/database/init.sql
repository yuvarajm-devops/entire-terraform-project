-- ===================================================================
-- Real-Time DevOps Server Monitoring Platform
-- Database Initialization Script (PostgreSQL)
-- ===================================================================

-- Create Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tenants Table (Multi-tenancy support)
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) DEFAULT 'operator' CHECK (role IN ('admin', 'operator', 'viewer')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Monitored Servers Table
CREATE TABLE IF NOT EXISTS servers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    hostname VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    ip_address VARCHAR(45) NOT NULL,
    os_name VARCHAR(100) DEFAULT 'Linux',
    os_version VARCHAR(100),
    cpu_cores INTEGER DEFAULT 1,
    total_memory_mb BIGINT DEFAULT 1024,
    total_disk_gb NUMERIC(10, 2) DEFAULT 20.0,
    agent_key VARCHAR(128) UNIQUE NOT NULL,
    agent_version VARCHAR(50) DEFAULT '1.0.0',
    status VARCHAR(20) DEFAULT 'offline' CHECK (status IN ('online', 'warning', 'offline', 'maintenance')),
    last_heartbeat TIMESTAMP WITH TIME ZONE,
    uptime_seconds BIGINT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for server queries
CREATE INDEX IF NOT EXISTS idx_servers_tenant_status ON servers(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_servers_agent_key ON servers(agent_key);

-- 4. Metrics Time-Series Table
CREATE TABLE IF NOT EXISTS metrics (
    id BIGSERIAL PRIMARY KEY,
    server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
    cpu_percent NUMERIC(5, 2) NOT NULL,
    memory_used_mb BIGINT NOT NULL,
    memory_total_mb BIGINT NOT NULL,
    memory_percent NUMERIC(5, 2) NOT NULL,
    swap_percent NUMERIC(5, 2) DEFAULT 0.0,
    disk_used_gb NUMERIC(10, 2) NOT NULL,
    disk_total_gb NUMERIC(10, 2) NOT NULL,
    disk_percent NUMERIC(5, 2) NOT NULL,
    load_1m NUMERIC(5, 2) DEFAULT 0.0,
    load_5m NUMERIC(5, 2) DEFAULT 0.0,
    load_15m NUMERIC(5, 2) DEFAULT 0.0,
    network_rx_kbps NUMERIC(10, 2) DEFAULT 0.0,
    network_tx_kbps NUMERIC(10, 2) DEFAULT 0.0,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Time-series indexes
CREATE INDEX IF NOT EXISTS idx_metrics_server_timestamp ON metrics(server_id, timestamp DESC);

-- 5. System and Application Logs Table
CREATE TABLE IF NOT EXISTS system_logs (
    id BIGSERIAL PRIMARY KEY,
    server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
    level VARCHAR(20) DEFAULT 'INFO' CHECK (level IN ('DEBUG', 'INFO', 'WARN', 'ERROR', 'CRITICAL')),
    source VARCHAR(100) DEFAULT 'system',
    message TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_logs_server_level_time ON system_logs(server_id, level, timestamp DESC);

-- 6. Alert Rules Table
CREATE TABLE IF NOT EXISTS alert_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    metric_type VARCHAR(50) NOT NULL CHECK (metric_type IN ('cpu', 'memory', 'disk', 'heartbeat', 'load')),
    condition_operator VARCHAR(10) DEFAULT '>' CHECK (condition_operator IN ('>', '>=', '<', '<=', '==')),
    threshold_value NUMERIC(10, 2) NOT NULL,
    duration_minutes INTEGER DEFAULT 1,
    severity VARCHAR(20) DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'critical')),
    is_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Triggered Alerts / Incidents Table
CREATE TABLE IF NOT EXISTS alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    rule_id UUID REFERENCES alert_rules(id) ON DELETE SET NULL,
    server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    severity VARCHAR(20) DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'critical')),
    current_value NUMERIC(10, 2),
    threshold_value NUMERIC(10, 2),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved')),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_alerts_server_status ON alerts(server_id, status);

-- 8. Platform Settings Table
CREATE TABLE IF NOT EXISTS settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
    heartbeat_interval_seconds INTEGER DEFAULT 30,
    offline_threshold_seconds INTEGER DEFAULT 90,
    retention_days INTEGER DEFAULT 30,
    webhook_url VARCHAR(500),
    notification_email VARCHAR(255),
    enable_notifications BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ===================================================================
-- Seed Initial Data
-- ===================================================================

-- Insert default tenant
INSERT INTO tenants (id, name, slug)
VALUES ('00000000-0000-0000-0000-000000000001', 'Default Organization', 'default')
ON CONFLICT (slug) DO NOTHING;

-- Insert default admin user: admin@monitoring.local / password: AdminPassword123!
INSERT INTO users (id, tenant_id, email, password_hash, full_name, role)
VALUES (
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    'admin@monitoring.local',
    '$2a$10$VfRwFsagdvYCFyAVxABezOIhnDxoPUfIVQpGo..FL/quJMK0NXhVa',
    'DevOps Administrator',
    'admin'
)
ON CONFLICT (email) DO NOTHING;

-- Insert default settings
INSERT INTO settings (tenant_id, heartbeat_interval_seconds, offline_threshold_seconds, retention_days)
VALUES ('00000000-0000-0000-0000-000000000001', 30, 90, 30)
ON CONFLICT (tenant_id) DO NOTHING;

-- Insert default alert rules
INSERT INTO alert_rules (tenant_id, name, metric_type, condition_operator, threshold_value, duration_minutes, severity)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'High CPU Utilization', 'cpu', '>', 85.00, 2, 'critical'),
    ('00000000-0000-0000-0000-000000000001', 'High Memory Usage', 'memory', '>', 90.00, 5, 'critical'),
    ('00000000-0000-0000-0000-000000000001', 'Disk Space Low', 'disk', '>', 85.00, 10, 'warning')
ON CONFLICT DO NOTHING;
