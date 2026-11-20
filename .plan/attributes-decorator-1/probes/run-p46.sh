#!/usr/bin/env bash
# P46: checks the proposed `@attributes(TABLE)` decorator's type with
# TypeScript 7 (`tsc`) and 6 (`tsc6`) under the trait probes' options:
# valid.ts with the declarations each compiler emits, then invalid.ts; then how
# oxfmt prints the two decorators, and where oxc-parser puts them.
# Run from the repository root: .plan/attributes-decorator-1/probes/run-p46.sh
set -u
here="$(cd "$(dirname "$0")" && pwd)"
bin="$(cd "${here:?}/../../.." && pwd)/node_modules/.bin"
cd "${here:?}"
for probe in valid invalid; do
  config=".tsconfig.${probe}.json"
  printf '{"extends":"./tsconfig.json","files":["%s.ts"],"compilerOptions":{"outDir":"out/%s"}}\n' \
    "${probe}" "${probe}" > "${config}"
  for tsc in tsc tsc6; do
    echo "=== ${probe}.ts — $("${bin}/${tsc}" -v)"
    "${bin}/${tsc}" -p "${config}" --pretty false
    echo "exit $?"
    if [[ "${probe}" == valid ]]; then
      echo "--- ${probe}.d.ts"
      cat "out/${probe}/attributes-decorator-1/probes/${probe}.d.ts"
    fi
    rm -rf "${here:?}/out"
  done
  rm -f "${config}"
done
echo "=== oxfmt, both decorators above export class"
printf '@trait @attributes({ open: Bool }) export class A extends B { accessor open!: boolean; }\n' \
  | "${bin}/oxfmt" --stdin-filepath x.ts
echo "=== oxc-parser"
node ast.ts
