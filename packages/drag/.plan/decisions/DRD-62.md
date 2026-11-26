#### DRD-62 — `xy()`'s previous geometry is held by `RetainingRectIndex`, and the index's field and axis parameters accept only their constants

**Status:** active, decided on 2026-11-13 on the owner's acceptance of VX in [`xy-held-geometry-proposal.md`](../xy-held-geometry-proposal.md) at `316003d76`, on the condition of narrowed field types. Adopts the provisional source at `f79f66fe2`. `xy()`'s previous geometry is held by `RetainingRectIndex`, and `at`, `retained` and the axis accept only their constants. Amends `DRD-61` properties 1, 2, 3 and 8, `DRD-58` property 7's table and §What this doesn't decide, and `DRD-52` property 1. [`xy-held-geometry-handoff.md`](../xy-held-geometry-handoff.md) implements it. A fresh independent reviewer reads its report before the architect's final acceptance. Speed is unmeasured, and budgets are unchanged. **Implemented at `b4117dae2`, reported at `7184d069c`, reviewed at `c4d02d45c` and accepted on 2026-11-14** ([assessment](../xy-held-geometry-assessment.md)). The 60 `.js` and `.d.ts` files are byte-identical to `f79f66fe2`'s, `sortable/rect-index.js.map` differs, and every size row reads 0/0/0. Property 2 is corrected in place to name the base's `held === 0` exit

**`rect-index.ts` exports `RetainingRectIndex extends RectIndex`. It keeps each slot's left and top across one rebuild in `#retained`, its own private `number[]`. `retain()` is its only write, and `retained(slot, field)` reads one number. `xy()` constructs it, calls `retain()` before its rebuild, and compares `retained` with `at`. It keeps its sorting policy and owns no geometry array. `y()` keeps constructing `RectIndex`, and its compositions don't change by a byte. `at`'s field accepts only the six geometry fields. `retained`'s field, the constructor's `axis` and the private `#axis` accept only `LEFT` or `TOP`. These are literal unions written from the constants, and `slot` stays `number`. The narrowing changes no emitted JavaScript, and a compile-time test shows that invalid fields are rejected. Speed is unmeasured.** [`xy-held-geometry-handoff.md`](../xy-held-geometry-handoff.md) implements it from the provisional source at `f79f66fe2`.

Decided on 2026-11-13 on the owner's acceptance of VX, on the condition that the field types are narrowed in both classes. The input is [`xy-held-geometry-proposal.md`](../xy-held-geometry-proposal.md), written at `316003d76` against `61f883d09`, with its [probe](../probes/xy-held-geometry/README.md). At the owner's request, its final patch was applied unchanged at `f79f66fe2` as provisional source. This decision adopts that source and requires the type change on top of it. The architect checked that the change compiles and that the compile-time test discriminates. The check ran in a scratch worktree of `f79f66fe2`, which has since been removed ([check](../measurements/2026-11-13-xy-held-geometry-types-check.txt)).

**Corrected on 2026-11-13, before implementation,** on the owner's direction. Two statements changed, and the adopted source, the verification and the measured results didn't:

- **The review's place in the sequence.** The decision said only that the unit comes "with the required verification and an independent review", and the handoff had the owner start the review after the architect accepted the report. The report now goes to a fresh independent reviewer first, and the architect's final acceptance follows the review.
- **What finishes before the first report.** Property 2 said "Every read finishes before the first report (proposal §2)", and §Rejected said a per-slot re-measure fails "because each read would follow the previous slot's report". Read literally, the first forbade the loop's own `retained`, `at` and `item` calls. The constraint is on DOM measurement: the rebuild finishes measuring before the loop that reports starts, and the loop reads only the index's cached values. Proposal §2's "All reads finish before the first report" means the same.

**The owner's direction:**

- **VX is accepted as a subclass,** with its names `RetainingRectIndex`, `retain` and `retained`, as at `f79f66fe2`. That answers the proposal's §5 items 1 and 2. P, VS and keeping `before` aren't taken.
- **The acceptance is conditional on narrowed field types in both classes.** The types are literal unions derived from the existing constants:
  - `RectIndex.at` accepts the six geometry fields;
  - `RetainingRectIndex.retained` accepts only `LEFT` or `TOP`;
  - `RectIndex`'s constructor `axis` and its private `#axis` accept only `LEFT` or `TOP`.

  `slot` stays numeric. The change adds no runtime validation, no `NaN` fallback and no other behavioral change. A small compile-time check shows that invalid fields are rejected.

- **Speed stays explicitly unmeasured.** The owner requested no timing run and no hold. That answers §5 item 3: the decision is accepted on size, flows and allocation, and the prepared timing check isn't run.
- **One bounded implementation unit reuses the committed prototype,** with the required verification and an independent review. **A fresh independent reviewer reads the unit's report before the architect's final acceptance.**

