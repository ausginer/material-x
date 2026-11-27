#!/usr/bin/env bash
# The feature proof's probes of `@ydinjs/mutator` at 9a65f1a89, on repositories
# made from `packages/mutator/fixture/` in a scratch directory, as its node rows
# make them. Each run's copy is the tool's own worktree, in the probe's TMPDIR.
#
#   probes.sh <scratch dir> <checkout of the reviewed head>
#
# Prints one section per probe. Nothing is written outside <scratch dir>.
set -uo pipefail
SCRATCH="${1:?scratch dir}"
REPO="${2:?checkout}"
HERE="$(cd "$(dirname "$0")" && pwd)"
CLI="${REPO:?}/packages/mutator/src/cli.ts"
export -n NODE_OPTIONS

# A repository from the fixture in $SCRATCH/<name>, with engines a, b and c.
make_repo() {
  local d="${SCRATCH:?}/${1:?}"
  rm -rf "${d:?}"
  mkdir -p "$d/tmp"
  cp -r "$REPO/packages/mutator/fixture" "$d/repo"
  git -C "$d/repo" init -q
  git -C "$d/repo" add -A
  git -C "$d/repo" -c user.name=probe -c user.email=probe@example.invalid commit -qm fixture
  cat >"$d/mutator.config.ts" <<CFG
export default {
  setup: [['ln', '-sfn', '$REPO/node_modules', 'node_modules'], ['node', 'build.ts']],
  engines: {
    a: { env: { FIXTURE_ENGINE: 'a' } },
    b: { env: { FIXTURE_ENGINE: 'b' } },
    c: { env: { FIXTURE_ENGINE: 'c' } },
  },
  rebuilds: [{ files: 'built/**', command: ['node', 'build.ts'] }],
};
CFG
}

# Runs `mutator run` on a JSON mutation file in a fresh repository.
run_json() {
  local name="${1:?}" json="${2:?}"
  shift 2
  local d="${SCRATCH:?}/${name:?}"
  make_repo "$name"
  echo "export default $(cat "$json");" >"$d/mutations.ts"
  (cd "$d/repo" && TMPDIR="$d/tmp" node "$CLI" run "$d/mutations.ts" \
    --config "$d/mutator.config.ts" --report "$d/report.json" "$@" \
    >"$d/stdout" 2>"$d/stderr")
  echo "exit: $?"
  echo "temporary directory: [$(ls -A "$d/tmp" | tr '\n' ' ')]"
  echo "worktrees: $(git -C "$d/repo" worktree list --porcelain | grep -c '^worktree ')"
  echo "status: [$(git -C "$d/repo" status --porcelain)]"
}

summary_table() { sed -n '/^| Mutation/,/^$/p;/^Every\|^An outcome/p' "${1:?}"; }

echo '## P1: a mutation that stops the test file from loading'
run_json p1 "$HERE/p1-did-not-run.json"
summary_table "$SCRATCH/p1/stdout"
node -e 'const r=require(process.argv[1]);const m=r.legs[0].mutations[0];console.log("outcome:",m.outcome);console.log("messages:",JSON.stringify(Object.values(m.messages)))' "$SCRATCH/p1/report.json"
grep -c 'did not run' "$SCRATCH/p1/stdout" | sed 's/^/"did not run" in the Markdown summary: /'

echo
echo '## P2: an engine expectation for a alone, and b and c fail different rows'
run_json p2 "$HERE/p2-byengine.json"
summary_table "$SCRATCH/p2/stdout"
node -e 'const r=require(process.argv[1]);for(const l of r.legs)console.log(l.engine,JSON.stringify(l.mutations[0].failed))' "$SCRATCH/p2/report.json"
echo '### P2b: the same mutation in b and c, with no engine expectation'
run_json p2b "$HERE/p2b-nobyengine.json"
summary_table "$SCRATCH/p2b/stdout"

