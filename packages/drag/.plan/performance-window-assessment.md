# Performance window assessment

**Read:** [`performance-window-report.md`](performance-window-report.md) at `56c1c27c3`, on `drag/performance`, by the architect on 2026-11-12. **Code read:** `501f60ab7`, against `71f20df20`. **Governing records:** `DRD-49`, `DRD-47`, `DRD-46` property 8, `DRD-40` property 6, `DRI-17` and `DRO-4`, in [`00-index.md`](00-index.md). CONTRIBUTING Part II §0, §14 and §17.

**Outcome:** `DRD-49`'s window conforms and is **confirmed**. "50 activate-and-drop cycles, 2000 items, no landing" is "faster" in `scriptUs` by −2,508 µs per cycle, against an A/A bound of 427 µs, and lower in 7 of 7 rounds. The owner had approved the scope and the ordering term before the unit started. Two changes that the unit made to fit the byte ceilings need more, and `DRD-50` decides them:

- **The per-read allocations with a displacement sink:** a bounded correction. The internal `settle` takes a slot range, so a measurement passes the cache's own buffer and element array, and no read allocates a view or a copy.
- **`xy()`'s rebuild, now shared with `y()`'s code:** a focused paired probe of that rebuild against `71f20df20`'s. If the probe reads "slower", the rebuild goes back to one pass, whatever the bytes cost.

The bytes are still the owner's to accept. §5 gives the trade-off, and the owner accepts or refuses the final figures when the correction reports. [`performance-window-correction-handoff.md`](performance-window-correction-handoff.md) is the next unit.

## 1. Conformance of `DRD-49`

| Property | Checked | Result |
| --- | --- | --- |
| 1. The window | `rect-index.ts` and `linear-shift.ts` at `501f60ab7` | Conforms. `RectIndex` holds every slot's element and measured geometry for `#first` to before `#end`. `collect` starts an empty window at the gap, and `linearShift.refresh` grows it one slot at a time toward the pointer until a center lies beyond the pointer, or the list ends. The scan in `y.ts` runs from `first` to before `end`, with the same incumbent and tie rule |
| 2. Reads | W5, the [activation counts](measurements/2026-11-12-window-activation-reads.txt) | Conforms. 6 reads at both 20 and 400 items in all three engines, against 24 and 404 at `71f20df20`'s source. A slot is read only when growth adds it. Each read is settled through the sink when one is composed |
| 3. Behavior | W6, M6 | Conforms. W6 passes in all three engines and at `71f20df20`'s source. M6 fails it in all three |
| 4. The cache's other users | `holds`, `moved`, `verifyEquivalence` | Conforms. The confirmation reads the window end farther from the gap, which is `DRD-47`'s list end when the window is the whole list. The development check compares every window slot and the placeholder against a fresh measurement, and every slot's element. Staleness, `retire` and `rebase` discard the window |
| 5. Contract, terms and README | `contract.md`, `y.ts`, `README.md` at `501f60ab7` | Conforms. The `DRI-14` paragraph is word for word property 5's text. The change record row names `DRD-49`. `y()`'s documentation and the README state the order term |
| 6. Witnesses | The witness, mutation and base records | Conforms. W5 fails at `71f20df20`'s source in all three engines. M5 fails only W5, and M6 only W6 |
| 7. Confirmation | [`2026-11-12-window-cycles.txt`](measurements/2026-11-12-window-cycles.txt) and [`.json`](measurements/2026-11-12-window-cycles.json), and the moves records | **Confirmed.** The console shows the target's verdict as the report states it, and the owner reproduced it from the saved data. The landed 2,000-item cycle row is "faster" by −2,272 µs against 235 µs. No row is "slower", and every layout count is at base |
| 8. What it doesn't change | `git diff 71f20df20 501f60ab7 -- src` | **Deviation.** `xy()`'s full measurement is now `collect` followed by `measure`, which `y()` shares, and the handoff placed `xy()`'s full measurement out of bounds. Its reads and their values are unchanged (§3). Its runtime isn't measured. `DRD-50` decides it |