**Why:**

- **The class-encapsulation rule, applied to the last geometry outside the index.** `DRD-58` and `DRD-61` both left `xy()`'s `before` out of scope. With this decision, every geometry value in `src/sortable/` is in `rect-index.ts`, private to the class that writes it. `xy()` keeps what is policy: when it rebuilds, the span it compares, the sign of the vector, which cells it reports, and the sink call (proposal §2).
- **The subclass is the only placement in which `y()` pays nothing.** "sortable + y" and "complete" are byte-identical to the base, because the bundler drops the subclass from a composition that never constructs it. A class method doesn't tree-shake, so P and VS charge every `y()` composition. P costs +60 and +38 B Brotli, and VS +38 and +21 B (proposal §4.1).
- **Narrowed types state the field contract where the compiler checks it,** as CONTRIBUTING Part II §1.2 and §3 prefer: literal unions over runtime enums, and no runtime bytes. At `f79f66fe2`, `at(slot, field: number)` accepts any number, and `retained` would silently read a neighbouring pair for a field other than `LEFT` or `TOP`. Each type is written with `typeof` from the constants, so a constant and its type can't disagree.

**Required properties:**

1. **The subclass, as at `f79f66fe2`.**
   - `RetainingRectIndex extends RectIndex` is exported from `rect-index.ts`.
   - `#retained` is one `readonly` `number[]` for the index's life. It holds each slot's left, then its top. It grows only by appending, written from index 0 up, so `DRD-58` property 2's rule holds for it. It never shrinks, and no member returns it.
   - **`retain()` is its only write.** It copies the left and the top of every slot below `count` through `at`.
   - **`retained(slot, field)` returns one number** from `#retained`, in `DRD-61` property 3's sense: it constructs nothing in its source. It is valid for the slots below the count at the last `retain`.
   - The subclass reaches no private member of `RectIndex`. It uses `at` and `count`.
2. **`xy()` holds its policy, and no geometry.**
   - It constructs `new RetainingRectIndex()`.
   - With a sink, a known, changed gap and at least one slot held, `moved` reads the count, calls `retain()`, then invalidates and rebuilds with the sink. For each slot below the smaller of the two counts, it computes `dx = retained(i, LEFT) − at(i, LEFT)` and `dy = retained(i, TOP) − at(i, TOP)`. It reports the element through `item` when either is non-zero.
   - Without a sink, with an unknown or unchanged gap, or with no slot held, it only invalidates. The last case is the base's: an index that holds no slot has nothing to compare.
   - **`xy.ts` holds no geometry array.** It adds no closure and no per-row object.
   - **DOM measurement finishes before the first report.** The rebuild measures every slot, with the sink, before the loop that reports starts, and the loop measures nothing. Inside the loop, `retained`, `at` and `item` read the index's cached values and stay readable after a report. A report starts an animation, and in Chromium 157 starting one invalidated the row's layout in every variant the [animation-end layout probe](../animation-end-layout-probe.md) tried, so a measurement after a report would force a layout once per row (proposal §2).

   **Corrected on 2026-11-14,** on the independent review ([assessment](../xy-held-geometry-assessment.md) §4.2). The second and third bullets didn't name the `held === 0` exit, which `xy.ts` has at `61f883d09`, at `f79f66fe2` and at `7184d069c`. Read literally, the second required a rebuild when the index held no slot. The adopted source and the behaviour it requires don't change. **What they used to say:** "With a sink and a known, changed gap, `moved` reads the count, calls `retain()`, then invalidates and rebuilds with the sink." and "Without a sink, or with an unknown or unchanged gap, it only invalidates."

3. **`y()` is unchanged.** It constructs `new RectIndex(TOP)`. `y.ts` and `linear-shift.ts` don't change. "sortable + y" and "complete" read exactly 0/0/0 against `61f883d09`.
4. **The field types.**
   - `rect-index.ts` declares two type aliases, each a union of `typeof` the constants:
     - `Field`, the six geometry fields `LEFT`, `TOP`, `RIGHT`, `BOTTOM`, `CENTER_X` and `CENTER_Y`;
     - `NearEdge`, `LEFT` or `TOP`, the near edge of each axis.
   - Both are module-private. Callers pass the constants, and no module needs to name either alias.
   - The signatures are:
     - `at(slot: number, field: Field)`;
     - `retained(slot: number, field: NearEdge)`;
     - `constructor(axis: NearEdge = LEFT)`;
     - `readonly #axis: NearEdge`.
   - **No other signature changes.** Every `slot`, `lo`, `hi`, `gap` and `delta` stays `number`.
