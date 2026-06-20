#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-}"

if [ -z "$ROOT" ]; then
  echo "workspace folder was not passed"
  exit 0
fi

# Dura continuously snapshots Git worktrees in the background.
# This complements editor-specific local history and helps recover uncommitted
# changes.

LOG_DIR="$HOME/.cache/dura"
PID_FILE="$LOG_DIR/dura.pid"
LOG_FILE="$LOG_DIR/dura.log"

mkdir -p "$LOG_DIR"

if ! command -v dura >/dev/null 2>&1; then
  echo "dura is not installed"
  exit 0
fi

if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  echo "dura serve already running"
else
  echo "starting dura serve"
  nohup dura serve >"$LOG_FILE" 2>&1 &
  echo $! > "$PID_FILE"
fi

if [ -d "$ROOT/.git" ]; then
  echo "watching workspace repo: $ROOT"
  dura watch "$ROOT" || true
fi

for repo in "$ROOT"/*; do
  if [ -d "$repo/.git" ]; then
    echo "watching nested repo: $repo"
    dura watch "$repo" || true
  fi
done

# Chrome CDP is bound to container-local 127.0.0.1.
# Proxy it to the container's network IP so host -> container port forwarding
# works.

# if [ -f /tmp/chrome-cdp-socat.pid ]; then
#   kill "$(cat /tmp/chrome-cdp-socat.pid)" 2>/dev/null || true
#   rm -f /tmp/chrome-cdp-socat.pid
# fi

# CONTAINER_IP=$(ip -4 route get 1.1.1.1 | sed -n 's/.* src \([0-9.]*\).*/\1/p')

# socat \
#   TCP-LISTEN:9222,bind="$CONTAINER_IP",fork,reuseaddr \
#   TCP:127.0.0.1:9222 \
#   >/tmp/chrome-cdp-socat.log 2>&1 &

# echo $! > /tmp/chrome-cdp-socat.pid
# echo "Chrome CDP proxy started on $CONTAINER_IP:9222"
