#!/usr/bin/env bash
# Applies one mutation to slot d's .scripts/entry.ts, runs .scripts/entry.node.test.ts
# in the repo project, and restores the file from HEAD.
set -uo pipefail
cd /workspaces/worktrees/d
name="${1:?}"; out="${2:?}"; F=.scripts/entry.ts
trap 'git checkout HEAD -- "$F"' EXIT
case "$name" in
  head) ;;
  main) git show 6a67badfd:"$F" > "$F" ;;
  mA-commit-read-throws)
    # Reading at a commit crashes, as it does for a commit the clone lacks.
    perl -0pi -e 's/(\): Promise<readonly Document\[\]> \{\n)(  const listing = await git)/$1  throw new Error("mutation");\n$2/' "$F" ;;
  mB-first-document-only)
    # Only each scope's first document is read.
    sed -i 's/for (const { path, source } of documents) {/for (const { path, source } of documents.slice(0, 1)) {/' "$F" ;;
  mC-own-pattern)
    # The pass uses a looser pattern of its own, which also takes `#####`.
    sed -i 's/for (const { local, at } of headings(source.split(.\\n.))) {/for (const { local, at } of source.split("\\n").flatMap((l, at) => { const m = \/^#{4,5} ([A-Za-z][A-Za-z0-9]*-\\d+)\/u.exec(l); return m ? [{ local: m[1]!, at }] : []; })) {/' "$F" ;;
  mD-duplicates-commit-read-throws)
    # Only the pass's read at a commit crashes; the lookup's is unchanged.
    sed -i 's/: await atCommit(scope, commit);/: await Promise.reject(new Error("mutation"));/' "$F" ;;
  *) echo "unknown $name"; exit 2 ;;
esac
{ echo "# mutation: $name"; git diff -- "$F"
  timeout 300 aube exec vitest run --project repo .scripts/entry.node.test.ts 2>&1 | sed 's/\x1b\[[0-9;]*m//g' | grep -E '^ +(✓|×)|Tests  ' ; } > "$out" 2>&1
