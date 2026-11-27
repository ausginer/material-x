#!/bin/bash
# The recheck's tool runs, one after the other, from slot e at its head: the recheck's file, then the implementer's
# file with its engines widened to three. Each copy is the tool's own, in $S/tmp.
S="${1:?}"
mkdir -p "$S/tmp"
cd /workspaces/worktrees/e || exit 1
for pair in "recheck .plan/reviews/mutations-1/recheck.mutations.ts" "implementer $S/impl/mutator-3.mutations.ts"; do
  set -- $pair
  t0=$(date +%s)
  TMPDIR=$S/tmp node packages/mutator/src/cli.ts run "$2" --ref HEAD --report "$S/$1.json" --summary "$S/$1.md" > /dev/null 2> "$S/$1.log"
  echo "$1: exit $? in $(( $(date +%s) - t0 ))s; left in TMPDIR: [$(ls "$S/tmp")]; worktrees: $(git worktree list | wc -l); status: [$(git status --porcelain | tr '\n' ' ')]"
done
