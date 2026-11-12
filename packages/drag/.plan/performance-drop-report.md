# Performance drop report

**Input:** [`performance-drop-handoff.md`](performance-drop-handoff.md), carried by `093f31c7f` on `drag/performance`. **Governing records:** `DRD-47` in [`00-index.md`](00-index.md), with `DRD-46` property 8, `DRD-40` properties 4, 6 and 7, `DRD-44` property 6 and `DRD-45` property 9, and [`performance-plan.md`](performance-plan.md) §2 P3. **Base for comparison:** `packages/drag/src` at `566ebfc65`.

**Outcome: complete, confirmed.** The pointer drop confirms the axis cache against one row and measures every row only when that row moved or the cache is stale. "50 activate-and-drop cycles, 2000 items, no landing" is "faster" in `scriptUs`: −2,449 µs per cycle against an A/A bound of 409 µs, lower in all 7 rounds. No row is "slower" on any measure, and no layout count is above base. No return condition was met.

**Owner approval.** The owner approved `DRD-47`'s geometry rule, as written in `DRI-14`'s new **Geometry** paragraph: a change in the items' sizes or relative positions during a drag that no scroll or resize causes needs `invalidate()`. The owner stated this approval in the request that started this unit, on 2026-11-12. This report records it beside the implementation results, and the architect records it under `DRD-47`.

| Commit | Content |
| --- | --- |
| `bf9d1caed` | Items 2, 3 and 4: the confirmation, W1 and W2, the `DRI-14` paragraph and its change record row, and the README sentence |
| the commit carrying this report | This report, and the records under `measurements/` |

## Item 1: the base

`git diff --stat 566ebfc65 HEAD -- packages/drag/src` at `093f31c7f`, before any change: **empty**.

## Item 2: the confirmation

- **Site.** `SortableOperation.drop`'s pointer branch calls `this.#behavior.axis.confirm(this.#query, this.#context)` where it called `this.#behavior.axis.invalidate()` (`sortable/operation.ts:109`). The command drop, the frame path, `moved`, `rebase`, activation and the landing are unchanged.
- **The interface.** `InsertionGeometry` (`sortable/axis.ts`) has a new member, `confirm(query, context)`. The interface stays private.
- **The shared definition.** `RectIndex.holds(gap, snapshot, getBox, displacement)` (`sortable/rect-index.ts`) reads and compares. `y()` and `xy()` call it, and each one calls its own `invalidate()` when it answers `false`. In `y()` that is `linearShift`'s `invalidate()`, which also discards the row distance.
  - If the cache is stale, meaning it is dirty or measured at another collection version, `holds` reads nothing and answers `true`. The resolution then measures every slot, as at `566ebfc65`. An empty cache also answers `true`.
  - If the cache is warm, `holds` measures the slot's element again through `box` when one is configured. It packs the reading like a slot and settles it through the displacement sink when one is composed. Then it compares left and top with the cached slot within `EQUIVALENCE_SLACK`.
- **`EQUIVALENCE_SLACK`.** Its value and comment are unchanged. The declaration moved above `RectIndex`, because `holds` is now a use before the declaration, and the linter's `no-use-before-define` refuses that.

**The slot it reads.** The end of the list farther from the placeholder's committed gap: the last slot when the gap is in the first half, and otherwise slot 0. A missing gap counts as −1, so the last slot is read.

The reason: a committed move displaces the slots next to the gap, so those are the slots most likely to carry a running layout animation. A slot far from the gap is most often settled geometry already. Its comparison then doesn't depend on the sink's timing arithmetic at the release instant. `linearShift` already says that this arithmetic isn't resolved at a move's own instant. A false difference is safe, because it only costs the full measurement of `566ebfc65`. Choosing the far slot makes one less likely. Any slot detects an unsignalled scroll, because every slot moves by the same vector.

**Inferred, not measured:** that the far slot gives fewer false differences than the near one. No run compared slot choices. The landed 2,000-item row below shows the saving survives with `layoutAnimation({ duration: 50 })` composed.

## Item 3: the witnesses

| Witness | Where | Implementation (Chromium, Firefox, WebKit) | Mutation | Mutation result |
| --- | --- | --- | --- | --- |
| **W1** | `tests/sortable.browser.test.ts`, "drag:DRD-47 should drop under the release position after a scroll whose event has not arrived" | Pass in all three | **M1:** the confirmation call deleted | **Fails in all three.** Chromium and Firefox: "expected 1 to be 4". WebKit: "expected +0 to be 4" |
| **W2** | `tests/hot-path.browser.test.ts`, "drag:DRD-47 should read as many rects at a pointer drop with a warm cache for 20 items as for 400" | Pass in all three | **M2:** the unconditional `axis.invalidate()` restored | **Fails in all three:** "expected 400 to be 20" |

