#!/usr/bin/env bash
# Runs the accessor microbenchmark ROUNDS times in each engine, each run in a
# fresh browser with the three variants in one page, then one Chromium run
# with V8's IC log, which ic-log.ts reads.
#
# Run from the repository root after the packages' builds and build-mixin.ts:
# .plan/trait-mixin-measure-1/probe/run-bench.sh
# Writes into .plan/trait-mixin-measure-1/checks/.
set -euo pipefail

ROUNDS="${ROUNDS:-5}"
ENGINES="${ENGINES:-chromium firefox webkit}"
DIR=.plan/trait-mixin-measure-1
RESULTS="${DIR:?}/checks"
LOGS="$(mktemp -d)"
CONFIG="${DIR:?}/bench/vitest.config.ts"

mkdir -p "${RESULTS:?}"
rm -f "${RESULTS:?}/bench.jsonl" "${RESULTS:?}/sfi-chromium.txt"

for round in $(seq 1 "${ROUNDS}"); do
  for engine in ${ENGINES}; do
    echo "round ${round} ${engine}"
    log="${LOGS:?}/${round}-${engine}.log"
    DEBUG=pw:browser BENCH_ENGINE="${engine}" BENCH_OUT="${RESULTS}/bench.jsonl" \
      aube exec -- vitest run --config "${CONFIG}" >"${log}" 2>&1 ||
      { tail -40 "${log}"; exit 1; }

    if [[ "${round}" == 1 && "${engine}" == chromium ]]; then
      grep -oE '(<String\[[0-9]+\]: c"MXBENCH [^"]*">|<JSFunction [^>]*>)' "${log}" |
        sed -E 's/<String\[[0-9]+\]: c"MXBENCH ([^"]*)">/\1:/; s/<JSFunction (.*)>/  \1/' \
        >"${RESULTS:?}/sfi-chromium.txt"
    fi
  done
done

echo "IC log"
BENCH_V8_LOG="${LOGS:?}/v8.log" BENCH_ENGINE=chromium \
  aube exec -- vitest run --config "${CONFIG}" >"${LOGS:?}/ic.log" 2>&1 ||
  { tail -40 "${LOGS:?}/ic.log"; exit 1; }
node "${DIR:?}/probe/ic-log.ts" "${LOGS:?}/v8.log" >"${RESULTS:?}/ic-chromium.txt"

rm -rf "${LOGS:?}"
