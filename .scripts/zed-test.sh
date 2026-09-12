#!/usr/bin/env bash
set -eu

file="${1:?Missing file path}"
symbol="${2:-}"
mode="${3:-}"

dir="$(dirname "$file")"

detect_package_root() {
  path="$1"

  case "$path" in
    */src/*)
      printf '%s\n' "${path%%/src/*}"
      return 0
      ;;
    */src)
      printf '%s\n' "${path%/src}"
      return 0
      ;;

    */tests/*)
      printf '%s\n' "${path%%/tests/*}"
      return 0
      ;;
    */tests)
      printf '%s\n' "${path%/tests}"
      return 0
      ;;

    */test/*|*/test)
      echo "Invalid test directory layout: use 'tests', not 'test': $path" >&2
      return 2
      ;;
  esac

  return 1
}

package_root="$(detect_package_root "$dir")"

if [ -z "$package_root" ]; then
  echo "Could not detect package root from: $dir" >&2
  echo "Expected path like: packages/<name>/src/... or packages/<name>/tests/..." >&2
  exit 1
fi

cd "$package_root"

test_file="${file#"$package_root"/}"

cleanup-debug-processes() {
  echo "Stopping previous Vitest browser debug processes..." >&2

  # Previous Playwright/Chrome instance that owns the CDP port.
  pkill -f 'chrome.*--remote-debugging-port=9222' 2>/dev/null || true

  sleep 0.3
}

run-vitest() {
  cmd="${1:-test}"
  shift || true

  if [ -n "$symbol" ]; then
    npm run "${cmd}" -- "$test_file" --testNamePattern=\""$symbol"\" "$@"
  else
    npm run "${cmd}" -- "$test_file" "$@"
  fi
}

run-vitest-debug() {
  vitest_bin="../../node_modules/.bin/vitest"

  # `run`, not a bare invocation. Watch mode is the default whenever stdin is a
  # TTY, and this task opens its own terminal, so dropping the flag would leave
  # the session watching. What holds the session open is `--test-timeout=0` and
  # a test paused on a breakpoint.
  if [ -n "$symbol" ]; then
    DEBUG=1 "$vitest_bin" run -c vitest.config.ts --no-file-parallelism --test-timeout=0 "$test_file" --testNamePattern="$symbol"
  else
    DEBUG=1 "$vitest_bin" run -c vitest.config.ts --no-file-parallelism --test-timeout=0 "$test_file"
  fi
}

if [ "$mode" = "debug" ]; then
  cleanup-debug-processes
  run-vitest-debug
else
  run-vitest
fi
