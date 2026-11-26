#!/bin/bash
# The implementer's 32 mutations and the second recheck's 5, at 0c38a4f7b, one engine at a time, each run in a
# short TMPDIR of its own. After each run: what it left in TMPDIR, the worktrees and the checkout's status.
set -u
W=/workspaces/worktrees/e
OUT=$W/.plan/reviews/mutations-1/checks/recheck-2
cd "$W" || exit 1
for engine in chromium firefox webkit; do
  for f in implementer:.plan/mutations-1/mutator.mutations.ts recheck:.plan/reviews/mutations-1/recheck-2.mutations.ts; do
    name=${f%%:*}; file=${f#*:}
    T="/tmp/mxe/${engine:?}-${name:?}"; rm -rf "${T:?}"; mkdir -p "$T"
    start=$(date +%s)
    TMPDIR=$T node packages/mutator/src/cli.ts run "$file" --ref 0c38a4f7b --engine "$engine" \
      --report "$OUT/$name-$engine.json" --summary "$OUT/$name-$engine.md" > /dev/null 2> "/tmp/mxe/$name-$engine.log"
    code=$?
    echo "$name $engine: exit $code, $(( $(date +%s) - start )) s, left in TMPDIR: [$(ls "$T" | tr '\n' ' ')], worktrees: $(git worktree list | wc -l), status: [$(git status --porcelain | tr '\n' ' ')]"
  done
done
