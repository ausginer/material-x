#!/usr/bin/env bash
# P43: checks trimmed.ts and p43-shared-key.ts alone with TypeScript 7 (`tsc`)
# and 6 (`tsc6`), under last-wins/tsconfig.json.
# Run from the repository root: .plan/trait-decorators-1/probes/types/last-wins/run-p43.sh
set -u
here="$(cd "$(dirname "$0")" && pwd)"
bin="$(cd "${here:?}/../../../../.." && pwd)/node_modules/.bin"
cd "${here:?}"
for probe in trimmed p43-shared-key; do
  config=".tsconfig.${probe}.json"
  printf '{"extends":"./tsconfig.json","files":["%s.ts"],"compilerOptions":{"outDir":"out/%s"}}\n' \
    "${probe}" "${probe}" > "${config}"
  for tsc in tsc tsc6; do
    echo "=== last-wins/${probe} — $("${bin}/${tsc}" -v)"
    "${bin}/${tsc}" -p "${config}" --pretty false
    echo "exit $?"
  done
  rm -f "${config}"
done
rm -rf "${here:?}/out"
