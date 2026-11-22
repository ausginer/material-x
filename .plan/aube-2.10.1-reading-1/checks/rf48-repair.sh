#!/usr/bin/env bash
# The rule's repair on aube 2.10.1: after add and after remove, the forced
# frozen reinstall, with the manifest change kept, then the revert.
# Usage: rf48-repair.sh <aube-2.10.1-bin-dir>   (run from the checkout root)
set -u
BIN="${1:?aube bin dir}"
export PATH="${BIN:?}:$PATH"
export npm_config_package_manager_strict=off
run() { echo "\$ $*"; local t0=$SECONDS; "$@" 2>&1; local rc=$?; echo "(exit $rc, $((SECONDS - t0)) s)"; return $rc; }
listing() { run ls node_modules/@ydinjs; run ls -d node_modules/size-limit-preset-rolldown; }
summary() { echo "\$ $*  (summary line only)"; local t0=$SECONDS; "$@" > /tmp/.rf48-out.$$ 2>&1; local rc=$?; grep -E '✓|×|error' /tmp/.rf48-out.$$ | tail -1; rm -f /tmp/.rf48-out.$$; echo "(exit $rc, $((SECONDS - t0)) s)"; }
for step in add remove; do
  echo; echo "## 6.$step. The repair after aube $step"
  run git status --short --untracked-files=no
  listing
  if [ $step = add ]; then summary aube add -D -W left-pad@1.3.0; else summary aube remove just-safe-get; fi
  listing
  run aube install --frozen-lockfile --force
  run git status --short --untracked-files=no
  listing
  run git checkout -- package.json package-lock.json
  summary aube install
  listing
done
