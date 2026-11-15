#!/usr/bin/env bash
set -uo pipefail
S="${S:?set S to a scratch directory that holds copy/ and the input test files}"
C="${S:?}/copy"
W=packages/drag/.plan/probes/drag2-guarantees
OUT="$S/out"; mkdir -p "$OUT"
run() { # id diff projects files...
  local id=$1 diff=$2 projects=$3; shift 3
  cd "$C"
  if [ -n "$diff" ]; then git apply "$diff" || { echo "$id: APPLY FAILED" >> "$OUT/summary"; return; }; fi
  (cd packages/drag && npx just test $projects "$@") > "$OUT/$id.raw" 2>&1
  echo "$id exit=$?" >> "$OUT/summary"
  git checkout -q -- . ; git clean -fdq -e node_modules >/dev/null 2>&1
  [ -z "$(git status --porcelain)" ] || echo "$id: TREE DIRTY" >> "$OUT/summary"
}
: > "$OUT/summary"
BC="--project browser --project consumer"
run base-ygeo "" "$BC" tests/y-geometry.browser.test.ts tests/refusals.browser.test.ts
run base-src "" "--project browser" tests/keyboard.browser.test.ts tests/sortable.browser.test.ts tests/landing.browser.test.ts tests/free-drag.browser.test.ts tests/coordinates.browser.test.ts tests/layout-animation.browser.test.ts
run S2-3 "$W/mutations/S2-3.diff" "$BC" tests/y-geometry.browser.test.ts
run refusal-instanceof "$W/witnesses/refusal-instanceof.diff" "$BC" tests/refusals.browser.test.ts
run S4-target-only "$W/witnesses/S4-target-only.diff" "--project browser" tests/keyboard.browser.test.ts
run S8-visual-first "$W/witnesses/S8-visual-first.diff" "--project browser" tests/sortable.browser.test.ts
run F4-null-viewport "$W/witnesses/F4-null-viewport.diff" "--project browser" tests/free-drag.browser.test.ts
run F5-no-activation "$W/witnesses/F5-no-activation.diff" "--project browser" tests/coordinates.browser.test.ts
run S1-late-revert "$W/witnesses/S1-late-revert.diff" "--project browser" tests/landing.browser.test.ts
run S1-settle-uncaught "$W/witnesses/S1-settle-uncaught.diff" "--project browser" tests/landing.browser.test.ts
run S6-7 "$W/mutations/S6-7.diff" "--project browser" tests/layout-animation.browser.test.ts
run F8-one-entry "$W/witnesses/F8-one-entry.diff" "--project node" tests/consumer-types.node.test.ts

runin() { # id diff projects inputfile target
  local id=$1 diff=$2 projects=$3 input=$4 target=$5
  cd "$C"; git apply "$diff" || { echo "$id: APPLY FAILED" >> "$OUT/summary"; return; }
  cp "$S/$input" "packages/drag/tests/$target"
  (cd packages/drag && npx just test $projects "tests/$target") > "$OUT/$id.raw" 2>&1
  echo "$id exit=$?" >> "$OUT/summary"
  git checkout -q -- . ; git clean -fdq >/dev/null 2>&1
  [ -z "$(git status --porcelain)" ] || echo "$id: TREE DIRTY" >> "$OUT/summary"
}
runin F8-one-entry-input "$W/witnesses/F8-one-entry.diff" "--project node" input-consumer-types.node.test.ts consumer-types.node.test.ts
runin S1-late-revert-input "$W/witnesses/S1-late-revert.diff" "--project browser" input-landing.browser.test.ts landing.browser.test.ts
runin S8-visual-first-input "$W/witnesses/S8-visual-first.diff" "--project browser" input-sortable.browser.test.ts sortable.browser.test.ts
echo DONE >> "$OUT/summary"
