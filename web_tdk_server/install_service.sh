#!/usr/bin/env bash
# install_service.sh - install and enable systemd service for Web TDK

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATE="$SCRIPT_DIR/web_tdk_server.service.template"
SERVICE_DEST="/etc/systemd/system/web_tdk_server.service"

if [ "$(id -u)" -ne 0 ]; then
    echo "This installer must be run as root (sudo). Example: sudo ./install_service.sh"
    exit 1
fi

if [ ! -f "$TEMPLATE" ]; then
    echo "Service template not found: $TEMPLATE"
    exit 1
fi

WORK_DIR="$SCRIPT_DIR"
USER_TO_RUN=${1:-$(logname 2>/dev/null || echo $SUDO_USER || echo $(whoami))}
GROUP_TO_RUN=$(id -gn "$USER_TO_RUN")
VENV_BIN="$WORK_DIR/.venv/bin/uvicorn"

if [ ! -x "$VENV_BIN" ]; then
    echo "Virtualenv not ready or uvicorn not installed. Setting up virtualenv..."
    su -s /bin/bash "$USER_TO_RUN" -c "cd \"$WORK_DIR\" && python3 -m venv .venv && . .venv/bin/activate && pip install -U pip && pip install -r requirements.txt"
fi

# Fill in the template
cat "$TEMPLATE" | sed \
    -e "s|__WORK_DIR__|$WORK_DIR|g" \
    -e "s|__USER__|$USER_TO_RUN|g" \
    -e "s|__GROUP__|$GROUP_TO_RUN|g" \
    -e "s|__VENV_BIN__|$VENV_BIN|g" \
    > "$SERVICE_DEST.tmp"

# If there's a .env file, add EnvironmentFile line
if [ -f "$WORK_DIR/.env" ]; then
    echo "Adding EnvironmentFile to service file"
    awk '/\[Service\]/{print; print "EnvironmentFile='"$WORK_DIR"'/.env"; next}1' "$SERVICE_DEST.tmp" > "$SERVICE_DEST"
else
    mv "$SERVICE_DEST.tmp" "$SERVICE_DEST"
fi

# Reload systemctl and enable
systemctl daemon-reload
systemctl enable --now web_tdk_server.service

echo "Service installed and started. Use: systemctl status web_tdk_server" 
