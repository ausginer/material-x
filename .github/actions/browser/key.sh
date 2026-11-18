#!/usr/bin/env bash
# Writes the cache key and the archive directory of one engine's system
# packages to the step's outputs (`repo:RD-21` property 1). `system-deps` and
# the `browser` action both call it, so the two can't disagree.
#
# The key names the image's release, the part of `ImageVersion` before its
# first dot, and not its build number: two runner pools of one release need the
# same packages, and their build numbers differ.
set -euo pipefail

engine="${1:?engine}"
playwright="$(jq -r '.devDependencies.playwright' package.json)"

{
  echo "key=system-deps-${ImageOS:?}-${ImageVersion%%.*}-${RUNNER_ARCH:?}-$engine-playwright-$playwright"
  echo "dir=${RUNNER_TEMP:?}/system-deps"
} | tee -a "${GITHUB_OUTPUT:?}"
