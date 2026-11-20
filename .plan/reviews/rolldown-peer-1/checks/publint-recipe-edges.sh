#!/usr/bin/env bash
# Edge cases of material-x's `publint` recipe (`repo:RF-55` task R1). Each case
# runs `just publint` in packages/material-x with an empty TMPDIR of its own,
# and with a shim first on PATH in place of `aube` or `mktemp`:
#
# - zero: `aube pack` exits 0 and writes no tarball;
# - two: `aube pack` writes two tarballs, copies of a real one;
# - pack-fails: `aube pack` exits 3;
# - tmpdir-unusable: TMPDIR is a regular file, and `aube` only records its call;
# - mktemp-fails: `mktemp` exits 1 with no output, and `aube` only records its
#   call.
#
# For each case it reports the exit status, the output, whether the output
# mentions `npm pack`, and what is left in the case's TMPDIR. It runs no npm.
#
# Usage: publint-recipe-edges.sh <worktree> <empty scratch directory>
# Run after `aube exec just build` at the worktree's root.
set -uo pipefail
WT="$(realpath "${1:?worktree}")"
S="$(realpath "${2:?scratch directory}")"
PKG="${WT:?}/packages/material-x"
BIN="${WT:?}/node_modules/.bin"

mkdir -p "${S:?}/real"
(cd "${PKG:?}" && aube pack --ignore-scripts --pack-destination "${S:?}/real" > /dev/null)
TGZ="$(find "${S:?}/real" -name '*.tgz')"
echo "real tarballs: $(find "${S:?}/real" -name '*.tgz' | wc -l) ($(basename "${TGZ:?}"))"

shim() { # case, command, body
  mkdir -p "${S:?}/shim-${1:?}"
  printf '#!/usr/bin/env bash\n%s\n' "${3:?}" > "${S:?}/shim-${1:?}/${2:?}"
  chmod +x "${S:?}/shim-${1:?}/${2:?}"
}
# The recipe calls `aube pack --ignore-scripts --pack-destination <dir>`.
shim zero aube 'exit 0'
shim two aube "cp '${TGZ:?}' \"\$4/a-0.1.0.tgz\"; cp '${TGZ:?}' \"\$4/b-0.1.0.tgz\""
shim pack-fails aube 'echo "shim: aube pack fails" >&2; exit 3'
shim tmpdir-unusable aube 'echo "shim: aube $* ran" >&2'
shim mktemp-fails aube 'echo "shim: aube $* ran" >&2'
shim mktemp-fails mktemp 'echo "shim: mktemp $* fails" >&2; exit 1'

run() { # case, TMPDIR
  local name="${1:?}" tmp="${2:?}"
  echo "== $name"
  (cd "${PKG:?}" && TMPDIR="${tmp:?}" PATH="${S:?}/shim-${name:?}:${BIN:?}:$PATH" just publint) \
    > "${S:?}/${name:?}.log" 2>&1
  echo "exit: $?"
  sed 's|^|  |' "${S:?}/${name:?}.log"
  if grep -q 'npm pack' "${S:?}/${name:?}.log"; then
    echo "mentions npm pack: yes"
  else
    echo "mentions npm pack: no"
  fi
}

for name in zero two pack-fails mktemp-fails; do
  mkdir -p "${S:?}/${name:?}-tmp"
  run "${name:?}" "${S:?}/${name:?}-tmp"
  echo "left in TMPDIR: $(find "${S:?}/${name:?}-tmp" -mindepth 1 | wc -l) entries"
done

: > "${S:?}/tmpdir-is-a-file"
run tmpdir-unusable "${S:?}/tmpdir-is-a-file"
