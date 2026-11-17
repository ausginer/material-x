#!/usr/bin/env bash
set -euo pipefail

if [ -z "$WORKSPACE_DIR" ]; then
  echo "workspace folder was not set"
  exit 0
fi

# Installs Playwright's Chromium and WebKit builds, which the locked `playwright`
# package pins. Chromium is the one engine local runs use by default, and visual
# runs only in CI, where its baselines are recorded. WebKit launches where the
# development image carries its system libraries, and runs locally only with
# `MX_TEST_ENGINES=webkit` (`repo:RD-13` property 7, `repo:RD-12` property 8).
# `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD` keeps `aube install` from downloading
# browsers, so this is where Chromium and WebKit come from. Installing is a no-op
# when a build is already in Playwright's cache.

PLAYWRIGHT="$WORKSPACE_DIR/node_modules/.bin/playwright"

if [ ! -x "$PLAYWRIGHT" ]; then
  echo "playwright is not installed yet: run aube install, then aube exec playwright install chromium webkit"
  exit 0
fi

"$PLAYWRIGHT" install chromium webkit
