#!/usr/bin/env bash
# Run from the repository root: .plan/reviews/axe-checks-1/probes/with-rf137.sh <engine> <report>
# RD-57's feature proof: RF-137's icon (material-x/icon-name-1 at 6083534cf,
# icon.ts and icon.ctr.css) on this branch, the axe file with and without the
# sortable list's name for a handle. Restores both files.
set -euo pipefail
engine=${1:?}
report=${2:?}
icon=packages/material-x/src/icon
sortable=packages/material-x/src/list/sortable-item.ts
restore() { git checkout -- "${icon:?}/icon.ts" "${icon:?}/styles/icon.ctr.css" "${sortable:?}"; }
trap restore EXIT
git show 6083534cf:"$icon/icon.ts" > "$icon/icon.ts"
git show 6083534cf:"$icon/styles/icon.ctr.css" > "$icon/styles/icon.ctr.css"
run() {
  (cd packages/material-x && NO_COLOR=1 MX_TEST_ENGINES="$engine" aube exec vitest run -c vitest.config.ts --reporter=json --outputFile="$report" tests/axe.browser >/dev/null 2>&1 || true)
  node -e 'const r=require(process.argv[1]);console.log(`${r.numFailedTests} failed, ${r.numPassedTests} passed`);for(const f of r.testResults)for(const a of f.assertionResults)if(a.status==="failed")console.log(`   ${a.fullName}\n     ${a.failureMessages[0].split("\n")[0]}`)' "$report"
}
echo "## RF-137's icon | $engine"; run
sed -i "s/claim(handle, handleOwned, 'aria-label', 'Reorder');//" "$sortable"
echo "## RF-137's icon, and the sortable list doesn't name a handle | $engine"; run
