# Performance window report

**Input:** [`performance-window-handoff.md`](performance-window-handoff.md), carried by `63cf79df4` on `drag/performance`. **Governing records:** `DRD-49` in [`00-index.md`](00-index.md), with `DRD-47`, `DRD-46` property 8, `DRD-40` properties 4, 6 and 7, `DRD-44` property 6 and `DRD-45` property 9, and [`performance-plan.md`](performance-plan.md) §2 P3. **Base for comparison:** `packages/drag/src` at `71f20df20`.

**Outcome: complete, confirmed.** `y()` measures a window of slots that grows from the placeholder's gap toward the pointer. A full measurement happens no longer at the activation or after an invalidation. "50 activate-and-drop cycles, 2000 items, no landing" is "faster" in `scriptUs`: −2,508 µs per cycle against an A/A bound of 427 µs, lower in all 7 rounds. No row is "slower" on any measure, and no layout count is above base. The activation through its first frame reads 6 layout values at 20 and at 400 items in Chromium, Firefox and WebKit, against 24 and 404 at `71f20df20`'s source. "sortable + y" and "sortable + xy" end exactly at their Brotli ceilings, with 0 B left on each. No return condition was met.

**Owner approval.** The owner accepted `DRD-49`'s scope for `y()` and its ordering term: the narrowing of `y()`'s terms to rows whose centers increase along y in the collection's order. The owner stated this in the request that started this unit, on 2026-11-12. The same request deferred virtualized-list support until after 1.0.0, as [`performance-plan.md`](performance-plan.md) §5 records, and this unit doesn't implement it. This report records the approval beside the results, for the architect to record under `DRD-49`. The bytes below are still the owner's to accept (`DRD-40` property 6).

| Commit | Content |
| --- | --- |
| `501f60ab7` | Items 2, 3 and 4: the window, W5 and W6, the `DRI-14` paragraph with its change record row and current-state sentence, `y()`'s documentation, and the README sentence |
| the commit carrying this report | This report, and the records under `measurements/` |

## Item 1: the base

`git diff --stat 71f20df20 HEAD -- packages/drag/src packages/drag/tests` at `63cf79df4`, before any change: **empty**.

## Item 2: the window

**The mechanism.**

- **`RectIndex`** (`sortable/rect-index.ts`) holds every slot's element, and measured geometry for the slots from `first` to before `end`.
  - `collect(snapshot, dragged, placeholder, slot)` runs only when the cache is stale: dirty, or measured at another collection version. It collects every slot's element, measures the placeholder, and leaves an empty window at `slot`.
  - `measure(lo, hi, getBox, displacement)` measures a range of slots through `box`, settles them through the sink when one is composed, and adds them to the window.
  - `refresh`, which `xy()` calls, is `collect` at slot 0 followed by `measure` over every slot when the window is empty, so `xy()`'s window is the whole list.
- **The growth** is in `linearShift.refresh` (`sortable/linear-shift.ts`), which now takes the pointer's y. After `collect`, it compares the pointer with the placeholder's center. Below it, the window grows down from its end, one slot at a time, while the window is empty or its last slot's center is above the pointer. Above or level with it, the window grows up from its first slot, while the window is empty or its first slot's center is below the pointer. Growth stops at the list's end on that side.
- **The scan** in `y()` (`sortable/y.ts`) runs from `first` to before `end`, with the placeholder as the incumbent and the same strict comparison, so the first in order wins a tie.
- **Reads.** A slot is read only by `measure`, and only when growth adds it to the window, so it is read at most once between two invalidations. A resolution whose window already brackets the pointer reads no slot, and still reads the placeholder when a committed move marked it stale, as before. The window grows only toward the pointer, so a slot on the other side of the placeholder is never read.
- **The cache's other users.** `moved`'s crossed slots run from the old gap to the new one, and the new gap is next to the nearest center, which is in the window. So `advance` and the probe at the lower crossed slot use window slots. `invalidate`, `retire`, a rebase (through `invalidate`) and a changed collection version make the next `collect` start an empty window.
- **The development check** (`verifyEquivalence`) copies the window and the placeholder, marks the cache stale, collects again with an empty window at `first`, measures every slot from `first` to before `end` again, and compares. It also compares every slot's element and the slot count. It compares no fewer slots than the window holds.

