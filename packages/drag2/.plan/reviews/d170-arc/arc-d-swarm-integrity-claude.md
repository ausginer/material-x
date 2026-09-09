# Arc D landing — package-coherence (integrity) pass

**Files read at `c553ff8da`.** Range reviewed: `0c62b02c6..c553ff8da` (`drag2: three corrections behind the Arc D challenge …` through `drag2: measure Arc D, restore the five suspended control equalities and close the series`). This is the landed D-191 design; D-190 and the abandoned intermediate variant are not reopened except where the tree itself contradicts a live contract.

## Scope

**Covered:**

- Full source diff: `src/sortable/{spec,runtime,slots,linear-shift,xy,y}.ts` — the activation-record completion (`SortableActivation`), the `insertion`/`snapshot` moves between `InsertionRuntimeView` and `InsertionFrameView`, and every call site touched.
- Full test diff: `sortable.browser.test.ts`, the new `feature.declaration.test.ts`, `xy.browser.test.ts`, `y.browser.test.ts`, `features.browser.test.ts`, `COVERAGE.md`, and the two disclosed items (`packaging.node.test.ts`, the browser flake).
- Record diff: `.plan/contract/00-index.md` (D-190, D-191, F-325, F-326, F-403, F-404, F-405, F-408, the deferred-decisions table, the status register), `.plan/contract/03-feature-composition.md`, `.plan/obligations.md` (O-13), `.plan/plan.md`, `.plan/measurements/arc-d.md`, `.plan/measurements/budget-rebases.md`, `bench/size/measure.ts`.
- Public surface: `src/sortable/feature.ts`'s export list, and a repo-wide grep for `PresentationView`, `activePlaceholder`, `.presentation`, `runtime.snapshot` outside dated provenance.
- Cross-package impact: whether `packages/material-x` or any other package consumes `@ydinjs/drag2`.
- Independent execution: `tsc --noEmit` for the package; the full `node` and `browser` Vitest projects (run three times for the browser project, to test the disclosed flake); and an independent re-measurement of `bench/size/measure.ts`'s bundle-size table against **both** endpoints of the range, each built from a detached, `node_modules`-symlinked worktree, compared byte-for-byte against `arc-d.md`'s table and against `bench/size/measure.ts`'s own `control:` literals.

**Not covered / explicitly out of scope:**

- Re-deriving or re-litigating D-190/D-191's architecture itself — the entity-model rule, the membership tests, or whether the four-arc count is correct. Only whether the landed tree matches what D-191 as written claims to have landed.
- The historical `.plan/reviews/checkpoint-*` and `phase-*` archive beyond the grep above; those are dated provenance and the record's own rule (F-315-style) is that they keep their wording.
- Independent re-measurement of the published-declaration ("install weight") figures cited in `arc-d.md` §The one cost that went the other way (116.39 kB → 116.43 kB raw) — this is a secondary observation not gating any instrument, and was not re-derived.
- `packages/material-x` — checked for a dependency edge (none found) and not reviewed further.

## Findings

### integrity-1 — the D-191 retirement narrative in `00-index.md` §Decisions not yet implemented breaks the section's own twenty-five-cycle formatting convention

**Tier C.**

**Current behavior.** At `packages/drag2/.plan/contract/00-index.md:2216-2218`, the table that used to carry D-191's one live row now reads:

```
| Decision | Lands | What is missing | Witness |
| --- | --- | --- | --- |
| **The twenty-sixth cycle opened and closed on 2026-09-09**, and the row was the first this table has carried whose witness was chosen **after** the obvious one was shown to retire too early. D-191's witness — … |
```

i.e. the retirement narrative is wrapped in a leading and trailing `|`, making it (syntactically) a one-cell table row directly beneath the header/separator, with the other three columns rendering blank.

**Why it is a problem.** Every one of the twenty-five prior retirement narratives in this same section — the twenty-fifth cycle (D-170/D-171), the twenty-fourth (D-168), the twenty-third (D-166), and so on back through the ninth (D-132) — is written as an ordinary paragraph _outside_ the table, immediately below the (otherwise empty) header and separator. That is the section's own established form for "the row that used to be here has retired": delete the data row, leave the table at header+separator, narrate the retirement in prose. Diffing against `0c62b02c6` confirms the table held exactly one real data row (`| D-191 | Remediation | … |`) before this landing, and the convention above is what every earlier cycle used to replace an equivalent row. This is the one narrative in the file's entire history that instead re-uses table-row syntax for the same role, which is a property (retirement narratives sit in prose, not in the table) no longer holding at this one site while it holds everywhere else in the same section.

**Evidence.**

- `git diff 0c62b02c6..c553ff8da -- packages/drag2/.plan/contract/00-index.md`, hunk at old line 2215 / new line 2216-2218.
- Compare the un-piped "The twenty-fifth cycle opened on 2026-09-02…" paragraph immediately following (same file, next paragraph) — same narrative role, plain prose, no leading/trailing `|`.
- `packages/drag2/tests/ledger.ts`'s `ROW_SHAPED = /^\|\s*D-\d+\s*\|/u` (used by `unrecognized()`) does not match a row that opens `| **The twenty-sixth cycle…`, so the anomaly is invisible to `tests/decisions.node.test.ts` — confirmed by running it (`npx vitest run --project node tests/decisions.node.test.ts`, 72/72 pass, including "should refuse a table row it cannot parse rather than skipping it"). `npx oxfmt --check .plan/contract/00-index.md` also passes clean, so the formatter does not catch or normalize it either.

