# Feature-composition handoff

**One bounded unit for one implementer.** It repairs `DRF-5` and implements `DRD-33` in [`00-index.md`](00-index.md).

- **`DRF-5`:** `bounds` is measured again in each operation.
- **The landing capability:** the landing animation leaves the lift and becomes the `Landing` capability.
- **The drop-target capability:** `freeDrag` gains the `targets` slot and `dropTargets()`.
- **`RectIndex`:** it meets CONTRIBUTING's class-encapsulation rule.

**Read before starting:**

- **In the index:** `DRD-33`, `DRO-10`, `DRO-11` and `DRF-5`.
- **In [`contract.md`](contract.md):** the public surface and its capability paragraph, DRI-9, DRI-13, DRI-17, DRI-18, DRI-20 and DRI-21.
- **In [`feature-composition-assessment.md`](feature-composition-assessment.md):** §3.2, §3.3, §7 and §10.
- **The prototype's [`README.md`](probes/feature-composition/README.md).**

**The prototype is the reference, not the patch.** [`composition.diff.txt`](probes/feature-composition/composition.diff.txt) and [`rect-index.diff.txt`](probes/feature-composition/rect-index.diff.txt) apply to `688613863`. Port them by item, as below. Where this handoff or `DRD-33` differs from the diff, this handoff and `DRD-33` govern.

**Base:** `drag/feature-composition` at the commit that carries this handoff. Its production tree equals `drag/production`'s `688613863`, which is the tree the prototype was measured against.

- **Before starting, `git diff 688613863 HEAD -- packages/drag/src packages/drag/tests packages/drag/bench packages/drag/package.json packages/drag/files.json packages/drag/typedoc.json packages/drag/README.md` must be empty.** If it isn't, stop and return.
- **If any file in scope has uncommitted changes that aren't yours,** stop and return, without stashing, resetting or rewriting them. Stage only the paths this unit changes, by name.

**WebKit is required.** Run every engine suite after `source ~/.cache/ms-playwright/webkit-env.sh`, as the [execution-boundary report](execution-boundary-report.md) did. Without it, Playwright's WebKit fails to launch on missing host libraries. On 2026-11-09 the architect ran the prototype in all three engines with that script, and WebKit launched. **If WebKit doesn't launch with the script, stop and return.** A Chromium and Firefox result doesn't replace it.

**Do not change:**

- **The kernel:** `src/kernel/*` and `src/draggable.ts`. `draggable alone` must stay byte-identical (C10).
- **`src/free-drag/bounds.ts`.** `DRF-5` is repaired in the host.
- **`sortable`,** apart from the `Landing` type in item 2 and `RectIndex` in item 4. This includes `layout-animation.ts`.
- **The instruments:**
  - every size ceiling and control figure, and `bench/` beyond item 2's and item 3's graph declarations;
  - the per-sample tests.
- **`tests/activation.browser.test.ts`.** Its observation below must stay visible.
- **The `.plan/` records,** apart from your report and its raw output.

**Not authorized:**

- no timing, no `compare.ts` run, and no optimization;
- no re-based ceiling, and no new size row, because a new row needs a ceiling and ceilings wait for `DRO-4`;
- no accepted cost. `DRO-10` approves only the slot's charge;
- no edit, retry, skip or tolerance change in a test to make a run pass, beyond the edits each item lists.

## Work, in order

Four commits, one per item, in this order. Item 5 is the report. Run the handoff loop of [`.agents/docs/handoff.md`](../../../.agents/docs/handoff.md) on each changed file before each commit.

### 1. `DRF-5`: `bounds` after a scroll between operations

**One commit,** with the repair and its regression test. **Files:** `src/free-drag/behavior.ts` and `tests/free-drag.browser.test.ts`.

**The source.** `FreeDragBehavior.activate` invalidates `this.bounds` after the lift's acquisition, before the operation's first `translate`. Nothing else changes.

**The regression test.** Its title or `describe` cites `drag:DRF-5`. The architect's scratch witness is recorded in [`results.txt`](probes/feature-composition/results.txt), and this test may follow it:

