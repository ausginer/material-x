#!/usr/bin/env bash
set -euo pipefail

if [ -z "$WORKSPACE_DIR" ]; then
  echo "workspace folder was not set"
  exit 0
fi

chmod +x "${WORKSPACE_DIR}/.scripts/cl.sh"
mkdir -p "$HOME/.local/bin"
ln -s "${WORKSPACE_DIR}/.scripts/cl.sh" "$HOME/.local/bin/cl"
