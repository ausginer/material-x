#!/bin/bash
# The mutations that the package's rows don't see, read by behaviour.browser.test.ts in Chromium. From packages/material-x.
set -u
P=../../.plan/reviews/disabled-item-1/probes
I=src/list/sortable-item.ts
L=src/list/sortable-list.ts
cp "$P/behaviour.browser.test.ts.txt" tests/list/zz-proof.browser.test.ts
trap 'git checkout -q -- src/list; rm -f tests/list/zz-proof.browser.test.ts' EXIT
run() {
  echo "## $1"
  git diff --stat -- src/list | tail -1
  node "$P/run.mjs" chromium tests/list/zz-proof 'P2 the page|P2 life|P5 mx-list-button-item span' | grep -v '^ok\|^read'
  git checkout -q -- src/list
}
run 'no mutation'
sed -i "/^    'aria-disabled',$/d" "$I"; run "aria-disabled isn't watched"
sed -i '/state.disconnect();/d' "$I"; run 'the state observer is never disconnected'
sed -i "s/element!.style.touchAction === 'none'/true/" "$I"; run "a page's touch-action is removed"
sed -i 's/^        dragged = item as ControlledElement;$/&if (isDisabled(item)) controller?.requestCancel();/' "$L"; run 'a press whose item is disabled before the lift is canceled'