**Required property.** A retirement narrative in §Decisions not yet implemented is written in the section's own established form (plain prose below the table), not as pipe-delimited row syntax, so a reader (and any future table-shaped instrument) can tell a live row from a closed one by the same convention the rest of the section uses.

## The two disclosed items

**`tests/packaging.node.test.ts` formatter delta.** The only change in this file (`git diff 0c62b02c6..c553ff8da`) re-wraps one `await` expression's line breaks with no change to tokens or semantics. `npx oxfmt --check tests/packaging.node.test.ts` reports it already in canonical formatter shape, and the file's test (part of the 363-test node run below) passes. Judged benign: a formatter-only delta, not promoted.

**Unreproduced browser flake.** Ran `packages/drag2`'s `browser` Vitest project three times end-to-end at `c553ff8da` (once standalone, twice back-to-back): all three runs report `39 passed (39)` files, `861 passed | 60 skipped (921)` tests, byte-identical pass/skip counts each time. No failure reproduced in this pass. Judged as disclosed: not dismissed as never-happened, but no evidence of it surfaced here.

## Verification performed (no findings)

- `npx tsc -p tsconfig.json --noEmit` in `packages/drag2` — clean.
- `node` Vitest project — 24 files, 363 tests, all passing.
- `browser` Vitest project — 39 files, 861 passing / 60 skipped, run three times, identical each time.
- `feature.declaration.test.ts`'s three-row disjointness assertion (`keyof InsertionFrameView & keyof InsertionRuntimeView` = `never`, plus the two owner rows) compiles and typechecks as claimed.
- Counted the `this.#operation.{presentation,activePlaceholder,lift,activation}!` non-null assertions directly in `spec.ts` at both endpoints: 6 at `0c62b02c6`, 4 at `c553ff8da` — matches F-403's "two of the six `!` assertions disappear" exactly.
- `retire()` at `c553ff8da` clears exactly three fields (`progress`, `pendingSpatial`, `activation`) — matches the record's "clears three fields instead of five."
- `SortableActivation` is not exported from `src/sortable/feature.ts` (confirmed by reading its export list) — the record's "no import edge from a feature module back to the behavior's runtime type" claim holds for this arc.
- No dependency edge from `packages/material-x` (or any other package) onto `@ydinjs/drag2` — grepped for `drag2` imports repo-wide, none found. The Material-X `files.json` component-surface check does not apply to this range: no Material X component was added, removed, or touched.
- Repo-wide grep for `PresentationView`, `activePlaceholder`, `.presentation`, `runtime.snapshot` outside `.plan/reviews/**` (dated provenance, exempted by the record's own rule): none found — no stale reference to the pre-arc shape survives in live source, tests, or current-state docs.
- `kernel/presentation.ts`'s `BehaviorLiftSession.write` docblock ("stays callable and stays _effective_ … calling it after retirement writes onto an element no live operation owns … neither is refused") independently confirms the `effectRelease` comment's "quiet write rather than a `TypeError`" claim for a reentrant-retire during `movePlaceholder`.
- **Independent bundle-size reproduction.** Built `@ydinjs/drag2` (`tsdown`) and ran `bench/size/measure.ts`'s `measureAll()` twice — once against the shared checkout at `c553ff8da`, once against a detached, `node_modules`-symlinked worktree at `0c62b02c6` — and diffed the results against `arc-d.md`'s table and `measure.ts`'s `control:` literals:
  - All fifteen rows' minified/Brotli figures reproduce `arc-d.md`'s table exactly at both endpoints (e.g. `minimal`: 34,631/10,404 → 34,367/10,357; `both behaviors`: 43,394/12,350 → 43,130/12,305).
  - The five `control:` rows restored by this landing (`free drag minimal` 8,116; `free drag + bounds` 8,274; `free drag + landing` 8,276; `free drag complete` 8,426; `kernel root - kernel.js` 6,185) are byte-identical between the two builds, confirming the "the arc did not move them" claim underlying O-13's discharge.
  - The two standing controls (`vocabulary root - drag.js` 252/142, `baseline B` 22,573/6,889) are also byte-identical between the two builds.
  - The shared checkout was left clean afterward (`git status --short` empty; build output is gitignored); the baseline worktree was removed with `git worktree remove` when done.

No other findings. Everything else examined in scope — the `InsertionFrameView`/`InsertionRuntimeView` disjointness and its two owner-satisfaction rows, the `linear-shift.ts` `moved()` signature change and its one call site, the `COVERAGE.md` row renames against the actual (renamed) test titles they cite, the `obligations.md` O-13 discharge text against `arc-d.md`, and the `03-feature-composition.md` widening-table correction — is internally consistent with the landed code at `c553ff8da`.