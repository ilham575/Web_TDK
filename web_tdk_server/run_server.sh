#!/usr/bin/env bash
# run_server.sh - portable script to start/stop FastAPI server for local Debian
# Usage: ./run_server.sh start|stop|status|install_venv

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

VENV_DIR=".venv"
PYTHON="python3"
UVICORN_CMD="$VENV_DIR/bin/uvicorn"
PID_FILE="$SCRIPT_DIR/.web_tdk_server.pid"
LOG_FILE="$SCRIPT_DIR/web_tdk_server.log"

ensure_venv() {
    if [ -f "$VENV_DIR/bin/activate" ]; then
        echo "Virtualenv $VENV_DIR found."
    else
        echo "Creating virtualenv ($PYTHON -m venv $VENV_DIR) ..."
        $PYTHON -m venv "$VENV_DIR"
    fi
    echo "Activating virtualenv..."
    # shellcheck source=/dev/null
    source "$VENV_DIR/bin/activate"
    echo "Installing/updating dependencies..."
    pip install --upgrade pip
    pip install -r requirements.txt
}

start_server() {
    ensure_venv
    echo "Starting Web TDK Server..."
    if [ -f "$PID_FILE" ]; then
        oldpid=$(cat "$PID_FILE")
        if kill -0 "$oldpid" >/dev/null 2>&1; then
            echo "Server already running with PID: $oldpid"
            exit 0
        else
            echo "Stale PID file found. Removing..."
            rm -f "$PID_FILE"
        fi
    fi

    # Start in background using nohup so we can manage it without systemd
    nohup "$UVICORN_CMD" main:app --host 0.0.0.0 --port 8000 >"$LOG_FILE" 2>&1 &
    echo $! > "$PID_FILE"
    echo "Server started. PID: $(cat "$PID_FILE")"
    echo "Logs: $LOG_FILE"
}

stop_server() {
    if [ ! -f "$PID_FILE" ]; then
        echo "No PID file found. Server not running (or pid file missing)."
        exit 0
    fi
    pid=$(cat "$PID_FILE")
    if kill -0 "$pid" >/dev/null 2>&1; then
        echo "Stopping server with PID $pid..."
        kill "$pid" && rm -f "$PID_FILE"
        echo "Server stopped."
    else
        echo "Process $pid not running. Cleaning up PID file."
        rm -f "$PID_FILE"
    fi
}

status_server() {
    if [ -f "$PID_FILE" ]; then
        pid=$(cat "$PID_FILE")
        if kill -0 "$pid" >/dev/null 2>&1; then
            echo "Server running. PID: $pid"
            return
        fi
    fi
    echo "Server not running."
}

case ${1:-} in
    start)
        start_server
        ;;
    stop)
        stop_server
        ;;
    status)
        status_server
        ;;
    install_venv)
        ensure_venv
        ;;
    *)
        echo "Usage: $0 {start|stop|status|install_venv}"
        exit 1
        ;;
esac
