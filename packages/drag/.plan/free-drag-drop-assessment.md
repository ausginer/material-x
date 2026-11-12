# Free drag drop assessment

**Read:** [`free-drag-drop-report.md`](free-drag-drop-report.md) at `7cb2207ae`, on `drag/performance`, by the architect on 2026-11-12. **Code read:** `71f20df20`, against `d11d71d27`, whose `packages/drag/src` equals `bf9d1caed`'s. **Governing records:** `DRD-48`, `DRF-22`, `DRD-33` C7, `DRD-46` property 8 and `DRO-4`, in [`00-index.md`](00-index.md). **Traces read for the selection:** [`performance-trace-report.md`](performance-trace-report.md) §Item 3 and §Item 4, at `e92e21eed`.

**Outcome:** `DRD-48` conforms, and `DRF-22` is closed at `71f20df20`. The owner accepts the +5 B Brotli on the two `freeDrag` rows, and approved the reads at the drop before the unit. No budget changes. The next optimization candidate is the trace report's candidate 1, the activation's measurement of every row, in a bounded form that `DRD-49` decides: `y()` measures a window of rows that grows toward the pointer. [`performance-window-handoff.md`](performance-window-handoff.md) is the next unit.

## 1. Conformance of `DRD-48`

| Property | Checked | Result |
| --- | --- | --- |
| 1. Site | `free-drag/operation.ts` `drop()` | Conforms. `this.handleEvent()` is the first statement, before `#computeMotion()` and the tracker's `drop()`. `handleEvent`'s body is unchanged and marks both caches stale |
| 2. Reads | [Census probe](measurements/2026-11-12-free-drop-reads.txt) and [base](measurements/2026-11-12-free-drop-reads-at-bf9d1caed.txt) | Conforms. 11 reads at the drop, against 0, in all three engines, with ten targets and one box. Without either capability, both calls are optional chains on `null` |
| 3. Behavior | W3 and W4 | Conforms in all three engines |
| 4. Published types | `drop-targets.ts`, `bounds.ts` | Conforms. No member changed. Each `invalidate` names the drop. `MotionConstraint` also names activation, which was already a caller |
| 5. Contract and README | `contract.md`, `README.md` at `71f20df20` | Conforms. `DRI-21`'s bullet and `DRI-20`'s sentence are word for word property 5's, in the stated place. The change record row names `DRD-48` and `DRF-22`. The current-state paragraph and the README say so |
| 6. Witnesses | The witness, mutation and base records | Conforms. Each record's head shows the `drop()` lines it ran. W3 and W4 fail at `bf9d1caed`'s `operation.ts` in all three engines. M3 fails only W3 and M4 only W4 |
| 7. Measurement | [Size](measurements/2026-11-12-free-drop-size.txt), [base](measurements/2026-11-12-free-drop-size-base.txt) | Conforms. +19 B minified and +5 B Brotli on "freeDrag" and "freeDrag + bounds + landing", and 0 on the control rows. No green row turned red |
| 8. What it doesn't change | Diff stat | Conforms. `sortable`, the kernel, `bench/`, every row, injection, floor entry, ceiling and reading are unchanged, and no `compare.ts` ran |

**The 1.2 µs figure.** The report correctly says that `DRD-48` used `sortable`'s full scan only as context. This unit counted reads and didn't time the drop, as property 7 asked.

**The owner's decisions.** The report records the owner's approval of the reads at the drop, stated before the unit ran, and the owner now accepts the +5 B Brotli. "freeDrag" is 69 B over its 4,967 B ceiling, and "freeDrag + bounds + landing" is 266 B over its 5,210 B ceiling. Both were already red. Five rows are red, as before.

**The report's redundant correction.** Its §For the architect still listed the 11 reads as pending the owner's acceptance, although its own §Owner approval records that approval. This commit corrects that bullet in the report and marks the correction.

## 2. The selection

`DRD-46` property 8 lets an optimization unit start on one candidate from a trace report. After `DRD-47` and `DRD-48`, here is what the existing traces still offer:

