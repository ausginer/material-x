# The owner's `CallbackList` edit, as read for `DRD-35`

Evidence for `DRD-35` in [`00-index.md`](../../00-index.md). No probe was run, and no figure was measured.

- [`owner-edit.diff.txt`](owner-edit.diff.txt): `git diff 9f885b9a9 -- packages/drag/src`, read on 2026-11-09. The edit was uncommitted in the `drag/step-queue-model` worktree, and it changes `src/kernel/callback-list.ts`, `src/kernel/drag.ts` and `src/kernel/gesture.ts`. SHA-256 `a5b8feec280f70d3f2cacd149a5f2ff63da8f855f4d355af5afc2e09bee46358`. `git diff 9f885b9a9` for the whole tree gave the same hash, so the edit touches nothing outside `src/`.
- [`typecheck.txt`](typecheck.txt): `tsc -p tsconfig.json --noEmit` in `packages/drag` with the edit in place. It exits with status 1.
- [`lint.txt`](lint.txt): `oxlint` on the six source files that the model and the edit change. It exits with status 1. ESLint was not run, because `just lint` stops at the first failure.

**The port's starting tree is reproducible.** In a scratch worktree at `25a67d4a9`, applying `git diff 25a67d4a9 9f885b9a9 -- packages/drag/src packages/drag/tests` and then `owner-edit.diff.txt` gave the eight changed files byte for byte as they were in the owner's worktree. The scratch worktree was removed. Neither the owner's worktree nor its edit was changed: the edit's hash was the same before and after the reading.

[`callback-list-handoff.md`](../../callback-list-handoff.md) lists the gaps that were found.

## The owner's insertion edit, as read for `DRD-36`

[`insertion-edit.diff.txt`](insertion-edit.diff.txt): `git diff -- packages/drag/src` on `drag/feature-composition` at `2bec0c431`, read on 2026-11-09. The edit was uncommitted in the main checkout, and it changes only `src/kernel/callback-list.ts`. SHA-256 `8b3b9b97b7c136e31665a2f61a1b4a21e6cc7d6bda08161e0d50e460f785ff58`. `git diff` for the whole tree gave the same hash.

The architect ran these checks with the edit in place and changed nothing:

- `tsc -p tsconfig.json --noEmit` in `packages/drag`: exit status 0.
- `oxlint src/kernel/callback-list.ts`: exit status 0.
- ESLint with the package's configuration on `callback-list.ts`, `gesture.ts`, `drag.ts` and `session.ts`: exit status 0.
- `vitest run -c vitest.config.ts` on `tests/callback-list`, `tests/requests`, `tests/release` and `tests/classes`, in Chromium: 5 files and 74 tests passed. No other engine and no other test was run.

**Also found:** `oxlint .` in `packages/drag` exits with status 1 at `2bec0c431`, with or without the edit. It reports three errors in [`allocation.ts`](allocation.ts): `triple-slash-reference` on line 1 and `no-console` on lines 70 and 73. The package's `just lint` lints `.plan/`, so it fails there too.