**The unit's three choices.**

1. **Where the window's state lives: in `RectIndex`, as `#first` and `#end`.** The cache's other users read it: the confirmation chooses a window end, the development check compares the window, and the cache's own staleness discards it. `xy()`'s `refresh` sets the window to every slot, so the confirmation's window rule gives `xy()` the list ends it read before. The growth, the only rule that is specific to `y()`, is in `linear-shift.ts`, so an `xy()` composition doesn't carry it, as that module's header asks. `RectIndex` is one class shared by both axes, so `collect`, `measure` and the two getters are in both compositions. That is the cause of the "sortable + xy" change under item 6.
2. **The first gap when the query holds no insertion: slot 0.** The window starts at the start of the list and grows down. `SortableOperation` always holds an insertion, from its constructor on, so this is only the null case of `AxisQuery`'s type.
3. **The confirmation's slot: the window end farther from the placeholder's gap,** `end - gap > gap - first ? end - 1 : first`. `DRD-49` names this under "What this amends". When the window is the whole list it is `DRD-47`'s expression, `gap * 2 < count ? count - 1 : 0`, so `xy()`'s confirmation is unchanged. `DRD-47`'s reason holds within the window: committed moves displace the slots next to the gap, so the farther end is the least likely to carry a running animation. An empty window, like a stale cache, reads nothing.

**What the size budget changed in the shared code.** The first form of the window kept `refresh`'s loop and added `collect` and a one-slot `measure` beside it. It read +275 B Brotli on "sortable + y" and +177 B on "sortable + xy", over the 155 B and 51 B that were left, which is a return condition. Three changes removed the duplication. Each one was measured before the next was made:

- **`refresh` is `collect` plus `measure` over every slot.** `xy()` still measures every slot through `box`, settles them in one call, and measures the placeholder. Two orders changed: the placeholder is read before the slots instead of after them, and nothing is written to the tree between the reads, so the values are the same. The sink receives `values.subarray(0)` instead of `values`, which is one view allocated per `xy()` rebuild with a sink composed. `measure` passes `items` itself for a range that starts at slot 0. It copies the elements only for a range after slot 0, which is `y()`'s growth.
- **One `pack` function** writes a rect into the six fields. `measure`, `collect`'s placeholder and the confirmation's scratch use it. The confirmation now also writes the scratch's two center fields, which it doesn't compare.
- **The slot count is the element array's length** (Part II §5). `collect` already truncated the array to the count, so `#count` held the same fact twice.

`remeasurePlaceholder` is unchanged. Making it call `pack` saved about 20 B more. It would also write the placeholder's x fields from the read that follows a move, and so the development check's x comparison of the placeholder would compare a value with itself. That weakens the check, and the placeholder's measurement is outside this unit's boundaries, so the change was reverted.

**Inferred, not measured:** that `pack`'s call per slot and the one view per rebuild cost `xy()` nothing measurable. No row in item 5 composes `xy()`. With a sink, `y()`'s growth allocates a view and a copy of one element per slot it reads. Without a sink it allocates nothing more. The allocation tests below don't compose a sink.

## Item 3: the witnesses

