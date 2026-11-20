#!/usr/bin/env bash
# RF-55's task 4: which path the two plugins take in material-x's own build
# hosts. material-x's build runs tsdown, which loads `viteTraitsPlugin()` for
# the library (.scripts/tsdown-library.ts) and `constructCSSTokens({ isProd:
# true })` for the components (.scripts/tsdown-component.ts). Its Storybook
# build runs Vite, which loads both (.scripts/vite-config.ts).
#
# The script instruments the two built plugins in place: each return of a
# changed module appends a line to a log, naming the plugin, the traits
# plugin's build kind, the path, `native` (a magic string) or `string`, and
# whether the host's binding class or its rolldown version decided it. It runs
# material-x's `just build` and `just docs-build`, counts the lines per host,
# and restores both built files.
#
# Usage: host-path-witness.sh <empty scratch directory>, from the repository
# root, after `aube exec just build`.
set -euo pipefail
S="$(realpath "${1:?scratch directory}")"
TRAITS="$PWD/packages/vite-traits-plugin/index.js"
ASSETS="$PWD/packages/vite-custom-element-assets/index.js"
cp "${TRAITS:?}" "${S:?}/traits.js"
cp "${ASSETS:?}" "${S:?}/assets.js"
restore() {
  cp "${S:?}/traits.js" "${TRAITS:?}"
  cp "${S:?}/assets.js" "${ASSETS:?}"
}
trap restore EXIT

LOG='process.getBuiltinModule("node:fs").appendFileSync(process.env.MX_PATH_LOG'
TRAITS_CHECK='kind !== "serve" \&\& (meta \&\& "magicString" in meta ? magic === meta.magicString : rolldownVersion === VERSION)'
BY='${meta \&\& "magicString" in meta ? "by binding" : "by version"}'
sed -i "s|^\(\t*\)return ${TRAITS_CHECK} ?|\1${LOG}, \`traits \${kind} \${${TRAITS_CHECK} ? \"native\" : \"string\"} ${BY}\\\\n\`);\n\1return ${TRAITS_CHECK} ?|" "${TRAITS:?}"
sed -i "s|^\(\t*\)return native ?|\1${LOG}, \`assets \${native ? \"native\" : \"string\"} \${offered ? \"by binding\" : \"by version\"}\\\\n\`);\n\1return native ?|" "${ASSETS:?}"
echo "instrumented returns: traits $(grep -c 'MX_PATH_LOG' "${TRAITS:?}"), assets $(grep -c 'MX_PATH_LOG' "${ASSETS:?}")"

for host in build docs-build; do
  : > "${S:?}/${host:?}.log"
  (cd packages/material-x && MX_PATH_LOG="${S:?}/${host:?}.log" aube exec just "${host:?}" > "${S:?}/${host:?}.out" 2>&1)
  echo "== material-x just $host: exit 0"
  sort "${S:?}/${host:?}.log" | uniq -c | sed 's/^ */  /'
done
