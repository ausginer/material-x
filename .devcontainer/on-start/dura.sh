#!/usr/bin/env bash
set -euo pipefail

if [ -z "$WORKSPACE_DIR" ]; then
  echo "workspace folder was not set"
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

if [ -d "$WORKSPACE_DIR/.git" ]; then
  echo "watching workspace repo: $WORKSPACE_DIR"
  dura watch "$WORKSPACE_DIR" || true
fi

for repo in "$WORKSPACE_DIR"/*; do
  if [ -d "$repo/.git" ]; then
    echo "watching nested repo: $repo"
    dura watch "$repo" || true
  fi
done