| Witness | Where | With the change (Chromium, Firefox, WebKit) | At `71f20df20`'s source | Mutation | Mutation result |
| --- | --- | --- | --- | --- | --- |
| **W5** | `tests/hot-path.browser.test.ts`, "drag:DRD-49 should read as many rects from the activation through its first frame for 20 items as for 400" | Pass in all three: 6 reads at both counts | **Fails in all three:** "expected 404 to be 24" | **M5:** `linearShift.refresh` calls `index.refresh`, which measures every slot, in place of `collect` | **Fails in all three:** "expected 404 to be 24". W6 passes |
| **W6** | `tests/sortable.browser.test.ts`, "drag:DRD-49 should hold the gap a measurement of every row gives, across 20 rows of two heights down and back up" | Pass in all three | **Passes in all three** | **M6:** the scan leaves out the window's slot on the pointer's side when that slot brackets the pointer, which is the window one slot short of bracketing | **Fails in all three:** "at 47 px: expected 1 to be 2". W5 passes |

- **W5.** In the census, the test presses `#r0`, starts counting, moves 20 px down in two steps, and waits two frames. The drag activates, and the first frame resolves. The pointer is within one row of the placeholder. It counts layout reads at 20 items and at 400, and releases the pointer after each count. Both drags end in `noop`.
  - By arithmetic, not by a per-call count: 24 at 20 items is 4 reads that don't depend on the count, the placeholder and 19 rows, and 404 at 400 items is the same 4, the placeholder and 399 rows. The landed 6 are then the same 4, the placeholder and one row, the row below the placeholder that brackets the pointer.
  - The landed counts were read with a temporary failing assertion that printed both. The record holds that assertion as a diff and the output, and the assertion was reverted.
  - **A discarded form of W5.** The first form ended each drag with `Escape` and left the pointer pressed. In WebKit, the second list's press was then not a new press, only one drag started, and the test failed on its count of `start` entries. Releasing the pointer fixed it in every engine. That run's output was overwritten by the next run and not kept.
- **W6.** 26 rows alternate between 20 px and 34 px, so no center is a multiple of one row height. The page doesn't scroll. The drag presses `#r0`, passes the threshold, and then moves in 9 px steps from 29 px to 596 px below the press, and back up to 6 px, with two frames after each step. Before each step, the test measures every row and the placeholder, and computes `y()`'s rule at the step's pointer position: the nearest center, the first in order among equals, and the placeholder's center as the incumbent. After the frames, the placeholder's gap must equal that gap. The geometry is measured before the move, because a resolution moves the placeholder and the rows. The drag reaches gap 20 or deeper, returns to gap 0, and drops as `noop`. W6 runs in the development project, so the development check runs at every frame after a committed move. It didn't throw in any engine.
- **Why 9 px.** The nearest row changes halfway between two adjacent centers. With 20 px and 34 px rows and a 20 px placeholder, half of that distance is at least 10 px, so a 9 px step lands in every interval where the answer changes.
- **The existing tests** "should re-measure on scroll during a drag, nested scrollers included", `DRD-47`'s W1 and W2, and every census test, including "should read no layout in a sample, and none in a frame with nothing stale", pass in the suites under item 6.

**Where they ran.** Every witness and mutation run used `vitest.engines.config.ts`, after `source ~/.cache/ms-playwright/webkit-env.sh`, on the working copy before `501f60ab7`. The runner copied each variant's `rect-index.ts`, `linear-shift.ts` and `y.ts` into `src/sortable`, and restored the landed files after the run. Each record's head is the variant's diff against the landed files, and the landed run's diff is empty. The `71f20df20` run used that commit's three files with this unit's tests. The source and tests in `501f60ab7` are the ones these runs used. The three-engine suite at `501f60ab7` also covers W5 and W6.

Records: [`2026-11-12-window-witnesses.txt`](measurements/2026-11-12-window-witnesses.txt), [`2026-11-12-window-witnesses-at-71f20df20.txt`](measurements/2026-11-12-window-witnesses-at-71f20df20.txt), [`2026-11-12-window-mutation-M5.txt`](measurements/2026-11-12-window-mutation-M5.txt), [`2026-11-12-window-mutation-M6.txt`](measurements/2026-11-12-window-mutation-M6.txt), the landed counts [`2026-11-12-window-activation-reads.txt`](measurements/2026-11-12-window-activation-reads.txt) with their probe [`2026-11-12-window-activation-reads-probe.diff.txt`](measurements/2026-11-12-window-activation-reads-probe.diff.txt), and the runner [`2026-11-12-window-witness-runner.sh.txt`](measurements/2026-11-12-window-witness-runner.sh.txt). The runner filters Vite's dynamic-import warning out of the saved output.

