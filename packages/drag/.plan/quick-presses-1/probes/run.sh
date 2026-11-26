#!/usr/bin/env bash
# run.sh <copies> <project> [vitest args]: copies the probe into tests/ that many
# times, runs them in one engine's project, and removes the copies.
set -uo pipefail
cd "$(dirname "$0")/../../.."
copies=${1:?}; project=${2:?}; shift 2
trap 'rm -f tests/zz-quick-*.browser.test.ts' EXIT
for ((i = 0; i < copies; i++)); do
  cp .plan/quick-presses-1/probes/quick-presses.browser.test.ts.txt "tests/zz-quick-$i.browser.test.ts"
done
echo "load before: $(cat /proc/loadavg)"
export MX_TEST_ENGINES=${project##*/}
aube exec vitest run -c vitest.config.ts --project "$project" zz-quick "$@" 2>&1 | sed 's/\x1b\[[0-9;]*m//g'
echo "load after: $(cat /proc/loadavg)"
