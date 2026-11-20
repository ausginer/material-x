#!/usr/bin/env bash
# P48 follow-up: one tsdown --watch reading in packages/core. It edits checkable.ts's class doc,
# waits for it in the rebuilt declaration, reverts, and stops the watcher.
set -uo pipefail
W="${1:?worktree}" L="${2:?log}"
cd "${W:?}/packages/core"
cp src/traits/checkable.ts "$L.src"
aube exec tsdown --config tsdown.config.ts --watch > "$L" 2>&1 &
pid=$!
for _ in $(seq 1 60); do grep -q "Rebuilt in\|Build complete" "$L" && break; sleep 1; done
sed -i 's/boolean field\./boolean field, edited under watch./' src/traits/checkable.ts
seen=no
for i in $(seq 1 30); do if grep -q "edited under watch" traits/checkable.d.ts; then seen="yes after ${i}s"; break; fi; sleep 1; done
js=$(grep -c "edited under watch" traits/checkable.js 2>/dev/null)
cp "$L.src" src/traits/checkable.ts
for _ in $(seq 1 30); do grep -q "edited under watch" traits/checkable.d.ts || break; sleep 1; done
kill "$pid" 2>/dev/null; pkill -P "$pid" 2>/dev/null; wait "$pid" 2>/dev/null
echo "edited doc in checkable.d.ts: $seen; in checkable.js: $js; rebuilds logged: $(grep -c 'Rebuilt in' "$L")"
echo "after revert: $(grep -c 'edited under watch' traits/checkable.d.ts) edited lines left; source diff: $(git diff --stat -- src/traits/checkable.ts | tail -1)"
