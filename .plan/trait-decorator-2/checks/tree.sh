#!/usr/bin/env bash
# Proof 4: compares the built files of @ydinjs/core and @ydinjs/material-x in
# two checkouts, each built with `aube exec just build` at its root. A built
# file is a git-ignored file outside node_modules and *.tsbuildinfo. A .js
# file is compared without its sourceMappingURL comment.
# Usage: tree.sh BASE HEAD
set -euo pipefail

BASE="${1:?usage: tree.sh BASE HEAD}"
HEAD="${2:?usage: tree.sh BASE HEAD}"

built() {
  git -C "${1:?}" ls-files --others --ignored --exclude-standard \
    packages/core packages/material-x |
    grep -vE '(^|/)node_modules/|\.tsbuildinfo$' | sort
}

strip() {
  case "$1" in
    *.js) grep -v '^//# sourceMappingURL=' "$1" || true ;;
    *) cat "$1" ;;
  esac
}

echo "## base $(git -C "${BASE}" rev-parse --short HEAD), head $(git -C "${HEAD}" rev-parse --short HEAD)"
diff <(built "${BASE}") <(built "${HEAD}") && echo "same $(built "${BASE}" | wc -l) built files in each"

echo "## files that differ (.js without sourceMappingURL)"
while read -r file; do
  if ! cmp -s <(strip "${BASE}/${file}") <(strip "${HEAD}/${file}"); then
    echo "${file}"
    case "${file}" in
      # A source map is one line of JSON: name the fields that differ.
      *.map) node -e '
        const [a, b] = process.argv.slice(1).map((f) => JSON.parse(require("node:fs").readFileSync(f, "utf8")));
        for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
          if (JSON.stringify(a[key]) !== JSON.stringify(b[key])) console.log(`    field ${key} differs`);
        }' "${BASE}/${file}" "${HEAD}/${file}" ;;
      *) diff <(strip "${BASE}/${file}") <(strip "${HEAD}/${file}") | sed 's/^/    /' || true ;;
    esac
  fi
done < <(built "${BASE}")

for tree in "${BASE}" "${HEAD}"; do
  echo "## bare imports of @ydinjs packages in material-x's .js, $(git -C "${tree}" rev-parse --short HEAD)"
  (cd "${tree}/packages/material-x" &&
    git ls-files --others --ignored --exclude-standard -- '*.js' |
    grep -v node_modules | sort |
      xargs grep -nE '^import "@ydinjs/' || true)
done
