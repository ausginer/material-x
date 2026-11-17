#!/usr/bin/env sh
set -eu

init=false
profile=

for arg do
  case "$arg" in
    --init) init=true ;;
    *)
      if [ -n "$profile" ]; then
        echo "Usage: cl [--init] <profile>" >&2
        exit 64
      fi
      profile=$arg
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
  *)
    echo "Usage: cl [--init] <profile>" >&2
    exit 64
    ;;
esac

if [ -n "${CLAUDE_CODE_EFFORT_LEVEL:-}" ]; then
  echo 'Unset CLAUDE_CODE_EFFORT_LEVEL: it overrides the role effort.' >&2
  exit 78
fi

# Follow the symlink back to .scripts/cl.sh, then start at the checkout root.
script=$(readlink -f -- "$0")
cd "$(dirname "$(dirname "$script")")"

# `--agent` applies the definition's model and not its effort, so the effort
# is read from the definition's frontmatter and passed explicitly.
definition=.claude/agents/$agent.md
effort=$(awk '
  NR == 1 { if ($0 != "---") exit; next }
  $0 == "---" { exit }
  /^effort:/ { sub(/^effort:[ \t]*/, ""); sub(/[ \t\r]+$/, ""); print; exit }
' "$definition" 2>/dev/null) || effort=

if [ -z "$effort" ]; then
  echo "$definition declares no effort." >&2
  exit 78
fi

if [ "$init" = true ]; then
  exec claude --agent "$agent" --effort "$effort" --name "$name"
else
  exec claude --agent "$agent" --effort "$effort" --resume "$name"
fi
