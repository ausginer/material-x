#!/usr/bin/env sh
# Prints one entry of a current-state record.
#
#     .scripts/entry.sh drag:DRD-13
#
# A wrapper and nothing else: every argument goes to `entry.ts` unchanged.
set -eu
exec node "$(dirname "$0")/entry.ts" "$@"
