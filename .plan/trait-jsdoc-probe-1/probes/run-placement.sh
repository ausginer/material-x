#!/usr/bin/env bash
# Where oxc, TypeScript 6 and TypeScript 7 keep a trait's JSDoc, for each
# placement of the doc and the decorators. placement.ts prints the oxc and
# TypeScript 6 columns and writes each case; tsc 7 then emits declarations for
# each case. Run from the worktree root:
#   .plan/trait-jsdoc-probe-1/probes/run-placement.sh <scratchDir>
set -euo pipefail
D="${1:?scratchDir}"
bin="$(pwd)/node_modules/.bin"
rm -rf "${D:?}"
node .plan/trait-jsdoc-probe-1/probes/placement.ts --write "$D"
cd "$D"
cat > a.ts <<'TS'
export class Base {}
export function attributes(_table: object) {
  return (_value: unknown, _context: ClassDecoratorContext): void => {};
}
TS
printf 'export function trait(_value: unknown, _context: ClassDecoratorContext): void {}\n' > c.ts
echo
echo "tsc $("$bin/tsc" -v), declarations:"
for f in $(ls [0-9]*.ts | sort -n); do
  i="${f%.ts}"
  "$bin/tsc" --declaration --emitDeclarationOnly --target esnext --module esnext \
    --moduleResolution bundler --allowImportingTsExtensions \
    --rewriteRelativeImportExtensions --skipLibCheck --outDir out "$f" > /dev/null || true
  if grep -q 'The doc.' "out/$i.d.ts"; then echo "KEPT     $i"; else echo "DROPPED  $i"; fi
done
