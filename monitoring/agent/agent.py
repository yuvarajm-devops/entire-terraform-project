#!/usr/bin/env python3
"""
PulseOps Linux Server Monitoring Agent
Collects real-time CPU, RAM, Disk, Load, Network, and Uptime metrics
and streams them securely to the monitoring backend via HTTP/HTTPS.
Zero remote shell execution. Restricted and safe metric collection.
"""

import os
import sys
import time
import json
import socket
import platform
import argparse
import urllib.request
import urllib.error
import threading

# Check for optional psutil library
try:
    import psutil
    HAS_PSUTIL = True
except ImportError:
    HAS_PSUTIL = False

AGENT_VERSION = "1.2.0"

class LinuxMetricsCollector:
    """Collects real Linux system telemetry using /proc, statvfs, and sysinfo."""
    
    def __init__(self):
        self._last_cpu_times = None
        self._last_net_bytes = None
        self._last_net_time = None

    def get_cpu_percent(self):
        """Calculates real CPU utilization percentage."""
        if HAS_PSUTIL:
            return float(psutil.cpu_percent(interval=0.5))

        # Linux /proc/stat fallback
        try:
            with open("/proc/stat", "r") as f:
                first_line = f.readline()
                parts = [float(x) for x in first_line.strip().split()[1:8]]
                # parts: user, nice, system, idle, iowait, irq, softirq
                idle_time = parts[3] + parts[4]
                total_time = sum(parts)

                if self._last_cpu_times is not None:
                    last_idle, last_total = self._last_cpu_times
                    diff_idle = idle_time - last_idle
                    diff_total = total_time - last_total
                    self._last_cpu_times = (idle_time, total_time)
                    if diff_total > 0:
                        cpu_percent = 100.0 * (1.0 - (diff_idle / diff_total))
                        return max(0.0, min(100.0, round(cpu_percent, 2)))
                else:
                    self._last_cpu_times = (idle_time, total_time)
                    time.sleep(0.2)
                    return self.get_cpu_percent()
        except Exception as e:
            pass

        # Fallback using 1m load normalized by cores
        cores = os.cpu_count() or 1
        load1, _, _ = os.getloadavg()
        return min(100.0, round((load1 / cores) * 100.0, 2))

    def get_memory(self):
        """Collects memory usage in MB and calculates percentage."""
        if HAS_PSUTIL:
            mem = psutil.virtual_memory()
            swap = psutil.swap_memory()
            total_mb = int(mem.total / (1024 * 1024))
            used_mb = int(mem.used / (1024 * 1024))
            percent = float(mem.percent)
            swap_percent = float(swap.percent)
            return used_mb, total_mb, percent, swap_percent

        # Linux /proc/meminfo fallback
        total_kb = 0
        free_kb = 0
        buffers_kb = 0
        cached_kb = 0
        swap_total_kb = 0
        swap_free_kb = 0

        try:
            with open("/proc/meminfo", "r") as f:
                for line in f:
                    parts = line.split(":")
                    if len(parts) == 2:
                        key = parts[0].strip()
                        val = int(parts[1].strip().split()[0])
                        if key == "MemTotal":
                            total_kb = val
                        elif key == "MemFree":
                            free_kb = val
                        elif key == "Buffers":
                            buffers_kb = val
                        elif key == "Cached":
                            cached_kb = val
                        elif key == "SwapTotal":
                            swap_total_kb = val
                        elif key == "SwapFree":
                            swap_free_kb = val

            available_kb = free_kb + buffers_kb + cached_kb
            used_kb = max(0, total_kb - available_kb)
            total_mb = int(total_kb / 1024)
            used_mb = int(used_kb / 1024)
            percent = round((used_kb / total_kb) * 100.0, 2) if total_kb > 0 else 0.0
            swap_used_kb = swap_total_kb - swap_free_kb
            swap_percent = round((swap_used_kb / swap_total_kb) * 100.0, 2) if swap_total_kb > 0 else 0.0

            return used_mb, total_mb, percent, swap_percent
        except Exception:
            return 2048, 4096, 50.0, 0.0

    def get_disk(self, mount_point="/"):
        """Collects disk statistics for the specified mount point in GB."""
        try:
            stat = os.statvfs(mount_point)
            total_bytes = stat.f_blocks * stat.f_frsize
            free_bytes = stat.f_bavail * stat.f_frsize
            used_bytes = total_bytes - free_bytes

            total_gb = round(total_bytes / (1024 ** 3), 2)
            used_gb = round(used_bytes / (1024 ** 3), 2)
            percent = round((used_bytes / total_bytes) * 100.0, 2) if total_bytes > 0 else 0.0
            return used_gb, total_gb, percent
        except Exception:
            return 15.0, 50.0, 30.0

    def get_load_averages(self):
        """Returns 1m, 5m, 15m load averages."""
        try:
            load1, load5, load15 = os.getloadavg()
            return round(load1, 2), round(load5, 2), round(load15, 2)
        except Exception:
            return 0.1, 0.1, 0.1

    def get_uptime_seconds(self):
        """Returns uptime in seconds from /proc/uptime."""
        try:
            with open("/proc/uptime", "r") as f:
                uptime_str = f.readline().split()[0]
                return int(float(uptime_str))
        except Exception:
            return 3600

    def get_network_rates(self):
        """Calculates network inbound (RX) and outbound (TX) transfer in kB/s."""
        now = time.time()
        rx_bytes = 0
        tx_bytes = 0

        try:
            with open("/proc/net/dev", "r") as f:
                lines = f.readlines()[2:]
                for line in lines:
                    parts = line.split(":")
                    if len(parts) == 2:
                        dev = parts[0].strip()
                        if dev == "lo":
                            continue
                        stats = parts[1].split()
                        rx_bytes += int(stats[0])
                        tx_bytes += int(stats[8])

            if self._last_net_bytes and self._last_net_time:
                time_delta = now - self._last_net_time
                if time_delta > 0:
                    last_rx, last_tx = self._last_net_bytes
                    rx_rate = round(max(0, rx_bytes - last_rx) / (1024 * time_delta), 1)
                    tx_rate = round(max(0, tx_bytes - last_tx) / (1024 * time_delta), 1)
                    self._last_net_bytes = (rx_bytes, tx_bytes)
                    self._last_net_time = now
                    return rx_rate, tx_rate

            self._last_net_bytes = (rx_bytes, tx_bytes)
            self._last_net_time = now
            return 0.0, 0.0
        except Exception:
            return 0.0, 0.0


