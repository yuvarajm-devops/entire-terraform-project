#!/usr/bin/env bash
# ===================================================================
# PulseOps Linux Monitoring Agent Installer
# Safely installs the agent files and configures systemd service.
# ===================================================================

set -e

BACKEND_URL="${MONITORING_BACKEND_URL:-http://localhost:8080}"
AGENT_KEY="${AGENT_KEY:-}"

if [ -z "$AGENT_KEY" ]; then
    echo "ERROR: AGENT_KEY environment variable is required."
    echo "Usage: curl -sSL http://<server>/install_agent.sh | sudo AGENT_KEY=your_key MONITORING_BACKEND_URL=http://your_host:8080 bash"
    exit 1
fi

echo "==> Installing PulseOps Monitoring Agent..."

INSTALL_DIR="/opt/pulseops-agent"
CONFIG_DIR="/etc/pulseops"

mkdir -p "$INSTALL_DIR"
mkdir -p "$CONFIG_DIR"
chmod 700 "$CONFIG_DIR"

# Copy agent script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SCRIPT_DIR/agent.py" ]; then
    cp "$SCRIPT_DIR/agent.py" "$INSTALL_DIR/agent.py"
else
    echo "Fetching agent.py..."
    curl -sSL "$BACKEND_URL/agent.py" -o "$INSTALL_DIR/agent.py" || true
fi
chmod 755 "$INSTALL_DIR/agent.py"

# Write restricted configuration
cat <<EOF > "$CONFIG_DIR/agent_config.json"
{
  "backend_url": "$BACKEND_URL",
  "agent_key": "$AGENT_KEY",
  "interval": 15,
  "heartbeat_interval": 30
}
EOF
chmod 600 "$CONFIG_DIR/agent_config.json"

# Setup Systemd service if available
if command -v systemctl >/dev/null 2>&1; then
    cat <<EOF > /etc/systemd/system/pulseops-agent.service
[Unit]
Description=PulseOps Linux Server Monitoring Agent
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$INSTALL_DIR
ExecStart=/usr/bin/python3 $INSTALL_DIR/agent.py --config $CONFIG_DIR/agent_config.json
Restart=always
RestartSec=10
ProtectSystem=full
NoNewPrivileges=true

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    systemctl enable pulseops-agent.service
    systemctl restart pulseops-agent.service
    echo "==> PulseOps Agent installed and started via systemd!"
else
    echo "==> Systemd not found. Start manually with:"
    echo "    python3 $INSTALL_DIR/agent.py --config $CONFIG_DIR/agent_config.json"
fi
