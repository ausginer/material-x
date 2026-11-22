#!/usr/bin/env bash
# RF-48 reading on aube 2.10.1. Runs each command that RF-48's widened decision
# names from a tree whose links are restored, lists node_modules/@ydinjs and
# node_modules/size-limit-preset-rolldown, then reverts the manifests and the
# lockfile and restores the links.
# Usage: rf48-reading.sh <aube-2.10.1-bin-dir>   (run from the checkout root)
set -u
BIN="${1:?aube bin dir}"
export PATH="${BIN:?}:$PATH"
# packageManager pins aube@2.10.0 with packageManagerStrict=error in .npmrc.
# This environment override lets 2.10.1 run without a tracked edit.
export npm_config_package_manager_strict=off

MANIFESTS=(package.json package-lock.json packages/material-x/package.json packages/tproc/package.json)

run() {
  echo "\$ $*"
  local t0=$SECONDS
  "$@" 2>&1
  local rc=$?
  echo "(exit $rc, $((SECONDS - t0)) s)"
  return $rc
}

listing() {
  run ls node_modules/@ydinjs
  local a=$?
  run ls -d node_modules/size-limit-preset-rolldown
  local b=$?
  return $((a || b))
}

state() {
  run git status --short --untracked-files=no
  run git diff --stat
}

edit_json() { # file, node expression on p
  node -e '
    const fs = require("fs"); const f = process.argv[1];
    const p = JSON.parse(fs.readFileSync(f, "utf8"));
    (new Function("p", process.argv[2]))(p);
    fs.writeFileSync(f, JSON.stringify(p, null, 2) + "\n");' "$1" "$2"
  echo "\$ (hand edit of $1: $2)"
}

restore() {
  run git checkout -- "${MANIFESTS[@]}"
  run git status --short --untracked-files=no
  run aube install
  if ! listing; then
    run aube install --frozen-lockfile --force
    listing
  fi
}

echo "## 0. The tool and the starting tree"
run aube --version
run git log --oneline -1
run aube install
listing
state

echo
echo "## 1. aube add -D -W of a mature package with no install script"
run aube add -D -W left-pad@1.3.0
state
listing
run aube install
listing
echo
echo "## 1, revert"
restore

echo
echo "## 2. aube remove of a root devDependency"
run aube remove just-safe-get
state
listing
run aube install
listing
echo
echo "## 2, revert"
restore

echo
echo "## 3. aube install --fix-lockfile after a peer edit"
edit_json packages/material-x/package.json 'p.peerDependencies["react-dom"] = "^19"; p.peerDependenciesMeta["react-dom"] = { optional: true };'
run aube install
state
listing
run aube install --fix-lockfile
state
listing
run aube install
listing
echo
echo "## 3, revert"
restore

echo
echo "## 4a. plain aube install after a hand edit of dependencies: a registry package"
edit_json packages/tproc/package.json 'p.dependencies["left-pad"] = "1.3.0";'
run aube install
state
listing
run aube install
listing
echo
echo "## 4a, revert"
restore

echo
echo "## 4b. plain aube install after a hand edit of dependencies: a workspace package"
edit_json packages/tproc/package.json 'p.dependencies["@ydinjs/core"] = "0.1.0";'
run aube install
state
listing
run aube install
listing
echo
echo "## 4b, revert"
restore

echo
echo "## 5. The tree after the reading"
run git status --short --untracked-files=no
listing
run aube store status