- **W1.** A 200 px scrolling container holds 20 rows of 40 px. A capture-phase `pointerup` listener on the window is added before the press, with `once`, and adds 100 px to the container's `scrollTop`. The drag presses `#r0`, passes the threshold, and moves 50 px down. Then it waits two frames, and the placeholder follows `r1`, which shows a committed move. The release then lands `#r0` at index 4. That is the slot a full measurement after the scroll gives: the release is 170 px into the list, nearest to `r4`'s center, below the placeholder.
- **W2.** In the census, the drag passes the threshold and crosses one row, so the cache is warm. The test counts layout reads from the release until one frame later, at 20 items and at 400 items.
  - With the confirmation, the counts are 1 and 1 in Chromium and Firefox, and 2 and 2 in WebKit. In WebKit, the placeholder rect the committed move marked stale is still unread when the release arrives.
  - Under M2 the counts are 20 and 400 in every engine: every row plus the placeholder.
  - These counts were read with a temporary failing assertion, which was then reverted. The record holds the M2 numbers and the pass, not the probe's output.
- **W1 at `566ebfc65`'s source**, which has the unconditional call: W1 passes in all three engines. W2 fails there, with "expected 400 to be 20", as M2 does.
- **The existing test** "should re-measure on scroll during a drag, nested scrollers included" passes, in the three-engine suite below.

**A discarded form of W2.** The first form counted reads right after `commands.pointerUp()` resolved, with no frame after it. In WebKit that once read 2 at 20 items and 1 at 400 items, and failed. Waiting one frame before counting gave equal counts in two consecutive three-engine runs, and in every later run. The failure output wasn't kept: the next run overwrote the file.

**Where they ran.** Every engine run used `vitest.engines.config.ts`, after `source ~/.cache/ms-playwright/webkit-env.sh`. Without that script WebKit doesn't launch here, because of missing host libraries. The witness and mutation runs used the working copy before commit. After those runs, `rect-index.ts` changed in three ways before `bf9d1caed`: the slack declaration moved, one comment was reworded, and the linter removed two `!` assertions. The three-engine suite at `bf9d1caed` covers W1 and W2 at the committed source.

Records: [`2026-11-12-drop-witnesses.txt`](measurements/2026-11-12-drop-witnesses.txt), [`2026-11-12-drop-mutation-M1.txt`](measurements/2026-11-12-drop-mutation-M1.txt), [`2026-11-12-drop-mutation-M2.txt`](measurements/2026-11-12-drop-mutation-M2.txt), [`2026-11-12-drop-witnesses-at-566ebfc65.txt`](measurements/2026-11-12-drop-witnesses-at-566ebfc65.txt), and the runner [`2026-11-12-drop-witness-runner.sh.txt`](measurements/2026-11-12-drop-witness-runner.sh.txt). The runner filters Vite's dynamic-import warning out of the saved output. Each file's head names the drop line that the run used.

## Item 4: the contract and the README

- **`DRI-14`** in [`contract.md`](contract.md) now has the **Geometry** paragraph, word for word as `DRD-47` property 5 gives it. It comes after **Consistency**'s closing paragraph and before the paragraph on `invalidate()` during a drag.
- **The change record** has a row dated 2026-11-12 for `DRI-14` that names `DRD-47`.
- **The README's sortable paragraph** now says that the library measures the rows again after a scroll or a resize, and that a pointer drop checks one row for a scroll whose event hasn't arrived. It also says to call `invalidate()` when rows change size or position during a drag for any other reason. The sentence about the list changing now reads "call `controller.invalidate()` when the list changes".

All of these are in `bf9d1caed`, the same commit as item 2.

## Item 5: the confirmation run

From `packages/drag`, at `bf9d1caed`:

```sh
node bench/compare.ts --before 566ebfc65 --only "activate-and-drop cycles" --out .plan/measurements/2026-11-12-drop-cycles.json
```

