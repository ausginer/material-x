#!/usr/bin/env bash
# P45: checks the `@trait` decorator's type with TypeScript 7 (`tsc`) and 6
# (`tsc6`) under the trait probes' options (isolatedDeclarations,
# erasableSyntaxOnly, standard decorators): valid.ts with the declarations
# each compiler emits, then invalid.ts; then (h) where oxc-parser places the
# decorator, and how oxfmt prints `export @trait class`.
# Run from the repository root: .plan/trait-decorator-1/probes/run-p45.sh
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
      cat "out/${probe}/${probe}.d.ts"
    fi
    rm -rf "${here:?}/out"
  done
  rm -f "${config}"
done
echo "=== (h) oxc-parser"
node ast.ts
echo "=== (h) oxfmt"
printf 'export @trait class A extends B {}\n' | "${bin}/oxfmt" --stdin-filepath x.ts
