#!/usr/bin/env bash
# Runs the checkbox spec file against the sheet that the checkbox's style
# modules compile at <commit>, with the working tree's token packages and rows,
# so each row reads the drawn color against the current oracle. Restores every
# module it replaces. Usage, from the repository root: witness.sh <commit>
set -euo pipefail
commit="${1:?commit}"
styles=packages/material-x/src/checkbox/styles
modules=("$styles/utils.ts" "$styles/default/tokens.ts" "$styles/default/main.css.ts")
saved="$(mktemp -d)"
restore() {
  for module in "${modules[@]}"; do
    cp "${saved:?}/$(basename "$module")" "$module"
  done
  rm -rf "${saved:?}"
}
trap restore EXIT
for module in "${modules[@]}"; do
  cp "$module" "${saved:?}/$(basename "$module")"
done

git show "$commit:$styles/utils.ts" > "$styles/utils.ts"
git show "$commit:$styles/default/tokens.ts" > "$styles/default/tokens.ts"
sheet="$(cd packages/material-x && node ../../.scripts/css/debug.ts src/checkbox/styles/default/main.css.ts)"
cp "${saved:?}/utils.ts" "$styles/utils.ts"
cp "${saved:?}/tokens.ts" "$styles/default/tokens.ts"

printf 'const styles: string = `%s`;\nexport default styles;\n' "$sheet" \
  > "$styles/default/main.css.ts"
(cd packages/material-x && aube exec just test-spec tests/checkbox/checkbox.spec.browser.test.ts) || true
