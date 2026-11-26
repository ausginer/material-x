#!/bin/bash
# RD-66 property 1 after recheck-2's fix, in CI's shape on the fixture: the root checked out at A, and a runner
# checkout in .mutator/ that holds the file, the config and a copy of the tool's source, which runs, as a leg's
# step does. Then the file modified there, and the tool run from the slot's checkout instead.
# Usage: p4-ci-shape.sh <short scratch dir>
set -u
W=/workspaces/worktrees/e
R="${1:?}/p4"
rm -rf "${R:?}"; mkdir -p "$R/tmp"
export TMPDIR=$R/tmp
cp -r "$W/packages/mutator/fixture" "$R/repo"
cd "$R/repo" || exit 1
g() { git -c user.name=probe -c user.email=probe@example.invalid "$@"; }
g init -q; g add -A; g commit -qm A; A=$(git rev-parse HEAD)
mkdir -p .mutator/packages/mutator; cp -r "$W/packages/mutator/src" .mutator/packages/mutator/src
cat > .mutator/mutations.ts <<'M'
export default {
  runs: [{ dir: '.', tests: ['tests/math'] }],
  engines: ['a'],
  mutations: [{
    name: 'clamp ignores its low bound', group: 'mechanism',
    edits: [{ file: 'src/math.ts', text: 'Math.max(value, low)', replacement: 'value' }],
    expect: { fails: [{ file: 'tests/math.node.test.ts', row: 'should clamp low' }] },
  }],
};
M
cat > .mutator/mutator.config.ts <<M
export default {
  setup: [['ln', '-s', '$W/node_modules', 'node_modules'], ['node', 'build.ts']],
  engines: { a: { env: { FIXTURE_ENGINE: 'a' } } },
  rebuilds: [{ files: 'built/**', command: ['node', 'build.ts'] }],
};
M
(cd .mutator && g init -q && g add -A && g commit -qm runner); RUNNER=$(git -C .mutator rev-parse HEAD)
echo "A=$A RUNNER=$RUNNER"
run() { # $1 case, $2 cli
  node "$2" run .mutator/mutations.ts --ref "$A" --config .mutator/mutator.config.ts \
    --report "$R/$1.json" --summary "$R/$1.md" > /dev/null 2> "$R/$1.log"; echo "exit $?"
  node -e 'const r=require(process.argv[1]); console.log(JSON.stringify({file:r.file, commit:r.commit, fileCommit:r.fileCommit ?? null, outcome:r.legs[0].mutations[0].outcome}))' "$R/$1.json"
  sed -n 3p "$R/$1.md"
}
echo; echo "## 1. The leg's form: node .mutator/packages/mutator/src/cli.ts, every file clean"
run 1 .mutator/packages/mutator/src/cli.ts
echo; echo "## 2. The same, with .mutator/mutations.ts modified"
sed -i "s/clamp ignores its low bound/clamp ignores its low bound, edited/" .mutator/mutations.ts
echo ".mutator status: [$(git -C .mutator status --porcelain)]"
run 2 .mutator/packages/mutator/src/cli.ts
git -C .mutator checkout -q -- mutations.ts
echo; echo "## 3. Clean again, the tool from $W instead"
run 3 "$W/packages/mutator/src/cli.ts"
echo; echo "left in TMPDIR: [$(ls "$R/tmp")]"
