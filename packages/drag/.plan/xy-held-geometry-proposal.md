# `xy()`'s previous geometry belongs to `RectIndex`

**Status: decided on 2026-11-13 as `DRD-62`** in [`00-index.md`](00-index.md). The owner accepted VX with its final names, on the condition that the field types are narrowed in both classes, and with speed unmeasured. [`xy-held-geometry-handoff.md`](xy-held-geometry-handoff.md) implements it. The provisional source at `f79f66fe2`, the [final VX patch](probes/xy-held-geometry/patches/VX-retaining-subclass.diff.txt) applied unchanged, is that unit's starting point. **This proposal is kept as it was written.** `DRD-62` governs where they differ: it adds the type narrowing, a compile-time test and the flows as suite tests. §6 calls the `before` row of `DRD-58`'s table "property 6's table row", but the table is property 7's. §2's "All reads finish before the first report" means DOM measurements: the rebuild finishes measuring before the loop that reports, and that loop reads the index's cached values (`DRD-62` property 2). **Was:** proposed on 2026-11-13, not decided. It registered no `D-*` and waited for the owner. The code is in [patches](probes/xy-held-geometry/README.md) against `61f883d09`. **Read at:** `61f883d09` on `drag/rect-index-ownership`, fast-forwarded from `afc9e1504` to the head of `drag/size` without rewriting history. **Governing:** CONTRIBUTING's class-encapsulation rule, Part II §2.1, §7, §9, §10, §14 and §15, `DRD-52` property 1, `DRD-58` §What this doesn't decide, and `DRD-61` properties 1, 3, 8 and §What this doesn't decide. **Readings:** `measurements/2026-11-13-xy-held-geometry-*`. **Chromium only** ([`performance-plan.md`](performance-plan.md) §3).

## 1. The question

The owner wants the geometry that `xy()` keeps across a committed move owned by `RectIndex`, as `DRD-61` made the slot geometry. In the owner's terms:

- `xy()` keeps its sorting policy, and doesn't own a packed geometry array;
- the storage is private;
- no growable typed array is replaced by hand;
- no per-row result object, and no new closure;
- the exact operations are a design question;
- any extra cost that `y()` pays is stated.

`DRD-58` left this buffer out of its scope, and `DRD-61` didn't prototype it (§What this doesn't decide of each).

## 2. What `xy()` does with the buffer now

At `61f883d09`, `xy()`'s `moved`, with a sink composed and a known, changed gap:

1. reads `held = index.count`;
2. replaces `before`, a `Float64Array` in the installer's closure, with a new one when it is shorter than `held * 2`;
3. copies each slot's `LEFT` and `TOP` into `before`, through `at`;
4. invalidates and rebuilds the index: `collect`, then `measure(0, count)` with the sink, so each slot is settled;
5. for `i` below `min(count, held)`, computes `dx = before[2i] - left` and `dy = before[2i + 1] - top`, and reports the element at `i` when either is non-zero.

Without a sink, or with an unknown or unchanged gap, it only invalidates, and `before` isn't touched.

**What the operation needs from storage:** two numbers per slot that survive one rebuild, read back after it, one at a time. **All reads finish before the first report.** A report starts an animation, and in Chromium 157 starting one invalidated the row's layout in every variant the [animation-end layout probe](animation-end-layout-probe.md) tried. A read after a report would force a layout, once per row. That rules out any operation that measures and compares one slot at a time inside the loop that reports.

**What stays `xy()`'s policy:** when a committed move rebuilds instead of invalidating, the span it compares, the sign of the vector, which cells it reports, and the sink call itself.

## 3. The operations

Two members, both on the index:

- **`retain()`** copies every slot's left and top into private storage that a rebuild doesn't write. It is the only write. Every slot is inside the window, because `xy()` measures `(0, count)`.
- **`retained(slot, field)`** returns one number: the left of `slot` at `LEFT` or its top at `TOP`, as the last `retain` copied it. It is valid for the slots below the count at that call, and `xy()` reads only those.

