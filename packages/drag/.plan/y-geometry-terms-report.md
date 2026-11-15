# Report: `y()`'s stated terms in the gap instrument, and drag's development checks as test-side oracles

**Handoff:** [`y-geometry-terms-handoff.md`](y-geometry-terms-handoff.md), items 1 to 3. **Input:** `f8d07e1c9` on `drag2/removal`. **Governing records:** `drag:DRD-65`, `drag:DRD-67` (which supersedes `DRD-66`), `drag:DRF-46`, `drag:DRF-47`, and §Disposition of the drag2 guarantees report in [`00-index.md`](00-index.md). The owner approved `DRD-67` as recorded on 2026-11-15.

**Outcome:** items 1 to 3 are implemented. **There are two stops** (§Stops):

- **`DRD-65` property 5's tolerance-0 witness doesn't fail.** At the rotate fixture's tie the instrument measures the two distances as exactly equal, so a tolerance of 0 still admits both gaps. The tolerance at 1/8 px is not what makes the case pass.
- **`tests/layout-animation.browser.test.ts:266` newly fails** in the source and consumer projects. The oracle records a mismatch at slot 0. At the input, the development check also refused this list, but its fault was never asserted.

Neither stop is resolved here.

## Commits

| Commit               | Content                                               |
| -------------------- | ----------------------------------------------------- |
| `b6fef26c4`          | Items 1 and 2, with item 1's mutations and their logs |
| `953a0fcc6`          | Item 3, and `DRI-6` as `DRD-67` property 8 words it   |
| this report's commit | This report, and item 3's witnesses                   |

## Item 1: the instrument admits a tie

- `tests/support/gap-conformance.ts:56`: `TIE_TOLERANCE = 1 / 8`, a constant of the helper. Its comment gives the reason: each of the two centers compared may be off by drag's 1/16 px. It isn't imported from `src`.
- `tests/support/gap-conformance.ts:65`: `admissibleGaps` replaces `measuredGap`. The candidates are the placeholder's center, which keeps the gap it occupies, and each row's center. A candidate is admissible when its distance to the pointer is within `TIE_TOLERANCE` of the smallest (`distance - nearest <= TIE_TOLERANCE`). `sweepGaps` reports a sample only when the proposal isn't admissible. When more than one gap is admissible, the message names them all (`measured 1 or 2`).
- `tests/support/gap-conformance.ts:103`: `Sweep.onTie`, called at each sample with more than one admissible gap. No test passes it or asserts a count.
- `tests/y-geometry.browser.test.ts:120`: S2's rotate case, back in `drag:DRI-14 y() proposes the gap a full measurement gives`. The fixture and its comment are unchanged from [`S2-rotate-stopped.test.ts.txt`](probes/drag2-guarantees/S2-rotate-stopped.test.ts.txt).
- `tests/y-geometry.browser.test.ts:242`: _should report a block column whose margins collapse on both sides of each row_ (`not.toEqual([])`). `:249`: _should agree on a block column whose margins collapse when the placeholder has the rows' margins_. It adds a `[data-drag-placeholder] { margin: 6px 0 10px }` rule and expects `toEqual([])`. Both use the rows `70, 55, 30, 90` with `margin-top: 6px; margin-bottom: 10px` in `display:block`.

At `b6fef26c4`, `tests/y-geometry.browser.test.ts` passes in the source and consumer projects: 26 tests.

### Witnesses

In [`probes/drag2-guarantees/mutations/`](probes/drag2-guarantees/mutations/), each `.diff` with its `.log`. Each was applied to `b6fef26c4`'s tree, `tests/y-geometry.browser.test.ts` was run, and the tree was restored.

