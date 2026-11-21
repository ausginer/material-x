#!/usr/bin/env bash
# Runs .scripts/release-check.ts with no node_modules, as release.yml's step
# "Check the release" runs it before `aube ci`: once as committed, and once with
# rolldown imported at the module's top. With no arguments the script prints its
# usage once its imports have loaded.
# Usage, from the repository root: bash .plan/reviews/core-side-effects-1/probes/without-dependencies.sh
set -euo pipefail
root="$(pwd)"
copy="$(mktemp -d)"
trap 'rm -rf "${copy:?}"' EXIT
mkdir "${copy:?}/.scripts"
cp "${root:?}/.scripts/release-check.ts" "${root:?}/.scripts/ci-scope.ts" "${copy:?}/.scripts/"
cp "${root:?}/package.json" "${copy:?}/"
cd "${copy:?}"
echo "## as committed: rolldown imported in checkSideEffects"
node .scripts/release-check.ts 2>&1 | grep -oE "usage: release-check.ts|Cannot find package 'rolldown'" | sort -u || true
file=.scripts/release-check.ts
sed -i "s/^  const { rolldown } = await import('rolldown');$//" "$file"
last="$(grep -n '^import ' "$file" | tail -1 | cut -d: -f1)"
sed -i "${last}a import { rolldown } from 'rolldown';" "$file"
echo "## rolldown imported at the module's top"
node .scripts/release-check.ts 2>&1 | grep -oE "usage: release-check.ts|Cannot find package 'rolldown'|ERR_MODULE_NOT_FOUND" | sort -u || true