`xy()`'s `moved` becomes: read the count, `retain()`, invalidate, rebuild, then for each slot in the span, `dx = retained(i, LEFT) - at(i, LEFT)` and `dy = retained(i, TOP) - at(i, TOP)`, and report as now.

**Names.** The measured prototype calls the read `held` and the storage `#held`. `RectIndex.holds()` already answers a different question, whether one slot is still where the cache holds it. Under the [technical English guide](../../../.agents/docs/technical-english.md), different concepts need a visible distinction, so the recommended names are `retain`, `retained` and `#retained`, as in the [final patch](probes/xy-held-geometry/patches/VX-retaining-subclass.diff.txt). The names change no behavior. §4 gives both readings.

**Operations considered and not taken:**

- **A rebuild that reports.** `RectIndex` would compare the slots and call `displacement.report` itself, with the space. That moves `xy()`'s reporting policy into the index, which `DRD-52` property 1 keeps policy-free.
- **`drift(slot, field)`**, the retained value minus the current one. `xy()` makes one call per coordinate instead of two. Measured as VXd: "sortable + xy" is 2 B Brotli smaller than with `retained`, and every other row is unchanged. It moves the vector's sign into the index for 2 B.
- **Re-measuring one slot at a time into the scratch slot**, and comparing it there. It needs no storage, but each read would follow the previous slot's report (§2).
- **Two banks of slots, swapped by a rebuild.** Every `at`, including `y()`'s per-candidate read, would add a bank offset.

## 4. Where the storage lives

Three placements, each with the same operations and the same `xy()` change. [Patches](probes/xy-held-geometry/README.md).

- **VX, a subclass. Recommended.** `rect-index.ts` exports `RetainingRectIndex extends RectIndex`. It holds `#retained`, its own `number[]`, and adds `retain` and `retained`. It copies through `at` and `count`, so it never reaches `RectIndex`'s private fields. `xy()` constructs it, and `y()` keeps constructing `RectIndex`.
- **P, a second array in `RectIndex`.** `RectIndex` gains `#held`, `retain` and `held`. Every index carries them.
- **VS, a wider slot.** `STRIDE` becomes 8, and each slot gains `HELD_LEFT` and `HELD_TOP`. `retain` copies within the slot array, and `xy()` reads the held fields through `at`. The development check copies and compares the six measured fields only.

In each, the storage grows only by appending, as `DRD-58` property 2 requires: P's and VX's arrays are written from index 0 upward, so each write lands at or below the length, and VS's slots grow in `collect` as now. Nothing replaces an array, and nothing returns one.

### 4.1 Size

Brotli-11 from `npx just size`, the gate on the published build, against `61f883d09`. Minified and gzip are in the [readings](measurements/2026-11-13-xy-held-geometry-size.txt).

| Row | `61f883d09` | P | VS | VX, as measured | VXd | VX, final names |
| --- | --: | --: | --: | --: | --: | --: |
| sortable + y | 6577 | **+60** | **+38** | **0** | 0 | 0 |
| sortable + xy | 6534 | +29 | +1 | +29 | +27 | +30 |
| complete | 7175 | **+38** | **+21** | **0** | 0 | 0 |
| seven control rows |  | 0 | 0 | 0 | 0 | 0 |

- **No verdict changes in any variant.** "complete" is 110 B over its 7,065 B ceiling at the base. P would put it 148 B over and VS 131 B. VX leaves it unchanged.
- **`y()` pays nothing in VX,** in any row that bundles it. "sortable + y" and "complete" are byte-identical to the base, so the bundler drops the unused subclass. No size row bundles `y()` and `xy()` together.
- **P and VS charge every `y()` composition** for `retain`, because class methods don't tree-shake (`DRD-61` §4.1 found the same for `shift` and `travel` in "sortable + xy").
- **VS is cheapest for `xy()`,** because it adds no field and no read method. Its cost moves to `y()`'s storage (§4.3).

### 4.2 Correctness

All checks ran in Chromium. [Record](measurements/2026-11-13-xy-held-geometry-checks.txt).

