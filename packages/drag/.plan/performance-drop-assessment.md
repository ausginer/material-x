# Performance drop assessment

**Read:** [`performance-drop-report.md`](performance-drop-report.md) at `8eda874f0`, on `drag/performance`, by the architect on 2026-11-12. **Code read:** `bf9d1caed`, against `093f31c7f`, whose `packages/drag/src` equals `566ebfc65`'s. **Governing records:** `DRD-47`, `DRD-46` property 8, `DRD-40` properties 4 and 6, `DRD-33` C7 and `DRO-4`, in [`00-index.md`](00-index.md).

**Outcome:** `DRD-47` conforms and is **confirmed**. "50 activate-and-drop cycles, 2000 items, no landing" is "faster" in `scriptUs`, by −2,449 µs per cycle against an A/A bound of 409 µs, lower in 7 of 7 rounds. The owner accepts the measured cost of +125 to +140 B Brotli on the sortable compositions, and no budget changes. `DRF-22` is decided by `DRD-48`: `freeDrag`'s drop measures its drop targets and its bounds again before it resolves. [`free-drag-drop-handoff.md`](free-drag-drop-handoff.md) is the next unit.

## 1. Conformance

Each property of `DRD-47`, checked against the diff `093f31c7f..bf9d1caed` and the records under `measurements/`:

| Property | Checked | Result |
| --- | --- | --- |
| 1. Site | `sortable/operation.ts:109` | Conforms. Only the pointer branch changed. The command drop, the frame path, `moved`, `rebase`, activation and the landing are unchanged |
| 2. The confirmation | `sortable/axis.ts`, `RectIndex.holds`, `y.ts` and `xy.ts` | Conforms. One private member, `confirm`, and one shared definition, `holds`. A dirty cache, a cache measured at another collection version and an empty cache read nothing. Otherwise `holds` reads one cached slot's element through `box`, settles it through the sink, and compares left and top within `EQUIVALENCE_SLACK`. `y()` calls `shift.invalidate()`, which also discards the row distance |
| 2. The slot | `RectIndex.refresh` | Safe. The slots exclude the dragged item, so slot 0 is never the lifted element. `items[slot]` is the element `refresh` measured for that slot, and the development check compares the same pairing |
| 3. Reads | W2 and [M2](measurements/2026-11-12-drop-mutation-M2.txt) | Conforms. 1 read at both counts in Chromium and Firefox, and 2 in WebKit, against 20 and 400 under M2 and at `566ebfc65`'s source |
| 4. Behavior | W1 and [M1](measurements/2026-11-12-drop-mutation-M1.txt) | Conforms. W1 lands at index 4 in all three engines. M1 fails it in all three, and W1 passes at `566ebfc65`'s source |
| 5. Contract and README | `contract.md`, `README.md` at `bf9d1caed` | Conforms. The `DRI-14` paragraph is word for word property 5's text. The change record row names `DRD-47`. The README says when to call `invalidate()` |
| 6. Witnesses | The four witness and mutation records | Conforms. Each record's head names the drop line it ran with |
| 7. Confirmation | [`2026-11-12-drop-cycles.json`](measurements/2026-11-12-drop-cycles.json) and [`.txt`](measurements/2026-11-12-drop-cycles.txt) | Confirmed. The console shows exactly the five selected rows in each of the 7 rounds, one process and exit 0. The machine record is at the head and the foot, and [the hold](measurements/2026-11-12-drop-hold.txt) covers the process. Every verdict in the report's table matches the JSON |
| 8. What it doesn't change | Diff stat | Conforms. No `bench/` file, row, injection, floor entry or reading changed, and no `--prove`, `--floors` or campaign ran |

**Accepted deviations, none affecting a result:**

- **`EQUIVALENCE_SLACK` moved** above `RectIndex`, because the linter refuses a use before the declaration. Its value and comment are unchanged, which is what the handoff protected.
- **The witnesses and mutations ran on the working copy** before three changes to `rect-index.ts` with no runtime effect: the declaration's move, a reworded comment, and two `!` assertions removed. The three-engine suite at `bf9d1caed` runs W1 and W2 on the committed source.
- **A discarded form of W2 wasn't kept**, against `DRD-40` property 4's rule that a discarded run is kept with its reason. The report gives the reason and the counts. No verdict depends on it, because it was a draft of a witness and not a reading.

## 2. The result

| Row | `scriptUs` verdict | Higher in | Median difference | A/A bound |
| --- | --- | --- | --- | --- |
| **CDP, 2000 items, no landing (target)** | **faster** | **0 of 7** | **−2,449 µs** | **409 µs** |
| CDP, 2000 items, with landing | faster | 0 of 7 | −1,922 µs | 450 µs |
| CDP, 20 items, either form | no difference shown | 1 and 2 of 7 | −94 and −63 µs | 255 and 556 µs |
| In the page, 20 items | no difference shown | 3 of 7 | −87 µs | 307 µs |