| Candidate | Estimated saving | Confirming row and its A/A bound | Why or why not |
| --- | --- | --- | --- |
| **1. The activation measures every row** | **About 2.4 ms per operation at 2,000 items.** The activation's first resolution runs the same 1,999-row scan that `DRD-47` removed from the drop, which saved 2,449 µs per cycle | "50 activate-and-drop cycles, 2000 items, no landing": 409 µs in `DRD-47`'s run | **Selected, as `DRD-49`.** It is the largest remaining library cost in the traces. Its row resolved `DRD-47`'s saving of the same size six times over. The trace report calls it a design change first, and `DRD-49` is that decision |
| 3. The frame's scan of every center | About 10 µs per move at 2,000 items, on fewer than 20 samples per trace | "300 moves, one frame each, 2000 items": 22 µs in B3. The in-page mirror's only figure is a discarded precheck, so it has no bound on record | Not selected alone: below its row's bound. `DRD-49`'s window shortens the same scan, so part of this saving comes with it, and the move rows check that nothing is slower |
| 4. The pull at a press | Up to 0.63 ms per press, and only with a costly consumer `items()` | The press row | Not selected. `DRO-1` is the owner's, and the behavior changes |
| 5. The landing's computed position | At most 0.16 ms per landing, and uncertain | The landed cycle rows | Not selected. It changes `Landing`'s published slot, and the estimate is below the landed row's bound |

**Why candidate 1 can be bounded.** The trace report estimates "about 11" reads for a search, and calls the estimate the least certain because the cache's other users would change too. `DRD-49` avoids a search: the placeholder sits under the pointer after every resolution, so the rows the next resolution needs are next to the placeholder. A window of measured slots that starts at the placeholder and grows toward the pointer needs no per-slot mask and no search. It reads each row at most once per measurement, and every user of the cache only ever reads slots inside that window:

| User | Which slots it reads | In the window? |
| --- | --- | --- |
| `y()`'s nearest-center scan | The slots that bracket the pointer | Yes, because the window grows until it brackets the pointer |
| `linearShift.moved` | The crossed slots between the old and the new gap, and one of them as its probe | Yes, because both gaps are next to slots the scan read |
| `DRD-47`'s confirmation | One cached slot | Yes, if it picks within the window. This changes the unit's slot choice, not `DRD-47`'s properties |
| The development check | Every cached slot | It compares the window |
| `insertionAt` and the displacement sink's `report` | The slots' elements, not their rects | The slots' elements are still established for every slot, with no layout read |

**One effect no row measures.** During a consumer's autoscroll, every `scroll` event marks the cache stale, so every frame measures all 1,999 rows again: about 2.4 ms per frame at 2,000 items. With the window, such a frame measures the rows from the placeholder to the pointer, usually one or two. **Inferred from the code, not measured.**

**What it costs in terms.** The window's answer equals a full scan's only when the rows' centers increase along y in the collection's order. A single column gives that order. `y()`'s published terms already require a linear flow, and `linearShift`'s prediction already assumes the increasing direction, so a `column-reverse` list is outside them today. But they allow an authored transform on a row, which can carry a row's center past its neighbour's. A full scan handles that, and the window doesn't. So `DRD-49` narrows `y()`'s terms, and the owner may refuse that before the unit runs.

## 3. Limits

- **The 2.4 ms is inferred** from `DRD-47`'s measured drop saving and the trace's sampled activation scan: 2,650 [1,932–5,192] \| 3,066 µs at `rect-index.ts:refresh`, on fewer than 20 samples in some traces. The cycle row hasn't measured the activation's share.
- **No row covers a long drag or an autoscroll.** The cycle rows activate and drop, and the move rows sweep about 100 px. So the run confirms the activation saving and shows that the move path isn't slower. It doesn't measure the autoscroll effect above.
- **The `sortable + y` row has 155 B left** under its ceiling. If the change exceeds that, the unit returns, because the budget doesn't move.