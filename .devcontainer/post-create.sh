#!/usr/bin/env bash
set -euo pipefail

if [ -z "$WORKSPACE_DIR" ]; then
  echo "workspace folder was not set"
  exit 0
fi

bash "${WORKSPACE_DIR}/.devcontainer/post-create/chown.sh"
bash "${WORKSPACE_DIR}/.devcontainer/post-create/setup.sh"
bash "${WORKSPACE_DIR}/.devcontainer/post-create/typescript-language-server.sh"
bash "${WORKSPACE_DIR}/.devcontainer/post-create/zed-terminal-fix.sh"