- **The arena is inside a scrolling container,** and the test scrolls the container, not the document. In Firefox the document of the test frame didn't scroll in the first witness.
- **The setup:**
  - `bounds(arena)` on a box inside the arena;
  - one drag and release;
  - the container scrolled by enough to move the arena's top by a known amount;
  - then a drag past the arena's top edge.
- **One assertion of one object,** so a failure prints every value. It asserts:
  - the arena's top before the scroll;
  - the arena's top after the scroll, which shows that the scroll happened;
  - the visual's top during the second drag, which must equal the arena's top after the scroll.

**Checks:**

- **The test fails without the source change** in Chromium, Firefox and WebKit. Record each failure message. The architect's witness read box 200, arena 50 in all three.
- **With the change, it passes in all three,** and so does the rest of `tests/free-drag.browser.test.ts`.
- **If it doesn't fail without the change in some engine, stop and return.** The repair would then be unproven there.

### 2. The landing capability

**One commit.** Port these hunks from `composition.diff.txt`:

- `src/lift.ts`;
- `src/lift/landing.ts`, a new file;
- `src/shared/landing.ts` and `src/shared/timing.ts`;
- `src/free-drag/landing.ts`, `src/sortable/landing.ts` and `src/sortable/behavior.ts`;
- in `src/free-drag/behavior.ts`, only the `Landing` type of the `landing` key and field.

**Required properties:** `DRD-33`'s landing capability, and `DRD-29` and `DRD-27` as amended.

- `land(x, y, landing)` requires its `Landing`. It calls `timing` once, copies `duration` and `easing`, and keeps the `Landing`. It keeps no object that `timing` returned. When `timing` throws, nothing is recorded.
- The release disposer calls the recorded `start` right after the release. It reads the displacement and the landing's offset at release, as now, and the `Lifter` keeps the returned cancel.
- `lift.ts` has no animation code, no elevation constant and no default timing, and imports nothing from `shared/timing.ts`.
- **Every other behavior of the lift is unchanged:**
  - acquisition, release and the failed-acquisition path;
  - the grab during a landing;
  - `cancelLanding`;
  - the order of the two disposers that `acquire` registers.

**Packaging for `lift/landing.js`:**

- the `exports` entry in `package.json`, and `lift` in its `files`;
- `lift/landing` in `files.json`'s `runtime`;
- the entry point in `typedoc.json`;
- `ENTRIES` in `tests/exports.node.test.ts`.

**Documentation:**

- the JSDoc of `land`, `Landing` and `landing()`;
- `README.md`'s lift section: `land(x, y, landing)`, `landing` from `lift/landing.js`, and that without a landing nothing animates. The default timing is no longer the lift's.

**Test edits allowed, and no assertion changes:**

- the five `land` call sites that named no `Landing` or passed a timing function:
  - three in `tests/landing.browser.test.ts`;
  - one in `tests/authoring.declaration.test.ts`;
  - two in `tests/fixtures/drop-zone.ts`;

  Each now passes `landing()`, or `{ ...landing(), timing }` where a timing function was passed;

- the title of "should give every landing zero duration with reduced motion, including a custom behavior with no timing", whose last case no longer exists. For example: "…, including a custom behavior's `landing()`".

**New test:** "should start no animation when no landing is composed", in `tests/landing.browser.test.ts` under `drag:DRI-13`, from the prototype's test of that name.

**Size graph declarations:**

- **`example: drop zone`** now composes `landing()`. `shared/landing` moves from its `absent` list to `present`, and `layout-animation` stays absent.
- **`draggable + lift`** already declares `shared/landing` absent. It is now the witness that the lift carries no landing.
- Nothing else changes in `bench/size/measure.ts`.

**Checks:**

- typecheck;
- `npx just test`;
- `tests/landing.browser.test.ts`, `tests/activation.browser.test.ts` and `tests/authoring.declaration.test.ts` in all three engines.

The `DRF-3` witness passes with only its call-site edit.

### 3. The drop-target capability and the `targets` slot

**One commit.** Port the rest of `composition.diff.txt`:

