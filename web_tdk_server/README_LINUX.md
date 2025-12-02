# Run Web TDK (FastAPI) on Debian without typing the commands

This guide provides scripts and a systemd service you can install so the FastAPI server runs on local Debian without manual `uvicorn` or environment setup commands.

Files added:

- `run_server.sh` - portable bash script to create a virtual environment, install requirements and start/stop the server.
- `install_service.sh` - installs and enables a systemd service.
- `web_tdk_server.service.template` - systemd service template (populated automatically by installer).

Quick steps (one command):

1. Make scripts executable (if not already):

```bash
cd web_tdk_server
chmod +x run_server.sh install_service.sh
```

2. To start the server manually (useful for testing):

```bash
./run_server.sh start
# Logs are in web_tdk_server.log
# Stop with:
./run_server.sh stop

2.5 To create the default owner account (if you need a default login):

```bash
# Run create_owner using the project's virtualenv (recommended)
./run_create_owner.sh
```
```

3. To install the service and run it automatically via systemd (recommended):

```bash
# Run installer as root so it can write to /etc/systemd/system
cd web_tdk_server
sudo ./install_service.sh
# The installer uses the user that invoked sudo (or the current user if run by root). You can also pass a username explicitly as first parameter to the script.
# Example: sudo ./install_service.sh myuser
```

4. Check status and logs:

```bash
systemctl status web_tdk_server
journalctl -u web_tdk_server -f
```

Notes and tips:

- The `install_service.sh` script will set up a Python venv using `python3 -m venv .venv` and install requirements in the project folder (owner will be the non-root user that invoked `sudo`). If `python3`, `virtualenv` or `pip` are not installed, install them with `sudo apt-get install python3 python3-venv python3-pip`.

- If you want the service to source environment variables, create a `.env` file with KEY=VALUE lines in the `web_tdk_server` directory; the installer will add it to the service file automatically.

- The service runs `uvicorn` directly inside the virtualenv and is configured to restart on failure.

- If you want the service to bind to a privileged port < 1024, run it behind a reverse proxy or use systemd socket activation.

If you want, I can also wire up a desktop entry to allow a double-click to start or craft a one-shot `Debian` package for easier install. Let me know which option you prefer. 
