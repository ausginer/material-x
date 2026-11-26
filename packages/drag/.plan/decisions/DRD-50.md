#### DRD-50 — A measurement settles a slot range of the cache's own buffer, and a paired probe decides whether `xy()`'s shared rebuild stays

**Status:** active, decided on 2026-11-12 by the architect on the window report at `56c1c27c3` ([assessment](../performance-window-assessment.md) §2 and §3). Amends `DRD-49` property 8 and the internal `DisplacementSink.settle`. **Implemented at `8d002529a`, and it conforms** ([report](../performance-window-correction-report.md) at `566d4d29e`, [assessment](../performance-window-correction-assessment.md)). The probe read "no difference shown", so the shared rebuild stays, and the reading bounds no slowdown. `DRD-58`: W7's helpers identify the slot array by being an array, and a copy mutation replaces M7. **Amended on 2026-11-13 by `DRD-61`:** property 1, and W7, M7 and M8. The sink answers per element, and receives no array. That amendment's "allocate nothing" is corrected on 2026-11-13 to the source reading

**`DRD-49`'s unit fitted the byte ceilings by sharing `RectIndex`'s measurement between the two axes. That left two runtime costs that no reading covers. With a displacement sink, each row that `y()` reads now allocates a typed-array view and a one-element array, because `settle` works only from the start of what it receives. And `xy()`'s full rebuild is now two passes and a `pack` call per slot, and its runtime is not measured. `settle` takes a slot range, so nothing is allocated per read. A paired probe of `xy()`'s rebuild against `71f20df20`'s decides whether the shared rebuild stays. If the probe reads "slower", one pass comes back, whatever the bytes.**

Decided on 2026-11-12 by the architect, on [`performance-window-report.md`](../performance-window-report.md) at `56c1c27c3` ([assessment](../performance-window-assessment.md) §2 and §3). The owner asked for these points to be resolved with runtime ahead of the byte ceiling, the confirmed readings preserved, and the deferred campaigns stopped.

**Why:**

- **The allocation is avoidable, and it came with the size fit.** CONTRIBUTING Part II §0 and §14 forbid avoidable allocation on pointer-move paths that is made for bytes without measurement and owner approval. A frame that reads rows allocates it at the activation, when the pointer leaves the window, and after every invalidation, so on every frame of an autoscroll. `DisplacementSink` isn't published (`DRD-39`), and §8 keeps no compatibility for an unreleased API, so its `settle` can take a range. That removes the view and the copy, and probably shortens `rect-index.ts`.
- **`xy()`'s rebuild is a hot path, and §14 asks for a measurement.** With a sink, `xy()` rebuilds at every committed move. Without one, the frame after the move rebuilds. The added work is probably well under 1 % of a rebuild, but that is inferred. No row composes `xy()`, and the cycle rows' A/A bounds are wider than the effect. A probe of the one changed function, in one page against the base's class, can resolve it and changes no instrument.
- **The decision rule comes before the reading.** Runtime comes first, so a "slower" reading restores one pass even when that takes a row over its ceiling. A reading of "no difference shown" or "faster" keeps the shared rebuild, and its bound goes on record.

**Required properties:**

1. **Range settling.** `DisplacementSink.settle` settles exactly the slots in a range it receives, in the buffer and element array as given. `RectIndex`'s measurement passes the cache's own buffer and element array with the range it read, and allocates nothing for the sink. The drop's confirmation and `linearShift`'s probe settle their one-slot scratch with a one-slot range, and read and allocate what they did before. `settle`'s documentation states the range. The type stays internal.
2. **The probe of `xy()`'s rebuild.** It runs in Chromium, under `DRD-44` property 6's hold, with `DRD-40` property 4's machine record and its output kept.
   - **The page:** a laid-out field of 2,000 items that wraps, and a placeholder in it.
   - **The arms:** `before` is `71f20df20`'s `RectIndex`, `production` is the unit's code, and `control` is a second `production` instance for the A/A reading. Each arm has its own instance, and its own sink in the case that composes one.
   - **The cases:** no sink, and `layoutAnimation` with nothing in flight.
   - **The rounds:** 7 rounds. Each round runs the arms in a rotated order. Each arm discards a warm-up batch, then times a batch of rebuilds, each one `invalidate()` and then `refresh`. A batch lasts long enough that the clock's resolution doesn't matter. The reading is the mean per rebuild.
   - **The verdict:** `compare.ts`'s paired rule. "Slower" means `production` is higher than `before` in at least 6 of 7 rounds, and the median difference is above the largest absolute A/A difference. The probe isn't a `bench/` file. Its source is kept beside its output under `measurements/`.