**Accepted as reported:** the base check, the discarded W5 form and its reason, the hold and the machine records, the three-engine suite, and the per-sample and census tests. The unit was right to revert `remeasurePlaceholder`'s use of `pack`: the development check would then compare the placeholder's x with itself.

**The owner's approval.** The owner approved `DRD-49`'s scope and its ordering term before the unit started, in [`performance-plan.md`](performance-plan.md) §2 P3 at `63cf79df4`, and deferred virtualized lists until after 1.0.0 (§5 there). This assessment records the approval under `DRD-49`. That approval accepted no speed or size result.

## 2. The per-read allocations with a sink

**What `501f60ab7` does.** `measure(lo, hi)` settles its range through the sink with `values.subarray(lo * STRIDE)` and, after slot 0, `items.slice(lo, hi)`. The sink settles from the start of what it receives, so a range after slot 0 needs a view and a copy. `y()`'s growth measures one slot per call. So with a sink composed, every row that `y()` reads allocates a typed-array view and a one-element array, beside the `DOMRect` that the read returns. `xy()`'s rebuild allocates one view per rebuild. Without a sink, the optional call evaluates no argument and nothing is allocated.

**Where it runs.** On frame resolutions only, not on samples, so `DRI-17` holds. The sample rule is the only allocation bound that `DRI-17` states. A frame reads rows at the activation, when the pointer leaves the window, and after every invalidation. During an autoscroll, which invalidates every frame, that is every frame. Every `sortable` page in `bench/lab.ts` composes `layoutAnimation`, so the confirmed cycle and move rows include this cost in their times. The allocation tests don't compose a sink, and no test bounds what a frame allocates.

**Why it is corrected.** CONTRIBUTING §0 names allocation on pointer-move paths, and §14 forbids avoidable allocation made for bytes without measurement and owner approval. This allocation came from sharing `measure` between both axes. It can be removed at no runtime cost, and probably at no byte cost:

- `DisplacementSink` is an internal type. The contract doesn't publish the `displacement` slot's types (`DRD-39`), and nothing published names `settle`. CONTRIBUTING §8 keeps no compatibility for an unreleased API.
- `settle` can take a slot range on the buffer and the element array as they are. A measurement then passes the cache's own buffer and element array, and nothing is copied. The `subarray` and `slice` expressions go away, so `rect-index.ts` gets shorter. "sortable + y" and "sortable + xy" don't compose `layoutAnimation`, so only "complete" carries the sink's side. **Inferred, not measured.**

`DRD-50` property 1 states the requirement. The drop's confirmation and `linearShift`'s probe still pack a one-slot scratch and pass a one-element array, once per drop and once per measurement. Those allocations come from `DRD-47` and earlier, and this correction doesn't change them.

## 3. `xy()`'s rebuild

**What changed.** At `71f20df20`, `refresh` was one loop over the snapshot that skipped the dragged item, read each slot, packed it in place and stored its element, then settled once and read the placeholder. At `501f60ab7`, it is `collect` and then `measure`:

1. one loop over the snapshot that stores the elements;
2. the placeholder's read;
3. a second loop over the slots that reads each slot and calls `pack`;
4. one settle, with a view.

**The reads and their values are unchanged.** Each slot is read once, in the same order, with the same box. The placeholder is now read before the slots instead of after them. Nothing writes to the tree between those reads: `settle` computes from animation timing and writes only the buffer, and `getBox` is the consumer's geometry source, which returns an element. A frame with nothing stale still reads nothing. **Checked by reading the code.** The three-engine suite at `501f60ab7`, which includes `xy()`'s tests, passed.

**The runtime isn't measured.** No row composes `xy()`. The added work is one more pass over the slots, an array load per slot, and a `pack` call per slot that V8 probably inlines. Against about 1.2 µs per read (`DRD-47`'s full scan), that is probably well under 1 % of a rebuild. **Inferred, not measured.** `xy()` with a sink rebuilds at every committed move. Without one, the frame after a move rebuilds. So this is a hot path in a grid reorder.

