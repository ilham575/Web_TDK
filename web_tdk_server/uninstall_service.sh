#!/usr/bin/env bash
# uninstall_service.sh - remove systemd service for Web TDK server
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_FILE="/etc/systemd/system/web_tdk_server.service"

if [ "$(id -u)" -ne 0 ]; then
    echo "This uninstaller must be run as root (sudo). Example: sudo ./uninstall_service.sh"
    exit 1
fi

if [ ! -f "$SERVICE_FILE" ]; then
    echo "Service not installed: $SERVICE_FILE"
    exit 0
fi

systemctl stop web_tdk_server.service || true
systemctl disable web_tdk_server.service || true
rm -f "$SERVICE_FILE"
systemctl daemon-reload
systemctl reset-failed

echo "Service removed. If process still running, use: pkill -f '$SCRIPT_DIR/.venv/bin/uvicorn' or manually stop it."
