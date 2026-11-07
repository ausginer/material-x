#!/usr/bin/env bash
set -euo pipefail

if [ -z "$WORKSPACE_DIR" ]; then
  echo "workspace folder was not set"
  exit 0
fi

sudo chown -R node:node "$WORKSPACE_DIR/node_modules"