5. **Type-only.**
   - **The emitted JavaScript doesn't change.** There is no runtime check, no `NaN` or default fallback, no lookup table, no unrolled loop, no overload and no second accessor that takes a `number`.
   - **The development check's loops are left as they are.** `verifyEquivalence` iterates fields with a numeric counter. Where that counter is passed as a field, it is narrowed by a type assertion to `Field` at that point.
   - **Against `f79f66fe2`:** every size row reads 0/0/0 in all three columns, and every emitted `.d.ts` is byte-identical.
6. **The compile-time check:** `tests/rect-index.declaration.test.ts`, which the `declaration` project and `typecheck` check.
   - **It accepts:**
     - each of the six constants at `at`;
     - `LEFT` and `TOP` at `retained` and at the constructor;
     - a constructor call with no argument.
   - **It rejects, each with `@ts-expect-error`:**
     - at `at`: a number outside the six fields, such as `STRIDE`, and a value typed `number`;
     - at `retained`: `RIGHT` and a value typed `number`;
     - at the constructor: `RIGHT` and a value typed `number`.
   - **Its mutations fail it:**
     - MT1 widens `at`'s field back to `number`;
     - MT2 widens `retained`'s field to `Field`;
     - MT3 widens the constructor's `axis` back to `number`.
   - **`#axis` is checked by reading.** A private field's type isn't observable from outside the class.
7. **The behavioral witness.** The proposal's flows become three tests in `tests/displacement-sink.browser.test.ts`. They drive the real `xy()` installer through `resolve` and `moved` on a wrapping field with a recording sink. In each, every reported vector equals the cell's flow travel, negated, within 0.1 px. Flow travel is read through `offsetLeft` and `offsetTop`. Every cell whose flow position changed is reported. The titles are:
   - "drag:DRD-62 should report each xy() cell's flow travel across committed moves that wrap";
   - "drag:DRD-62 should report each xy() cell's flow travel while displaced cells are still animating", with `layoutAnimation` delegated to and running animations at the end;
   - "drag:DRD-62 should report each xy() cell's flow travel after the same installer retires and measures a larger collection".

   **Each mutation must fail what it names:**
   - MX1, `retain` after the rebuild: all three;
   - MX2, `retained` ignoring its field: all three;
   - MX3, `moved`'s rebuild without the sink: the animation test;
   - MX4, `retain` copying slot 0 into every slot: all three;
   - MX5, `retain` writing only below `#retained`'s length once that is non-zero: the larger-collection test.

   No other test changes.

**Costs:**

- **Size,** Brotli-11 against `61f883d09`, as the proposal's final-names column reads it:
  - "sortable + xy" +30 B (+60 minified, +18 gzip), at 6,564 B against its 6,617 B ceiling;
  - "sortable + y", "complete" and the seven control rows: 0/0/0;
  - **no verdict changes.** "complete" stays 110 B over its ceiling.

  Property 5 adds nothing to these figures. No budget changes.

- **`y()` pays nothing:**
  - 0 B in every row that bundles it;
  - no memory: no field, and no wider slot;
  - no work: its code is the base's.

  **One risk is unmeasured.** On a page that runs `xy()` and `y()` together, `RectIndex`'s methods see two receiver classes, so their property accesses may become polymorphic (proposal §4.3).

- **Allocation,** read on VX as measured, heap sampling at 16 B, three launches per tree (proposal §4.4):
  - **no difference shown** per `y()` sample, per `xy()` sample, per `y()` committed move, cold or warm, and per `xy()` committed move after warm-up;
  - **per operation with one first move on a fresh `xy()` index:** 6,679.02 B against the base's 6,869.87 B, which is 191 B less;
  - **the base undercounts,** because the sampler doesn't see a `Float64Array`'s contents. A larger saving is an inference from the calibration, not a reading.
- **Speed: unmeasured** in both directions, on every path:
  - `retain`'s copy through `at`, and the compare through `retained`;
  - `xy()`'s rebuild on a subclass instance;
  - the polymorphism above.

  Allocation isn't speed, and nothing here infers one from the other.

**Limits of the evidence:**

- **Chromium only,** on one machine ([`performance-plan.md`](../performance-plan.md) §3).
- **The flows cover one wrapping geometry.** It is 100 × 60 cells, three per row, with no gaps, margins or transforms, and one 60-second linear animation. The installer is driven directly, not through a pointer.
- **The mutations ran against the probe flows, not against the suite.** No suite test at `f79f66fe2` asserts the reported vectors. "should animate displaced rows with layoutAnimation, in xy() too" asserts only that some animation runs. Property 7 adds that assertion.
- **The allocation readings were taken on VX as measured.** It differs from `f79f66fe2` in member names and a type-only import. The final names were read for size, flows, suite, typecheck and lint, and not for allocation. Names don't change what is allocated, but that is an inference.
- **The allocation campaign, the size builds, the flows and the suite overlapped on the machine.** Bytes allocated don't depend on load, and no timing ran.
- **The type change was checked by typecheck and by the declaration project only.** Property 5's size and `.d.ts` identity are the unit's to show.