- `src/free-drag/drop-targets.ts`, a new file;
- `src/free-drag/behavior.ts`'s slot changes;
- `src/free-drag/operation.ts`, `domain.ts` and `geometry.ts`;
- `src/free-drag.ts`'s comment.

**Required properties:** `DRD-33`'s drop-target capability, C4 and C6, and the contract's DRI-21.

- **The factory's order is allocation, then `drag.use`, then `targets()`.** No statement that can run consumer code comes before the registration.
- **`FreeDragOperation` holds the tracker** in a `readonly` private field. `FreeDragBehavior` gains no field. No `null`-between-operations field, and no non-null assertion on operation state.
- **The operation is the invalidation listener,** through `handleEvent()`, which reaches the bounds and the tracker. It is registered when `bounds` or `targets` is configured. The behavior's `invalidate` step receives the operation or `null`, and reaches the operation's `handleEvent` when there is one.
- **Item 1's activation invalidation stays.** It may move only where it still precedes the first `translate`.
- **The request carries `target`.** It is `null` without the capability.

**Packaging for `free-drag/drop-targets.js`:**

- the `exports` entry in `package.json`. `free-drag` is already in `files`;
- `free-drag/drop-targets` in `files.json`;
- the entry point in `typedoc.json`;
- `ENTRIES` in `tests/exports.node.test.ts`.

**Documentation:**

