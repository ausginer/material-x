#!/usr/bin/env bash
# pairs.sh <pairs> <project> [vitest args]: the probe's `first` row after a copy of
# the verdict suite, as CI orders the two files, beside `y-geometry` on the second
# page. Vitest orders files without a cached duration by size, the largest first,
# so each copy is padded to its place.
set -uo pipefail
cd "$(dirname "$0")/../../.."
pairs=${1:?}; project=${2:?}; shift 2
trap 'rm -f tests/zz-quick-*.browser.test.ts' EXIT
stamp=$(date +%s)
pad() { # source target size
  cp "$1" "$2"
  printf '/*%*s*/' "$(($3 - $(stat -c %s "$2")))" '' >> "$2"
}
for ((i = 0; i < pairs; i++)); do
  pad tests/verdict.browser.test.ts "tests/zz-quick-$stamp-$i-a.browser.test.ts" $((400000 - 2 * i))
  sed '/^  for (let i/,/^  }/d' .plan/quick-presses-1/probes/quick-presses.browser.test.ts.txt > /tmp/zz-quick-$$.ts
  pad /tmp/zz-quick-$$.ts "tests/zz-quick-$stamp-$i-b.browser.test.ts" $((399999 - 2 * i))
done
rm -f /tmp/zz-quick-$$.ts
echo "load before: $(cat /proc/loadavg)"
export MX_TEST_ENGINES=${project##*/}
aube exec vitest run -c vitest.config.ts --project "$project" zz-quick "$@" 2>&1 | sed 's/\x1b\[[0-9;]*m//g'
echo "load after: $(cat /proc/loadavg)"