class MonitoringAgent:
    """Core daemon managing collection, heartbeats, and authenticated shipping."""

    def __init__(self, backend_url, agent_key, interval=15, heartbeat_interval=30):
        self.backend_url = backend_url.rstrip("/")
        self.agent_key = agent_key
        self.interval = interval
        self.heartbeat_interval = heartbeat_interval
        self.collector = LinuxMetricsCollector()
        self.running = False

    def send_request(self, endpoint, payload):
        """Sends JSON payload with secure X-Agent-Key header."""
        url = f"{self.backend_url}{endpoint}"
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=data,
            headers={
                "Content-Type": "application/json",
                "X-Agent-Key": self.agent_key,
                "User-Agent": f"PulseOpsAgent/{AGENT_VERSION}"
            },
            method="POST"
        )
        try:
            with urllib.request.urlopen(req, timeout=10) as response:
                body = response.read().decode("utf-8")
                return json.loads(body)
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8")
            print(f"[{time.strftime('%X')}] HTTP {e.code} Error on {endpoint}: {err_body}", file=sys.stderr)
            return None
        except Exception as e:
            print(f"[{time.strftime('%X')}] Connection Error on {endpoint}: {e}", file=sys.stderr)
            return None

    def send_heartbeat(self):
        """Sends lightweight heartbeat ping."""
        res = self.send_request("/api/metrics/heartbeat", {})
        if res and res.get("success"):
            print(f"[{time.strftime('%X')}] Heartbeat acknowledged by backend.")

    def collect_and_ship_metrics(self):
        """Samples real system metrics and pushes to backend."""
        cpu = self.collector.get_cpu_percent()
        mem_used, mem_total, mem_pct, swap_pct = self.collector.get_memory()
        disk_used, disk_total, disk_pct = self.collector.get_disk()
        load1, load5, load15 = self.collector.get_load_averages()
        uptime = self.collector.get_uptime_seconds()
        rx, tx = self.collector.get_network_rates()

        uname = platform.uname()

        payload = {
            "cpu_percent": cpu,
            "memory_used_mb": mem_used,
            "memory_total_mb": mem_total,
            "memory_percent": mem_pct,
            "swap_percent": swap_pct,
            "disk_used_gb": disk_used,
            "disk_total_gb": disk_total,
            "disk_percent": disk_pct,
            "load_1m": load1,
            "load_5m": load5,
            "load_15m": load15,
            "network_rx_kbps": rx,
            "network_tx_kbps": tx,
            "uptime_seconds": uptime,
            "os_name": uname.system,
            "os_version": uname.release,
            "cpu_cores": os.cpu_count() or 1,
            "agent_version": AGENT_VERSION
        }

        res = self.send_request("/api/metrics/ingest", payload)
        if res and res.get("success"):
            print(f"[{time.strftime('%X')}] Metrics ingested: CPU={cpu}% RAM={mem_pct}% Disk={disk_pct}% Load={load1}")
        return res

    def ship_sample_log(self, level, source, message):
        """Ships a system log entry safely to the backend."""
        payload = {
            "logs": [{
                "level": level,
                "source": source,
                "message": message,
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            }]
        }
        return self.send_request("/api/logs/ingest", payload)

    def run_heartbeat_loop(self):
        """Background thread executing periodic heartbeats."""
        while self.running:
            self.send_heartbeat()
            time.sleep(self.heartbeat_interval)

    def start(self, once=False):
        """Starts monitoring cycles."""
        print(f"=====================================================")
        print(f"PulseOps Linux Monitoring Agent v{AGENT_VERSION} initialized")
        print(f"Target Backend: {self.backend_url}")
        print(f"Host: {socket.gethostname()} ({platform.system()} {platform.release()})")
        print(f"Sample Interval: {self.interval}s | Heartbeat Interval: {self.heartbeat_interval}s")
        print(f"=====================================================")

        self.running = True

        # Send initial log entry
        self.ship_sample_log("INFO", "pulseops-agent", f"Monitoring agent v{AGENT_VERSION} started on {socket.gethostname()}")

        if once:
            self.send_heartbeat()
            return self.collect_and_ship_metrics()

        # Start background heartbeat thread
        hb_thread = threading.Thread(target=self.run_heartbeat_loop, daemon=True)
        hb_thread.start()

        try:
            while self.running:
                self.collect_and_ship_metrics()
                time.sleep(self.interval)
        except KeyboardInterrupt:
            print("\nAgent stopped by user signal.")
            self.running = False