3. **One pass, only on a "slower" reading** in either case. `xy()`'s full measurement then collects, reads and packs each slot in one pass over the snapshot, settles once with the cache's own buffer, and leaves the window at every slot, as `71f20df20` measured. `y()`'s `collect`, `measure` and growth don't change. The probe runs again on that form, and it must not read "slower".
4. **Witnesses, each shown by a mutation it catches.**
   - **W7, no copy:** with a sink composed, every `settle` call that a measurement makes during a `y()` drag and during an `xy()` rebuild receives the cache's buffer and element array, the same two objects across the operation, and the range it read. The drag must grow the window across at least three slots after slot 0. **M7**, `501f60ab7`'s call with a view and a copy, fails W7.
   - **W8, the range is settled:** with `layoutAnimation` and rows in flight, a resolution that grows the window over a row in flight holds that row's settled geometry, and the gap equals the gap of the rows' flow positions. **M8**, a `settle` that ignores the range's start, fails W8.
   - **The existing tests still pass,** including `DRD-49`'s W5 and W6, `DRD-47`'s W1 and W2, "should call the layoutAnimation sink with its receiver, with rows in flight", and the census and allocation tests.
5. **Bytes.** The unit runs the size table at its last code commit and reports each row against `501f60ab7` and `71f20df20`. The seven rows without `sortable` read 0. A `sortable` row that turns red doesn't return the unit, because runtime comes first. It is reported for the owner, and no ceiling moves.
6. **What it doesn't change.** `DRD-49`'s window, growth, scan, confirmation slot and development check. `DRD-49`'s readings stand as its confirmation, and no `compare.ts` run follows. Every row, injection, floor entry, ceiling and `judge` stay as they are. No campaign, `--prove` or `--floors` runs.

**Rejected:**

- **A reusable one-slot scratch in `RectIndex`.** It removes the allocation but copies every read twice, and costs bytes that range settling saves.
- **Restore one pass now.** It would spend up to about 120 B Brotli on each `sortable` row against a cost that is probably under 1 % of a rebuild and that nothing has measured.
- **Accept the shared rebuild by inference.** §14 asks for a measurement.
- **An `xy()` row in `compare.ts`.** It would add an instrument and a lab page, and a cycle row's bound would be wider than the effect.

**What this amends:**

- **`DRD-49` property 8.** `xy()`'s full measurement may share `RectIndex`'s code with `y()`, provided its reads, their values and its settling are unchanged, and property 2's probe doesn't read "slower". `DRD-49`'s rule that a row turning red returns the unit doesn't apply to this correction.
- **The internal `DisplacementSink.settle`**, by property 1.
- **The plan:** [`performance-plan.md`](../performance-plan.md) §2 P3 names [`performance-window-correction-handoff.md`](../performance-window-correction-handoff.md).

**Result, 2026-11-12** ([report](../performance-window-correction-report.md) at `566d4d29e`, [assessment](../performance-window-correction-assessment.md)). Implemented at `8d002529a`, and it conforms. A measurement settles a slot range of the cache's own buffer and element array and allocates nothing for the sink. W7 and W8 pass in all three engines, and M7 and M8 each fail their witness in all three. The probe of `xy()`'s rebuild reads "no difference shown" in both cases, so the shared rebuild stays, and property 3 didn't apply. **The reading doesn't bound a slowdown.** The A/A bounds, 650 µs with no sink and 807 µs with `layoutAnimation`, are the rule's thresholds and not limits on how much slower the shared rebuild could be. The rule found no slowdown, and both median differences are negative, −219.5 µs and −135.9 µs. The probe can't resolve the effect this decision inferred, about 20 µs, which remains an inference. The bytes against `71f20df20` are +143 B Brotli on "sortable + y", +36 B on "sortable + xy" and +149 B on "complete", and the owner accepts them (`DRO-4`). The "Why" bullet above said a probe "can resolve it". It could resolve only a slowdown larger than its spread.

**Amended on 2026-11-13 by `DRD-61`: property 1, and property 4's W7, M7 and M8.**

- **Property 1:** a measurement no longer passes a range to the sink. `RectIndex` asks `displaced(element)` once for each row it reads, and subtracts the sink's `dx` and `dy` itself. No array, view or object is constructed for the sink, and the sink receives no array. The drop's confirmation and `linearShift`'s probe read through the same path, into the index's scratch slot, and construct no scratch of their own.
- **W7** asserts that each `displaced` call asks about exactly the row read just before it, in a `y()` drag and across `xy()` rebuilds. Its mutations are `DRD-61`'s M7a and M7b.
- **M8** is a read path that subtracts nothing when the sink answers `true`. W8, W8's title and property 2's probe result stand.
- **What they used to say:**
  - property 1: "`DisplacementSink.settle` settles exactly the slots in a range it receives, in the buffer and element array as given. `RectIndex`'s measurement passes the cache's own buffer and element array with the range it read, and allocates nothing for the sink. The drop's confirmation and `linearShift`'s probe settle their one-slot scratch with a one-slot range";
  - W7: "every `settle` call that a measurement makes during a `y()` drag and during an `xy()` rebuild receives the cache's buffer and element array, the same two objects across the operation, and the range it read";
  - M7: "`501f60ab7`'s call with a view and a copy", which `DRD-58` replaced by a copy of the slot array;
  - M8: "a `settle` that ignores the range's start".

**Corrected on 2026-11-13** on the independent review of the unit ([assessment](../rect-index-access-assessment.md) §7.2). Property 1's amendment said "Nothing is allocated for the sink" and ended "and allocate nothing". It is a statement about the source, as `DRD-61` property 3 now says, and not a byte count: heap sampling attributes bytes to `#read`, `travel` and `displaced` in the per-drop probe, and those are allocation readings with no established cause.