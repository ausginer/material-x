#!/usr/bin/env bash
# Mutations of the checkbox's token packages and extension graph. Each removes
# one exact text from the working tree's module, runs the spec file in Chromium,
# prints the failing rows, and restores the module. Usage, from the repository
# root: mutate.sh <name>...
set -uo pipefail
mx=packages/material-x
utils=$mx/src/checkbox/styles/utils.ts
tokens=$mx/src/checkbox/styles/default/tokens.ts
saved="$(mktemp -d)"
cp "$utils" "$tokens" "${saved:?}/"
restore() {
  cp "${saved:?}/utils.ts" "$utils"
  cp "${saved:?}/tokens.ts" "$tokens"
}
trap 'restore; rm -rf "${saved:?}"' EXIT

# remove <file> <text>: deletes <text>, which must occur exactly once.
remove() {
  python3 -I -c '
import sys
path, text = sys.argv[1], sys.argv[2]
source = open(path).read()
if source.count(text) != 1:
    sys.exit(f"{path}: {source.count(text)} matches")
open(path, "w").write(source.replace(text, ""))
' "$1" "$2"
}

append() { # append <state> <token>: the text of one by-name append
  printf "    .append('%s', {\n      '%s': \`\${SET_NAME}.%s.%s\`,\n    })\n" "$1" "$2" "$1" "$2"
}

apply() {
  case "$1" in
    no-uhover-outline) remove "$tokens" "$(append unselected.hover outline.color)" ;;
    no-ufocus-outline) remove "$tokens" "$(append unselected.focus outline.color)" ;;
    no-upressed-outline) remove "$tokens" "$(append unselected.pressed outline.color)" ;;
    no-outline-appends) apply no-uhover-outline && apply no-ufocus-outline && apply no-upressed-outline ;;
    no-udisabled-outline) remove "$tokens" "$(append unselected.disabled outline.color)" ;;
    no-sdisabled-icon) remove "$tokens" "$(append selected.disabled icon.color)" ;;
    sel-hover-no-uhover) remove "$utils" "
      unselectedHover," ;;
    sel-pressed-no-upressed) remove "$utils" "
      unselectedPressed," ;;
    *) echo "unknown mutation $1"; return 1 ;;
  esac
}

for name in "$@"; do
  echo "== $name"
  if apply "$name"; then
    log="$(cd "$mx" && aube exec just test --browser=chromium tests/checkbox/checkbox.spec.browser.test.ts 2>&1)"
    sed 's/\x1b\[[0-9;]*m//g' <<<"$log" | grep -E '^ +(×|✗) |^ +Tests |AssertionError|Error: ' | sed 's/^ */  /'
  fi
  restore
done
