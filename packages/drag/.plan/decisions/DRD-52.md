#### DRD-52 — `RectIndex` is the dimension-neutral cache, and `y()`'s prediction writes it through a lend scoped to one call and one range

**Status:** active, decided on 2026-11-12 on the owner's approval of proposal P in [`rect-index-ownership-proposal.md`](../rect-index-ownership-proposal.md), with the owner's two conditions. Amends `DRD-33` choice 9 and `DRD-51` §First unit, and answers `DRO-14` item 2. [`size-pass-unit-handoff.md`](../size-pass-unit-handoff.md) implements it. Its 7 B per committed move is provisional. **Implemented on 2026-11-12** at `237d65d2f` and accepted ([assessment](../size-pass-unit-assessment.md)). Property 9's 7 B is replaced by readings: +0.84 B per committed move warm, +4.13 B cold, both with their spreads. `DRD-58` amends properties 1, 4 and 6: the slot buffer is one `number[]` that nothing replaces. **Amended on 2026-11-13 by `DRD-61`:** properties 1, 4, 5 and 6. `lend` goes, and `RectIndex` applies the shift. **Corrected on 2026-11-13:** the timing result's A/A bounds are the rule's thresholds and don't limit a slowdown. **Amended on 2026-11-13 by `DRD-62`:** property 1. `xy()`'s index is a `RetainingRectIndex`

**`RectIndex` holds no axis policy. `xy.ts` holds its full rebuild, and `linear-shift.ts` holds `y()`'s prediction, which writes the slot buffer only through `lend(lo, hi, write)`: during the call, and inside the range. The placeholder's re-read is one shared `measurePlaceholder`. The development check still compares the placeholder's x with what the last rebuild measured.** [`size-pass-unit-handoff.md`](../size-pass-unit-handoff.md) implements it.

Decided on 2026-11-12 on the owner's approval of proposal P in [`rect-index-ownership-proposal.md`](../rect-index-ownership-proposal.md), measured at `c0d6b9205`, with two conditions of the owner's. The architect then measured it again at the unit's base, `1d304128b` ([readings](../measurements/2026-11-12-size-unit-base-readings.txt)).

**The owner's direction:**

- **Proposal P is approved.**
- **The existing development check is preserved, including the placeholder's x.**
- **The 7 B more per committed move is provisional.** It is checked again after warm-up, together with the planned timing comparison.
- **One unit carries `DRF-13` and `DRF-14` (U1), this decision and `DRD-53`.** Budgets stay unchanged.

**How the check keeps the placeholder's x.** The proposal re-measured all six fields of the placeholder after a committed move, so its x became the fresh reading and a placeholder moving along x was no longer reported (proposal §3.4). Keeping `RectIndex`'s y-only `remeasurePlaceholder` instead gives back about 30 B Brotli of the saving: with U1, −31 B on "sortable + y" instead of −62 B. **This decision keeps the shared six-field re-read in the shipped code, and gives the development check the placeholder's x as the cache held it before the re-read.** That state is written only inside `__DEV__` branches. Its patch reads 0/0/0 against the proposal's on every row, and a witness shows it reports what the base reports (property 7).

**Required properties:**

1. **`RectIndex`'s responsibilities.** It alone allocates the slot buffer and replaces it, which happens only in `collect`. It writes the element array, the window and the staleness. It makes every measurement: `collect`, `measure`, `measurePlaceholder` and `holds`. It has no `refresh`, `advance` or `remeasurePlaceholder`. Both axes use every member except `lend`.
2. **`measurePlaceholder(placeholder)`** packs the placeholder's rect like a slot, from one `getBoundingClientRect`. `collect` calls it. `linear-shift.ts` calls it on the first refresh after a committed move, as it calls `remeasurePlaceholder` now.
3. **`xy.ts`'s rebuild** is a module function that does what `RectIndex.refresh` does: `collect` with the window at slot 0, then `measure` of every slot when the window is empty. It uses only `RectIndex`'s public members. `DRD-50`'s outcome holds: `xy()` still rebuilds through `collect` and `measure`.
4. **`lend(lo, hi, write)`** calls `write(values, lo, hi)` once, with the writable slot buffer.
   - **Lifetime:** the reference is valid during the call only.
   - **Extent:** `lo` to before `hi` is inside the window, and `write` reads and writes nothing outside it.
   - **Reentrancy:** `write` calls neither `collect` nor `xy.ts`'s rebuild. Any other member may be called.
   - This is the rule that `measure` gives the sink's `settle`, and the JSDoc says so. Nothing checks it at runtime.