- **Selection, checked in the output before any verdict:** exactly five rows. They are the four CDP rows "50 activate-and-drop cycles, {20, 2000} items, {no, with} landing", and "in the page: 50 activate-and-drop cycles, 20 items, no landing". No other row ran.
- **One browser process**, exit 0, at 7 rounds, with arms `before` (`566ebfc65`), `production` and `control`. It used the unchanged `judge` and A/A control, and applied no injection. Chrome 157.0.8103.38.
- **The hold.** The owner confirmed the hold before the browser started, at 2026-11-12T00:17:49Z. The process ran from 00:17:49 to 00:31:14. The owner confirmed the release at 00:32:36. Nothing else from this session ran during the process.
- **The machine record**, at the head and the foot: Node v26.13.0, 12 CPUs, 12th Gen Intel Core i7-1255U, `cpu_core` 0–3, `cpu_atom` 4–11. Load average 4.22, 5.06, 3.75 at the head, and 3.92, 2.94, 3.05 at the foot.

Records: [`2026-11-12-drop-cycles.json`](measurements/2026-11-12-drop-cycles.json), the console output with the machine record [`2026-11-12-drop-cycles.txt`](measurements/2026-11-12-drop-cycles.txt), the wrapper [`2026-11-12-drop-record-wrapper.sh.txt`](measurements/2026-11-12-drop-record-wrapper.sh.txt), which is the trace unit's wrapper unchanged, and the hold [`2026-11-12-drop-hold.txt`](measurements/2026-11-12-drop-hold.txt).

**Verdicts against `before`**, as `judge` printed them. "Higher" counts the rounds in which `production` read higher than `before`. Time medians are per cycle. Layout counts are totals over the row's 50 cycles.

| Row | Measure | Verdict | Higher in | Median difference | A/A bound | `before` median | `production` median |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CDP, 20 items, no landing | layouts | at or below | — | — | — | 250 | 250 |
|  | `scriptUs` | no difference shown | 1 of 7 | −94 µs | 255 µs | 1,901 | 1,809 |
|  | `taskUs` | no difference shown | 2 of 7 | −292 µs | 1,222 µs | 10,206 | 9,941 |
| CDP, 20 items, with landing | layouts | at or below | — | — | — | 350 | 350 |
|  | `scriptUs` | no difference shown | 2 of 7 | −63 µs | 556 µs | 2,060 | 1,998 |
|  | `taskUs` | no difference shown | 2 of 7 | −102 µs | 2,824 µs | 11,356 | 11,255 |
| **CDP, 2000 items, no landing (target)** | layouts | at or below | — | — | — | 250 | 250 |
|  | **`scriptUs`** | **faster** | **0 of 7** | **−2,449 µs** | **409 µs** | **6,427** | **4,163** |
|  | `taskUs` | no difference shown | 2 of 7 | −4,366 µs | 2,699 µs | 27,700 | 24,404 |
| CDP, 2000 items, with landing | layouts | at or below | — | — | — | 350 | 350 |
|  | `scriptUs` | faster | 0 of 7 | −1,922 µs | 450 µs | 6,233 | 4,194 |
|  | `taskUs` | no difference shown | 3 of 7 | −442 µs | 1,931 µs | 28,857 | 27,465 |
| In the page, 20 items, no landing | layouts | at or below | — | — | — | 250 | 250 |
|  | `scriptUs` | no difference shown | 3 of 7 | −87 µs | 307 µs | 1,436 | 1,349 |
|  | `taskUs` | no difference shown | 2 of 7 | −204 µs | 888 µs | 4,822 | 4,690 |

**The landed 2,000-item row beside the target:** "faster" in `scriptUs`, with −1,922 µs against a bound of 450 µs, lower in all 7 rounds. The saving is smaller than the target's by about 0.5 ms per cycle. This run doesn't show whether the confirmation's slot was sometimes settled mid-animation and fell back to a full measurement. That would cost the full measurement, which `before` always pays.

**`taskUs` on the target row:** the median difference is −4,366 µs, beyond its bound of 2,699 µs, but `judge` reads "no difference shown", because 2 of 7 rounds read higher. That is `judge`'s sign rule and is reported as printed.

The estimate in `DRD-47` was 2.1 to 2.5 ms per cycle, and `before` read 6,401 µs in B3. Here `before` read 6,427 µs, and the measured difference of 2,449 µs is inside the estimate.

**Result by item 5's table: confirmed.**

## Item 6: the other checks

All three ran after the confirmation run's process ended.

