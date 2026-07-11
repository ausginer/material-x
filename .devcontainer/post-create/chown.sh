#!/usr/bin/env bash
set -euo pipefail

WORKSPACE="${1:?Usage: $0 <workspace>}"

sudo chown -R node:node "$WORKSPACE/node_modules"
