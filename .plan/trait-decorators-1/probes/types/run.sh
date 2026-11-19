#!/usr/bin/env bash
# Type-checks each probe alone with TypeScript 7 (`tsc`) and 6 (`tsc6`), and
# prints the declarations TypeScript 7 emits for the probes that compile.
# Run from the repository root: .plan/trait-decorators-1/probes/types/run.sh
set -u
here="$(cd "$(dirname "$0")" && pwd)"
bin="$(cd "${here:?}/../../../.." && pwd)/node_modules/.bin"
cd "${here:?}"
for probe in p1-decorator-only p2-decorator-interface p2-typed-marker p6-member-kinds p9-brand-props p9b-brand-forms p10-today-own-field p11-type-argument p12-instance-arguments p13-attribute-forms p14-read-only p16-interface-accessors p17-sketch-as-is p18-sketch-fixed p19-sketch-groups p20-rust-like p21-class-instanceof p23-layer-a-naming p24-layer-a-traits p25-layer-a-form \
  p3-interface-only p4-impl-class p5-attribute-accessor; do
  config=".tsconfig.${probe}.json"
  # The sketch's probes import core's attribute.ts, outside this directory.
  case "${probe}" in
    p17-* | p18-* | p19-* | p20-*) root=',"rootDir":"../../../.."' ;;
    *) root='' ;;
  esac
  printf '{"extends":"./tsconfig.json","files":["%s.ts"],"compilerOptions":{"outDir":"out/%s"%s}}\n' \
    "${probe}" "${probe}" "${root}" > "${config}"
  for tsc in tsc tsc6; do
    echo "=== ${probe} — $("${bin}/${tsc}" -v)"
    "${bin}/${tsc}" -p "${config}" --pretty false
    echo "exit $?"
  done
  rm -f "${config}"
done
# The owner's _example4.ts and its fixed version, with core's real
# ControlledElement, under example4/tsconfig.json (experimentalDecorators).
for probe in traits/_example4 traits/fixed p27-example4-as-is p28-example4-fixed; do
  name="${probe##*/}"
  config="example4/.tsconfig.${name}.json"
  printf '{"extends":"./tsconfig.json","files":["%s.ts"],"compilerOptions":{"outDir":"out/%s"}}\n' \
    "${probe}" "${name}" > "${config}"
  for tsc in tsc tsc6; do
    echo "=== example4/${probe} — $("${bin}/${tsc}" -v)"
    "${bin}/${tsc}" -p "${config}" --pretty false
    echo "exit $?"
  done
  rm -f "${config}"
done
echo "=== p1-decorator-only with experimentalDecorators — $("${bin}/tsc" -v)"
"${bin}/tsc" -p tsconfig.experimental.json --pretty false
echo "exit $?"
for probe in p2-decorator-interface p3-interface-only p6-member-kinds p9-brand-props p11-type-argument p13-attribute-forms p14-read-only p16-interface-accessors p25-layer-a-form; do
  echo "=== emitted out/${probe}/${probe}.d.ts"
  cat "out/${probe}/${probe}.d.ts" 2>/dev/null || echo '(none)'
done
for name in _example4 fixed; do
  echo "=== emitted example4/out/${name}/…/traits/${name}.d.ts"
  cat "example4/out/${name}/.plan/trait-decorators-1/probes/types/example4/traits/${name}.d.ts" 2>/dev/null || echo '(none)'
done
rm -rf "${here:?}/out" "${here:?}/out-exp" "${here:?}/example4/out"
