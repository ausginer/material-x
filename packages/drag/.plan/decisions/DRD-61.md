#### DRD-61 — `RectIndex` owns its storage and every write to it: callers read one value at a time, `linearShift` decides a shift that the index applies, and the sink answers per element

**Status:** active, decided on 2026-11-13 on the owner's approval of proposal P and its displacement-sink interface, in [`rect-index-access-proposal.md`](../rect-index-access-proposal.md) at `a61b76e9c`. `RectIndex` owns its storage and every write to it, and the sink answers `displaced(element)`. Amends `DRD-52` properties 1, 4, 5 and 6, `DRD-58` properties 1, 3 to 7 and 9, `DRD-50` property 1 and W7, M7 and M8, and `DRD-33` choice 9. Measured at the restored names against `8904947f6`: −31, +22 and −92 B Brotli on the `sortable` rows, and no verdict changes. [`rect-index-access-handoff.md`](../rect-index-access-handoff.md) implements it from `drag/size` at `8904947f6`, with a focused timing check under the owner's hold. Budgets are unchanged. **Implemented at `010a9ef39`, reported at `f788b2b80` and accepted** ([assessment](../rect-index-access-assessment.md)). Timing reads "no difference shown" in all three cases, so speed is unmeasured. Property 11's reading of the A/A threshold is corrected in place. **Reviewed at `bdb2c73c8`:** properties 3 and 10 are corrected in place, the acceptance stands, and one `.scripts/vitest-config.ts` comment goes to a follow-up. **Amended on 2026-11-13 by `DRD-62`:** properties 1, 2, 3 and 8. `xy()`'s `before` goes into `RetainingRectIndex`, and the field and axis types are narrowed. **Amended on 2026-11-14 by `DRD-63`:** property 6's wording. The sink's `dx` and `dy` are private fields

**`RectIndex` keeps one `number[]` for its life, holding a scratch slot, the placeholder and the destination slots. Its axis is chosen when it is constructed. Code outside reads one value at a time through `at`, `item` and `insertion`, and never holds the storage or the element array. Every write is a method of the class, including `shift(lo, hi, delta)`, which applies the prediction, and `travel`, which re-reads one row. `linearShift` decides `lo`, `hi` and `delta`. `DisplacementSink.settle` is replaced by `displaced(element)` with read-only `dx` and `dy`, so the sink receives no array and writes nothing of the index. `lend`, the getters `values`, `placeholderRect` and `items`, and the fixed-size scratches go. `xy()`'s geometry rules don't change. Budgets are unchanged.** [`rect-index-access-handoff.md`](../rect-index-access-handoff.md) implements it from `drag/size` at `8904947f6`.

Decided on 2026-11-13 on the owner's approval of proposal P and its displacement-sink interface, in [`rect-index-access-proposal.md`](../rect-index-access-proposal.md) at `a61b76e9c`. The architect then ported P to the names that `DRD-60` restored, and checked and measured it at `8904947f6` ([size](../measurements/2026-11-13-rect-index-access-restored-size.txt), [checks](../measurements/2026-11-13-rect-index-access-restored-checks.txt), [patch](../probes/rect-index-access/patches/P-restored-names.diff.txt)).

**The owner's direction:**

- **Proposal P is approved, with its sink interface.** That answers the proposal's §5 items 1 and 3. VF and keeping `DRD-52` and `DRD-58` as they are aren't taken.
- **The unit targets `drag/size` after the mangling rollback, at `8904947f6`.** It uses the restored property names and keeps the `number[]` storage.
- **The proposal's size claims are reconciled with that publication baseline.** The green "complete" that the mangled build read is historical.
- **The unit carries:**
  - the replacement W7 tests and their discriminating mutation;
  - the Chromium correctness checks;
  - current size and allocation readings;
  - the focused timing check that the proposal's §4.3 describes.

  This answers the proposal's §5 item 2: the runtime isn't accepted on the inlining trace alone.

- **The deferred campaigns stay stopped, and budgets are unchanged.**
- **The report keeps reduced allocation apart from unmeasured speed.**
- **The 49 existing lint errors and `repo:RF-31` are accounted for and not repaired** ([rollback report](../mangle-rollback-report.md) §Baseline errors).

