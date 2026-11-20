#!/usr/bin/env bash
# RF-55's task R1: material-x's `publint` recipe lints the tarball that
# `aube pack` writes. For a pass and for a failure, it reports the recipe's
# output and exit status, whether the output mentions `npm pack`, and what the
# recipe left in its temp directory.
#
# The recipe takes its temp directory from `mktemp -d`, so each run gets an
# empty TMPDIR of its own, and whatever is left in it afterwards is what the
# recipe didn't remove. The failure deletes `button/button.js`, which the
# manifest's `exports` names, from the built output, and restores it after.
#
# Usage: publint-recipe.sh <empty scratch directory>
# Run from the repository root after `aube exec just build` in
# packages/material-x.
set -uo pipefail
S="$(realpath "${1:?scratch directory}")"
PACKAGE="$PWD/packages/material-x"
EXPORTED='button/button.js'

run() {
  local name="${1:?}"
  local tmp="${S:?}/${name:?}-tmp"
  mkdir -p "${tmp:?}"
  echo "== $name"
  (cd "${PACKAGE:?}" && TMPDIR="${tmp:?}" aube run publint) > "${S:?}/${name:?}.log" 2>&1
  echo "exit: $?"
  sed 's|^|  |' "${S:?}/${name:?}.log"
  if grep -q 'npm pack' "${S:?}/${name:?}.log"; then
    echo "mentions npm pack: yes"
  else
    echo "mentions npm pack: no"
  fi
  echo "left in TMPDIR: $(find "${tmp:?}" -mindepth 1 | wc -l) entries"
}

run pass

mv "${PACKAGE:?}/${EXPORTED:?}" "${S:?}/exported.js"
run missing-export
mv "${S:?}/exported.js" "${PACKAGE:?}/${EXPORTED:?}"

run restored
