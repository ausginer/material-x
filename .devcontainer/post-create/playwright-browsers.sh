#!/usr/bin/env bash
set -euo pipefail

if [ -z "$WORKSPACE_DIR" ]; then
  echo "workspace folder was not set"
  exit 0
fi

# Installs the Chromium and Firefox builds that the locked `playwright` package
# pins. The tests start these builds and no other browser. WebKit isn't
# installed locally. `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD` keeps `npm ci` from
# downloading browsers, so this is where they come from. Installing is a no-op
# when the builds are already in Playwright's cache.

PLAYWRIGHT="$WORKSPACE_DIR/node_modules/.bin/playwright"

if [ ! -x "$PLAYWRIGHT" ]; then
  echo "playwright is not installed yet: run npm ci, then npx playwright install chromium firefox"
  exit 0
fi

"$PLAYWRIGHT" install chromium firefox
