#!/usr/bin/env bash
set -euo pipefail

if [ -z "$WORKSPACE_DIR" ]; then
  echo "workspace folder was not set"
  exit 0
fi

# The same install as at creation, so a `playwright` update reaches a container
# that already exists the next time it starts.
bash "$WORKSPACE_DIR/.devcontainer/post-create/playwright-browsers.sh"
