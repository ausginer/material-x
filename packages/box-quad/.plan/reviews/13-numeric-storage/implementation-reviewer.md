# BQ-11 implementation review

**Lens:** feature proof, by the `reviewer` role. **Read at:** `b258bbd92` on `box-quad/numeric-storage`. **Range reviewed:** `3300e8f8e..b258bbd92`, which is the implementation commit `057c39b94` and the report commit `b258bbd92`. **Governing records:** `BQ-11` in [`plan.md`](../../plan.md), [`numeric-storage-handoff.md`](../../numeric-storage-handoff.md), and the owner's scope update quoted in [`numeric-storage-report.md`](../../numeric-storage-report.md). **Browser:** Chromium only, through `/usr/local/bin/chrome`. Node v26.13.0.

**Result:** two findings, both tier C. Nothing found changes runtime behavior or a published value. The source, the public types, the contract edits and the drag consumers meet `BQ-11` properties 1 to 9 and the drag part of property 10. The drag2 parts are excluded by the owner, and the architect must decide how the record treats them. The routed items below list them.

## Scope

**Covered:**

- `packages/box-quad/src/index.ts`, every changed test file under `packages/box-quad/tests/`, and the published `index.js` and `index.d.ts` after a rebuild.
- The contract edits in `01-public-api.md` §2 and §6, and `04-support-matrix.md` §2.4.
- The nine drag consumer files in handoff item 4, and a search of the repository for other importers of the removed factories.
- Every verification figure in the report that applies after the change, re-run at `b258bbd92`, and both witnesses.
- Three additional mutations of the write order, run once and reverted.

**Not covered:**

- **drag2.** The owner's scope update excludes drag2's migration, its checks and its controls. I ran no drag2 check, and I confirmed only that `3300e8f8e..b258bbd92` changes nothing under `packages/drag2/`.
- **Base-side readings.** I did not re-run any check at `3300e8f8e`. The base figures below are the report's and the handoff's. They agree with the probe README.
- **The probe's storage matrix.** I did not re-run it against the base. Property 6 is established below by transitivity, and the evidence for that is stated.
- **Timing, other engines, typedoc output, and the record history.**

## Findings

### reviewer-1 — `coordinates`' non-finite `false` path has no test, so property 5 is unproven for it

- **Tier:** C. The code is correct today. The gap is in the proof, and no consumer observes it.
- **Current behavior.** `coordinates` has four `false` returns: the rect count, the ancestry read, the element's own 3D transform, and the final finiteness check. Every test that asserts an untouched output after a `coordinates` failure reaches one of the first three. These are `coordinates.browser.test.ts`'s sentinel test (disconnected), `layout-and-transform` and `advanced`'s atomic-failure tests (no principal box, fragmented), and the new storage test's `coordinates` failure (disconnected). No test reaches the finiteness check.
- **Why it is a problem.** `BQ-11` property 5 requires that, on `false`, "the output's keys, values and `length` are as they were", and that writes happen "only after every check has passed". For one of `coordinates`' four checks, the suite does not test this.
- **Evidence.**
  - **Mutation.** I moved `out[BOX_A] = a;` from the write block to just above `if (!finite(a + b + c + d + width + height))`. The whole box-quad browser project still passed: 239 of 239. I reverted the change, and `src/index.ts` was byte-identical to its saved copy afterwards.
  - **The path can be reached from the DOM.** Chromium clamps each transform component to about 3.4e38, so one element cannot overflow. Nine nested ancestors with `transform: scale(1e38)` do: `coordinates` returns `false` and leaves `[11, 22, …, 88]` as it was. With the mutation, the same probe returns `false` and slot 0 is no longer 11. The probe was a temporary test file, deleted after the run.
  - **For comparison.** The same mutation in `projection`, with `out[0] = e;` moved above its finiteness check, fails one test: "should preserve every output sentinel on a non-finite source". So the late path is covered for `projection` and not for `coordinates`.
  - **Inferred, not measured.** The gap is older than this unit. The changed `coordinates` tests differ from the base only in storage allocation and in the deleted allocation tests. I did not run the mutation at the base.
- **Required property.** Some test fails when `coordinates` writes any slot of `out` before its finiteness check has passed.

### reviewer-2 — The report counts three drag2 factory calls; there are four

- **Tier:** C. This is record accuracy only.
- **Current behavior.** The report's "Expected consequences outside scope" section says that the handoff's factory `grep` "also finds drag2's three factory calls in `presentation.ts` and `m5.browser.test.ts`".
- **Evidence.** The handoff's `grep` at `b258bbd92` finds four calls: `packages/drag2/src/kernel/presentation.ts` lines 519 (`space()`), 523 (`space()`) and 524 (`box()`), and `packages/drag2/tests/perf/m5.browser.test.ts` line 538 (`space()`). Handoff item 4 also names four sites: `above`, `itemAbove` and `measured`, and `m5`'s `above`.
- **Why it is a problem.** The architect may use the report to scope a later drag2 migration, or to decide on drag2's removal. Its count is one call too low.
- **Required property.** The report's count of drag2's remaining factory calls matches the tree.

## Routed to the architect, not findings

