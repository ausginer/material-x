#!/bin/bash
# RF-143, the ruling of 2026-11-26: the proof's cost probe in Chromium, this
# unit's sources and main's (2485fb2df) in turn, three times.
#   S=<scratch dir holding head's three sources under $S/head> ORDER="head main" cost-ends.sh
# with reviews/roving-hidden-1/probes/proof-cost.browser.test.ts.txt copied to
# packages/material-x/tests/button-group/proof-cost.browser.test.ts.
cd /workspaces/worktrees/g || exit 1
F="packages/core/src/controllers/useRovingTabindex.ts packages/material-x/src/button-group/connected-button-group.ts packages/material-x/src/button-group/styles/connected/main.styles.css"
swap() { if [ $1 = main ]; then for f in $F; do git show 2485fb2df:$f > $f; done; else for f in $F; do cp $S/head/$f $f; done; fi; (cd packages/core && aube exec just build >/dev/null 2>&1) || exit 1; }
for k in 1 2 3; do for v in $ORDER; do swap $v
  out=$(cd packages/material-x && MX_TEST_ENGINES=chromium NO_COLOR=1 timeout 200 aube exec -- vitest run -c vitest.config.ts tests/button-group/proof-cost.browser.test.ts 2>&1 | grep -E '^chromium (groups|split)' | sed 's/^chromium //' | tr '\n' ';')
  echo "$k $v load $(cut -d' ' -f1 /proc/loadavg) | $out"
done; done
swap head
