#!/usr/bin/env bash
# Captures the RF-49 witness into $1: oxlint and ESLint --print-config for a
# TypeScript file at the root and in each package, run from the root and from
# the package's directory, and both linters' results over the tree.
set -u
out="${1:?}"
root=/workspaces/worktrees/b
mkdir -p "${out:?}"
cd "${root:?}" || exit 1
eslint=(aube exec -- eslint --flag unstable_native_nodejs_ts_config)

files=(
  .scripts/oxlint-migrate.ts
  packages/box-quad/src/index.ts
  packages/core/src/attribute.ts
  packages/drag/src/draggable.ts
  packages/material-x/src/button-group/ButtonGroupCore.ts
  packages/size-limit-preset-rolldown/src/index.ts
  packages/tproc/src/DB/DB.ts
  packages/vite-custom-element-assets/src/css/css-worker.ts
  packages/vite-traits-plugin/src/attributes/lower.ts
)

for f in "${files[@]}"; do
  tag=$(echo "$f" | tr '/' '_')
  (cd "$root" && aube exec -- oxlint --print-config "$f") >"$out/oxlint-root-$tag.json" 2>&1
  (cd "$root" && "${eslint[@]}" -c eslint.config.ts --print-config "$f") >"$out/eslint-root-$tag.json" 2>&1
  case "$f" in
    packages/*)
      pkg=$(echo "$f" | cut -d/ -f1-2)
      rel=${f#"$pkg"/}
      (cd "$root/$pkg" && aube exec -- oxlint --print-config "$rel") >"$out/oxlint-pkg-$tag.json" 2>&1
      (cd "$root/$pkg" && "${eslint[@]}" -c eslint.config.ts --print-config "$rel") >"$out/eslint-pkg-$tag.json" 2>&1
      ;;
  esac
done

# Lint results over the tree, as `just lint` runs them: each package from its
# own directory, then the repository-level files.
for pkg in packages/*/; do
  name=$(basename "$pkg")
  (cd "$root/$pkg" && aube exec -- oxlint -f unix .) >"$out/lint-oxlint-$name.txt" 2>&1
  echo "exit $?" >>"$out/lint-oxlint-$name.txt"
  (cd "$root/$pkg" && "${eslint[@]}" -c eslint.config.ts -f json .) >"$out/lint-eslint-$name.txt" 2>&1
  echo "exit $?" >>"$out/lint-eslint-$name.txt"
done
(cd "$root" && aube exec -- oxlint -f unix --ignore-pattern 'packages/**' .) >"$out/lint-oxlint-root.txt" 2>&1
echo "exit $?" >>"$out/lint-oxlint-root.txt"
(cd "$root" && "${eslint[@]}" -c eslint.config.ts -f json --ignore-pattern 'packages/**' .) >"$out/lint-eslint-root.txt" 2>&1
echo "exit $?" >>"$out/lint-eslint-root.txt"
