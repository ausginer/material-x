#!/usr/bin/env bash
# Run from the repository root: .plan/reviews/axe-checks-1/probes/icon-names.sh
# Runs icon-names.browser.test.ts.txt in Chromium on this branch's icon, then
# with RF-137's (6083534cf: icon.ts, icon.ctr.css, split-button.tpl.html). Removes the copy and restores the icon.
set -euo pipefail
icon=packages/material-x/src/icon
copy=packages/material-x/tests/zz-review-icon-names.browser.test.ts
split=packages/material-x/src/button/split-button.tpl.html
restore() { git checkout -- "${icon:?}/icon.ts" "${icon:?}/styles/icon.ctr.css" "${split:?}"; rm -f "${copy:?}"; }
trap restore EXIT
cp .plan/reviews/axe-checks-1/probes/icon-names.browser.test.ts.txt "$copy"
run() { (cd packages/material-x && NO_COLOR=1 MX_TEST_ENGINES=chromium aube exec vitest run -c vitest.config.ts --silent=false tests/zz-review-icon-names 2>&1 | grep -o 'ICON .*' | sed 's/^ICON /  /'); }
echo "## this branch's icon"; run
git show 6083534cf:"$icon/icon.ts" > "$icon/icon.ts"
git show 6083534cf:"$icon/styles/icon.ctr.css" > "$icon/styles/icon.ctr.css"
git show 6083534cf:"$split" > "$split"
echo "## RF-137's icon"; run
