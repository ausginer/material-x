#!/usr/bin/env bash
# Checks the mixin form's types with TypeScript 7 (`tsc`) and 6 (`tsc6`), under
# the trait probes' options (isolatedDeclarations, strict, noImplicitOverride),
# then mixin-declarations.ts again with isolatedDeclarations off, where a
# private member still fails declaration emit.
# Run from the repository root: .plan/trait-mixin-measure-1/probe/types/run-types.sh
set -u
here="$(cd "$(dirname "$0")" && pwd)"
bin="$(cd "${here:?}/../../../.." && pwd)/node_modules/.bin"
cd "${here:?}"
for probe in mixin-surface mixin-declarations; do
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
config=".tsconfig.emit.json"
printf '{"extends":"./tsconfig.json","files":["mixin-declarations.ts"],"compilerOptions":{"outDir":"out/emit","isolatedDeclarations":false}}\n' > "${config}"
for tsc in tsc tsc6; do
  echo "=== mixin-declarations, isolatedDeclarations off — $("${bin}/${tsc}" -v)"
  "${bin}/${tsc}" -p "${config}" --pretty false
  echo "exit $?"
done
rm -f "${config}"
rm -rf "${here:?}/out"