**Names.** The proposal wrote `_at`, `_item`, `_insertion`, `_shift` and `_travel`. Under `DRD-60` they are `at`, `item`, `insertion`, `shift` and `travel`, and the members they join are `collect`, `measure`, `measurePlaceholder`, `holds`, `count`, `first`, `end`, `invalidate` and `retire`. Removing each `_` from P, then formatting, gives the restored-name patch. Against `8904947f6`, the rollback differs from `f552e0ec9` with each `_` removed only in line breaks, in `layout-animation.ts`, `rect-index.ts` and `xy.ts` ([checks](../measurements/2026-11-13-rect-index-access-restored-checks.txt)).

**Size, reconciled.** The gate on the published build, Brotli-11, at `8904947f6` and with P:

| Row | `8904947f6` | P | P − base | Ceiling | Proposal, "plain" build at `f552e0ec9` |
| --- | --: | --: | --: | --: | --: |
| sortable + y | 6619 | 6588 | −31 | 6733 | −45 |
| sortable + xy | 6515 | 6537 | +22 | 6617 | +37 |
| complete | 7258 | 7166 | −92 | 7065 | −93 |

- **Minified:** −205, +103 and −302 B. The seven rows without `sortable` read exactly 0/0/0.
- **No verdict changes.** "complete" stays over its ceiling, by 101 B instead of 193 B. "sortable + y" keeps 145 B of headroom, and "sortable + xy" 80 B.
- **Why the differences aren't the proposal's:** its "plain" build kept each `_`, one byte at every occurrence, and the rollback's build has none.
- **Historical:** the proposal's "renamed" column and its "complete" at 7,040 B, under its ceiling, were read under `DRD-56`'s mangling. `DRD-60` removed that mangling, so those figures are no longer evidence for this decision.

**Why:**

- **The class-encapsulation rule, applied to the whole path.**
  - The proposal's §2 found that every caller needs one value per slot and field, an element, an insertion, a boolean or a distance.
  - With `lend`, a writer outside the class held the storage during a call. With `settle`, the sink did too, for every measured range. Under this decision, every geometry write is a method of `RectIndex`, and nothing outside it receives the storage.
- **It removes allocation and adds none.** The scratch `Float64Array`s and their one-element arrays go, and a read returns a number. At `f552e0ec9`, allocation fell per `y()` sample, per cold committed move and per drop with a sink, and no probe moved up (proposal §4.2).
- **The axis is data, not a rule.** `DRD-52` property 1 took axis policy out of `RectIndex`. Naming the axis at construction keeps that, for 7 to 12 B more than writing y into the index.
- **The shared storage pays for itself.** A separate placeholder array was 16 to 19 B larger.

**Required properties:**

1. **The storage.**
   - `#values` is one `readonly` `number[]` for the index's life. It holds the scratch slot, then the placeholder, then the destination slots, `STRIDE` numbers each, in `DRD-58`'s packed layout.
   - The placeholder is the slot `PLACEHOLDER`, which is −1. The scratch slot is before it and is private.
   - **It grows only by appending, in `collect`,** to cover the two leading slots and every destination slot. `DRD-58` property 2 holds: no write lands past the array's length, nothing assigns `length` upward, and the array never shrinks.
   - **Apart from `xy()`'s `before` (property 8), nothing in `src/sortable/` allocates a typed array for geometry.** `#placeholderRect`, `holds`'s scratch, `linearShift`'s probe scratch and `ReadonlyFloat64Array` go. The development check keeps the placeholder's x as two numbers, written only inside `__DEV__` branches.
2. **The axis is chosen at construction.**
   - The constructor takes `axis: number`, and the default is `LEFT`. `y()` constructs `new RectIndex(TOP)`. `xy()` constructs `new RectIndex()`, and never calls `shift` or `travel`.
   - `shift` and `travel` find the near edge at `axis`, the far edge at `axis + RIGHT` and the center at `axis + CENTER_X`, with the same arithmetic for both values. No branch in the index depends on the axis.
