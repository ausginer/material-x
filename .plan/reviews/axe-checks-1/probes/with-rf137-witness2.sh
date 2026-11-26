#!/usr/bin/env bash
# Run from the repository root:
#   .plan/reviews/axe-checks-1/probes/with-rf137-witness2.sh <engine> <report>
# RD-57's feature proof. RF-137 (material-x/icon-name-1 at 6083534cf: icon.ts,
# icon.ctr.css and split-button.tpl.html) on this branch, then the axe file:
#   a. as it is;
#   b. without the fixtures' aria-hidden on their icons, which this unit's note
#      says is redundant once RF-137 lands;
#   c. as b, with the implementer's witness 2 (useARIA's call out of ButtonCore).
# Restores every file.
set -euo pipefail
engine=${1:?}
report=${2:?}
x=packages/material-x
files=("$x/src/icon/icon.ts" "$x/src/icon/styles/icon.ctr.css" "$x/src/button/split-button.tpl.html" "$x/tests/axe.browser.test.ts" "$x/src/button/ButtonCore.ts")
restore() { git checkout -- "${files[@]:?}"; }
trap restore EXIT
for f in "${files[@]:0:3}"; do git show 6083534cf:"$f" > "$f"; done
run() {
  (cd "$x" && NO_COLOR=1 MX_TEST_ENGINES="$engine" aube exec vitest run -c vitest.config.ts --reporter=json --outputFile="$report" tests/axe.browser >/dev/null 2>&1 || true)
  node -e 'const r=require(process.argv[1]);console.log(`${r.numFailedTests} failed, ${r.numPassedTests} passed`);for(const f of r.testResults)for(const a of f.assertionResults)if(a.status==="failed")console.log(`   ${a.fullName.replace(/^axe-core /, "")}\n     ${a.failureMessages[0].split("\n")[0]}`)' "$report"
}
echo "## a. RF-137 | $engine"; run
sed -i 's/<mx-icon aria-hidden="true">check<\/mx-icon>/<mx-icon>check<\/mx-icon>/; s/<mx-icon slot="icon" aria-hidden="true">check<\/mx-icon>/<mx-icon slot="icon">check<\/mx-icon>/' "$x/tests/axe.browser.test.ts"
grep -q "const ICON = '<mx-icon>check</mx-icon>';" "$x/tests/axe.browser.test.ts"
grep -q "const ICON_SLOT = '<mx-icon slot=\"icon\">check</mx-icon>';" "$x/tests/axe.browser.test.ts"
echo "## b. RF-137, the fixtures' icons not aria-hidden | $engine"; run
node -e 'const fs=require("fs");const f=process.argv[1];const s=fs.readFileSync(f,"utf8");const t=s.replace(/^\s*useARIA\([^;]*;\n/mu,"");if(t===s)throw new Error("no useARIA");fs.writeFileSync(f,t)' "$x/src/button/ButtonCore.ts"
echo "## c. as b, and useARIA's call out of ButtonCore (witness 2) | $engine"; run
