#!/usr/bin/env bash
# RF-55's task 4, as amended: the traits plugin's node test
# (tests/emit.node.test.ts) against five mutations of `src/plugin.ts`, one per
# branch of the check. Each mutation is applied to the source, the test runs,
# and the source is restored from a copy.
#
# Usage: emit-mutations.sh <empty scratch directory>, from the repository root.
set -uo pipefail
S="$(realpath "${1:?scratch directory}")"
P="$PWD/packages/vite-traits-plugin"
cp "${P:?}/src/plugin.ts" "${S:?}/plugin.ts"

mutate() {
  local name="${1:?}" from="${2:?}" to="${3:?}"
  echo "== $name"
  sed -i "s/${from:?}/${to:?}/" "${P:?}/src/plugin.ts"
  if cmp -s "${P:?}/src/plugin.ts" "${S:?}/plugin.ts"; then
    echo '  the mutation did not apply'
  else
    (cd "${P:?}" && aube exec just test tests/emit.node.test.ts 2>&1) \
      | grep -E '×|Tests ' | sed -e 's/ [0-9]*ms$//' -e 's/^ */  /'
  fi
  cp "${S:?}/plugin.ts" "${P:?}/src/plugin.ts"
}

echo '== unmutated'
(cd "${P:?}" && aube exec just test tests/emit.node.test.ts 2>&1) \
  | grep -E 'Tests ' | sed 's/^ */  /'
mutate 'the version decides where the host offers a magic string' \
  '? magic === meta.magicString' '? rolldownVersion === VERSION'
mutate 'never native' "kind !== 'serve' \&\&$" 'false \&\&'
mutate 'any host magic string is edited' \
  'return host instanceof RolldownMagicString' 'return host'
mutate 'a host that offers none always gets a string' \
  ': rolldownVersion === VERSION);' ': false);'
mutate 'a host that offers none is always native' \
  ': rolldownVersion === VERSION);' ': true);'
