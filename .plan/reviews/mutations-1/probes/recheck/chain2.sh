#!/bin/bash
# The recheck's tool runs again with a short TMPDIR, so that Chromium's SingletonSocket path fits: the recheck's file,
# and the two witnesses of the implementer's file that the long TMPDIR voided. Usage: chain2.sh <scratch dir>
S="${1:?}"
T=$(mktemp -d /tmp/mxr.XXXX)
cd /workspaces/worktrees/e || exit 1
run() { # $1 label, $2 file, then --only options
  local label=$1 file=$2; shift 2
  local t0=$(date +%s)
  TMPDIR=$T node packages/mutator/src/cli.ts run "$file" --ref HEAD "$@" --report "$S/$label.json" --summary "$S/$label.md" > /dev/null 2> "$S/$label.log"
  echo "$label: exit $? in $(( $(date +%s) - t0 ))s; TMPDIR $T: [$(ls "$T" | tr '\n' ' ')]; worktrees: $(git worktree list | wc -l); status: [$(git status --porcelain | tr '\n' ' ')]"
}
run recheck-2 .plan/reviews/mutations-1/recheck.mutations.ts
run implementer-2 "$S/impl/mutator-3.mutations.ts" --only "an engine's environment doesn't reach Vitest" --only "nothing is read as expected"
rm -rf "${T:?}"