| Mutation | Project | Result |
| --- | --- | --- |
| `S2-tie-0`: `TIE_TOLERANCE = 0` | consumer | **Passes, 13 of 13.** A stop (§Stops) |
| `S2-tie-exact`: only the rule's own choice is admissible, with the incumbent first among equals, as the input's instrument had it | consumer | Fails the rotate case, `:119`: `at 95: proposed 1, measured 2` |
| `S2` (saved), re-run, log `S2-at-tie.log` | source | Fails 2: `:78` (flow gap) and `:245` (the placeholder with the rows' margins) |
| `S2-2` (saved), re-run, log `S2-2-at-tie.log` | source | Fails 9: every agreement case of the first block, rotate included, and `:245` |
| `S2-3` (saved), re-run, log `S2-3-at-tie.log` | source | Fails 1: `:139` (sub-pixel geometry with a displacement running) |
| `S2-instrument-tie`: the saved `S2-instrument` written against the new instrument. It drops the "no placeholder" report and makes the comparison never report | source | Fails 4: `:194` and the three "should report" self-checks, the collapsing-margin one included |

The saved `S2-instrument.diff` no longer applies, because item 1 rewrote the code it edits. `S2-instrument-tie.diff` is the same mutation against the new code. The saved `S2`, `S2-2` and `S2-3` applied unchanged. The `:NN` line numbers in the logs are those at `b6fef26c4`.

### Tie counts

For the rotate fixture, from a probe that passes `onTie` and prints the count (not committed): **2 tie samples in the source project and 2 in the consumer project**, both at item 1's tree and at item 3's.

## Item 2: the comments say what the contract says

- `src/sortable/y.ts:9-17`, the module comment: "a wrapping list does not satisfy it, and varying gaps and margins do" is replaced by the term as `DRI-14` states it. A wrapping list doesn't satisfy it. Nor does a block column whose vertical margins collapse on both sides of a row, because the space between two neighbours is then the larger of their two margins. Such a column satisfies it when the placeholder has the rows' margins. A flex column, a flow `gap` and margins on one side of each row satisfy it.
- `src/sortable/y.ts:110-114`, `y()`'s public JSDoc: the shift term, the collapsing-margin exclusion, and the remedy (the rows' margins on the placeholder, for example from a `[data-drag-placeholder]` style rule), beside the existing exclusions.

**The emitted `.js` is not byte-identical, and the handoff's check can't be met as worded.** The build keeps `y()`'s JSDoc in `sortable/y.js`, so a change to that JSDoc changes `y.js`. Compared with the input's build, with comments stripped by the TypeScript printer: 32 files are byte-identical, `sortable/y.js` differs only in that comment, and no file differs in code. The size table is unchanged (see item 3).

## Item 3: drag drops `__DEV__`, and its instruments become test-side oracles

### `src` and tooling (properties 1 and 2)

- **Removed:** `verifyEquivalence` from `src/sortable/rect-index.ts`; `DevelopmentCheck`, `developmentChecks` and the three `__DEV__` branches from `src/sortable/linear-shift.ts`, with the `LEFT`, `RIGHT` and `verifyEquivalence` imports; `countRefused`, `countedRefusals` and the `__DEV__` branch from `src/kernel/gesture.ts`, with the comment that explained that branch; and `src/globals.d.ts`, whose only content was the `__DEV__` declaration. `EQUIVALENCE_SLACK` stays, because `holds` uses it. The only other `src` change is `LinearShift.refresh`'s comment, which named the development check.
- **The define is removed** from `tsdown.config.ts`, `.scripts/vite-config.ts` (`createViteConfig`, with its comment) and `.scripts/vitest-config.ts` (`createTestBaseConfig`, and the `shipped` projects in `createDragTestProjects` and `createDragAllEnginesTestConfig`).
- **The `shipped` project stays.** It runs `tests/hot-path.browser.test.ts` against `src` without the oracles. Its comment (`.scripts/vitest-config.ts`, above `createDragTestProjects`), `DRAG_SHIPPED_BROWSER_TESTS`'s comment and `tests/hot-path.browser.test.ts:1-5` say why: the oracle's fresh measurement is itself a layout read.
- **Not changed: `bench/size/measure.ts:199` and `bench/compare.ts:115` still define `__DEV__` as `false`** for Rolldown. Neither file is in the handoff's scope list or `DRD-67`'s list of tooling, and the define is inert against the new source. `compare.ts --before <revision>` builds arms from earlier revisions, whose source does read `__DEV__`, so removing it there would break those arms. Open item 1.

### The oracles (properties 3 and 4)

