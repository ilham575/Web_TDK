#!/usr/bin/env bash
# run_server.sh - portable script to start/stop FastAPI server for local Debian
# Usage: ./run_server.sh start|stop|status|install_venv

poetry run uvicorn main:app --port 8080 --reload
