#!/usr/bin/env bash
# p4.sh <worktree> <out>: installs, builds the packages, regenerates the
# Storybook theme, and copies material-x's git-ignored build outputs and the
# theme into <out>.
set -u
W="${1:?}"; O="${2:?}"
cd "${W:?}" || exit 1
aube install --frozen-lockfile > "$O.install.log" 2>&1; echo "install $?"
aube exec just build > "$O.build.log" 2>&1; echo "build $?"
node .scripts/storybook-theme.ts > "$O.theme.log" 2>&1; echo "theme $?"
mkdir -p "$O"
git ls-files --others --ignored --exclude-standard packages/material-x .storybook \
  | grep -v node_modules | sort > "$O.list"
tar cf - -T "$O.list" | (cd "$O" && tar xf -)
echo "$(wc -l < "$O.list") files"
