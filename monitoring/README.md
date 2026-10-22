# Monitoring and Logging

<!-- Explains where application logs are stored -->
Docker and system logs are emitted by application containers and Linux hosts.

<!-- Explains how logs help troubleshoot failures -->
Use logs to investigate startup errors, application exceptions, and failed requests.

<!-- Explains the purpose of health checks -->
The ALB health check verifies that the application responds successfully at `/health`.

<!-- Explains the purpose of metrics and alerts -->
Configure CloudWatch alarms for relevant errors, resource utilization, and service health.

## Real-Time Linux Monitoring Agent

The `monitoring/agent/` directory contains the production Linux monitoring agent (`agent.py`) which securely collects real-time system metrics and streams them to the monitoring backend.

### Telemetry Collected:
- **CPU Utilization**: Real CPU load percentage calculated from `/proc/stat` and normalized multi-core load.
- **Memory & Swap Allocation**: Total, used, free memory (MB) and percentages derived from `/proc/meminfo`.
- **Disk Utilization**: Total and used storage (GB) across mounted filesystems via `statvfs`.
- **System Load Averages**: 1-minute, 5-minute, and 15-minute load metrics.
- **Network I/O**: Real-time ingress (`RX`) and egress (`TX`) rates in kB/s from `/proc/net/dev`.
- **Uptime**: Continuous seconds calculation from `/proc/uptime`.
- **System Logs**: Authenticated log shipping to `/api/logs/ingest`.

### Security Hardening:
- **Restricted Access**: Uses dedicated `X-Agent-Key` header authentication.
- **Zero Arbitrary Execution**: The agent contains no remote shell execution or command evaluation mechanisms.
- **File Permissions**: The agent configuration file `/etc/pulseops/agent_config.json` is restricted to `chmod 600`.
- **Systemd Isolation**: Runs with `ProtectSystem=full` and `NoNewPrivileges=true`.

### Agent Installation:
```bash
# 1. Register a server in the dashboard to obtain an AGENT_KEY
# 2. Run the installer on target Linux host:
sudo AGENT_KEY="your_agent_key" MONITORING_BACKEND_URL="http://<ALB_OR_IP>:8080" ./monitoring/agent/install_agent.sh
```

### Manual Execution:
```bash
python3 monitoring/agent/agent.py --server-url http://localhost:8080 --agent-key <AGENT_KEY>
```
