#!/usr/bin/env sh
# Diagnostic: run one role alone on a main thread, at the effort it declares.
#
# Not the normal path. Work is dispatched by agent-router to subagents, whose
# frontmatter the runtime honours without help; see .agents/docs/agent-workflow.md
# §Dispatch. This exists for reproducing a single role in isolation, where the
# main-thread --agent effort defect would otherwise drop the declared level, and
# that defect is its whole remaining reason. It does not load the guard: the
# checkout's own settings do that.
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
# A success with an empty effort field is a role outside the effort invariant.
resolved=$(node "$plugin/scripts/resolve-role.ts" "$role" "$PWD")

# The two fields are tab-separated, and the tab is built rather than typed: a
# bare one here is invisible to review and one whitespace-normalising edit away
# from splitting on nothing at all, which would put a whole path where the level
# belongs. Both expansions cut at the *last* tab, so a project path containing
# one cannot make the two halves disagree about where the boundary was.
separator=$(printf '\t')
root=${resolved%"$separator"*}
effort=${resolved##*"$separator"}

# Starting from the resolved root is load-bearing: it makes the session's
# CLAUDE_PROJECT_DIR the directory the effort was just read from, so the
# launcher's lookup and the hook's cannot disagree.
cd "$root"

# A role outside the effort invariant has no level to pin, and passing one would
# manufacture the very mismatch the guard exists to catch.
if [ -n "$effort" ]; then
  set -- --effort "$effort" "$@"
fi

# No --plugin-dir. The checkout this cd'd into enables the guard from its own
# project settings, so naming the plugin here would load it by a second
# mechanism — and the rule is that nothing about loading depends on this script.
set -- --agent "$role" "$@"

if [ -n "${CLAUDE_ROLE_PRINT_ARGV-}" ]; then
  echo "cwd=$root"
  echo "claude $*"
  exit 0
fi

exec claude "$@"
