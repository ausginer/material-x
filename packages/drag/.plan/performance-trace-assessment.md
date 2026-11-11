# Performance trace assessment

**Read:** [`performance-trace-report.md`](performance-trace-report.md) at `e92e21eed`, on `drag/performance-resolution`, by the architect on 2026-11-11. **Source read:** `packages/drag/src` at `566ebfc65`, the traced revision. Every line number below is that revision's unless a file names another. **Governing records:** `DRD-46` properties 7 and 8, `DRD-40` property 7 and `DRD-45` property 9, in [`00-index.md`](00-index.md).

**Outcome:** candidate 2 is selected in a changed form, `DRD-47`. The hypothesis that the drop's unconditional `axis.invalidate()` protects no supported case is **false in one case**: a scroll that moved the rows after the browser's last rendering update, whose `scroll` event has not been dispatched when the release arrives. So the call isn't deleted. The drop confirms the cache against one row, and measures every row only when that row moved or the cache is already stale. The bundle's missing module markers are `DRF-21`, and they change no recorded verdict. The drop-target tracker has the same unsignalled-scroll window, which is `DRF-22`. [`performance-drop-handoff.md`](performance-drop-handoff.md) is the next unit.

## 1. What was checked again

| Claim in the report | Check | Result |
| --- | --- | --- |
| The drop's figures at 2,000 items | [Analysis output](measurements/2026-11-11-trace-analysis.txt) lines 402–407 and 601 | As reported: span 2,742 [2,212–4,158] \| 4,240 µs counted; `refresh` 2,467 [2,097–3,805] \| 3,120 µs sampled, on 16/14/24 \| 20 samples |
| The drop calls `invalidate()` before it resolves | `sortable/operation.ts:103–115` | Confirmed, pointer branch only. `drop()` cancels the frame first, at line 106 |
| The cycle rows have a warm cache at the drop | [`compare.ts`](../bench/compare.ts) `50 activate-and-drop cycles` | Confirmed. Each cycle waits one frame at `Y0 + 45` before the release, so the frame measures the rows after activation's `invalidate()` (`sortable/behavior.ts:229`), and the drop measures them a second time |
| The move rows don't include the drop | `movesScenario`, `compare.ts` lines 277–286 | Confirmed. `metrics()` is read before `mouse.up()`, so no move row reaches the change |
| Two modules have no marker | [`bundle.js.txt`](measurements/traces/2026-11-11/bundle.js.txt) | Confirmed. `var RectIndex` at line 1540 sits under the `shared/landing.ts` marker at 1477. `directionOf` and `keyboardInsertion` at 1927 and 1938 sit under `sortable/collection.ts` at 1879 |
| "`--profile` and the bytes rule's module keys have the same gap" | `compare.ts` lines 161–176, 428–431 and 1491–1500 | **Half right.** `moduleAt` has one caller, `samplingProfile`, which keys the bytes rows. `--profile` keys by function name and line only, so it has no module gap |

## 2. Candidate 2: what the unconditional call protects

The drop resolves the release position against the axis cache. Without the call, the cache is measured again only when something marked it stale. Each path by which the rows' geometry can differ from the cache at a `pointerup`:

| Path | Protected by the call? | Why |
| --- | --- | --- |
| **A frame is pending** | No | `drop()` cancels it (line 106). The cache describes the placeholder at the last committed gap: `moved()` advances the crossed slots or invalidates, and `updateInsertion`'s `finally` invalidates if a write throws (lines 195–205). `y`'s resolution finds the nearest center from scratch at every call (`sortable/y.ts:47–70`), so a skipped frame leaves nothing behind for the drop |
| **A step is pending** | No | None can be pending across tasks. A step requested while idle runs as the first step of its own pass (`kernel/gesture.ts:288–294`), and steps drain before the pass that requested them ends (`kernel/session.ts:205–207`) |
| **A scroll or resize whose event was dispatched** | No | The capture-phase `scroll` and the `resize` listener request the axis's `invalidate` step (`sortable/behavior.ts:208–210`), which runs at once while idle. The cache is already stale |
| **The controller's `invalidate()`** | No | `rebase` calls `axis.invalidate()` (`sortable/operation.ts:175`) |
| **A scroll whose event wasn't dispatched yet** | **Yes** | A browser dispatches `scroll` in its next rendering update, before animation-frame callbacks. A scroll made after that update — from a timer, an event handler or another frame callback, such as a consumer's autoscroll — or applied by scroll anchoring in that update's layout, reaches the cache only at the next update. A frame that resolves before it is corrected one frame later. The drop has no later frame. With a warm cache it would resolve against rows displaced by that scroll |
| **Rows changed size or relative position, with no scroll, resize or `invalidate()`** | Yes, at the drop only | The frames never see it: a resolution with nothing stale reads no layout (`sortable/y.ts:17`). So the placeholder the user sees is already resolved against the old rows, and only the release used new ones. The contract states no such guarantee |