- **The owner's scope update is recorded only in the report.** `BQ-11` property 10 still requires drag2 to allocate its own storage and its five controls to be re-declared. Handoff items 4 (the two drag2 rows) and 5, and the drag2 verification rows, are also unmet as written. The report states this and asks the architect to update the record. Whether and how property 10 is amended is the architect's decision.
- **drag's `npx just typecheck` now exits 1.** This is an acknowledged consequence of the drag2 exclusion, and it is not a finding. I confirmed the mechanism: drag's `tsconfig.json` includes `bench/lab-drag2.ts`, which imports `../../drag2/src/…`, and that brings `drag2/src/kernel/presentation.ts` into drag's program. The run reports exactly two errors, `TS2724` for `box` and `space` at `presentation.ts` lines 13 and 15. No drag file has an error. Handoff verification step 2, "`npx just typecheck` … drag … is clean", is therefore not met. While drag2 imports the removed factories, drag's typecheck recipe cannot serve as a pass or fail signal, because it fails for a reason outside drag.

## Claims checked

Each check below was run at `b258bbd92`, unless the row says otherwise. Every check agrees with the report.

| Claim | Result |
| --- | --- |
| Runtime exports are exactly `ancestry`, `coordinates`, `localDelta`, `projection` | Confirmed by the storage test. The rebuilt `index.d.ts` declares only these four functions and the four types. |
| Types are `Record<number, number>`, with writable `out` and `Readonly<…>` inputs | Confirmed in the source and in the published `index.d.ts`. |
| No storage policy (property 7) | Confirmed by reading: no `Array.isArray`, `instanceof`, `length` read, conversion, copy or wrapper. |
| The fallback allocates fresh storage on each call (property 8) | Confirmed: `const read: Space = []` inside `coordinates`, and no module state. |
| Write order and checks are unchanged from the arm | Confirmed. I applied `arm.diff.txt` to `3300e8f8e` in a scratch copy and transpiled both `src/index.ts` files with comments removed. The emitted JavaScript is identical. |
| The drag consumers are the arm's edits after formatting | Confirmed by the same comparison. Six files emit identical JavaScript. Three (`lab-no-lift.ts`, `lift.ts`, `canvas-group.ts`) differ only in an import list that `fmt` joined onto one line, which drops a trailing comma. |
| Values are `Object.is`-equal to `0a28f909a`'s (property 6) | Established by transitivity, not measured directly. The implementation's runtime code is identical to the arm's, and the probe README records that the arm matches `0a28f909a` slot for slot in nine scenarios and five storage kinds. |
| Type JSDoc meets property 4 | Confirmed. Each type lists every index and its meaning, gives the capacity (8, 5, 8, 2), and says once what the storage must do. `Box` keeps its matrix and size text, `Space` keeps its ancestor-zoom text, and `Quad` keeps the p1 to p4 order. Every precondition and every "leaves `out` untouched" sentence is unchanged. |
| Contract edits are limited to §2, §6 and §2.4 | Confirmed by the diff. No other line in `contract/` mentions `Float64Array`, a factory or a length constant. |
| No other importer of a removed factory | Confirmed. Outside drag2, only drag imports `@ydinjs/box-quad`, and every drag factory call is gone. `bench/compare.ts`'s `delta(…)` is a local function. drag's README sentence about `localDelta` is unchanged and still true. |
| `npx just typecheck`, box-quad | Clean. |
| `npx tsc -p packages/box-quad/.plan/probes/numeric-storage` | Exit 0. |
| `npx just lint`, box-quad and drag, whole packages | Clean. |
| `fmt-check` on every changed file | Clean in both packages. |
| box-quad browser project | 239 passed, in 7 files. |
| drag, `npx just test` | 414 passed, 5 failed. The five failures are the `tests/size.node.test.ts` rows that the report lists as failing at the base. |
| drag size instrument | Every row equals the report's "After" column and the arm. The control is 2197 B Brotli and 6733 B minified. The same five rows are red, with no ceiling moved. |
| box-quad sizes | `size-limit --json`: 1197 B. `index.js`: 11270 B. `index.d.ts`: 7531 B. The report's explanation of the 1 B difference from the arm's `index.js` is right: the second function-JSDoc sentence grows by one character ("arrays" becomes "storage"), and the first nets zero. |
| Witness 1: `box` exported again | Reproduced: `TS2578` at `api.declaration.test.ts(92,1)`, and the storage test's export test fails, 1 of 239. |
| Witness 2: `localDelta`'s `out[0] = x` moved above its check | Reproduced: 8 of 239 fail, three in `local-delta.browser.test.ts` and five in `storage.browser.test.ts`. |
| `git diff --check 3300e8f8e b258bbd92` | Clean. The report's relative links all resolve. |
| Nothing under `packages/drag2/` changed | Confirmed. |

The declaration test checks absence through `keyof typeof boxQuad` instead of reading properties of the namespace. The report records this as a choice the handoff left open, because of the `import/namespace` lint rule. Witness 1 shows that the check detects a returned `box`. I raise no finding about it.

## Evidence limits

- The base readings were not repeated in this review.
- drag2 was not built, typechecked, linted, tested or measured.
- The probe's storage matrix was not re-run. Property 6 rests on the runtime-code identity with the arm, together with the probe's recorded result.
- The mutations and probes were temporary edits in this worktree. I reverted each one and confirmed that the tree was clean with `git status`. Their logs are in this session's scratchpad, and they are not kept.