## Item 4: the contract, the terms and the README

All of these are in `501f60ab7`, the same commit as item 2.

- **`DRI-14`'s Geometry paragraph** in [`contract.md`](contract.md) is `DRD-49` property 5's text, word for word.
- **The change record** has a row dated 2026-11-12 for `DRI-14` that names `DRD-49`.
- **The current-state paragraph** has a sentence that names `DRD-49` and links this report. The link resolves from the commit that carries this report.
- **`y()`'s published documentation** states the order term: the rows' centers must increase along y in the collection's order, and a reversed column, a row that isn't rendered, or a transform that carries a row's center past a neighbor's is outside the rule. It also says that a resolution measures only rows it hasn't measured since the last scroll, resize or `invalidate()`. The module's internal header states the same term and the reads.
- **The README's sortable paragraph** says that with `y()` the library measures only the rows between the placeholder and the pointer. So the rows' centers must follow the list's order along y, and a reversed column, or a transform that moves a row's center past a neighbor's, isn't supported.

## Item 5: the confirmation run

From `packages/drag`, at `501f60ab7`, one process after the other:

```sh
node bench/compare.ts --before 71f20df20 --only "activate-and-drop cycles" --out .plan/measurements/2026-11-12-window-cycles.json
node bench/compare.ts --before 71f20df20 --only "moves, one frame each" --out .plan/measurements/2026-11-12-window-moves.json
```

- **Selection, checked in each output before any verdict.** The first process ran exactly five rows: the four CDP rows "50 activate-and-drop cycles, {20, 2000} items, {no, with} landing", and "in the page: 50 activate-and-drop cycles, 20 items, no landing". The second ran exactly five rows: "300 moves, one frame each" at 20 and 2000 items, their two in-page mirrors, and "free drag, 300 moves, one frame each", the control.
- **Two browser processes**, each exit 0, at 7 rounds, with arms `before` (`71f20df20`), `production` and `control`. They used the unchanged `judge` and A/A control, and applied no injection. Chrome 157.0.8103.38.
- **The hold.** The owner confirmed the hold before the first browser started, at 2026-11-12T02:24:37Z. The cycles process ran from 02:24:37 to 02:38:05, and the moves process from 02:38:05 to 02:52:29. The owner confirmed the release at 02:52:49. Nothing else from this session ran between the hold and the release.
- **The machine record**, at the head and the foot of each process: Node v26.13.0, 12 CPUs, 12th Gen Intel Core i7-1255U, `cpu_core` 0–3, `cpu_atom` 4–11. Load average 6.01, 10.61, 16.20 at the cycles head, 1.55, 2.26, 7.75 at the cycles foot and the moves head, and 3.73, 2.33, 4.22 at the moves foot. About 25 minutes before the hold, the load average was 32.81, from the owner's other sessions. The 15-minute figure at the first head still carries some of that.

Records: [`2026-11-12-window-cycles.json`](measurements/2026-11-12-window-cycles.json), [`2026-11-12-window-moves.json`](measurements/2026-11-12-window-moves.json), the console output with the machine record [`2026-11-12-window-cycles.txt`](measurements/2026-11-12-window-cycles.txt) and [`2026-11-12-window-moves.txt`](measurements/2026-11-12-window-moves.txt), the wrapper [`2026-11-12-window-record-wrapper.sh.txt`](measurements/2026-11-12-window-record-wrapper.sh.txt), which is the earlier units' wrapper unchanged, and the hold [`2026-11-12-window-hold.txt`](measurements/2026-11-12-window-hold.txt).