5. **The prediction in `linear-shift.ts`.**
   - Its writer is created once per `linearShift`, so a committed move allocates no function.
   - The committed move's displacement along y is rule state, which `moved` sets before it lends.
   - The arithmetic is unchanged: the top and the bottom move by the displacement, and the center is recomputed from the moved edges.
   - The report loop is unchanged.
6. **Reads.** The getters are unchanged, and they return read-only views. The `values` getter states its lifetime: valid until the next `collect`, the only operation that replaces the buffer.
7. **The development check reports what it reports at the base.**
   - After a committed move, it compares the placeholder's left and right with what the cache held before the re-read, which is the last rebuild's measurement.
   - It compares the placeholder's top and bottom with the re-read, and every field of every slot in the window, as now.
   - Its message is unchanged.
   - Its added state is written only inside `__DEV__` branches, and the shipped build of every row is byte-identical to the same change without it.
   - **Witness:** a development-project test in which only the placeholder moves along x, by its position's parity. The drag reports the fault "at the placeholder" at the base and with this decision. With the held x removed from the check, the test fails.
8. **Behavior.** Nothing that `y()` or the confirmation reads changes. `y()` never reads the placeholder's x, and the confirmation reads slots only. In the shipped build, the cached x of the placeholder is the fresh reading after a re-read. Nothing reads it.
9. **Runtime.** Per sample: no change. Per committed move: `lend` and the writer run where one method call ran, and the lend allocates nothing. The proposal read 7 B more per committed move in code that wasn't warm, and **that figure is provisional.** The unit's handoff states how it is read again.

**What this amends:**

- **`DRD-33` choice 9:** `RectIndex`'s private fields are still read through getters typed as read-only views. **Writes leave the class only through `lend`.**
- **`DRD-51` §First unit item 5:** the unit also carries this decision and `DRD-53`. By property 4 it runs `compare.ts`, because this decision moves work on the committed-move path.
- **`DRO-14` item 2** is answered.

**Not adopted:**

- The proposal's §3.4, under which the check no longer compared the placeholder's x.
- `RectIndex`'s y-only `remeasurePlaceholder`, which gives back about 30 B.
- The proposal's variants D to H, for the reasons in its §4.

**Cost.** Against `1d304128b`, with U1 (Brotli-11):

- −62 B on "sortable + y", −56 B on "sortable + xy" and −65 B on "complete";
- −1 B on "freeDrag";
- 0 B on "freeDrag + bounds + landing", which is −26 B minified;
- exactly 0/0/0 on the five other rows.

Without U1: −51, −54 and −47 B. No ceiling changes, and `DRO-4` keeps the re-base.

**Result, 2026-11-12:** implemented in `237d65d2f`, reported at `ed4bd589f` and accepted in [`size-pass-unit-assessment.md`](../size-pass-unit-assessment.md). The cost is as stated above.

- **Properties 1 to 6 and 8 hold.** `lend`'s and the `values` getter's JSDoc state property 4's and property 6's rules.
- **Property 7 holds.** The witness, "drag:DRD-52 development equivalence check", passes in Chromium, Firefox and WebKit at the unit and at `1d304128b`'s source, and fails in all three with the held x removed (M1). In the three-engine suite, the check throws in the witness and nowhere else.
- **Property 9: the provisional 7 B is replaced by readings, and their uncertainty is kept** (assessment §2.1). Three runs per tree, heap sampling at 16 B:
  - **warm,** after 2,000 crossings: +0.84 B per committed move. The difference is smaller than the spread inside either tree, so the reading bounds the excess below 7 B and doesn't resolve about 1 B in either direction;
  - **cold,** after 100 crossings: +4.13 B, with every unit run above every base run. A drag with fewer committed moves than that warm-up sees about 4 B more per committed move;
  - **per sample:** +0.80 B for `y()` and +0.55 B for `xy()`, each below the 4 B limit, with spreads of 2 to 3 B;
  - warm, the committed-move code allocates nothing the probe sees, at either tree.