- **The flows** ([test](probes/xy-held-geometry/xy-held-flows.browser.test.ts.txt), [output](measurements/2026-11-13-xy-held-geometry-flows.txt)) drive the real `xy()` installer through `resolve` and `moved` on a wrapping field of 12 cells, three per row, with a recording sink:
  - **wrapping:** five committed moves across wraps, forward and back. Every reported vector equals the cell's flow travel, negated, read through `offsetLeft` and `offsetTop`, and every cell whose flow position changed is reported;
  - **animation:** the same moves with `layoutAnimation({ duration: 60_000, easing: 'linear' })` delegated to, so every move after the first measures cells that a running animation draws away from flow. 11 cells are still animating at the end, and every vector is still the flow travel;
  - **growth:** after `retire`, a second operation on the same installer over 21 cells, four more moves. The retained storage grows with the collection.
- **The same 201 `FLOW` lines** are printed at the base and in P, VS, VX and VXd. The reported vectors are identical in every tree.
- **Four mutations of VX, each caught:**
  - MX1, `retain` after the rebuild: both flows fail;
  - MX2, `retained` ignoring the field: both fail;
  - MX3, `moved`'s rebuild without the sink: only the animation flow fails;
  - MX4, `retain` copying slot 0 into every slot: both fail.
- **The suite, with the final VX:** 740 tests pass and 6 fail, all six in `tests/size.node.test.ts`: the rows over their ceilings at the base. That is the base's verdict list, as the [integration report](owner-edits-integration-report.md) recorded it at `61f883d09`.
- **Typecheck:** only `repo:RF-31`, in every tree. **Lint** on `rect-index.ts` and `xy.ts`, with the final VX: clean after `fmt`, `lint-fix`, `fmt`. VX as measured imported `RectIndex` as a value where only its type is used, and the final patch imports it with `type`.

### 4.3 What `y()` pays

|  | P | VS | VX |
| --- | --- | --- | --- |
| Bytes in "sortable + y" and "complete" | +60 and +38 B | +38 and +21 B | 0 and 0 B |
| Memory per index | One more empty `number[]` | Two more numbers per slot: the slot array is 8/6 as long, and the scratch slot and the placeholder widen too | None |
| Work in `y()`'s paths | None | `collect` appends 8 numbers per new slot instead of 6. `at`'s offset multiplies by 8 | None: `y()`'s code is the base's |
| A page that also runs `xy()` | Unchanged | Unchanged | **`RectIndex`'s methods see two receiver classes,** so their property accesses may become polymorphic. Unmeasured: timing case C (§4.5) prices it |

### 4.4 Allocation

Bytes per unit under `src/sortable/`, heap sampling at 16 B, three launches per tree and probe, as the mean with the range. VX is the patch as measured, whose code differs from the final patch only in names. [Readings](measurements/2026-11-13-xy-held-geometry-alloc.txt), [per-launch excerpts](measurements/2026-11-13-xy-held-geometry-alloc-logs/).

| Probe | `61f883d09` | VX | P | VS |
| --- | --: | --: | --: | --: |
| Per `y()` sample, 20 rows | 50.05 (49.43 to 50.44) | 50.53 (49.94 to 50.87) | 50.86 (50.17 to 51.89) | 49.66 (49.18 to 50.24) |
| Per `xy()` sample, 20 cells | 49.81 (49.03 to 51.15) | 50.27 (49.76 to 51.19) | – | – |
| Per `y()` committed move, cold | 115.10 (112.48 to 116.70) | 115.75 (113.76 to 118.22) | 115.65 (113.94 to 116.58) | 114.17 (111.98 to 116.90) |
| Per `y()` committed move, warm | 17.20 (15.92 to 18.20) | 16.37 (15.92 to 17.04) | – | – |
| Per `xy()` committed move with `layoutAnimation()`, after 100 | 846.53 (838.52 to 854.90) | 837.15 (833.82 to 838.92) | 835.46 (831.36 to 837.62) | 837.14 (831.40 to 841.88) |
| **Per operation with one first move on a fresh `xy()` index, with `layoutAnimation()`** | 6,869.87 (6,854.67 to 6,899.07) | **6,679.02** (6,645.60 to 6,726.27) | **7,239.86** (7,209.33 to 7,257.33) | **7,962.18** (7,922.27 to 8,013.07) |

