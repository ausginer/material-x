#!/usr/bin/env bash
# frame-focus.sh <engine> [file filters]: runs the control in one engine, with other files on
# the second page if given, then removes its copy.
set -uo pipefail
cd "$(dirname "$0")/../../.."
trap 'rm -f tests/zz-frame-focus.browser.test.ts' EXIT
cp .plan/quick-presses-1/probes/frame-focus.browser.test.ts.txt tests/zz-frame-focus.browser.test.ts
echo "engine $1, load before: $(cat /proc/loadavg)"
project=browser/$1; [[ $1 == chromium ]] && project=browser
MX_TEST_ENGINES=$1 aube exec vitest run -c vitest.config.ts --project "$project" zz-frame-focus "${@:2}" --reporter=verbose 2>&1 | sed 's/\x1b\[[0-9;]*m//g' | grep -E '^FRAME|Tests  |Error'
echo "load after: $(cat /proc/loadavg)"
