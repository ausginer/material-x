#!/bin/bash
# Where the unmutated run's new failure (`recheck-1`'s fix) applies besides a browser that doesn't start, and the
# file's commit when only the config differs from it. N: a run whose tests match no test file. H: an unhandled error
# in a row that passes. N and H run again with the tool at 0cc0d9516, before the fix. C: the file, the config and the
# runner committed, then the config modified.
# Usage: p3-exit-3.sh <short scratch dir>
set -u
W=/workspaces/worktrees/e
CLI=$W/packages/mutator/src/cli.ts
R="${1:?}/p3"
rm -rf "${R:?}"; mkdir -p "$R/tmp"
export TMPDIR=$R/tmp
fixture() { # $1 dir
  cp -r "$W/packages/mutator/fixture" "$1"
  git -C "$1" init -q; git -C "$1" add -A; git -C "$1" -c user.name=p -c user.email=p@example.invalid commit -qm A
}
config() { # $1 path
cat > "$1" <<M
export default { setup: [['ln', '-s', '$W/node_modules', 'node_modules'], ['node', 'build.ts']], engines: { a: { env: { FIXTURE_ENGINE: 'a' } } }, rebuilds: [] };
M
}
mfile() { # $1 path, $2 tests
cat > "$1" <<M
export default { runs: [{ dir: '.', tests: ['$2'] }], engines: ['a'], mutations: [{
  name: 'clamp ignores its low bound', group: 'mechanism',
  edits: [{ file: 'src/math.ts', text: 'Math.max(value, low)', replacement: 'value' }],
  expect: { fails: [{ file: 'tests/math.node.test.ts', row: 'should clamp low' }] } }] };
M
}
run() { # $1 case, $2 repo, $3 file, $4 config
  (cd "$2" && node "$CLI" run "$3" --config "$4" --report "$R/$1.json" --summary "$R/$1.md" > /dev/null 2> "$R/$1.log"); echo "exit $?"
  grep -v '^mutator: \(setup\|unmutated, a$\)' "$R/$1.log" | head -6
  [ -f "$R/$1.json" ] && node -e 'const r=require(process.argv[1]);console.log(JSON.stringify({fileCommit:r.fileCommit,outcomes:r.legs.flatMap(l=>l.mutations.map(m=>m.outcome))}))' "$R/$1.json" || echo "no report"
  [ -f "$R/$1.md" ] && sed -n 3p "$R/$1.md"
}
config "$R/c.ts"

echo "## N. tests: ['tests/nothing'], which matches no test file"
fixture "$R/n"; mfile "$R/n.ts" tests/nothing
run n "$R/n" "$R/n.ts" "$R/c.ts"
echo "Vitest alone:"
(cd "$R/n" && ln -s "$W/node_modules" node_modules && FIXTURE_ENGINE=a node "$W/node_modules/vitest/vitest.mjs" run tests/nothing --reporter=json --outputFile="$R/n-vitest.json" > "$R/n-vitest.log" 2>&1; echo "Vitest exit $?"; rm -f node_modules)
grep -i 'no test files' "$R/n-vitest.log" | head -1
[ -f "$R/n-vitest.json" ] && node -e 'const r=require(process.argv[1]);console.log(JSON.stringify({files:r.testResults.length,success:r.success}))' "$R/n-vitest.json" || echo "Vitest wrote no report"

echo; echo "## H. an unhandled error in a row that passes, committed before the run"
fixture "$R/h"
cat >> "$R/h/tests/math.node.test.ts" <<'M'

it('should pass and leave an unhandled rejection', () => {
  void Promise.reject(new Error('left unhandled'));
});
M
git -C "$R/h" -c user.name=p -c user.email=p@example.invalid commit -qam H
mfile "$R/h.ts" tests/math
run h "$R/h" "$R/h.ts" "$R/c.ts"

echo; echo "## N and H with the tool at 0cc0d9516, before the fix"
mkdir -p "$R/old/src"
for f in $(git -C "$W" ls-tree --name-only 0cc0d9516 packages/mutator/src/); do git -C "$W" show "0cc0d9516:$f" > "$R/old/src/${f##*/}"; done
NEW=$CLI; CLI=$R/old/src/cli.ts
echo "N:"; run old-n "$R/n" "$R/n.ts" "$R/c.ts"
echo "H:"; run old-h "$R/h" "$R/h.ts" "$R/c.ts"
CLI=$NEW

echo; echo "## C. the file, the config and the runner committed after the fixture, then the config modified"
fixture "$R/c"; mfile "$R/c/mutations.ts" tests/math; config "$R/c/mutator.config.ts"
mkdir -p "$R/c/tool"; cp -r "$W/packages/mutator/src" "$R/c/tool/src"
git -C "$R/c" add -A; git -C "$R/c" -c user.name=p -c user.email=p@example.invalid commit -qm file
CLI=$R/c/tool/src/cli.ts
echo "clean:"; run c0 "$R/c" "$R/c/mutations.ts" "$R/c/mutator.config.ts"
echo "// modified" >> "$R/c/mutator.config.ts"
echo "config modified ($(git -C "$R/c" status --porcelain)):"; run c1 "$R/c" "$R/c/mutations.ts" "$R/c/mutator.config.ts"
echo "HEAD: $(git -C "$R/c" rev-parse HEAD)"
echo; echo "left in TMPDIR: [$(ls "$R/tmp")]"