- `tests/support/oracles.ts`. `installEquivalence` (`:96`) wraps `RectIndex`'s `collect`, `measure`, `shift`, `measurePlaceholder`, `invalidate` and `retire`, as probed. A `shift` marks the index. `invalidate` and `retire` clear the mark. `measurePlaceholder` keeps the placeholder's left and right from before the re-read. At the next `collect` with the same collection version, a separate index of the live index's class (`index.constructor`) collects and measures the window through the `getBox` and sink of the last `measure`. The oracle compares the count, each slot's element, the window's six fields, the placeholder's top and bottom, and its held left and right, within 1/16 px. It writes nothing to the live index or the DOM. `installRefusals` (`:238`) wraps `Gesture.prototype.enter`. A call with a step and an `Event` while another `enter` of the same gesture is on the stack counts once per event, trusted and untrusted apart.
- **Reporting** (`:282`, `:296`): mismatches and refusals are recorded. `installOracles` registers a reset before each test, and a check after it that fails a test ending with a trusted refusal or an unconsumed mismatch. `takeMismatches()` reads and consumes the mismatches. `equivalenceChecks()` and `refusals()` read the counts. `tests/support/harness.ts` re-exports the three. Its own trusted-refusal check and its `__dragRefused` read are removed.
- **Installation:** `tests/support/oracles.source.ts` wraps the classes from `src`. `.scripts/vitest-config.ts:397` (`DRAG_SOURCE_SETUP_FILES`) installs it in the source `browser` project, and in the engines configuration's `browser` projects for every engine. `tests/support/oracles.build.ts` wraps the emitted `sortable/rect-index.js` and `kernel/gesture.js`. `DRAG_CONSUMER.setupFiles` (`:615`) installs it in the consumer project, after `require-build.ts`. The consumer project's resolver refuses an unpublished `src` module, so the setup imports the emitted paths, under `@ts-ignore`, because those paths have a declaration only after a build. The node project keeps `require-build.ts` only. `shipped` installs nothing. No test reads which build it runs against.
- **Consumption:** `tests/y-geometry.browser.test.ts:220` and `:232`, the grid and the wrapping row, are retitled "…, whose prediction the equivalence oracle rejects", and each now also takes its mismatches (`expect(takeMismatches()).not.toEqual([])`). `:242`, the collapsing-margin self-check, takes them the same way. `tests/equivalence-check.browser.test.ts:49`, `DRD-52`'s test, reads `takeMismatches()` and expects `'the placeholder'`, where it used to expect the development fault's message.

### Liveness (property 5)

`tests/equivalence-check.browser.test.ts` and `tests/refusals.browser.test.ts` leave `DRAG_SOURCE_ONLY_BROWSER_TESTS` and run in the source and consumer projects:

| Test | Source | Consumer |
| --- | --- | --- |
| `equivalence-check.browser.test.ts:42` a plain `y()` column: at least one check, no mismatch | passes | passes |
| `:49` `DRD-52`'s fixture: a mismatch at the placeholder | passes | passes |
| `:66` the collapsing-margin list (rows `70, 55, 30, 90`, swept): a mismatch at a slot | passes | passes |
| `refusals.browser.test.ts:105` a nested synthetic press: `{ trusted: 0, untrusted: 1 }` | passes | passes |
| `refusals.browser.test.ts:28` the press asked for during `activate`: one untrusted refusal | passes | passes |

The consumer project's refusal check used to read 0 and check nothing. It now counts against the published build.

### Witnesses (property 6)

In [`probes/test-side-oracles/witnesses/`](probes/test-side-oracles/witnesses/), each `.diff` with its `.log`, applied to item 3's tree and run in the source and consumer projects:

- **`held-x-removed`:** the oracle compares the placeholder's left and right after the re-read. `equivalence-check.browser.test.ts:49` fails in both projects, and the other two equivalence tests pass.
- **`not-installed`:** no oracle setup in any project. All five liveness tests above fail in both projects: 10 failures. The test that passes in each project is `refusals.browser.test.ts:132`, which asserts 0 trusted refusals, a count that an absent oracle also gives.
- **The rotate fixture's proposals:** the gap proposed at each of the 108 samples of the integer path, from a probe that records each proposal (not committed). The four sequences are `rotate-proposals-*.txt`.
  - At item 3's tree, **the source project's sequence equals the consumer project's at every sample**, `95:1` on the way back included.
  - At the input's code (item 1's tree, development checks on), **they differ at exactly one sample**: on the way back, the source gives `95:2` and the consumer `95:1`. The development check re-measured the window after every committed move, and so discarded the 1.4 × 10⁻⁶ px error (`DRF-46`).
  - Item 3's source sequence equals the input's consumer sequence.

### `DRI-6` (property 8)

[`contract.md`](contract.md): the sentence "Development builds count each event a running pass refuses once, so that the suite can assert this." is deleted. A change-record row is added with property 8's wording. Both are in `953a0fcc6`, the commit that removes `countRefused`.

### Emitted `.js` and size

