#!/usr/bin/env sh
# Prints one entry of a current-state record.
#
#     .scripts/entry.sh drag2:D-171
#
# A wrapper and nothing else: every argument goes to `entry.ts` unchanged, and
# no parsing or extraction happens here. Two implementations of "what an entry
# is" would be two definitions of the record — which is the whole reason the
# reader shares `tests/ledger.ts` in the first place.
set -eu
exec node "$(dirname "$0")/entry.ts" "$@"
