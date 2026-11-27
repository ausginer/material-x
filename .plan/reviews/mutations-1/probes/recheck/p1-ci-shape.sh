#!/bin/bash
# RD-66 property 1 in CI's shape, on the fixture: a runner checkout in .mutator/ holds the file and the config,
# and --ref is an older commit that doesn't hold them. Then a local run with the file modified and not committed,
# and a file outside any repository. Usage: p1-ci-shape.sh <scratch dir>
set -u
W=/workspaces/worktrees/e
CLI=$W/packages/mutator/src/cli.ts
R="${1:?}/p1"
rm -rf "${R:?}"; mkdir -p "$R/tmp" "$R/plain"
cp -r "$W/packages/mutator/fixture" "$R/repo"
cd "$R/repo" || exit 1
g() { git -c user.name=probe -c user.email=probe@example.invalid "$@"; }
g init -q; g add -A; g commit -qm A; A=$(git rev-parse HEAD)
echo '// B' >> src/math.ts; g commit -qam B; B=$(git rev-parse HEAD)
mkdir .mutator; cd .mutator || exit 1
cat > mutations.ts <<'M'
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
cat > mutator.config.ts <<M
export default {
  setup: [['ln', '-s', '$W/node_modules', 'node_modules'], ['node', 'build.ts']],
  engines: { a: { env: { FIXTURE_ENGINE: 'a' } } },
  rebuilds: [{ files: 'built/**', command: ['node', 'build.ts'] }],
};
M
g init -q; g add -A; g commit -qm runner; RUNNER=$(git rev-parse HEAD)
cd "$R/repo" || exit 1
state() { git rev-parse HEAD; git worktree list --porcelain; git status --porcelain --ignored; git -C .mutator status --porcelain; }
echo "A=$A B=$B RUNNER=$RUNNER"
echo "A holds .mutator/mutations.ts: $(git cat-file -e "$A:.mutator/mutations.ts" 2>/dev/null && echo yes || echo no)"

echo; echo "## 1. CI's shape: the root checked out at A, the file and config in .mutator/, --ref A"
git checkout -q "$A"
before=$(state)
TMPDIR=$R/tmp node "$CLI" run .mutator/mutations.ts --ref "$A" --config .mutator/mutator.config.ts \
  --report "$R/1.json" --summary "$R/1.md" > /dev/null 2> "$R/1.log"; echo "exit $?"
[ "$before" = "$(state)" ] && echo "checkouts: unchanged" || { echo "checkouts: CHANGED"; state; }
echo "left in TMPDIR: [$(ls "$R/tmp")]"
node -e 'const r=require(process.argv[1]); console.log(JSON.stringify({file:r.file, commit:r.commit, fileCommit:r.fileCommit, outcome:r.legs[0].mutations[0].outcome}))' "$R/1.json"
sed -n 3p "$R/1.md"

echo; echo "## 2. A local run: the root at B, --ref A, the file in .mutator/ modified and not committed"
git checkout -q "$B"
sed -i "s/clamp ignores its low bound/clamp ignores its low bound, edited/" .mutator/mutations.ts
echo ".mutator status: $(git -C .mutator status --porcelain)"
TMPDIR=$R/tmp node "$CLI" run .mutator/mutations.ts --ref "$A" --config .mutator/mutator.config.ts \
  --report "$R/2.json" --summary "$R/2.md" > /dev/null 2> "$R/2.log"; echo "exit $?"
node -e 'const r=require(process.argv[1]); console.log(JSON.stringify({file:r.file, commit:r.commit, fileCommit:r.fileCommit, name:r.legs[0].mutations[0].name}))' "$R/2.json"
sed -n 3p "$R/2.md"
echo "RUNNER's mutation name: $(git -C .mutator show HEAD:mutations.ts | grep -o "name: '[^']*'")"

echo; echo "## 3. The file outside any repository"
cp .mutator/mutations.ts .mutator/mutator.config.ts "$R/plain/"
TMPDIR=$R/tmp node "$CLI" run "$R/plain/mutations.ts" --ref "$A" --config "$R/plain/mutator.config.ts" \
  --report "$R/3.json" --summary "$R/3.md" > /dev/null 2> "$R/3.log"; echo "exit $?"
node -e 'const r=require(process.argv[1]); console.log(JSON.stringify({file:r.file, commit:r.commit, fileCommit:r.fileCommit ?? null}))' "$R/3.json"
sed -n 3p "$R/3.md"
echo "left in TMPDIR: [$(ls "$R/tmp")]"; git worktree list | wc -l
