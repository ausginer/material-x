# Handoff: the size re-base, and the cleanup of five open findings

**Recipient:** the implementer. **Branch:** `drag/size-acceptance`. **Input:** the architect's record commit on `drag/size-acceptance` that adds this handoff, from `3228d1f07`.

**Governing records,** in [`00-index.md`](00-index.md):

- `drag:DRD-68`, and §Disposition of the size acceptance;
- `drag:DRF-15`, `DRF-17`, `DRF-18` (required property amended on 2026-11-15), `DRF-21` (how it is shown, decided on 2026-11-15) and `DRF-42`;
- `drag:DRO-19`: the library code that the tests run is the library code that consumers receive.

**Scope:**

- `bench/size/measure.ts`, `bench/compare.ts` and `bench/heap-snapshot.ts`;
- `src/shared/landing.ts`, and `src/shared/timing.ts`, which is deleted;
- `tests/support/` (`harness.ts`, `commands.node.ts`, `browser-commands.ts`, and a new node-side module if item 4 needs one);
- the tests that define `row`, `focusableList` or the shared `makeBox`: `activation`, `keyboard`, `landing`, `order`, `focus`, `commit` and `free-drag`;
- `tests/destruction.browser.test.ts`;
- witnesses under `probes/size-acceptance-cleanup/`.

**Library code changes only in item 2.** No other item changes a file under `src`. A mutation is applied for a run and then reverted. It is never committed.

**Order:** item 1 first, so that the gate checks items 2 to 6. Then items 2 to 6, in any order.

## 1. The five red rows and the control take their readings (`DRD-68`)

In `bench/size/measure.ts`, `COMPOSITIONS`:

| Row                         |    `budget` |   `control` |
| --------------------------- | ----------: | ----------: |
| draggable alone             | 2139 → 2189 | 2024 → 2189 |
| example: drop zone          | 4431 → 4570 |           — |
| freeDrag                    | 4967 → 4985 |           — |
| freeDrag + bounds + landing | 5210 → 5455 |           — |
| complete                    | 7065 → 7150 |           — |

No other figure, graph assertion or row changes.

**Check:** at the commit with this item alone, `npx just size` exits 0, and its table reads the figures above for these five rows. **If a row reads otherwise at the input, stop** and report the table. The architect read these figures at `3228d1f07` after a fresh build.

## 2. `shared/timing.ts` goes (`DRF-15`)

`DEFAULT_LANDING_DURATION` and `DEFAULT_LANDING_EASING` become module-private constants of `src/shared/landing.ts`, with the module's one-line comment. `src/shared/timing.ts` is deleted.

**Expected, from the architect's probe at `3228d1f07`:**

- every row's Brotli figure is unchanged, and "example: drop zone", "freeDrag + bounds + landing" and "complete" each list one module fewer;
- the emitted tree loses `shared/timing.js` and its map. `shared/landing.js` changes, and every other emitted `.js` is byte-identical to the input's.

**A row that grows is a stop** under `DRD-68` property 4. It is not re-based.

## 3. The `tap` command goes (`DRF-17`)

`tap` is removed from `tests/support/commands.node.ts` and from its declaration in `tests/support/browser-commands.ts`. The comment in `tests/click-guard.browser.test.ts` about a synthesized tap stays: it explains why the next click comes from the mouse.

## 4. One definition of each shared helper (`DRF-18`, amended)

Each of these has one definition, and every former site imports it:

- **`row`,** from the five browser tests, and **`focusableList`,** from `keyboard`, `order` and `focus`, with `focus`'s optional parent: in `tests/support/harness.ts`.
- **`makeBox`,** the identical copy in `commit` and `free-drag`: in `tests/support/harness.ts`.
- **The heap snapshot's type, and the reading of its chunks** (subscribe, `HeapProfiler.takeHeapSnapshot`, unsubscribe, parse), from `tests/support/commands.node.ts`'s `countHeapObjects` and `bench/heap-snapshot.ts`'s `takeSnapshot`. It goes in one node-side module, which you choose. `bench/size/measure.ts` already imports from `tests/support`. **Each caller keeps its own garbage collection and its own count:** the test collects once, and the bench enables the profiler and collects twice. The unsubscribe runs even when the snapshot throws.
- **`PROTOTYPE_REVISION`,** from `bench/compare.ts` and `bench/size/measure.ts`.

