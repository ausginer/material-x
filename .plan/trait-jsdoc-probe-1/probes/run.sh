#!/usr/bin/env bash
# The probe: builds @ydinjs/core and @ydinjs/material-x today (real), with the
# stand-in on today's source (standin), and with every trait moved to @trait
# under each mode, then compares each build with today's.
#   .plan/trait-jsdoc-probe-1/probes/run.sh <outRoot>
# Run from the worktree root, after `aube exec just build`. Leaves the trait
# sources as it found them.
set -euo pipefail
OUT="${1:?outRoot}"
P=.plan/trait-jsdoc-probe-1/probes
FILES=$(grep -rl 'trait(this' packages/core/src/traits packages/material-x/src \
  | grep -v -e composition.ts -e attribute-traits.ts | sort)
restore() { git checkout -- $FILES; }
trap restore EXIT

rm -rf "${OUT:?}"
for mode in real standin; do
  for pkg in core material-x; do
    node "$P/build.ts" "$mode" "$pkg" "$OUT/$mode/$pkg" 2>&1 | sed "s|^|[$mode $pkg] |"
  done
done

node "$P/maps.ts" "$OUT/real" > "$OUT/real-maps.txt"
node "$P/migrate.ts" $FILES >/dev/null
aube exec oxfmt -c .oxfmtrc.json $FILES >/dev/null
for mode in control control-pre way1 way2 way3a way3b; do
  for pkg in core material-x; do
    node "$P/build.ts" "$mode" "$pkg" "$OUT/$mode/$pkg" > "$OUT/$mode-$pkg.log" 2>&1 \
      || { echo "[$mode $pkg] build failed:"; grep -E '^RolldownError' "$OUT/$mode-$pkg.log" | sort | uniq -c; rm -rf "${OUT:?}/$mode/$pkg"; }
    grep -E '^\S.*\[[A-Z_]+\]' "$OUT/$mode-$pkg.log" | sed "s|^|[$mode $pkg] |" || true
  done
done

for mode in control control-pre way1 way3a way3b; do
  node "$P/maps.ts" "$OUT/$mode" "$OUT/control" > "$OUT/$mode-maps.txt" 2>&1 || true
done

git checkout -- $FILES
node "$P/migrate.ts" --after-export $FILES >/dev/null
aube exec oxfmt -c .oxfmtrc.json $FILES >/dev/null
for pkg in core material-x; do
  node "$P/build.ts" form "$pkg" "$OUT/form/$pkg" > "$OUT/form-$pkg.log" 2>&1 \
    || { echo "[form $pkg] build failed"; rm -rf "${OUT:?}/form/$pkg"; }
done
git diff -- packages/core/src/traits/checkable.ts packages/material-x/src/fab/fab.ts > "$OUT/form.diff"
node "$P/maps.ts" "$OUT/form" > "$OUT/form-maps.txt" 2>&1 || true

TRAITS='core/traits/(checkable|disableable|linkable|nameable|reorderable|selectable|typeable|valuable)|material-x/(core/traits/focus-forwarding|button/IconButtonCore)'
for mode in standin control control-pre way1 way2 way3a way3b form; do
  echo
  echo "=== $mode against real"
  if [ ! -d "$OUT/$mode/core" ] || [ ! -d "$OUT/$mode/material-x" ]; then
    echo "no build"
    continue
  fi
  js=$(diff -rq --exclude='*.map' --exclude='*.d.ts' "$OUT/real" "$OUT/$mode" | wc -l || true)
  dts=$(diff -rq --exclude='*.map' --exclude='*.js' "$OUT/real" "$OUT/$mode" | wc -l || true)
  docs=0
  for f in $(cd "$OUT/real" && find . -name '*.d.ts' | grep -E "$TRAITS" | sort); do
    n_real=$(grep -c '^/\*\*' "$OUT/real/$f" || true)
    n_mode=$(grep -c '^/\*\*' "$OUT/$mode/$f" 2>/dev/null || true)
    [ "$n_real" = "$n_mode" ] && docs=$((docs + 1))
  done
  echo ".js files differing: $js; .d.ts files differing: $dts; trait .d.ts with every doc: $docs/10"
  diff -rq --exclude='*.map' "$OUT/real" "$OUT/$mode" | sed 's/^/  /' | head -40 || true
done

echo
echo "=== source maps (trait modules), each against control; form against its own source"
echo "--- real, read against today's source before the migration"
cat "$OUT/real-maps.txt"
for mode in control control-pre way1 way3a way3b form; do
  echo "--- $mode"
  cat "$OUT/$mode-maps.txt"
done
echo
echo "=== the form's source, two files"
cat "$OUT/form.diff"
