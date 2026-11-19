#!/usr/bin/env bash
# Type-checks each probe alone with TypeScript 7 (`tsc`) and 6 (`tsc6`), and
# prints the declarations TypeScript 7 emits for the probes that compile.
# Run from the repository root: .plan/trait-decorators-1/probes/types/run.sh
set -u
here="$(cd "$(dirname "$0")" && pwd)"
bin="$(cd "${here:?}/../../../.." && pwd)/node_modules/.bin"
cd "${here:?}"
for probe in p1-decorator-only p2-decorator-interface p2-typed-marker p6-member-kinds p9-brand-props p9b-brand-forms p10-today-own-field p11-type-argument p12-instance-arguments \
  p3-interface-only p4-impl-class p5-attribute-accessor; do
  config=".tsconfig.${probe}.json"
  printf '{"extends":"./tsconfig.json","files":["%s.ts"],"compilerOptions":{"outDir":"out/%s"}}\n' \
    "${probe}" "${probe}" > "${config}"
  for tsc in tsc tsc6; do
    echo "=== ${probe} — $("${bin}/${tsc}" -v)"
    "${bin}/${tsc}" -p "${config}" --pretty false
    echo "exit $?"
  done
  rm -f "${config}"
done
echo "=== p1-decorator-only with experimentalDecorators — $("${bin}/tsc" -v)"
"${bin}/tsc" -p tsconfig.experimental.json --pretty false
echo "exit $?"
for probe in p2-decorator-interface p3-interface-only p6-member-kinds p9-brand-props p11-type-argument; do
  echo "=== emitted out/${probe}/${probe}.d.ts"
  cat "out/${probe}/${probe}.d.ts" 2>/dev/null || echo '(none)'
done
rm -rf "${here:?}/out" "${here:?}/out-exp"