3. **Reads.**
   - `at(slot, field): number` returns one field, and `item(slot): HTMLElement` the element at a slot. `insertion(gap)` returns the insertion at a gap.
   - `count`, `first` and `end` are unchanged.
   - No member returns the storage, the element array or a view of either. **`at` and `item` construct nothing:** each returns a value the index already holds, a number from the storage or an element from the element array, and neither creates an array, a view or an object in its source. This is a property of the source, checked by reading it, and not a byte count. A heap-sampling reading attributed to `at` or `item` is reported under property 11 as allocation, and its cause is stated only once it is established. `insertion` returns the `Insertion` that `insertionAt` builds, which `y()` and `xy()` return now.
4. **Writes, all methods of `RectIndex`:**
   - `collect`, `measure`, `measurePlaceholder`, `holds`, `invalidate` and `retire` keep what they do;
   - `shift(lo, hi, delta)` moves the slots from `lo` to before `hi` along the axis, inside the window. Both edges move by `delta`, and the center is recomputed from the moved edges, which is `DRD-52` property 5's arithmetic;
   - `travel(slot, getBox, displacement): number` reads the slot's element, or its box, into the scratch slot, settled, and returns the scratch's near edge minus the slot's cached near edge;
   - `holds` reads into the same scratch slot, and `measure` writes each slot once, in place;
   - **`lend` is removed, and no member takes a callback that receives the storage.**
5. **One read path.** One private method reads one element's rect, asks the sink once about that element, and writes the slot's six fields once, already settled. `measure`, `holds` and `travel` use it. `measurePlaceholder` uses it without a sink. `pack` goes into it, with the same arithmetic: each edge minus what the sink carries, and each center from the two settled edges.
6. **The sink answers, and writes nothing of the index.**
   - `DisplacementSink.displaced(element: HTMLElement): boolean`. When it returns `true`, the read-only `dx` and `dy` hold what the element's animation carries, in viewport units, until the next call. When it returns `false`, the index subtracts nothing. `settle` is removed.
   - `layoutAnimation`'s sink holds `dx` and `dy` in closure variables behind getters. Per call, its work is one `Map` lookup and, for a running row, one `getComputedTiming`. It reads no layout.
   - The type stays one of `DRD-39`'s unpublished installer types, and Part II §8 keeps no compatibility for it. The emitted `sortable/axis.d.ts` replaces `settle` and its documentation with the three members and theirs. No other `.d.ts` changes, and `typedoc` warns as before.
7. **`linearShift` decides.**
   - `moved` computes `lo` and `hi`. On the first committed move after an invalidation, `delta` comes from `travel`. Later, it comes from the known row distance, with the move's sign.
   - It calls `shift(lo, hi, delta)` and reports each crossed row through `item`, with the same vector as now.
   - The writer closure and the `delta` rule state go, and `delta` is a local.
8. **`xy()` is unchanged as a rule.** It rebuilds through `collect` and `measure(0, count)`, reads through `at`, `item` and `insertion`, and keeps its own `before` array, which isn't the index's storage.
9. **The development check** copies the window and the placeholder through `at`. `DRD-52` property 7 holds: it compares the placeholder's x with what the cache held before the re-read, and its message is unchanged.
10. **Witnesses, each shown by a mutation it catches.**
    - **W7, replaced: each measured row is settled by asking about that row.** With `layoutAnimation` composed, every `displaced` call during a `y()` drag asks about exactly the destination row whose rect was read just before it, and no other row was read in between. The drag grows the window across at least three slots after slot 0. The same holds across two `xy()` rebuilds of 11 destination rows. The titles are "drag:DRD-50 should settle each row y() measures by asking the sink about that row" and "drag:DRD-50 should settle each row of an xy() rebuild by asking the sink about that row".
    - **M7a:** the read path asks the sink about the element at slot 0 instead of the row it read. Both W7 tests must fail.
    - **M7b:** `xy()`'s rebuild measures without the sink. The `xy()` W7 test must fail. At the port, it was the only test that failed.
    - **W8, unchanged as `DRD-50` states it:** when a resolution grows the window over a row in flight, the gap it holds equals the gap of the rows' flow positions. **The gap assertion is the one that observes the index's settled value.** **M8** is now a read path that subtracts nothing when the sink answers `true`, and W8's gap assertion must fail. W8's settled-top assertion, the presented top minus `dy`, compares `layoutAnimation`'s `dy` with flow and reads nothing that `RectIndex` writes. It is a check of property 6's sink, and it passes under M8.
    - **The axis witness:** with `y()`'s index constructed with `LEFT`, the development check must fault, in `sortable.browser.test.ts` or `equivalence-check.browser.test.ts`.
    - Every mutation was checked at the port. Both W7 tests failed on M7a, and on M7b only the `xy()` W7 test failed. M8 failed W8, and the axis mutation failed 18 of 50 tests on the check's fault. The proposal's mutation 2, which is M8, didn't fail the `xy()` W7 test, so it isn't W7's mutation.
    - Every other test keeps its verdict, including "should call the layoutAnimation sink with its receiver, with rows in flight" and `DRD-52`'s development equivalence check.