**What this amends.** Each amended entry says what it used to say.

- **`DRD-61`:**
  - property 1: `before` is no longer an exception;
  - property 2: the axis is typed `NearEdge`, and `xy()` constructs `RetainingRectIndex`;
  - property 3: `at`'s field is typed `Field`, and `retained` is one more read that constructs nothing;
  - property 8: `xy()` keeps no geometry array;
  - §What this doesn't decide: `xy()`'s `before` is decided.
- **`DRD-58`:**
  - property 7's table row for `xy.ts`'s `before`;
  - the first bullet of §What this doesn't decide.

  **The proposal's §6 calls this table "property 6's",** but the table is property 7's.

- **`DRD-52` property 1,** as `DRD-61` amended it: `xy()`'s index is a `RetainingRectIndex`, and only `xy()` uses `retain` and `retained`.

**Rejected:**

- **P,** a second array in `RectIndex`: +60 and +38 B Brotli on `y()`'s rows.
- **VS,** an 8-number slot. It costs +38 and +21 B on `y()`'s rows, a third more slot storage, and 1,092 B more on a fresh `xy()` index's first move.
- **VXd's `drift(slot, field)`.** It is 2 B smaller on "sortable + xy", and moves the vector's sign into the index.
- **A rebuild that reports.** It moves `xy()`'s reporting policy into the index, against `DRD-52` property 1.
- **A per-slot re-measure,** because each slot's measurement would follow the previous slot's report and force a layout.
- **Two banks of slots,** which add an offset to every `at`.
- **For the types:**
  - **runtime validation or a `NaN` fallback,** which the owner excluded;
  - **a runtime or `const` enum,** against CONTRIBUTING Part II §3;
  - **a branded or narrowed `slot`,** which the owner excluded;
  - **exported aliases,** which no module needs.

**What this doesn't decide:**

- **Speed.** It stays unmeasured, including the polymorphism risk. The timing check in [`probes/xy-held-geometry/timing/`](../probes/xy-held-geometry/README.md#the-timing-check) remains prepared. It runs only if the owner asks for it, under `DRD-44` property 6's hold.
- **Firefox and WebKit,** deferred to the owner's planned CI.
- **Field types elsewhere,** such as `STRIDE`, `PLACEHOLDER` or `verifyEquivalence`'s parameters.
- **`DRO-4`'s re-base and the red rows,** the baseline lint errors, `DRF-38` and `repo:RF-31`.
- **box-quad's separate PR, the deferred campaigns, and the rollback report's acceptance.**

**Result, 2026-11-14:** implemented at `b4117dae2`, reported at `7184d069c`, reviewed independently at `c4d02d45c`, and accepted ([assessment](../xy-held-geometry-assessment.md), §Disposition of the xy() held geometry report). Properties 1 to 7 hold, in Chromium only.

- **Source:** `rect-index.ts` is the architect's sketch, blob `b9234028e`. `xy.ts`, `y.ts` and `linear-shift.ts` are unchanged from `f79f66fe2`.
- **Emitted files,** against `f79f66fe2`'s source: the build emits 90 files, and all of them are published. Its 33 `.js` and 27 `.d.ts` files are byte-identical. **One of its 30 source maps differs:** `sortable/rect-index.js.map` embeds the typed source, and its mappings follow the shifted lines. Property 5 covers JavaScript and declarations, not maps. A source map that embeds its source changes with any change to that source, so this is expected and accepted. The published package isn't byte-identical, only its JavaScript and declarations are.
- **Size:** every row reads 0/0/0 against `f79f66fe2`. Against `61f883d09`, only "sortable + xy" moves, +60 / +18 / +30 B, to 6,564 B Brotli under its 6,617 B ceiling. The same six rows stay red, "complete" by 110 B. No budget changes.
- **The witnesses:** MT1 to MT3 fail the declaration test, and MX1 to MX5 fail the three `drag:DRD-62` tests as property 7 names. The mutations now run against the suite, not only the probe flows. Of the five, the suite at `f79f66fe2` caught only MX1 and MX3, and neither through an asserted vector. The new tests don't pass a box, and their counts don't fall across a rebuild, so the box path and the `count < held` side of the span aren't witnessed.
- **Allocation** stands as the proposal read it, under §Costs, and wasn't run again. **Speed is unmeasured** in both directions, including the polymorphism risk. The timing check stays prepared and unrun.
- **Baselines:** the 49 ESLint errors, with `DRF-38`'s line moved from 53 to 59, and `repo:RF-31`. Nothing new, and nothing repaired.
- **Property 2 is corrected in place** to name the base's `held === 0` exit.