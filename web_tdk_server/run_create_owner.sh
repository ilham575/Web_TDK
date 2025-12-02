#!/usr/bin/env bash
# run_create_owner.sh - run create_owner.py using project venv
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

VENV_DIR=".venv"
PYTHON="$VENV_DIR/bin/python"

if [ ! -f "$VENV_DIR/bin/activate" ]; then
    echo "Virtualenv not found; create it now."
    python3 -m venv "$VENV_DIR"
fi

# shellcheck source=/dev/null
source "$VENV_DIR/bin/activate"

# Ensure requirements are installed
pip install --upgrade pip
pip install -r requirements.txt

# Run script using the venv's python
$PYTHON create_owner.py "$@"
