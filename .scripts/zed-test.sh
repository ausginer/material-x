#!/usr/bin/env sh
set -eu

file="${1:?Missing file path}"
symbol="${2:-}"

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

if [ -n "$symbol" ]; then
  npm t -- "$test_file" --testNamePattern=\""$symbol"\"
else
  npm t -- "$test_file"
fi