- **The three-engine suite** (`npx just test-engines`, at `bf9d1caed`, with the WebKit environment script): 1,047 passed and 18 skipped, in 72 files, with no failure. The development equivalence check threw at no drop in any engine. Record: [`2026-11-12-drop-engines.txt`](measurements/2026-11-12-drop-engines.txt).
- **The per-sample and census tests** (`npx just test tests/hot-path.browser.test.ts`, Chromium, the `shipped` project): 8 passed. That includes W2, "should read no layout in a sample, and none in a frame with nothing stale", both allocation tests, and "should run no consumer callback per sample". The three-engine suite also ran this file, and Firefox and WebKit skip the allocation tests by their existing condition. Record: [`2026-11-12-drop-hot-path.txt`](measurements/2026-11-12-drop-hot-path.txt).
- **The Chromium suite** (`npx just test`, before the commit): every browser test passed. Five rows of `size.node.test.ts` failed: "draggable alone", "example: drop zone", "freeDrag", "freeDrag + bounds + landing" and "complete". The same five fail with `566ebfc65`'s source, so they are known failures.

**The size table** (`node bench/size/measure.ts`, at `bf9d1caed` and with `src` checked out from `566ebfc65`, run one after the other):

| Composition | `566ebfc65` min / br | `bf9d1caed` min / br | Change |
| --- | --- | --- | --- |
| draggable alone | 6,733 / 2,197 | 6,733 / 2,197 | 0 |
| draggable + lift | 11,544 / 3,974 | 11,544 / 3,974 | 0 |
| example: resize handle | 9,390 / 3,310 | 9,390 / 3,310 | 0 |
| example: drop zone | 13,183 / 4,610 | 13,183 / 4,610 | 0 |
| example: canvas group | 9,526 / 3,306 | 9,526 / 3,306 | 0 |
| freeDrag | 15,182 / 5,031 | 15,182 / 5,031 | 0 |
| freeDrag + bounds + landing | 16,347 / 5,471 | 16,347 / 5,471 | 0 |
| **sortable + y** | 19,897 / 6,453 | 20,364 / 6,578 | **+467 / +125** |
| **sortable + xy** | 19,705 / 6,426 | 20,159 / 6,566 | **+454 / +140** |
| **complete** | 21,574 / 7,079 | 22,041 / 7,207 | **+467 / +128** |

- **Where the bytes are.** `RectIndex.holds` and the `confirm` member in `y()` or `xy()`. Only the compositions that contain `sortable` change, and the seven rows without it are the control and read 0. Module counts are unchanged.
- **Budgets.** "complete" was already 14 B over its 7,065 B Brotli ceiling at `566ebfc65`, and is now 142 B over. "sortable + y" and "sortable + xy" have no ceiling violation. The other four violations, including "draggable alone"'s control movement of 173 B, are the same at both sources. No ceiling is re-based.
- **The trade-off for the owner (`DRD-40` property 6).** About 125 to 140 B Brotli on every sortable composition, for about 1.9 to 2.4 ms less script per drop at 2,000 items. At 20 items no saving was shown.

Records: [`2026-11-12-drop-size.txt`](measurements/2026-11-12-drop-size.txt), and [`2026-11-12-drop-size-base.txt`](measurements/2026-11-12-drop-size-base.txt), whose head says "with uncommitted changes" because `src` was checked out from `566ebfc65` for that run and restored after it.

## Verification

| Check | Result |
| --- | --- |
| Item 1 | Empty |
| `git diff --stat 093f31c7f..HEAD -- packages/drag` | `src/sortable/{axis,operation,rect-index,xy,y}.ts`, `tests/sortable.browser.test.ts`, `tests/hot-path.browser.test.ts`, `.plan/contract.md`, `README.md`, this report and `measurements/` |
| W1 and W2 | Pass in Chromium, Firefox and WebKit |
| M1 and M2 | M1 fails W1, and M2 fails W2, in all three engines |
| Item 5 | One process, exit 0, five rows judged |
| Changed `.ts` files | `just fmt`, `just lint-fix`, `just fmt`, then `just lint`, which is clean. `just typecheck` passes |
| Markdown | `just fmt` on this report, `contract.md` and `README.md`. Links checked with a scratch script. `git diff --check` is clean. No Markdown linter is configured, so lint doesn't apply |

**Not changed:** the frame path, `moved`, `rebase`, activation, the command drop, the landing, the displacement sink, `EQUIVALENCE_SLACK`'s value, the development check, every `bench/` file, `judge`, every row, injection and floor entry, and every recorded reading. No `--prove`, `--floors` or campaign ran.

## For the architect

- **Record the result under `DRD-47`:** confirmed, with the owner's approval of the geometry rule stated above.
- **The size trade-off** above is the owner's to accept or refuse. Nothing is re-based.
- **`DRF-21`** is still open, and this unit used no bytes reading. **`DRF-22`** has been waiting for this report.