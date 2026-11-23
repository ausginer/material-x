#!/usr/bin/env bash
# One mutation of slot e's material-x sources or elevation test, the elevation
# rows in three engines, then every touched file restored from HEAD.
set -uo pipefail
cd /workspaces/worktrees/e/packages/material-x
name="${1:?}"; out="${2:?}"
E=src/core/styles/elevation/tokens.ts; FT=src/fab/styles/default/tokens.ts; FA=src/fab/fab.ts
BT=src/button/styles/default/tokens.ts; T=tests/core/elevation.spec.browser.test.ts
trap 'git checkout HEAD -- "$E" "$FT" "$FA" "$BT" "$T"' EXIT
m1() {
  sed -i "s/'default-shadow-color': 'md.sys.color.shadow'/'shadow-color': 'md.sys.color.shadow'/" "$E"
  perl -0pi -e "s/CSSVariable\.ref\(\n\s*'shadow-color',\n\s*CSSVariable\.ref\('default-shadow-color'\),\n\s*\)/CSSVariable.ref('shadow-color')/" "$E"
}
case "$name" in
  head) ;;
  m1-default-only) m1 ;;
  mF-fab-no-own-colour) sed -i "/'shadow.color': CSSVariable.ref('container.shadow-color'),/d" "$FT" ;;
  mB-button-no-own-colour) sed -i "/'shadow.color': CSSVariable.ref('container.shadow-color'),/d" "$BT" ;;
  m1-plus-fab-adopts-elevation-last)
    m1
    perl -0pi -e 's/\[\n(\s*)elevationStyles,\n(\s*focusStyles,\n\s*defaultStyles,\n\s*colorStyles,\n\s*sizeStyles,\n\s*tonalStyles,\n\s*extendedStyles,\n)/[\n$2$1elevationStyles,\n/' "$FA" ;;
  mL-link-item-red)
    perl -0pi -e "s/(item\.style\.setProperty\('--_level', '1'\);\n)/\$1    item.style.setProperty('--_shadow-color', 'rgb(255, 0, 0)');\n/" "$T" ;;
  *) echo "unknown $name"; exit 2 ;;
esac
{ echo "# mutation: $name"; git diff -- "$E" "$FT" "$FA" "$BT" "$T"
  MX_TEST_ENGINES=chromium,firefox,webkit timeout 600 aube exec vitest run -c vitest.config.ts --project 'spec*' "$T" 2>&1 \
    | sed 's/\x1b\[[0-9;]*m//g' | grep -E '^ FAIL|Tests  ' | sort -u ; } > "$out" 2>&1
