#!/usr/bin/env bash
set -euo pipefail

if [ -z "$WORKSPACE_DIR" ]; then
  echo "workspace folder was not set"
  exit 0
fi

bash "$WORKSPACE_DIR/.devcontainer/on-start/dura.sh"
bash "$WORKSPACE_DIR/.devcontainer/on-start/fix-zed-timeout.sh"