**Verdicts against `before`**, as `judge` printed them. "Higher" counts the rounds in which `production` read higher than `before`. The arm medians are from the JSON summary. Layout counts are totals over the row.

**The cycles process.** Time medians are per cycle.

| Row | Measure | Verdict | Higher in | Median difference | A/A bound | `before` median | `production` median |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CDP, 20 items, no landing | layouts | at or below | — | — | — | 250 | 250 |
|  | `scriptUs` | no difference shown | 3 of 7 | −72 µs | 361 µs | 2,097 | 2,130 |
|  | `taskUs` | no difference shown | 4 of 7 | 91 µs | 2,469 µs | 11,529 | 11,810 |
| CDP, 20 items, with landing | layouts | at or below | — | — | — | 350 | 350 |
|  | `scriptUs` | no difference shown | 1 of 7 | −108 µs | 554 µs | 2,371 | 2,319 |
|  | `taskUs` | no difference shown | 2 of 7 | −883 µs | 3,361 µs | 13,781 | 13,643 |
| **CDP, 2000 items, no landing (target)** | layouts | at or below | — | — | — | 250 | 250 |
|  | **`scriptUs`** | **faster** | **0 of 7** | **−2,508 µs** | **427 µs** | **4,510** | **2,002** |
|  | `taskUs` | no difference shown | 2 of 7 | −467 µs | 5,619 µs | 27,347 | 26,879 |
| CDP, 2000 items, with landing | layouts | at or below | — | — | — | 350 | 350 |
|  | `scriptUs` | faster | 0 of 7 | −2,272 µs | 235 µs | 4,583 | 2,178 |
|  | `taskUs` | no difference shown | 2 of 7 | −1,151 µs | 5,334 µs | 30,382 | 29,351 |
| In the page, 20 items, no landing | layouts | at or below | — | — | — | 250 | 250 |
|  | `scriptUs` | no difference shown | 2 of 7 | −90 µs | 266 µs | 1,613 | 1,627 |
|  | `taskUs` | no difference shown | 3 of 7 | −247 µs | 831 µs | 5,704 | 5,797 |

**The moves process.** Time medians are per row run of 300 moves.

| Row | Measure | Verdict | Higher in | Median difference | A/A bound | `before` median | `production` median |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CDP, 20 items | layouts | at or below | — | — | — | 83 | 83 |
|  | `scriptUs` | no difference shown | 5 of 7 | 9 µs | 49 µs | 182 | 196 |
|  | `taskUs` | no difference shown | 3 of 7 | −2 µs | 561 µs | 2,234 | 2,323 |
| **CDP, 2000 items** | layouts | at or below | — | — | — | 83 | 83 |
|  | `scriptUs` | no difference shown | 3 of 7 | −3 µs | 24 µs | 192 | 177 |
|  | `taskUs` | no difference shown | 4 of 7 | 125 µs | 347 µs | 2,956 | 2,884 |
| Free drag (control) | layouts | at or below | — | — | — | 0 | 0 |
|  | `scriptUs` | no difference shown | 6 of 7 | 8 µs | 21 µs | 118 | 125 |
|  | `taskUs` | no difference shown | 6 of 7 | 174 µs | 333 µs | 1,748 | 1,921 |
| In the page, 20 items | layouts | at or below | — | — | — | 83 | 83 |
|  | `scriptUs` | no difference shown | 5 of 7 | 1 µs | 44 µs | 146 | 141 |
|  | `taskUs` | no difference shown | 2 of 7 | −20 µs | 266 µs | 1,016 | 967 |
| **In the page, 2000 items** | layouts | at or below | — | — | — | 83 | 83 |
|  | `scriptUs` | no difference shown | 3 of 7 | −5 µs | 28 µs | 148 | 128 |
|  | `taskUs` | no difference shown | 3 of 7 | −46 µs | 363 µs | 1,813 | 1,700 |

**Beside the target:**

