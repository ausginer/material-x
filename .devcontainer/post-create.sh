#!/usr/bin/env bash
set -euo pipefail

WORKSPACE="${1:?Usage: $0 <workspace>}"

bash "$WORKSPACE/.devcontainer/post-create/chown.sh" "$WORKSPACE"
bash "$WORKSPACE/.devcontainer/post-create/typescript-language-server.sh"
bash "$WORKSPACE/.devcontainer/post-create/zed-terminal-fix.sh"