- **`y()` shows no difference in any variant.** Every `y()` difference is smaller than the spread inside either tree.
- **`xy()`'s committed move after warm-up shows no difference.** The mean is 9 to 11 B lower in every variant, and the ranges overlap. Per function, `collect` and `#read` carry about 800 of the 840 B in every tree. Those are the base's allocations, and this proposal doesn't change them.
- **Only the first move on a fresh index moves beyond its spread,** because the buffer is created and grown there. Per operation, by function:
  - **Base:** `xy.ts`'s `moved` 1,097 B and the installer 425 B, which create `before` as a `Float64Array(0)` and replace it with one of 38 numbers.
  - **VX:** `moved` 264 B, the installer 249 B, `RetainingRectIndex`'s constructor 100 B, `retain` 504 B, as the `number[]` grows by appending, and the read 222 B. In total, 191 B less than the base.
  - **P:** `retain` 973 B. 370 B more than the base.
  - **VS:** `collect` grows 8 numbers per slot instead of 6: 4,629 B against the base's 3,101 B. 1,092 B more than the base. This cost lands in `y()`'s `collect` too, which no probe here measured on a fresh `y()` index.
- **The calibration** ([readings](measurements/2026-11-13-xy-held-geometry-alloc.txt)): 1,000 `Float64Array(38)` read 126.64 B each, and 1,000 `number[]`s grown to 38 numbers by appending read 570.81 B each. A `Float64Array`'s 304 B of contents is outside the heap the sampler reports. **So the first-move readings undercount the base,** by the contents of each `before` it allocates. That VX's saving is larger than 191 B is an inference from the calibration, not a reading.
- **The reads allocate in the interpreter.** `at` reads 226 B and the retained read 222 B per operation on the first move, as `at` did at the base. `DRD-61` property 3 states that reads construct nothing as a property of the source, not as a byte count. They are cold-code readings, and after warm-up neither appears.

### 4.5 Runtime

**No timing has run.** The owner holds the machine before any timing measurement. What changes on each path in VX:

