#!/usr/bin/env bash
set -euo pipefail

if [ -z "$WORKSPACE_DIR" ]; then
  echo "workspace folder was not set"
  exit 0
fi

# Installs the Chromium build that the locked `playwright` package pins, which
# is the one engine local runs use. Firefox and Safari run in CI, and visual runs
# only there, where its baselines are recorded (`repo:RD-13`). No WebKit is
# installed: CI runs Safari itself, and nothing runs Playwright's WebKit
# (`repo:RD-12`).
# `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD` keeps `npm ci` from downloading browsers,
# so this is where Chromium comes from. Installing is a no-op when the build is
# already in Playwright's cache.

PLAYWRIGHT="$WORKSPACE_DIR/node_modules/.bin/playwright"

if [ ! -x "$PLAYWRIGHT" ]; then
  echo "playwright is not installed yet: run npm ci, then npx playwright install chromium"
  exit 0
fi

"$PLAYWRIGHT" install chromium