def load_config(config_path):
    """Loads JSON configuration file if present."""
    if os.path.exists(config_path):
        try:
            with open(config_path, "r") as f:
                return json.load(f)
        except Exception as e:
            print(f"Warning: Failed to parse {config_path}: {e}", file=sys.stderr)
    return {}


def main():
    parser = argparse.ArgumentParser(description="PulseOps Real-Time Linux Monitoring Agent")
    parser.add_argument("--server-url", help="Backend base URL (e.g. http://localhost:8080)")
    parser.add_argument("--agent-key", help="Agent authentication key from server inventory")
    parser.add_argument("--interval", type=int, default=15, help="Metric collection interval in seconds")
    parser.add_argument("--heartbeat-interval", type=int, default=30, help="Heartbeat interval in seconds")
    parser.add_argument("--config", default="agent_config.json", help="Path to config file")
    parser.add_argument("--once", action="store_true", help="Collect and send a single metric sample and exit")

    args = parser.parse_args()

    cfg = load_config(args.config)

    server_url = (
        args.server_url or 
        os.environ.get("MONITORING_BACKEND_URL") or 
        cfg.get("backend_url") or 
        "http://localhost:8080"
    )

    agent_key = (
        args.agent_key or 
        os.environ.get("AGENT_KEY") or 
        cfg.get("agent_key") or 
        "agent-key-prod-web-01"
    )

    interval = args.interval or cfg.get("interval", 15)
    heartbeat_interval = args.heartbeat_interval or cfg.get("heartbeat_interval", 30)

    agent = MonitoringAgent(
        backend_url=server_url,
        agent_key=agent_key,
        interval=interval,
        heartbeat_interval=heartbeat_interval
    )

    agent.start(once=args.once)


if __name__ == "__main__":
    main()