**Unchanged:** `mount` in `commit` and in `free-drag`, and `makeBox` in `drop-targets`. They share a name, not a body.

**Check:** every test whose file changed passes, with the same titles and assertions.

## 5. `compare.ts` places each bundle line from the bundle's own mapping (`DRF-21`)

`bundle` and `moduleAt` place each line of the lab bundle in the module that holds its source. The placement comes from the bundle's own mapping, such as a source map or Rolldown's module data, and not from comment lines. A line the mapping can't place ends the run with an error. Keys keep their current form: the path under the arm's source root, or the path from the package for any other module. Every arm, including `--before` and the prototype, keys alike.

**Shown by,** at the repaired tree, with each log under `probes/size-acceptance-cleanup/`:

1. **The placement before and after.** For the base arm at the input and at the repaired tree: the key of `RectIndex`'s methods, `directionOf` and `keyboardInsertion`, and the modules that have no marker line at the input.
2. **An allocation in `sortable/rect-index.ts`.** One allocation per call, injected by hand into a `sortable/rect-index.ts` method on the move path, applied for one run of the row _bytes per move by function, 20 items_ and reverted. The reading keys it under `sortable/rect-index.ts`. Save the diff beside the log.
3. **The bytes rule still selects the kernel.** `node bench/compare.ts --prove --only` with the three bytes injections: _1 KB allocated per move_ and _an array of four numbers per sample, in Gesture.enter_ flag, and _one entry on the step list per frame_ stays quiet. Run `--prove --dry` with the same `--only` first. **If one of the three doesn't apply, stop.** The architect dry-ran each at `3228d1f07`, and each applied.

**Not this item's:** the entries that `DRD-45` property 9 holds. A full `--prove`, `--floors` and the other stopped campaigns stay stopped.

## 6. The heap test's sentinel can detect a retained callback (`DRF-42`)

`drag:DRI-10 destruction` › _should retain no item, behavior, view or behavior instance after 3 operations and destruction_ (`tests/destruction.browser.test.ts:381`) meets `DRF-42`'s required property:

- at the sentinel's assertion, nothing the test controls holds the sentinel's object, apart from the callbacks it passed to the controller;
- the test's other assertions, its Chromium-only condition and its operations stay as they are. Its title states what its body checks.

**Witnesses,** each applied for one run and reverted, with logs under `probes/size-acceptance-cleanup/`:

- **A retained callback.** A mutation under `src` that keeps the consumer's options, or one of their callbacks, reachable after `requestDestroy`, and keeps no `SortableBehavior` instance. The sentinel's assertion fails, and the class count passes.
- **The proof's row 3.** A live controller, never destroyed, kept in the test's frame ([proof](reviews/final-cleanup/proof-reviewer.md) §The heap tests release their controllers). The sentinel's assertion fails.
- **Unmutated,** the test passes.

**Return to the architect** if the property needs a change under `src`, or a change to another assertion.

## Checks

- `npx just test` in `packages/drag` exits 0. With item 1, the five size rows pass. **Any failing test is a stop.**
- `npx just test-engines --project browser --project browser/firefox --project shipped --project shipped/firefox` exits 0. WebKit isn't owed locally (`DRO-18`).
- `npx just typecheck` and `npx just lint` in `packages/drag` exit 0 on the edited files.
- The Verify steps of [`handoff.md`](../../../.agents/docs/handoff.md) for every edited file.
- **The size table** after the last item. Every row's Brotli figure equals its reading at the input. "draggable alone" reads exactly 2189, and it is this pass's control row: no item changes a file in its graph.
- **The emitted tree** against a build of the input: only item 2's changes.

**Stops.** A row over its ceiling, or a control that moves (`DRD-68` property 4). A test that newly fails. Any stop named in an item. Report each with its reading or assertion. Don't adjust a test or a figure to pass.

## Report

`packages/drag/.plan/size-acceptance-cleanup-report.md`:

- each item's edits, as `file:line`;
- item 1's and the final size table;
- item 5's three results and item 6's witnesses, with their logs;
- the checks and their results;
- the comparison of the emitted tree;
- any stop, with its reading or assertion;
- the commits.

The unit stops at the pushed report. Next, the architect reads it.