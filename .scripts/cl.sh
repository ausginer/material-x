#!/usr/bin/env sh
set -eu

usage() {
  echo 'Usage: cl [--init] <profile> [<slot>], where <slot> is one of b to z' >&2
  exit 64
}

init=false
profile=
slot=

for arg do
  case "$arg" in
    --init) init=true ;;
    *)
      if [ -z "$profile" ]; then
        profile=$arg
      elif [ -z "$slot" ]; then
        slot=$arg
      else
        usage
      fi
      ;;
  esac
done

case "$profile" in
  reviewer)     agent=reviewer;     name='Mx Reviewer' ;;
  architect)    agent=architect;    name='Mx Architect' ;;
  challenger)   agent=architect;    name='Mx Architect Challenger' ;;
  implementer)  agent=implementer;  name='Mx Implementer' ;;
  consolidator) agent=consolidator; name='Mx Review Swarm' ;;
  integrity)    agent=integrity;    name='Mx Integrity' ;;
  cleanup)      agent=cleanup;      name='Mx Cleanup' ;;
  der)          agent=der;          name='Mx Der' ;;
  coordinator)  agent=coordinator;  name='Mx Coordinator' ;;
  *) usage ;;
esac

# Each letter is listed, because a bracket range can match upper case in some
# locales.
case "$slot" in
  ''|b|c|d|e|f|g|h|i|j|k|l|m|n|o|p|q|r|s|t|u|v|w|x|y|z) ;;
  *) usage ;;
esac

if [ -n "${CLAUDE_CODE_EFFORT_LEVEL:-}" ]; then
  echo 'Unset CLAUDE_CODE_EFFORT_LEVEL: it overrides the role effort.' >&2
  exit 78
fi

# Follow the symlink back to .scripts/cl.sh, then start at the checkout root.
script=$(readlink -f -- "$0")
checkout=$(dirname "$(dirname "$script")")

if [ -z "$slot" ]; then
  cd "$checkout"
else
  # CL_SLOT_ROOT exists for cl's test only.
  slots=${CL_SLOT_ROOT:-/workspaces/worktrees}
  # Without the volume, a slot would land on the container's overlay, which a
  # rebuild discards.
  if ! mountpoint -q "$slots"; then
    echo "$slots is not a mount point. The devcontainer mounts the" \
      "<workspace>_worktrees volume there; rebuild the container." >&2
    exit 78
  fi
  dir="${slots:?}/${slot:?}"
  if [ ! -d "$dir" ]; then
    # Locked, so `git worktree prune` keeps the slot's entry wherever the
    # volume isn't mounted.
    git -C "$checkout" worktree add -q --detach --lock --reason 'session slot' \
      "$dir" origin/main
  fi
  cd "$dir"
  name="$name $(printf '%s' "$slot" | tr '[:lower:]' '[:upper:]')"
fi

# `--agent` applies the definition's model and not its effort, so the effort
# is read from the session root's definition and passed explicitly.
definition=.claude/agents/$agent.md
effort=$(awk '
  NR == 1 { if ($0 != "---") exit; next }
  $0 == "---" { exit }
  /^effort:/ { sub(/^effort:[ \t]*/, ""); sub(/[ \t\r]+$/, ""); print; exit }
' "$definition" 2>/dev/null) || effort=

if [ -z "$effort" ]; then
  echo "$PWD/$definition declares no effort." >&2
  exit 78
fi

if [ "$init" = true ]; then
  exec claude --agent "$agent" --effort "$effort" --name "$name"
else
  exec claude --agent "$agent" --effort "$effort" --resume "$name"
fi
