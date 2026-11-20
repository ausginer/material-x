#!/usr/bin/env bash
# P48: builds the packages at the implementer's head (eda3b1bfc) with and
# without the probe's load stage, and compares every built .js, .d.ts and map.
# Run from a worktree of repo/trait-decorator-1 at eda3b1bfc, after
# `aube install`, with this directory's load.ts copied to
# packages/vite-traits-plugin/src/p48-load.ts and ../../checks/p48-plugin-load.diff applied.
# The stage runs only when P48_LOAD=1. Usage: run.sh <worktree> <empty out dir>
set -euo pipefail
W="${1:?worktree}" O="${2:?out dir}"
cd "$W"
build() {
  P48_LOAD="$1" aube exec just build > "$O/build-$2.log" 2>&1
  mkdir -p "$O/$2"
  git ls-files --others --ignored --exclude-standard packages/core packages/material-x \
    | grep -v node_modules | grep -E '\.(js|d\.ts|map)$' > "$O/list-$2.txt"
  tar cf - -T "$O/list-$2.txt" | (cd "$O/$2" && tar xf -)
}
build 0 ref
build 1 stage
cmp -s "$O/list-ref.txt" "$O/list-stage.txt" && echo "same $(wc -l < "$O/list-ref.txt") files"
while read -r f; do cmp -s "$O/ref/$f" "$O/stage/$f" || echo "differs: $f"; done < "$O/list-ref.txt"
