#!/usr/bin/env sh
# Start a managed role: pin its declared effort, and load the guard that checks it.
#
# Both jobs have to happen before Claude starts, which is why this is repository
# tooling rather than part of the plugin — the artifact that starts the session
# cannot be reachable only through the session it is starting.
set -eu

if [ $# -eq 0 ]; then
  echo "usage: claude-role.sh <role> [claude args...]" >&2
  exit 64
fi

role=$1
shift

# A process-wide override would flatten the swarm to one level, which is the
# failure the whole guard exists to make impossible.
if [ -n "${CLAUDE_CODE_EFFORT_LEVEL-}" ]; then
  cat >&2 <<'MSG'
Refusing to start: CLAUDE_CODE_EFFORT_LEVEL is set.

It outranks /effort, settings and agent frontmatter alike, so subagents cannot
run at their own declared levels while it is present. Unset it and try again.
MSG
  exit 78
fi

plugin=$(CDPATH= cd -- "$(dirname -- "$0")/../.claude/plugins/harness-effort-guard" && pwd)

# One resolver, given an explicit start directory. Its non-zero exits already
# say why — an undeclared, duplicated or unknown role, or no project root.
resolved=$(node "$plugin/scripts/resolve-role.ts" "$role" "$PWD")
root=${resolved%	*}
effort=${resolved#*	}

# Starting from the resolved root is load-bearing: it makes the session's
# CLAUDE_PROJECT_DIR the directory the effort was just read from, so the
# launcher's lookup and the hook's cannot disagree.
cd "$root"

set -- --plugin-dir "$plugin" --agent "$role" --effort "$effort" "$@"

if [ -n "${CLAUDE_ROLE_PRINT_ARGV-}" ]; then
  echo "cwd=$root"
  echo "claude $*"
  exit 0
fi

exec claude "$@"
