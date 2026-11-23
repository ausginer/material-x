#!/usr/bin/env bash
# Applies one mutation to slot e's sources, runs the elevation rows and the probe
# in three engines, and restores the sources.
set -uo pipefail
# PROBES is this directory. The probe ran as
# tests/core/zz-rf77-probe.spec.browser.test.ts, a copy of
# rf77-rf78-probe.spec.browser.test.ts, removed after the runs.
cd /workspaces/worktrees/e/packages/material-x
name="${1:?}"; out="${2:?}"
E=src/core/styles/elevation/tokens.ts; L=src/list/styles/item/tokens.ts
restore() { git checkout HEAD -- "$E" "$L"; }
trap restore EXIT
case "$name" in
  head) ;;
  base) git checkout 4fd8b9a67 -- "$E" "$L" ;;
  m1-default-only)
    # The rejected alternative: the package sets --_shadow-color itself, to
    # md.sys.color.shadow, and the layers read it with no fallback. Level
    # scaling and the list token stay.
    sed -i "s/'default-shadow-color': 'md.sys.color.shadow'/'shadow-color': 'md.sys.color.shadow'/" "$E"
    perl -0pi -e "s/CSSVariable\.ref\(\n\s*'shadow-color',\n\s*CSSVariable\.ref\('default-shadow-color'\),\n\s*\)/CSSVariable.ref('shadow-color')/" "$E" ;;
  m2-no-list-token) sed -i "/'shadow.color': 'md.comp.list.reorder.list-item.shadow-color',/d" "$L" ;;
  m3-no-level-scale) sed -i 's/calc(min(${CSSVariable.ref(.level.)}, 1) \* ${percent}%)/${percent}%/' "$E" ;;
  m4-step) sed -i 's/min(${CSSVariable.ref(.level.)}, 1)/min(${CSSVariable.ref('"'"'level'"'"')} * 1000, 1)/' "$E" ;;
  m5-third) sed -i 's/min(${CSSVariable.ref(.level.)}, 1)/min(${CSSVariable.ref('"'"'level'"'"')} \/ 3, 1)/' "$E" ;;
  *) echo "unknown $name"; exit 2 ;;
esac
{
  echo "# mutation: $name"
  git diff -- "$E" "$L"
  node "${PROBES:?}/render.ts" "$PWD"
  MX_TEST_ENGINES=chromium,firefox,webkit timeout 600 aube exec vitest run -c vitest.config.ts --project 'spec*' \
    tests/core/elevation.spec.browser.test.ts tests/core/zz-rf77-probe.spec.browser.test.ts 2>&1 \
    | grep -E '^ (FAIL|❯ \|)|Test Files|Tests  |AssertionError|Error:' | sort -u
} > "$out" 2>&1