- **`xy()`'s committed move with a sink:** `retain` copies `2 × count` numbers through `at`, into a packed `number[]`, where the base wrote a `Float64Array` through `at`. The compare reads through `retained`, where the base indexed `before`. Each is one call per number, which `DRD-61`'s inlining trace found V8 inlines for `at` ([trace](measurements/2026-11-13-rect-index-access-inlining.txt), on Node's V8 with stub elements). The rect reads, the sink calls and the reports are unchanged: 4,002 rect reads per forward-and-back move on 2,000 cells in every arm, and the same two reports.
- **`xy()`'s resolution and rebuild:** the same code, on a subclass instance.
- **`y()`:** the same code. On a page that also runs `xy()`, see §4.3.

**The timing check, prepared and not run** ([page](probes/xy-held-geometry/timing/page.ts.txt), [runner](probes/xy-held-geometry/timing/runner.ts.txt)). It is `DRD-61`'s check with case B replaced:

- **A:** `xy()`'s rebuild with no sink, 2,000 wrapping cells, the placeholder at 1,000. One operation is `invalidate`, then `resolve`.
- **M:** `xy()`'s committed move with `layoutAnimation()`: the placeholder moves one gap forward and back, so each operation is two `moved` calls, each a rebuild with the sink, a retain and a compare, with one cell in flight.
- **C:** `y()`'s scan of a grown window on 2,000 rows, run after A and M. Production's `RectIndex` methods have then run on both production classes, and before's on one, so C prices the polymorphism in §4.3.
- The arms, the rounds, the verdict rule, the machine record and the attempts are `DRD-61` property 11's and the [handoff](rect-index-access-handoff.md)'s item 7: `before` is `61f883d09`'s `src/sortable/`, `production` is the final VX patch, `control` a second instance of it, 7 rotated rounds, `compare.ts`'s paired rule. "No difference shown" is inconclusive, and no figure limits a slowdown that the check could miss.
- **Its one-operation check ran, with no timed batch** ([output](measurements/2026-11-13-xy-held-geometry-timing-check.txt)): every arm reads 2,001 rects in case A, 4,002 in case M with the same two reports, and none in case C.

## 5. What you decide

1. **Where `xy()`'s previous geometry lives.**
   - **VX. Recommended.** `xy()` owns no geometry array. The geometry and its storage stay in `rect-index.ts`, private to a class whose only write is `retain`. `y()` pays 0 B and no memory. "sortable + xy" pays 30 B with the final names.
   - P, if one class should hold every geometry member. `y()` pays 60 B and 38 B.
   - VS, if `xy()`'s bytes matter most. `y()` pays 38 B and 21 B, and a third more slot storage.
   - None: `xy()` keeps `before`, and `DRD-61` property 8 stands.
2. **The names:** `retain`, `retained` and `RetainingRectIndex`, or the prototype's `held`.
3. **The timing.** Hold the machine for the check in §4.5 before the decision, or accept on the size, the flows and the allocation, with speed unmeasured.

## 6. If you adopt VX

The architect records a decision that amends:

- **`DRD-61` property 1:** "Apart from `xy()`'s `before` (property 8), nothing in `src/sortable/` allocates a typed array for geometry" loses its exception;
- **`DRD-61` property 3:** `retained(slot, field)` reads one number from `RetainingRectIndex`, and constructs nothing;
- **`DRD-61` property 8:** `xy()` constructs `RetainingRectIndex`, calls `retain` before the rebuild, and reads through `at`, `retained`, `item` and `insertion`. It keeps no geometry array;
- **`DRD-61` §What this doesn't decide:** `xy()`'s `before` in the index's storage is decided;
- **`DRD-58` property 6's table row** for `xy.ts`'s `before`, and its §What this doesn't decide;
- **`DRD-52` property 1:** `RectIndex` and its subclass make every measurement and hold every geometry value. "Both axes use every member" becomes "`y()` uses every member of `RectIndex`, and `xy()` every member except `shift` and `travel`, plus the subclass's two".

The implementation unit:

- applies the final patch and runs the Chromium suite, typecheck and lint;
- adds the flows' assertion as a test of `xy()` with `layoutAnimation`, and shows it with MX1 to MX3;
- measures every composition: "sortable + y", "complete" and the seven control rows must read exactly 0/0/0;
- runs the allocation probes of §4.4, at the base and at the end;
- runs the timing check of §4.5 if the owner asks for it, under the hold.

## 7. Limits

- **Chromium only,** on one machine with 12 CPUs. Firefox and WebKit are deferred to the CI the owner plans ([`performance-plan.md`](performance-plan.md) §3).
- **No timing.** Speed is unmeasured in both directions on every path, including the polymorphism risk in §4.3. Allocation isn't speed, and no sentence here infers one from the other.
- **The flows** cover one wrapping geometry: 100 × 60 cells, three per row, with no gaps, margins or transforms, and one 60-second linear animation. They drive the installer directly, not through a sortable and a pointer. The suite's existing `xy()` tests cover the composed path.
- **The mutations ran on both VX patches,** and on no other variant. P and VS are checked by the flows only.
- **The allocation campaign, the size builds, the flows and the suite overlapped** on the machine. Bytes allocated don't depend on load, and no timing ran.
- **Heap sampling didn't see a `Float64Array(38)`'s contents.** The calibration shows it, and §4.4 states which readings it affects. Where V8 draws that line wasn't measured.
- **The size of P, VS and VXd** was read with the prototype names. The final VX names read 1 B more on "sortable + xy" than VX as measured.
- **No `.d.ts` changes:** the 27 `.d.ts` files that the size run's build emitted are byte-identical between the base and the final VX, and no `rect-index.d.ts` is emitted. `typedoc` wasn't run.