echo
echo '## P3: signals during a mutated Vitest run'
signal_run() {
  local name="${1:?}" sig="${2:?}" target="${3:?}" workdir="${4:-}"
  local d="${SCRATCH:?}/${name:?}"
  make_repo "$name"
  echo "export default $(cat "$HERE/p3-slow.json");" >"$d/mutations.ts"
  local extra=()
  if [ -n "$workdir" ]; then
    git clone -q "$d/repo" "$d/tmp/workdir"
    extra=(--workdir "$d/tmp/workdir")
  fi
  set -m
  (cd "$d/repo" && exec env TMPDIR="$d/tmp" node "$CLI" run "$d/mutations.ts" \
    --config "$d/mutator.config.ts" "${extra[@]}" >"$d/stdout" 2>"$d/stderr") &
  local pid=$!
  set +m
  for _ in $(seq 120); do grep -q 'slow, a' "$d/stderr" 2>/dev/null && break; sleep 0.5; done
  sleep 3
  echo "during: worktrees $(git -C "$d/repo" worktree list --porcelain | grep -c '^worktree '), locks [$(git -C "$d/repo" worktree list --porcelain | grep '^locked' | tr '\n' ' ')]"
  if [ "$target" = group ]; then kill -s "$sig" -- "-$pid"; else kill -s "$sig" "$pid"; fi
  wait "$pid"
  echo "exit: $?"
  sleep 1
  echo "right after: worktrees $(git -C "$d/repo" worktree list --porcelain | grep -c '^worktree '), locks [$(git -C "$d/repo" worktree list --porcelain | grep '^locked' | tr '\n' ' ')], temporary directory [$(ls -A "$d/tmp" | tr '\n' ' ')]"
  echo "a Vitest of the run still running: $(pgrep -f "$d/tmp/mutator-report" >/dev/null && echo yes || echo no)"
  for _ in $(seq 60); do pgrep -f "$d/tmp/mutator-report" >/dev/null || break; sleep 1; done
  echo "after it ends: [$(cd "$d/tmp" && find . -mindepth 1 -maxdepth 4 -path ./workdir -prune -o -print | sort | tr '\n' ' ')]"
  if [ -n "$workdir" ]; then
    echo "workdir status: [$(git -C "$d/tmp/workdir" status --porcelain)]"
  fi
}
echo '### P3a: SIGTERM to the tool alone'
signal_run p3a TERM pid
echo '### P3b: SIGINT to its process group, as Ctrl-C sends it'
signal_run p3b INT group
echo '### P3c: SIGINT to its process group, with --workdir'
signal_run p3c INT group workdir

echo
echo '## P4: --workdir whose file differs from the commit'
make_repo p4
d="$SCRATCH/p4"
cat >"$d/mutations.ts" <<'EOF'
export default { runs: [{ dir: '.', tests: ['tests/math'] }], engines: ['a'], mutations: [
  { name: 'clamp ignores its low bound', group: 'mechanism',
    edits: [{ file: 'src/math.ts', text: 'Math.max(value, low)', replacement: 'value' }],
    expect: { fails: [{ file: 'tests/math.node.test.ts', row: 'should clamp low' }] } }] };
EOF
git clone -q "$d/repo" "$d/tmp/workdir"
sed -i 's/Math.max(value, low)/Math.max(low, value)/' "$d/tmp/workdir/src/math.ts"
(cd "$d/repo" && TMPDIR="$d/tmp" node "$CLI" run "$d/mutations.ts" \
  --config "$d/mutator.config.ts" --workdir "$d/tmp/workdir" >"$d/stdout" 2>"$d/stderr")
echo "exit: $?"
summary_table "$d/stdout"
grep '  - missed' "$d/stdout"

echo
echo '## P5: two mutations with one name'
run_json p5 "$HERE/p4-dupe.json"
summary_table "$SCRATCH/p5/stdout"
node -e 'const r=require(process.argv[1]);console.log("in the JSON:",JSON.stringify(r.legs[0].mutations.map(m=>[m.name,m.outcome])))' "$SCRATCH/p5/report.json"