**Why a probe and not a decision by inference.** §14 asks for a measurement of new O(n) work on a hot path that was added for bytes, and the owner put runtime ahead of the byte ceiling. The cycle and move rows can't see it: their A/A bounds are 235 to 427 µs on a rebuild of about 2,400 µs. A probe that times only `RectIndex.refresh` on a laid-out 2,000-item field, against `71f20df20`'s class in the same page, isolates exactly the changed code, and it changes no instrument. `DRD-50` property 2 fixes the rule before the run: "slower" by `judge`'s paired rule restores one pass, whatever the bytes. Otherwise the shared rebuild stays, with the probe's bound on record.

**Rejected:**

- **Restore one pass now, without a probe.** It would spend bytes, up to about 120 B Brotli on each `sortable` row (§5), against a cost the evidence puts well under 1 % and that nothing has measured. With a probe, the owner gets a measured trade.
- **Accept the shared rebuild on the reasoning above.** §14 asks for a measurement, and the reasoning is an inference.
- **Add an `xy()` row to `compare.ts`.** That adds an instrument and a lab page. A cycle row's bound would be wider than the effect, so it couldn't resolve the question.

**The other two size changes conform.** Deriving the count from the element array is CONTRIBUTING §5, and reads a length instead of a field. `pack` writes the two centers into the confirmation's scratch, which costs two stores per drop.

## 4. The report's statements

The report states its inferences as inferences, and the statements checked above hold. This assessment adds one fact: the confirmed rows composed a sink, so they include the growth's allocations (§2). The report needs no correction.

## 5. The size trade-off, for the owner

| Row | At `71f20df20` (Brotli) | At `501f60ab7` | Change | Ceiling |
| --- | --- | --- | --- | --- |
| sortable + y | 6,578 B | 6,733 B | +155 B | 6,733 B: green, 0 B left |
| sortable + xy | 6,566 B | 6,617 B | +51 B | 6,617 B: green, 0 B left |
| complete | 7,207 B | 7,362 B | +155 B | 7,065 B: red, 297 B over, up from 142 B |
| The seven rows without `sortable` |  |  | 0 | Unchanged |

**What the bytes buy.** About 2.3 to 2.5 ms less script per drag at 2,000 items: −2,508 µs per cycle without a landing and −2,272 µs with one, each lower in 7 of 7 rounds. At 20 items no saving was shown. No move row changed. An autoscroll frame reads the rows from the placeholder to the pointer instead of every row. **That is inferred, not measured.** The `+51 B` on "sortable + xy" buys nothing for `xy()`: it is the shared class carrying `y()`'s window code.

**What the correction may change.** The range `settle` probably makes the two `sortable` rows a little smaller. **Inferred.** If the probe reads "slower", one pass comes back. The unit's first form, which kept `refresh`'s own loop, read +275 B and +177 B, which is 120 B and 126 B above the landed form. Part of that difference is `pack` and the derived count, which a one-pass rebuild keeps. So a one-pass rebuild costs less than about 120 B on each `sortable` row. It would take both rows over their ceilings. **Inferred.** Runtime comes first, so a red row doesn't stop that correction.

**What the owner decides.** Whether to accept the final bytes when the correction reports. No ceiling moves either way. Refusing them reopens how `y()`'s window fits, and doesn't undo `DRD-50`'s runtime properties.

## 6. Limits

- **Only the target and the landed 2,000-item cycle rows measure the saving.** No row covers a long drag or an autoscroll.
- **The probe measures one function on a laid-out tree.** A real rebuild after a move also pays a forced layout, which is the same for both arms. So the probe shows the difference at its largest share of the rebuild.
- **The confirmation isn't rerun after the correction.** Range settling removes work from `y()`'s path and adds none, so `501f60ab7`'s readings remain `DRD-49`'s confirmation. **Inferred.**