- **Timing:** `compare.ts --before 1d304128b` reads "no difference shown" on all ten move and cycle rows, and every layout count equals the base's. That is inconclusive: the rule found neither "slower" nor "faster", so a speed change in either direction is unmeasured. The rows' A/A bounds, 8 to 325 µs of script and 51 to 3,305 µs of task time, are the thresholds the rule used. A slowdown smaller than a bound can't read "slower", and a larger one isn't excluded either. Four idle background tasks of the implementing session overlapped the first four seconds of the moves process (assessment §2.2). The verdict stands with that overlap recorded.

**Corrected on 2026-11-13** on the owner's direction ([`rect-index-access-assessment.md`](../rect-index-access-assessment.md) §7.4). The timing bullet said "That doesn't show the absence of a slowdown smaller than a row's A/A bound", which implies that a larger slowdown is excluded. `DRD-50`'s result had already recorded that the A/A bound isn't such a limit. The verdict, the rule and the bounds don't change.

**Amended 2026-11-13 by `DRD-58`, properties 1, 4 and 6.** The slot buffer is one `number[]` for the index's life, so nothing replaces it.

- **Property 1:** `RectIndex` alone grows the slot array, in `collect`, by appending. Nothing replaces it.
- **Property 4:** `lend` keeps its extent rule, and `write` writes the array only during the call, which is the class-encapsulation rule. The lifetime and reentrancy clauses are removed.
- **Property 6:** the `values` getter returns the same array for the index's life, typed `readonly number[]`, and gives no lifetime.
- **What they used to say:**
  - property 1: "It alone allocates the slot buffer and replaces it, which happens only in `collect`";
  - property 4: "**Lifetime:** the reference is valid during the call only" and "**Reentrancy:** `write` calls neither `collect` nor `xy.ts`'s rebuild. Any other member may be called";
  - property 6: "The `values` getter states its lifetime: valid until the next `collect`, the only operation that replaces the buffer."

**Amended on 2026-11-13 by `DRD-61`, properties 1, 4, 5 and 6.** `RectIndex` applies the prediction itself, and code outside reads one value at a time.

- **Property 1:** `RectIndex` also moves the crossed slots, through `shift(lo, hi, delta)`, and re-reads one row through `travel`. Only `y()` calls those two. `xy()` uses every other member.
- **Property 4 is removed,** with `lend`.
- **Property 5:** `linear-shift.ts` decides `lo`, `hi` and `delta`, and calls `shift`. It has no writer and no displacement rule state. The arithmetic and the report loop are unchanged.
- **Property 6:** no getter returns a view. `at(slot, field)`, `item(slot)` and `insertion(gap)` each return one value, and `count`, `first` and `end` stay.
- **Property 7 holds as written.** The check copies the window and the placeholder through `at`.
- **What they used to say:**
  - property 1: "It makes every measurement: `collect`, `measure`, `measurePlaceholder` and `holds`. It has no `refresh`, `advance` or `remeasurePlaceholder`. Both axes use every member except `lend`";
  - property 4: "`lend(lo, hi, write)` calls `write(values, lo, hi)` once, with the writable slot buffer", with its extent rule, and `write` writing the array only during the call, as `DRD-58` amended it;
  - property 5: "Its writer is created once per `linearShift`, so a committed move allocates no function" and "The committed move's displacement along y is rule state, which `moved` sets before it lends";
  - property 6: "The getters are unchanged, and they return read-only views", the `values` getter returning the same array for the index's life, as `DRD-58` amended it.

**Amended on 2026-11-13 by `DRD-62`, property 1.** `xy()`'s index is a `RetainingRectIndex`, a subclass of `RectIndex` in `rect-index.ts` that also keeps each slot's left and top across one rebuild. `xy()` uses every member of `RectIndex` except `shift` and `travel`, and only `xy()` calls the subclass's `retain` and `retained`. **What it used to say,** as `DRD-61` amended it: "Only `y()` calls those two. `xy()` uses every other member."