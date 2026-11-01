#!/usr/bin/env bash
# Reruns the snapshot-units probes (D-201, D-202) against the working tree.
#
# The sources are stored as `*.ts.txt` because the package's `just lint` walks
# `.plan/` with both oxlint and ESLint, and these files are evidence about one
# revision of `src/`, not maintained code: they import members D-202 renames.
# This script materializes them as `.ts` under a scratch directory inside
# `tests/`, where their `../../src/` imports resolve, runs them, and removes the
# directory on exit, so the tracked tree is unchanged whether the run passes or
# fails.
#
# The node probes and the reference model run with `node`. The browser probes
# run in the package's `browser` Vitest project, whose include glob is
# `tests/**/*.browser.test.ts`, with the Chrome `.scripts/vitest-config.ts`
# resolves (`$CHROME_EXECUTABLE`, else `/usr/local/bin/chrome`). `--silent=false`
# is needed because the project config otherwise drops console output.
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
package="$(cd "${here}/../../.." && pwd)"
scratch="${package}/tests/zz-snapshot-units-probe"

trap 'rm -rf "${scratch}"' EXIT
mkdir -p "${scratch}"

for source in "${here}"/*.ts.txt; do
  name="$(basename "${source}" .txt)"
  cp "${source}" "${scratch}/${name}"
done

for probe in p1-nested-ingress p2-arm-destroy model; do
  echo "== ${probe}"
  node "${scratch}/${probe}.ts"
done

echo "== browser probes (P4, P5)"
cd "${package}"
npx vitest run -c vitest.config.ts --project browser --silent=false \
  tests/zz-snapshot-units-probe 2>&1 |
  grep -E '^P[0-9]|Test Files|Tests '
