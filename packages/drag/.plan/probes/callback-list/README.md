# The owner's `CallbackList` edit, as read for `DRD-35`

Evidence for `DRD-35` in [`00-index.md`](../../00-index.md). No probe was run, and no figure was measured.

- [`owner-edit.diff.txt`](owner-edit.diff.txt): `git diff 9f885b9a9 -- packages/drag/src`, read on 2026-11-09. The edit was uncommitted in the `drag/step-queue-model` worktree, and it changes `src/kernel/callback-list.ts`, `src/kernel/drag.ts` and `src/kernel/gesture.ts`. SHA-256 `a5b8feec280f70d3f2cacd149a5f2ff63da8f855f4d355af5afc2e09bee46358`. `git diff 9f885b9a9` for the whole tree gave the same hash, so the edit touches nothing outside `src/`.
- [`typecheck.txt`](typecheck.txt): `tsc -p tsconfig.json --noEmit` in `packages/drag` with the edit in place. It exits with status 1.
- [`lint.txt`](lint.txt): `oxlint` on the six source files that the model and the edit change. It exits with status 1. ESLint was not run, because `just lint` stops at the first failure.

**The port's starting tree is reproducible.** In a scratch worktree at `25a67d4a9`, applying `git diff 25a67d4a9 9f885b9a9 -- packages/drag/src packages/drag/tests` and then `owner-edit.diff.txt` gave the eight changed files byte for byte as they were in the owner's worktree. The scratch worktree was removed. Neither the owner's worktree nor its edit was changed: the edit's hash was the same before and after the reading.

[`callback-list-handoff.md`](../../callback-list-handoff.md) lists the gaps that were found.