No row is "slower" on any measure, and every layout count equals the base's. The saving is inside `DRD-47`'s estimate of 2.1 to 2.5 ms. The A/A bound was much tighter than B3's 1,920 µs, so the margin `DRD-47` called narrow didn't constrain this run.

**The landed row's smaller saving isn't the confirmation falling back.** The report leaves open whether the slot was sometimes settled during an animation and caused a full measurement. In this run `production` reads 4,163 µs on the target row and 4,194 µs on the landed row. The arm that differs is `before`, at 6,427 and 6,233 µs. A full measurement costs about 2.2 ms per cycle, so a fallback at most drops would show as a difference of more than 1 ms between the two `production` medians. **Inferred, not measured:** the two rows aren't paired with each other, so an occasional fallback isn't excluded.

**`taskUs` on the target row** reads −4,366 µs against a bound of 2,699 µs, and "no difference shown" because 2 of 7 rounds read higher. That is `judge`'s sign rule. The candidate is confirmed on `scriptUs`, as property 7 says.

## 3. The owner's decisions

- **The geometry rule.** The report records that the owner approved `DRI-14`'s **Geometry** paragraph in the request that started the unit, on 2026-11-12. This assessment didn't see that request, and records the approval as the report states it. The request that started this assessment doesn't contradict it.
- **The bytes.** The owner accepts the measured cost: +125 B Brotli on "sortable + y", +140 B on "sortable + xy" and +128 B on "complete" ([size](measurements/2026-11-12-drop-size.txt), [base](measurements/2026-11-12-drop-size-base.txt)). The seven rows without `sortable` read 0, so the control behaved. **No budget changes.** "complete" is now 142 B over its 7,065 B ceiling, up from 14 B, and stays red under `DRO-4`. "sortable + y" has 155 B left under its 6,733 B ceiling, and "sortable + xy" has 51 B under 6,617 B. Five rows are red at `bf9d1caed`, as at `566ebfc65`: the alias cleanup took "example: resize handle" under its ceiling ([report](alias-cleanup-report.md)).

## 4. `DRF-22`

`dropTargets`' `drop()` cancels its frame and resolves against the cached rects. A scroll whose event hasn't been dispatched leaves them warm. That is `DRD-47`'s window, and it decides the same way for a different reason.

**The window is open at most releases during a consumer's autoscroll.** An autoscroll usually scrolls in an animation-frame callback. Under the HTML event loop, a scroll made there dispatches its `scroll` event at the next rendering update, so a release after such a frame resolves against geometry from before that frame's scroll. When the autoscroll's callback runs after the library's frame, the user saw the scrolled tree, and the cache is older than what was on screen. So "resolve against what the user saw" doesn't argue for keeping the cache. **Inferred from the specification, not measured:** W1 shows the window in all three engines for a scroll made in a `pointerup` listener, not in a frame callback.

**The error is a target off by one frame's scroll.** For targets about as tall as an autoscroll's step, such as a calendar's time slots, that names a neighbouring target at a large share of releases near an edge.

**One target can't confirm the others.** `sortable`'s rows share one list, so one row's displacement is every row's. Drop targets are whatever `targets()` returns: elements in several scrollers, fixed or sticky ones that a scroll doesn't move, and overlapping ones whose order decides. A target that hasn't moved says nothing about another.

**Measuring every target at the drop is cheap.** `DRD-47`'s run measures the full scan at about 1.2 µs per row, packing included (2,449 µs for 1,999 rows). A target list is usually far shorter than a sortable list, so the cost is tens of µs at most per drop, paid once per operation. The first read forces any pending style and layout, which the next frame would otherwise do. No sample or frame reads more.

**`bounds` has the same window at the same drop.** `computeMotion` clamps the drop position against a box read before the pending scroll. An accepted position can then lie outside the bounds element by one frame's scroll. The repair is one read, or one call of the consumer's function, per drop. `DRD-48` covers both, because one signal reaches both caches: the scroll and resize listener already marks both stale.

**Rejected:**

- **Keep the cache, and state the window outside the contract.** The cache can be older than the frame the user saw, and `sortable`'s drop now sees the pending scroll, so two built-ins would answer the same release differently.
- **Confirm one target, as `DRD-47` does.** Unsound, for the reason above.
- **`elementsFromPoint` at the drop.** It skips `pointer-events: none` targets and honors clipping, which the mark's rect test doesn't, so the drop could disagree with the mark the user saw.

## 5. Routine record corrections in this commit

| Record | Correction |
| --- | --- |
| [`contract.md`](contract.md)'s current-state paragraph | Names `DRD-47`'s change to `DRI-14`, implemented at `bf9d1caed`. The change record row was already there |
| [`00-index.md`](00-index.md) | Header status, `DRD-47`'s status row, `DRF-22`'s status, a dated `DRO-4` paragraph for the bytes, `DRD-48` and its status row, and the disposition |
| [`performance-drop-handoff.md`](performance-drop-handoff.md) | A **Done** line. Its base paragraph waited for the branches to join, which `093f31c7f` did |
| [`performance-plan.md`](performance-plan.md) | P3's first unit's result, the next unit, and the open items |