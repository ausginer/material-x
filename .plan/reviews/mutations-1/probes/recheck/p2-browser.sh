#!/bin/bash
# What the tool reports when a browser doesn't start, on the fixture's browser project. U: it doesn't start in the
# unmutated run (a TMPDIR long enough that Chromium's SingletonSocket path is refused). M: it starts unmutated, and a
# mutation of the fixture's config stops it from starting. Usage: p2-browser.sh <scratch dir with a long path>
set -u
W=/workspaces/worktrees/e
CLI=$W/packages/mutator/src/cli.ts
R="${1:?}/p2"
rm -rf "${R:?}"; mkdir -p "$R/long/tmp"
SHORT=$(mktemp -d /tmp/mxr.XXXX)
cp -r "$W/packages/mutator/fixture" "$R/repo"
cd "$R/repo" || exit 1
git init -q; git add -A; git -c user.name=p -c user.email=p@example.invalid commit -qm A
cat > "$R/c.ts" <<M
export default { setup: [['ln', '-s', '$W/node_modules', 'node_modules'], ['node', 'build.ts']], engines: { chromium: { env: { FIXTURE_ENGINE: 'chromium' } } }, rebuilds: [] };
M
mfile() { # $1 name, $2 file, $3 text, $4 replacement
cat > "$R/$1.ts" <<M
export default { runs: [{ dir: '.', tests: ['tests/dom'] }], engines: ['chromium'], mutations: [{
  name: '$1', group: 'mechanism',
  edits: [{ file: '$2', text: "$3", replacement: "$4" }],
  expect: { fails: [{ file: 'tests/dom.browser.test.ts', row: 'should hold its text' }] } }] };
M
}
mfile label src/dom.ts 'element.textContent = text;' ''
mfile launch vitest.config.ts "launchOptions: { channel: 'chromium' }" "launchOptions: { executablePath: '/nonexistent/chrome' }"
show() { node -e '
const r=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")); const l=r.legs[0];
console.log("unmutated rows:", l.rows.length); for (const m of l.mutations) console.log(JSON.stringify({outcome:m.outcome, failed:m.failed, voided:m.voided, unrun:m.unrun}));' "$1"; }

echo "## U. TMPDIR of $(printf %s "$R/long/tmp" | wc -c) characters, the label mutation"
TMPDIR=$R/long/tmp node "$CLI" run "$R/label.ts" --config "$R/c.ts" --report "$R/u.json" > "$R/u.md" 2> "$R/u.log"; echo "exit $?"
grep -v '^mutator: setup' "$R/u.log"; [ -f "$R/u.json" ] && show "$R/u.json" || echo "no report"

echo; echo "## U'. Vitest itself in that TMPDIR, and in a short one"
ln -s "$W/node_modules" node_modules; node build.ts > /dev/null
FIXTURE_ENGINE=chromium TMPDIR=$R/long/tmp node "$W/node_modules/vitest/vitest.mjs" run tests/dom --reporter=json --outputFile="$R/v.json" > "$R/v.log" 2>&1; echo "Vitest exit $?"
grep -o 'FATAL:[^]]*\] [^/]*' "$R/v.log" | head -1
node -e 'const r=require(process.argv[1]);const t=r.testResults[0];console.log(JSON.stringify({file:t.name.split("/").slice(-2).join("/"),status:t.status,message:t.message,rows:t.assertionResults.length,success:r.success}))' "$R/v.json"
P=$(mktemp -d /tmp/mxr.XXXX)
FIXTURE_ENGINE=chromium TMPDIR=$P node "$W/node_modules/vitest/vitest.mjs" run tests/dom > /dev/null 2>&1; echo "Vitest exit $? in a short TMPDIR; left there: [$(ls "$P" | tr '\n' ' ')]"
rm -rf "${P:?}"
git checkout -q -- built 2>/dev/null
rm -f node_modules; git status --porcelain

echo; echo "## M. TMPDIR $SHORT, a mutation that stops the browser from starting"
TMPDIR=$SHORT node "$CLI" run "$R/launch.ts" --config "$R/c.ts" --report "$R/m.json" --summary "$R/m.md" > /dev/null 2> "$R/m.log"; echo "exit $?"
show "$R/m.json"
sed -n '/^### /,$p' "$R/m.md"
echo "left in $SHORT: [$(ls "$SHORT")]"
rm -rf "${SHORT:?}"