11. **Costs, and how each is read.**
    - **Size:** every row at the base and at the end. The seven rows without `sortable` must read exactly 0/0/0. The expected figures are the table above, and the patch reads them. No ceiling or control figure changes, and a changed verdict goes to `DRO-4`.
    - **Allocation:** `DRD-52`'s probes per sample and per committed move, cold and warm, and the proposal's per-drop probe with a sink, at the base and at the end. They are reported and not gated.
    - **Timing:** one focused paired check of `xy()`'s rebuild and `y()`'s scan, which the handoff specifies from `DRD-50` property 2's probe. It runs under `DRD-44` property 6's hold. Its verdict is reported as it reads, with the sign counts, the median difference and the A/A threshold that the rule used. "No difference shown" is inconclusive: the run met neither directional rule. None of those figures limits the size of a slowdown that the check could have missed. A "slower" verdict in any case goes to the owner before the report is accepted (Part II §0 and §14). The code stays as implemented, and nothing is reverted by the unit.
    - **The report doesn't infer speed from allocation.** A reduction in bytes allocated is reported as allocation. A speed change that the timing check doesn't resolve is unmeasured, whatever its size, and the report says so.

    **Corrected on 2026-11-13** on the unit's report ([assessment](../rect-index-access-assessment.md) §3.2). The timing bullet said "'No difference shown' bounds only a slowdown larger than its A/A bound", and the next bullet said "The speed below the timing check's bound is unmeasured". Both read the A/A threshold as a limit on the slowdown the check would catch. A slowdown larger than the threshold also reads "no difference shown" when fewer than 6 of 7 rounds agree, as `DRD-50`'s result had recorded. The rule and the recorded verdicts don't change.

**Corrected on 2026-11-13** on the independent review at `bdb2c73c8` ([assessment](../rect-index-access-assessment.md) §7). Neither correction changes the code, a test or a verdict.

- **Property 3** said "`at` and `item` allocate nothing". That could be read as a measured byte count, and the per-drop probe attributes 3,300, 3,288 and 3,600 B over 60 drops to `at`. The property meant the source, as the rationale's "a read returns a number" says, and it now states that reading. Property 3 holds under it.
- **Property 10's W8 bullet** said "W8, unchanged as a property: its settled top is the presented top minus `dy`", and "W8 must fail" on M8. The settled-top assertion reads the sink's `dy`, not the index, and passes under M8. W8 fails M8 on its gap assertion, with the development check (the check faults and the gap reads −1) and without it (the gap reads 2 for 3).

**What this amends.** Each amended entry says what it used to say.

- **`DRD-52`:**
  - property 1: `shift` and `travel` are added, and `lend` goes;
  - property 4 is removed;
  - property 5: `linearShift` passes `lo`, `hi` and `delta` to `shift`;
  - property 6: the getters go, and `at`, `item` and `insertion` read.

  Property 7 holds as written, and the check copies through `at`.

- **`DRD-58`:**
  - property 1: the storage also holds the scratch slot and the placeholder;
  - property 3: `pack` goes into the read path, with its arithmetic, and `settle`'s range goes with `settle`;
  - property 4: no getter returns the array;
  - property 5: `lend` goes;
  - property 6: `#placeholderRect`, the scratches and `ReadonlyFloat64Array` go, because the storage holds them;
  - property 7: no shared signature takes the union;
  - property 9: W7 is replaced.
- **`DRD-50`:** property 1, and property 4's W7 and M7, which are replaced by property 10 above. M8 changes with the read path.
- **`DRD-33` choice 9:** no getter returns a view, and the accessors return one value each. Writes don't leave the class.

**Rejected:**

