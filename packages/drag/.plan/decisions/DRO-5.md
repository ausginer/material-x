#### DRO-5 — Keep `599684791` reachable after the squash merge

**The repository allows only squash merges, so `main` won't contain `599684791`.** Once `drag/production` is squashed and its branch deleted, the commit stays reachable only through another ref. On 2026-11-07 that ref is `origin/drag/prototype`, whose tip `a1d31e0d2` descends from `599684791`. `origin/drag/production` holds it too, but merging normally deletes that branch. The `compare` instrument's prototype arm and `measure.ts --prototype` read the commit with `git archive`, and fail without it.

**Default: keep `drag/prototype` as the ref that preserves it.** No tag and no settings change is needed.

- **Before merge:** `git branch -r --contains 599684791` must list `origin/drag/prototype`.
- **While either instrument names the commit:** don't delete, rewrite or force-push `drag/prototype`.
- **On a checkout of `main` alone,** which includes a single-branch clone: run `git fetch origin drag/prototype` before either instrument.

**The alternative is to retire the prototype arm** from both instruments before merge, after the remediation's validation has read it. The branch then stops mattering, and the 2026-11-06 and remediation readings keep the arm's figures. **Recommendation: keep the branch until the owner has read `DRO-4`, then decide whether to retire the arm.**

**Held after the merge, 2026-11-10:** `git branch -r --contains 599684791` lists `origin/drag/prototype`. The performance baseline uses the prototype arm, so the branch stays.

**Answered by the owner on 2026-11-15: the prototype arm retires.** The prototype is no longer needed. `compare.ts`'s prototype arm and `measure.ts --prototype` go, with `PROTOTYPE_REVISION` ([`size-acceptance-cleanup-handoff.md`](../size-acceptance-cleanup-handoff.md) item 6). The figures already recorded against the prototype stay as recorded. **Once that unit lands, no instrument reads `599684791`,** so `drag/prototype` no longer needs to be kept for them, and `DRD-23`'s reachability bullet lapses. Deleting the branch is the owner's: no agent deletes a shared ref.