Against the input's build, with comments stripped by the TypeScript printer: 31 of 33 files are byte-identical. `sortable/y.js` (item 2's JSDoc) and `sortable/linear-shift.js` (`refresh`'s comment) differ only in comments. No file differs in code, and the set of files is the same. `npx just size` prints a table identical to the input's: the same five rows over their ceilings, by the same bytes (`DRO-4`).

## Stops

### `S2-tie-0` doesn't fail (`DRD-65` property 5)

`DRD-65` property 5 says: "With the tolerance at 0, the rotate case fails in the consumer project." It passes. At pointer 95 on the way back, the instrument measures the placeholder's center at 120 and the 30 px row's at 70. That row is not the rotated one, so both distances are exactly 25 px. Property 2 makes a candidate admissible when it is "within 1/8 px of the smallest", and within 0 of the smallest includes equal to it. So at tolerance 0 the tie still admits both gaps. The 1.4 × 10⁻⁶ px error is in `y()`'s prediction, not in the instrument's measurement.

So this fixture witnesses tie admission, not the 1/8 px width. `S2-tie-exact` shows that the case fails as soon as exact ties are broken as the rule breaks them. **What is open:** whether the instrument should read "within" strictly, so that tolerance 0 means the input's instrument; or keep `≤` and take `S2-tie-exact` as the witness; and whether a fixture that witnesses the 1/8 px width is owed. The instrument implements property 2 as worded (`≤`). I haven't changed it.

### `tests/layout-animation.browser.test.ts:266` newly fails (`DRD-67` property 7)

_layoutAnimation composition › should leave a consumer animation on transform running_ fails in the source and consumer projects:

```
Error: the predicted insertion geometry disagreed with a fresh measurement at slot 0
 ❯ tests/support/oracles.ts:303:13
```

The test's own assertions pass. The oracle's after-test check fails it. A consumer animation on `transform` moves the row along x for 10 s, so a fresh measurement differs from the prediction's x. That puts the list outside `y()`'s rule.

**At the input the development check refused the same list.** I stashed item 3 and probed the input with a harness check that throws on any fault after the test. It reported `drag: the predicted insertion geometry disagreed with a fresh measurement at slot 0; the linear shift rule does not hold for this list`. The harness never asserted faults, so the test passed while the drag faulted. The oracle makes the refusal fail the test.

The test is unchanged, as property 7 requires. The fixture isn't one of property 4's named consumers. **What is open:** whether this test consumes its mismatch as a fixture outside the rule, or its fixture changes so that the consumer animation stays inside the rule.

## Checks

- `npx just test` in `packages/drag`, at `953a0fcc6`: **930 tests, 923 passed, 7 failed.** The 7 are the five `size.node.test.ts` ceiling rows, which fail at the input (`DRO-4`), and the stop `layout-animation.browser.test.ts:266` in the source and consumer projects. Every new and changed test passes in the source, consumer and node projects. The first run of item 3 also failed `equivalence-check.browser.test.ts:66` in both projects. That was my liveness fixture: eight 40 px rows crossed by `#r1` produced no slot mismatch. I replaced it with the probe's fixture, which records one.
- `npx just test-engines --project browser --project browser/firefox --project shipped --project shipped/firefox`: **exits 1**, 908 tests, 896 passed, 10 skipped, 2 failed. Both failures are the same stop, `layout-animation.browser.test.ts:266`, in Chromium and Firefox. WebKit didn't run (`DRO-18`).

- `npx just typecheck` in `packages/drag`: exit 0. `npx tsc --noEmit -p tsconfig.json` at the root: no error in `.scripts/`.
- `npx just lint` on every edited `.ts` file in `packages/drag`: exit 0. The `.scripts/` files through `oxlint` and ESLint, as `handoff.md` gives for repository-level files. `.scripts/vitest-config.ts` passes. `.scripts/vite-config.ts` has one ESLint error, `74:23 require-unicode-regexp` (`/\.css\.ts/`), on a line this unit didn't touch. Not fixed.
- `npx just fmt` before and after `lint-fix` on every edited file. Markdown: this report and `contract.md` formatted with `oxfmt`, their links checked by a scratch script that resolves every relative link target, and `git diff --check` clean. Markdown has no linter.

## Open

1. `bench/size/measure.ts` and `bench/compare.ts` still define `__DEV__` (item 3, §`src` and tooling). Property 2 says no configuration defines it, and the handoff's scope lists three files. Removing the define from `compare.ts` breaks `--before` against a revision before `953a0fcc6`.
2. The two stops.
3. `DRF-46` and `DRF-47` stay open until this report is read. `DRF-45` waits for the guarantees unit's proof.
4. `953a0fcc6` has the same subject line as the input commit `f8d07e1c9`. It is left as committed.
5. The mutation and witness logs were filtered from the raw output by a scratch script, which kept the `FAIL`, assertion and summary lines. The raw output isn't kept.

**Next:** the architect, on the two stops and open item 1.