- **VF:** the shift and the travel as module functions. At `f552e0ec9`, "sortable + xy" read −25 B against P's +37 B, and the other two rows 8 and 20 B more than P. It writes the storage from outside the class.
- **VY:** y written into `shift` and `travel`. It puts an axis rule back into `RectIndex`.
- **VSEP:** the placeholder in its own array, which is 16 to 19 B larger.
- **Keeping `DRD-52` and `DRD-58` as they are.**

**What this doesn't decide:**

- **Named accessors, a scan inside `RectIndex`, and `xy()`'s `before` in the index's storage.** They weren't prototyped (proposal §4.1).
- **`DRF-38`'s scope** and the other 48 lint errors at the base, and `repo:RF-31`. The unit adds no error and repairs none.
- **The acceptance of the rollback's report** at `8904947f6`. The architect hasn't read it yet. The unit takes `8904947f6`'s code as its base on the owner's direction.
- **`DRO-4`'s re-base and the red rows.**
- **Firefox and WebKit,** deferred to the owner's planned CI ([`performance-plan.md`](../performance-plan.md) §3).

**Result, 2026-11-13:** implemented at `010a9ef39`, reported at `f788b2b80` and accepted ([assessment](../rect-index-access-assessment.md), §Disposition of the RectIndex access report). Properties 1 to 10 hold. The size table above is read exactly, the seven control rows read 0/0/0, and no verdict changes. **Allocation:** −34.74 B per `y()` sample, −11.77 B per cold committed move and −406.53 B per drop with `layoutAnimation()`, each beyond its spread. The `xy()` sample and the warm move show no difference. Those are bytes allocated. **Timing:** "no difference shown" in all three cases, which is inconclusive, so the speed of `xy()`'s rebuild and `y()`'s scan is unmeasured in either direction. The lint and typecheck baselines are unchanged.

**Reviewed on 2026-11-13** by an independent feature proof at `bdb2c73c8` ([review](../reviews/rect-index-access/proof-reviewer.md)), with three tier-C findings and no tier A or B. Properties 3 and 10 are corrected as stated above, and the acceptance stands (§Disposition of the RectIndex access review). One comment in `.scripts/vitest-config.ts` goes to a follow-up ([handoff](../rect-index-access-handoff.md) §Follow-up after the independent review).

**Amended on 2026-11-13 by `DRD-62`, properties 1, 2, 3 and 8, and §What this doesn't decide.** `xy()`'s previous geometry is held by `RetainingRectIndex`, a subclass in `rect-index.ts`, and the field and axis parameters accept only their constants. `xy()`'s rule is unchanged.

- **Property 1:** nothing in `src/sortable/` allocates a typed array for geometry, with no exception.
- **Property 2:** the constructor takes `axis: NearEdge`, which is `LEFT` or `TOP`, and the default is `LEFT`. `#axis` has the same type. `xy()` constructs `new RetainingRectIndex()`, and never calls `shift` or `travel`.
- **Property 3:** `at(slot: number, field: Field)`, where `Field` is one of the six geometry fields. `RetainingRectIndex.retained(slot, field)` is one more read that constructs nothing.
- **Property 8:** `xy()` calls `retain` before its rebuild, and reads through `at`, `retained`, `item` and `insertion`. It keeps no geometry array.
- **§What this doesn't decide:** `xy()`'s `before` is decided. Named accessors and a scan inside `RectIndex` stay undecided.
- **What they used to say:**
  - property 1: "Apart from `xy()`'s `before` (property 8), nothing in `src/sortable/` allocates a typed array for geometry";
  - property 2: "The constructor takes `axis: number`, and the default is `LEFT`. … `xy()` constructs `new RectIndex()`, and never calls `shift` or `travel`";
  - property 3: "`at(slot, field): number` returns one field";
  - property 8: "It rebuilds through `collect` and `measure(0, count)`, reads through `at`, `item` and `insertion`, and keeps its own `before` array, which isn't the index's storage";
  - §What this doesn't decide: "Named accessors, a scan inside `RectIndex`, and `xy()`'s `before` in the index's storage. They weren't prototyped (proposal §4.1)".

**Amended 2026-11-14 by `DRD-63`.** Property 6: the sink holds `dx` and `dy` in private fields behind getters, not in closure variables. The text above is unchanged.