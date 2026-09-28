#!/usr/bin/env bash
set -euo pipefail

WORKSPACE="${1:?Usage: $0 <workspace>}"

chmod +x "${WORKSPACE}/.scripts/cl.sh"
mkdir -p "$HOME/.local/bin"
ln -s "${WORKSPACE}/.scripts/cl.sh" "$HOME/.local/bin/cl"