- **The landed 2,000-item cycle row** is "faster" in `scriptUs` too: −2,272 µs against a bound of 235 µs, lower in all 7 rounds.
- **The 2,000-item move rows**, CDP and in the page, show "no difference shown" on every measure, with layouts at base. The move rows' medians differ by less than their bounds in both directions. No move row reads "slower".
- **The control** "free drag" moves by less than its bound on both measures. It is "no difference shown" on both, and higher in 6 of 7 rounds. `judge` requires every round, so this is not "slower", and the free-drag modules are not in this unit's change.

**Against the estimate.** `DRD-49` cites 2,650 µs for the activation's first resolution at 2,000 items. The measured difference of 2,508 µs per cycle is close to it. The target row's `before` median, 4,510 µs, is about `DRD-47`'s landed `production` figure of 4,163 µs plus noise. So `71f20df20` still measured every row at the activation, and this unit removed that measurement.

**Result by item 5's table: confirmed.**

## Item 6: the other checks

All three ran after the release, at `501f60ab7`, one after the other.

- **The three-engine suite** (`vitest.engines.config.ts`, with the WebKit environment script): 1,059 passed and 18 skipped, in 72 files, with no failure. The development equivalence check threw at no frame in any engine. Record: [`2026-11-12-window-engines.txt`](measurements/2026-11-12-window-engines.txt).
- **The per-sample and census tests** (`tests/hot-path.browser.test.ts`, Chromium, the `shipped` project): 9 passed. That includes W5, `DRD-47`'s W2, "should read no layout in a sample, and none in a frame with nothing stale", both allocation tests, and "should run no consumer callback per sample". Record: [`2026-11-12-window-hot-path.txt`](measurements/2026-11-12-window-hot-path.txt).
  - **During the unit**, before the hold, a load average of about 32 from other sessions made the two allocation tests time out in Chromium. They timed out the same way with `71f20df20`'s source in the same minute. They pass here, and in the three-engine suite.
- **The Chromium suite** (`vitest.config.ts`, on the working copy before `501f60ab7`): every browser test passed. Five rows of `size.node.test.ts` failed: "draggable alone", "example: drop zone", "freeDrag", "freeDrag + bounds + landing" and "complete". The first four fail the same way with `71f20df20`'s source. "complete" was red at `71f20df20` and grows by this change. Output wasn't kept: the suite under item 6 replaces it, and the size table below gives every row.

**The size table** (`node bench/size/measure.ts`, at `501f60ab7` and with `src` checked out from `71f20df20`, run one after the other, `src` restored after the base run):

| Composition | `71f20df20` min / br | `501f60ab7` min / br | Change | Ceiling (br) |
| --- | --- | --- | --- | --- |
| draggable alone (control) | 6,733 / 2,197 | 6,733 / 2,197 | 0 | 2,139, red at both |
| draggable + lift (control) | 11,544 / 3,974 | 11,544 / 3,974 | 0 |  |
| example: resize handle (control) | 9,390 / 3,310 | 9,390 / 3,310 | 0 |  |
| example: drop zone (control) | 13,183 / 4,610 | 13,183 / 4,610 | 0 | 4,431, red at both |
| example: canvas group (control) | 9,526 / 3,306 | 9,526 / 3,306 | 0 |  |
| freeDrag (control) | 15,201 / 5,036 | 15,201 / 5,036 | 0 | 4,967, red at both |
| freeDrag + bounds + landing (control) | 16,366 / 5,476 | 16,366 / 5,476 | 0 | 5,210, red at both |
| **sortable + y** | 20,364 / 6,578 | 20,766 / 6,733 | **+402 / +155** | 6,733: green, 0 B left |
| **sortable + xy** | 20,159 / 6,566 | 20,324 / 6,617 | **+165 / +51** | 6,617: green, 0 B left |
| **complete** | 22,041 / 7,207 | 22,443 / 7,362 | **+402 / +155** | 7,065: red at both, 142 B over before, 297 B over now |