- the JSDoc of the capability, its types, the `targets` key and the request's `target`;
- `README.md`'s free-drag section: one example with `dropTargets`, the `data-drop-over` attribute, the request's `target`, and that an accepted drop stays where it was dropped (`DRO-11`'s default).

**Tests.** Port the prototype's `tests/feature-composition.browser.test.ts`, without its "the lift without the landing capability" block, which item 2 placed:

- **`tests/drop-targets.browser.test.ts`** holds the seven `freeDrag + dropTargets` tests under `drag:DRI-21`, and "one config across controllers", which cites `drag:DRD-33`'s C2;
- **the throw test** asserts what the prototype's does: one fault with the thrown value as `cause`, the lift restored, nothing marked, no `onEnd`, and a working next drag.

**Size graph declarations:** `freeDrag` and `freeDrag + bounds + landing` add `free-drag/drop-targets` to their `absent` lists. That is the witness that a composition without the capability carries none of its code (C7). No other change.

**The slot's charge.** Read `freeDrag`, `freeDrag + bounds + landing` and, with the composition probe, `freeDrag + landing`, at this commit and its parent.

- **`DRO-10` covers up to 45 B Brotli** on each of them.
- **Above that,** finish the unit and put the figure to the owner in the report as not covered. Don't optimize to bring it under.

**Checks:**

- typecheck;
- `npx just test`;
- the new file and `tests/free-drag.browser.test.ts` in all three engines.

**Mutations, in Chromium.** Apply each to this commit's source, run `tests/drop-targets.browser.test.ts`, record the failing tests or none, and revert. Commit none of them.

|  | Mutation | Prototype |
| --- | --- | --- |
| M1 | The release no longer removes the mark | 5 failed |
| M2 | The invalidation step no longer reaches the operation | 1 |
| M3 | The operation's `handleEvent` no longer reaches the tracker | 2 |
| M4 | No invalidation listener without `bounds` | 1 |
| M5 | `drop()` cancels the frame but doesn't resolve | 1 |
| M6 | The release no longer cancels the frame | 0 |
| M7 | `targets()` pulled before the release is registered | 0 |
| M8 | Item 1's activation invalidation removed, run against `tests/free-drag.browser.test.ts` | Not run. `DRF-5`'s test must fail |

**M6 and M7 are known limits, not defects to fix in tests:**

- **M6.** A late frame's `requestStep` through a released `Drag` does nothing (DRI-8), so the cancel is cleanup.
- **M7.** Nothing that needs release exists before the pull, so the order can't be observed. The order is required by C4 and is checked by reading.

**The throw test also passes against the first prototype,** whose defect was retention that no behavior shows. So the report doesn't claim that a test witnesses the ordering or the ownership. Those are read from the source.

**A mutation that fails differently from the prototype's figure is a result.** Report it, and don't change a test without returning first.

### 4. `RectIndex` under the class-encapsulation rule

**One commit.** **Files:**

- `src/sortable/rect-index.ts`;
- its readers in `y.ts`, `xy.ts` and `linear-shift.ts`, only where they read through the new getters;
- the `ReadonlyFloat64Array` type, if it needs `slice`.

`rect-index.diff.txt` is the reference.

**Required properties.** These are CONTRIBUTING's Part I "Class encapsulation" as `DRD-33`'s choice 9 applies it:

- every mutable member is `#private`;
- `values`, `count`, `items` and `placeholderRect` are read through getters typed as read-only views;
- nothing is frozen, copied or allocated per read;
- each axis reads the getters once per resolution, outside the candidate loop;
- the development check `verifyEquivalence` reads through the class.

**Checks:**

- typecheck;
- `npx just test`;
- the sortable, hot-path and landing files in all three engines.

### 5. The report

Write `feature-composition-report.md` in this directory, commit it with its raw output under `probes/feature-composition/implementation/`, and push. It records:

- **Commits:** the base and each item's commit.
- **The diffs,** with an argument for each order property in items 1 and 3.
- **Item 1:** the regression test's failure messages without the change, per engine, and its passes after.
- **Item 3:** the mutation table, with each failing assertion.
- **Suites:**
  - `npx just test` at the base and after each item, with every failure listed against the base's;
  - `npx just test-engines` in three engines, after item 1 and at the end. **At the end, three full runs.**
- **Size:**
  - `node bench/size/measure.ts` at the base and after each item, minified and Brotli, with each change attributed to the item that caused it;
  - the composition probe [`compose.ts.txt`](probes/feature-composition/compose.ts.txt), copied to `bench/compose-probe.ts` for the run and not committed, at the base and at the end, for the rows the instrument lacks: `draggable + lift + landing`, `freeDrag + landing`, `freeDrag + dropTargets` and `freeDrag + dropTargets + landing`;
  - the slot's charge against `DRO-10`.
- **Allocation, counted by reading,** with the [ownership report](ownership-report.md)'s rules:
  - per `freeDrag` activation with and without `dropTargets`, and per measurement of the targets;
  - per lifted activation with and without a landing;
  - nothing per sample, which the per-sample tests and the code show.
- **Every cost,** reported and not accepted, beside the assessment's figures.
- **Limits:** M6, M7, the throw test's limit, C8 for `dropTargets` established by reading only, and the observation below.

**Stop after the report.** Don't start the combined review.

## The unexplained landing-test failure

**Observed once, not reproduced, not attributed.**

- **The failure:** `tests/activation.browser.test.ts` › "drag:DRI-13 a grab during a landing" › "should keep the visual under the pointer during a rejected landing", in Chromium, in the second of three two-engine runs of the prototype.
- **The test:** a `sortable` grab during a 20 s linear landing.
- **What isn't recorded:** the failing assertion's message.
- **Runs without the failure:**
  - the other two prototype runs, and the first version's two runs;
  - eight isolated runs of the block in each of Chromium and Firefox;
  - on 2026-11-09, three-engine runs of the prototype by the architect, recorded in the assessment's §7;
  - the base's one two-engine run.
- **Code relevant to it:** the prototype's two versions don't differ there. Item 2 does change it relative to the base: the landing's `start` moves out of the lift. So the failure isn't excluded from item 2's scope.

**What this unit owes:**

- **Twenty runs of that `describe` block in each engine, at the base and again after item 2,** with `-t "a grab during a landing"`. Record each failure with its engine, run number and full assertion message.
- **If it fails after item 2 and never at the base,** finish item 2's checks, then stop and return before item 3. It is then a candidate regression of the landing split.
- **Otherwise,** record the counts and continue. A failure in the final three full runs is recorded the same way.
- **Don't edit, retry or skip the test.**

## Closing

The closing message names the last commit, the report's path, every cost reported and not accepted, any figure that `DRO-10` doesn't cover, and the flake counts. The owner reads the costs. The combined review is a separate unit.