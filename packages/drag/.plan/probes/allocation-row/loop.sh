#!/usr/bin/env bash
# Runs drag's hot-path file N times and keeps each log.
#   RUNS=<dir> loop.sh <label> <n> [vitest args...]
# With checks/probe.diff applied, the row prints a `PROBE {...}` line when vitest
# prints console output (`--silent=false`). The probe reads these variables:
#   VITE_PROBE_WARM=<moves>   the warm-up's length (300 when unset)
#   VITE_PROBE_RAW=1          the row's moves go through CDP, not Playwright's mouse
#   PROBE_JS_FLAGS='...'      extra V8 flags, such as '--trace-opt --trace-deopt'
#   PROBE_PROFILE_DIR=<dir>   stopHeapSampling saves each raw profile there
# V8's trace reaches the log only with DEBUG=pw:browser.
set -uo pipefail
label="${1:?}"; n="${2:?}"; shift 2
runs="${RUNS:?}"
cd "$(git rev-parse --show-toplevel)/packages/drag"
for i in $(seq 1 "$n"); do
  aube exec just test-engines tests/hot-path.browser.test.ts "$@" > "${runs:?}/${label:?}-$i.log" 2>&1
  echo "$label $i exit=$?"
done