- **The control** is every row without `sortable`, and each reads 0. Module counts are unchanged in every row.
- **Where the bytes are in "sortable + y"** and "complete": `collect`, the range `measure` and its settling, the two window getters, the growth loops in `linear-shift.ts`, the confirmation's window rule, and `pack`, less what `pack` and the derived count removed from `refresh`, the placeholder write and the confirmation.
- **"sortable + xy", +51 B Brotli, with its cause.** `RectIndex` is one class shared by both axes, and a class's methods are not tree-shaken. So `xy()` carries `collect`, `measure`'s range settling, the window fields and getters, and the window rule in `holds`, though it uses the window only as the whole list. The growth loops are in `linear-shift.ts` and are not in this composition. `pack` and the derived count give back part of the cost.
- **Budgets.** No row that is green at `71f20df20` turns red. The two sortable rows each end at their ceiling exactly, which `violations` accepts (`brotli > budget` is the violation), so any later byte on either row turns it red. "complete" was already red and is now 297 B over. No ceiling is re-based.
- **The trade-off for the owner (`DRD-40` property 6).** 155 B Brotli on "sortable + y" and "complete", and 51 B on "sortable + xy", for about 2.3 to 2.5 ms less script per drag at 2,000 items. At 20 items no saving was shown, and no move row changed.

Records: [`2026-11-12-window-size.txt`](measurements/2026-11-12-window-size.txt), and [`2026-11-12-window-size-base.txt`](measurements/2026-11-12-window-size-base.txt), whose head says that `src` was checked out from `71f20df20` for that run. `measure.ts` doesn't print a header, so each record's first three lines were added: the command, the revision and the machine.

## Verification

| Check | Result |
| --- | --- |
| Item 1 | Empty |
| `git diff --stat 63cf79df4..HEAD -- packages/drag` | `src/sortable/{rect-index,linear-shift,y}.ts`, `tests/hot-path.browser.test.ts`, `tests/sortable.browser.test.ts`, `.plan/contract.md`, `README.md`, this report and `measurements/` |
| W5 and W6 | Pass in Chromium, Firefox and WebKit. W5 fails and W6 passes at `71f20df20`'s source, in all three |
| M5 and M6 | M5 fails W5, and M6 fails W6, in all three engines |
| Item 5 | Two processes, each exit 0, with all ten selected rows judged |
| Changed `.ts` files | `just fmt`, `just lint-fix`, `just fmt`, then `just lint`, which is clean. `just typecheck` passes |
| Markdown | `just fmt` on this report, `contract.md` and `README.md`. Links checked with a scratch script. `git diff --check` is clean on the Markdown files. No Markdown linter is configured, so lint doesn't apply |

**Not changed:** `xy.ts`, `operation.ts`, `axis.ts`, `linearShift`'s prediction rule and its row distance, `remeasurePlaceholder`, the landing, the keyboard path, the displacement sink, `EQUIVALENCE_SLACK`, every `bench/` file, `judge`, every row, injection and floor entry, every ceiling and every recorded reading. No `--prove`, `--floors` or campaign ran. Virtualized-list support was not started.

## For the architect

- **Record the result under `DRD-49`:** confirmed, with the owner's acceptance of the scope and the ordering term stated above.
- **Pending acceptance:** the bytes, 155 B Brotli on "sortable + y" and "complete" and 51 B on "sortable + xy", are the owner's to accept or refuse (`DRD-40` property 6). Both sortable rows now have 0 B left under their ceilings.
- **For review (Part II §17):** `refresh` became `collect` plus `measure`, and `pack` replaced three inline packings, to fit the budget. `xy()`'s reads and settling are the same, but no row measured `xy()`'s runtime. The same question applies to the view and one-element copy that `y()`'s growth allocates per read with a sink composed.
- **Still open:** `DRF-21`, until the next bytes reading that a report or decision uses. This unit took no `samplingProfile` bytes reading. `DRD-45` property 9's repair is owed before any `--prove` or `--floors`.