**The supported case is the fifth row.** `DRI-16` requires scrolling containers, and the library has no autoscroll of its own, so a consumer's autoscroll is how a list scrolls during a drag. A release during such a scroll lands one row off whenever the scroll since the last update moved a row's center past the pointer. No test covers this window: the scroll test in `tests/sortable.browser.test.ts` lines 951–991 waits frames after each scroll, so its `scroll` event arrives before the release.

**The sixth row isn't a supported case.** A consumer whose rows change size during a drag already sees a misplaced placeholder at every frame. `DRD-47` states it outside the contract, with `invalidate()` as the remedy, which already rebases and invalidates.

**One row detects the supported case.** Any scroll of an ancestor, scroll anchoring or a layout shift above the list moves every row by one vector. So one cached row, read again and settled as the cache holds it, shows whether the cache still describes the tree. The read forces whatever style and layout are pending, as today's first read does, so the forced work doesn't move. What leaves the drop is the other 1,998 reads and the packing loop.

## 3. The selection

| Candidate | Why not first |
| --- | --- |
| 1. Lazy measurement at activation | A model change first, the least certain estimate, and it interacts with 2 |
| **2. The drop's re-measure** | **Selected, as `DRD-47`'s confirmation.** The largest cost on one counted event, an existing CDP row with a recorded base and A/A bound, and no ownership or contract decision moves |
| 3. Binary search per frame | About 10 µs per move, sampled on fewer than 20 samples per trace, against an A/A bound of 22 µs on "300 moves, one frame each, 2000 items" in B3 |
| 4. The pull at a press | `DRO-1`'s pull: an owner decision first |
| 5. The landing's computed position | At most 0.16 ms, uncertain, and a decision first |

**Expected saving, estimated:** about 2.1 to 2.5 ms per pointer drop at 2,000 items, and tens of µs at 20. The traced drop follows 61 moves. The cycle rows' drop follows one frame, which measured the same rows once, so the drop's scan is the same size there.

**What the confirming row can see.** In B3, the A/A run of `a9c323f6a` ([`2026-11-10-performance-b3.json`](measurements/2026-11-10-performance-b3.json)), "50 activate-and-drop cycles, 2000 items, no landing" read 6,401 µs of script per cycle with an A/A bound of 1,920 µs, and "… with landing" read 6,389 µs with 1,337 µs. The expected saving is above both bounds, but not by a wide margin, so a "no difference shown" is possible. `DRD-46` property 8 decides what follows it. The 20-item rows can't see tens of µs, and are there to show that nothing is slower.

## 4. Trace overhead and sparse samples

These limits apply to the selection and stay in force until the paired measurement reads the effect:

- **Sparse samples.** The drop's `refresh` figure rests on 16 and 14 samples in two of the three warm traces, at an effective interval of 152 to 159 µs. The counted span, 2,742 [2,212–4,158] µs, doesn't depend on sampling and bounds the saving from above.
- **Tracing overhead.** The probe measured stack capture and profiler cost only on the 20-item move scenario. Neither inflation it found applies to `refresh`'s work: a `getBoundingClientRect` call requests no frame and writes no style. The 2,000-item release was not probed, so the absolute figure is still an upper bound.
- **Three warm traces** give a median and a range, not a distribution.
- **The cycle rows' drop wasn't traced.** Its scan is inferred to be the same size from the row's script: one frame and the drop each measure 1,999 rows.

## 5. The module markers

`DRF-21` records the defect. **What it affects:**

- **No verdict.** The only user of the markers is the bytes rows' keying. Every kernel key in the recorded bytes readings names a function of that kernel module: `kernel/session.ts:advance` is `Session.advance` at line 254. The unmarked modules' code falls under `shared/landing.ts` and `sortable/collection.ts`, and the kernel modules without a marker, `kernel/admission.ts`, `kernel/behavior.ts` and `kernel/outcome.ts`, have no runtime code. So `DRF-1`'s closure and `DRD-41`'s witness hold, and so does every bytes verdict on record.
- **Labels in raw readings.** In nine recorded bytes readings, from `2026-11-10-performance-b1.json` to `2026-11-11-resolution-prove.json`, `RectIndex`'s methods are keyed `shared/landing.ts:` (`refresh`, `advance`, `remeasurePlaceholder`, `remeasureHole`, `edge` and the getters). No report or decision drew a conclusion from those labels. The readings stay as written, under `DRD-40` property 4.
- **Not the trace report.** Its analysis mapped every position through a source map and checked the code against `bundle.js.txt`, so its attributions are unaffected. Only `record.json`'s marker list is incomplete.
- **Not `--profile`.** See §1.

## 6. Received and not decided here

- **Playwright's drag listeners in the CDP move rows**, about 74 to 83 µs per move in the report. Not verified here. Every arm of a CDP row carries them, so no paired verdict depends on them. They matter only where an absolute CDP figure is read as the library's share, and no current decision does that.
- **The owner's DevTools check** of one trace per scenario is still open.