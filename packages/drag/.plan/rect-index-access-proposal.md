# RectIndex owns its storage and every write to it

**Status: approved on 2026-11-13 by the owner, with its displacement-sink interface, and decided as `DRD-61`** in [`00-index.md`](00-index.md). [`rect-index-access-handoff.md`](rect-index-access-handoff.md) implements it from `drag/size` at `8904947f6`, after the mangling rollback, under the restored names ([patch](probes/rect-index-access/patches/P-restored-names.diff.txt)). **The size figures below were read at `f552e0ec9` and are historical.** At `8904947f6`, P reads −31, +22 and −92 B Brotli on "sortable + y", "sortable + xy" and "complete", and "complete" stays over its ceiling. The "renamed" column and its green "complete" were read under the mangling that `DRD-60` removed. `DRD-61` records the reconciliation. The rest of this record is as proposed.

**As proposed on 2026-11-13,** it was not decided, registered no `D-*` and changed no production contract: the code is in [patches](probes/rect-index-access/README.md) against `f552e0ec9`, and the branch's source is unchanged. On acceptance, the architect was to record a decision that amends `DRD-52`, `DRD-58` and `DRD-50`, and write the unit's handoff (§6). **Read at:** `f552e0ec9` on `drag/rect-index-ownership`, the same tree as `drag/size`. **Governing:** CONTRIBUTING's class-encapsulation rule, Part II §7, §8, §9, §14 and §15, `DRD-39`, `DRD-50`, `DRD-52` and `DRD-58`. **Probe:** [`probes/rect-index-access/`](probes/rect-index-access/README.md). **Readings:** `measurements/2026-11-13-rect-index-access-*`.

## 1. The question

The owner wants `RectIndex` to own both the geometry storage and every write to it:

- the shift a committed move predicts is applied inside `RectIndex`, and `linearShift` decides only the range and the delta;
- the code outside gets numbers or other primitive results. It never holds the backing arrays, and nothing allocates a result object for it;
- the path through `DisplacementSink.settle`, which receives the slot array now, is covered too;
- `xy()`'s geometry rules stay as they are, and the slot storage stays one `number[]` (`DRD-58`).

The owner suggested choosing the shifted coordinates when the index is constructed, and storing the placeholder in the same storage. A generic `get(slot, field)` was only an illustration.

## 2. What the callers need

At `f552e0ec9`, three objects leave `RectIndex`: the slot array (`_values`), the placeholder's `Float64Array` (`_placeholderRect`) and the element array (`_items`). One writer, `linearShift`'s `advance`, is lent the slot array through `_lend`. The sink's `settle` is lent the slot array by `_measure`, and a one-slot scratch `Float64Array` by `_holds` and by `linearShift`'s first committed move.

| Caller | What it reads | What it writes or allocates |
| --- | --- | --- |
| `y()`'s resolution | The window's bounds, each window slot's center y, the placeholder's center y, and the elements on both sides of the new gap | Nothing |
| `linearShift._refresh` | The count, the window's bounds, the center y of the window's ends and of the placeholder. In development, a copy of the placeholder | Nothing |
| `linearShift._moved` | The element at `lo`, its cached top and its fresh rect, read by `linearShift` itself, and the elements it reports | Top, bottom and center y of the crossed slots, through `_lend`. With a sink, a `Float64Array(6)` and a one-element array on the first move |
| `xy()`'s resolution | The count, every slot's two centers, the placeholder's two centers, and the element at the nearest slot | Nothing |
| `xy()`'s committed move | Every slot's left and top before and after a rebuild, the count, and the elements it reports | Its own `before` array |
| `confirm`, both axes | `_holds`, a boolean | With a sink, a `Float64Array(6)` and a one-element array per drop |
| The sink's `settle` | The slots of the range | Those slots: each one minus what its animation carries |
| `verifyEquivalence`, development only | Every field of the window and of the placeholder, and every element | Nothing |

**The callers need little:**

- one number for each slot and field, with the placeholder read like a slot;
- the element at a slot, and the insertion at a gap;
- the count and the window's bounds, which are getters already;
- two answers that need a measurement: whether the cache still holds, which is a boolean, and how far one slot's element has moved along the axis, which is a number;
- one write: move the slots from `lo` to before `hi` by `delta` along the axis.

**Every array read happens in a loop that already reads one field of one slot at a time.** No caller needs a whole array. The only copy, in the development check, copies field by field.

## 3. The proposed design, P

[`patches/P-owned-storage.diff.txt`](probes/rect-index-access/patches/P-owned-storage.diff.txt).

1. **One storage.** `#values` is one `number[]` for the index's life: a scratch slot, the placeholder, then the destination slots, each `STRIDE` numbers. It grows only by appending, as `DRD-58` property 2 requires. The placeholder's `Float64Array`, `ReadonlyFloat64Array` and `pack`'s union with `Float64Array` go.
2. **The axis is chosen at construction.** `y()` constructs `new RectIndex(TOP)`, and `xy()` constructs `new RectIndex()`, whose default axis it never uses. The layout gives each axis its near edge at `axis`, its far edge at `axis + RIGHT` and its center at `axis + CENTER_X`. So the index still holds no axis rule: its owner names the axis, and the arithmetic is the same for both axes.
3. **Reads, one number at a time:**
   - `_at(slot, field)` returns one field. The placeholder is the slot `PLACEHOLDER`, which is −1.
   - `_item(slot)` returns the element at a slot, and `_insertion(gap)` returns the insertion at a gap.
   - `_count`, `_first` and `_end` are unchanged.
   - The getters `_values`, `_placeholderRect` and `_items` are removed.
4. **Writes, all inside the class:**
   - `_shift(lo, hi, delta)` moves the slots along the axis. Both edges move, and the center is recomputed from them, which is the arithmetic `advance` performs now.
   - `_travel(slot, getBox, displacement)` measures the slot's element again into the scratch slot, settled, and returns its distance from the cached position along the axis. It replaces `linearShift`'s own rect read and its scratch.
   - `_holds` measures into the same scratch slot. `DRD-50` rejected a scratch that every read passes through, because it copied each read twice. Here only these two single re-reads use the scratch, and `_measure` writes each slot once, in place.
   - `_collect`, `_measure` and `_measurePlaceholder` are unchanged in what they do.
   - **`_lend` is removed.**
5. **The sink answers, and the index writes.** `settle(values, items, first, end)` is replaced by `displaced(element): boolean`. When it answers `true`, the read-only `dx` and `dy` hold what the element's animation carries, until the next call. One private `#read` reads the rect, asks the sink, and writes the six fields once, already settled.
   - `layoutAnimation`'s sink holds `dx` and `dy` in two closure variables behind getters, so only the sink writes them.
   - The sink's work per row is unchanged: one `Map` lookup and, for a row in flight, one `getComputedTiming`.
   - The early return when nothing is in flight becomes a `Map` lookup that finds nothing, once for each measured row.
6. **`linearShift` decides, and doesn't write.** `_moved` computes `lo` and `hi`. On the first move it takes `delta` from `_travel`, and on later moves from the known row distance. Then it calls `_shift(lo, hi, delta)` and reports through `_item`. The writer closure and the `delta` rule state go, and `delta` is a local again.
7. **`xy()` is unchanged as a rule.** It rebuilds through `_collect` and `_measure`, reads its centers through `_at`, and keeps its own `before` array, which isn't the index's storage (`DRD-58` §What this doesn't decide).
8. **The development check** copies the window and the placeholder through `_at`. It still compares the placeholder's x with what the cache held before the re-read, and its message is unchanged (`DRD-52` property 7).

**Who writes what, after the change:**

| Writer | Writes |
| --- | --- |
| `RectIndex` | Its storage: every measured slot, settled, the placeholder, the scratch slot, every predicted shift, its growth, the element array, the window and the staleness |
| The displacement sink | Its own `dx` and `dy`, and nothing of the index |
| `linearShift` | Its own rule state. It passes `lo`, `hi` and `delta` to `_shift` |
| `y()`, `xy()` | Their own rule state, and `xy()`'s `before` |

### 3.1 Correctness

All checks ran in Chromium only. [Record](measurements/2026-11-13-rect-index-access-checks.txt).

- **Suite:** 751 tests, 748 pass. The 3 failures are size rows that already fail at the base: "draggable alone", "example: drop zone" and "freeDrag + bounds + landing". Against the base's verdict list, only three verdicts differ: "complete" passes, and the two W7 tests below have new titles. Typecheck shows only `repo:RF-31`, and lint only `DRF-38`'s existing error.
- **The flows** ([output](measurements/2026-11-13-rect-index-access-flows.txt)) pass:
  - in `y`, a prediction made by `_travel` and `_shift` equals a fresh measurement in every field of every window slot and of the placeholder, and the cross axis doesn't move;
  - a row drawn 30 px low by a running animation is cached at its flow position;
  - `_holds` sees a 13 px shift of the whole list;
  - in `xy`, the vector computed from `_at` readings equals each cell's travel, negated.
- **Two mutations, each caught:**
  - `y()`'s index constructed with `LEFT`, so that `_shift` moves x: 18 of 50 tests in `sortable.browser.test.ts` and `equivalence-check.browser.test.ts` fail on the development check's fault.
  - `#read` ignoring the sink's answer: W8, the receiver test and the flows' sink test fail.
- **Witnesses that change.** `DRD-50`'s W7 asserted that each `settle` call received the cache's own slot array, so that no copy was made. With no array passed, it has nothing left to assert. In the patch, its two tests assert instead that each `displaced` call asks about exactly the row read just before it. W8 asserts the same settled position, as the presented top minus `dy`. No other test changes. **These replacements have no discriminating mutation yet.** The unit owes one (§6).

### 3.2 The published declarations

`DisplacementSink` is one of `DRD-39`'s unpublished installer types, so CONTRIBUTING Part II §8 keeps no compatibility for it. The emitted `sortable/axis.d.ts` replaces `settle` with `displaced(element: HTMLElement): boolean`, `readonly dx: number` and `readonly dy: number`. No other `.d.ts` changes, because no entry emits `rect-index.d.ts`. `DRD-50` and `DRD-58` changed the same signature on the same ground.

## 4. Measured trade-offs

### 4.1 Size

Brotli-11, against `f552e0ec9`. **Plain** is the build without `DRD-56`'s rename step, which stands in for the build after the owner's mangle revert. **Renamed** is the build as `drag/size` gates it, with each tree's map regenerated. The seven rows without `sortable` read exactly 0/0/0 in every variant in the plain build. In the renamed build they move by −6 to +12 B, only because a regenerated map gives other names to other properties. [Readings](measurements/2026-11-13-rect-index-access-size.txt).

| Variant | "sortable + y", plain | "sortable + xy", plain | "complete", plain | "sortable + y", renamed | "sortable + xy", renamed | "complete", renamed |
| --- | --: | --: | --: | --: | --: | --: |
| Base, absolute | 6672 | 6541 | 7310 | 6490 | 6371 | 7123 |
| **P** | **−45** | **+37** | **−93** | **−32** | **+46** | **−83** |
| VY: the axis written into `_shift` and `_travel` | −54 | +30 | −105 | −38 | +43 | −84 |
| VSEP: the placeholder in its own `Float64Array` | −28 | +53 | −74 | −17 | +66 | −61 |
| VF: VY, with the shift and the travel as module functions | −37 | −25 | −73 | −2 | −14 | −58 |

**"complete" turns green in the gated build.** It reads 7,040 B against its 7,065 B ceiling, which it is 58 B over at the base. The suite's size test agrees (§3.1). No other verdict changes. `DRO-4`'s re-base stays the owner's.

**What the variants show:**

- **The shared placeholder pays for itself:** VSEP is 17, 16 and 19 B larger than P in the plain build.
- **Choosing the axis at construction costs 7 to 12 B** against VY, which writes y into the index. VY makes `RectIndex` know an axis rule, which `DRD-52` property 1 removed.
- **`xy()` carries `_shift` and `_travel` and never calls them,** because class methods don't tree-shake. That is most of P's +37 B on "sortable + xy" (§7).
- **VF moves them out of the class.** "sortable + xy" then reads −25 B, but "sortable + y" and "complete" are 8 and 20 B larger than P. The shift then writes the slot array from a module function, through an accessor that a static block sets. That keeps the array inside `rect-index.ts`, but not inside the class, and the class-encapsulation rule asks for changes through methods.

**Not prototyped:**

- **Named accessors,** such as `_centerY(slot)`, `_centerX(slot)`, `_left(slot)` and `_top(slot)`. The development check would still need a generic one, and both axes would carry every method. Estimated larger than `_at`, not measured.
- **The scan inside `RectIndex`,** such as a `_nearestY(pointerY)`. It would return a primitive too, but it moves `y()`'s rule into the index, which `DRD-52` property 1 took out.
- **`xy()`'s `before` in the index's storage.** It is `xy()`'s rule state across one committed move, not the cache, and `DRD-58` left it undecided.

### 4.2 Allocation

Bytes per unit under `src/sortable/`, heap sampling at 16 B, three launches per tree, mean with the range. The base ran first, then P, with the same probe text in both. [Readings](measurements/2026-11-13-rect-index-access-alloc.txt).

| Probe | Base | P | Mean difference |
| --- | --: | --: | --: |
| Per `y()` sample, 20 rows | 85.92 (84.17 to 87.62) | 49.30 (48.11 to 50.26) | **−36.62** |
| Per `xy()` sample, 20 rows | 49.62 (48.37 to 50.33) | 48.86 (48.02 to 49.48) | −0.76 |
| Per committed move, cold, after 100 crossings | 128.67 (126.00 to 130.96) | 114.47 (112.02 to 117.68) | **−14.20** |
| Per committed move, warm, after 2,000 crossings | 16.41 (15.56 to 17.20) | 16.05 (15.28 to 17.20) | −0.36 |
| Per drop with `layoutAnimation()`, under `rect-index.ts` and `linear-shift.ts` | 1,700.82 (1,681.27 to 1,715.60) | 1,300.89 (1,284.87 to 1,316.20) | **−399.93** |
| Same cycles, under `layout-animation.ts` apart from `report` | 77.27 (77.27 to 77.27) | 77.16 (76.00 to 77.73) | −0.11 |

- **Three differences are larger than the spread inside either tree,** and all three are reductions.
- **Per `y()` sample,** the base attributes about 35 B to `y.ts`'s `resolve` and `linearShift._refresh`, and P attributes nothing to either. **The cause isn't established.** The base reads `_values` and `_placeholderRect` into locals once per resolution, and P reads through `_at`. `DRD-52` and `DRD-58` read the same 84 to 87 B at their bases.
- **The drop probe's cycles are short**, so the code is mostly cold, and the reduction is larger than the two scratch `Float64Array`s and one-element arrays that P removes. Its attribution isn't split further.
- **Per `xy()` sample and per warm committed move,** the differences are smaller than the spread, so they show no difference.
- The sink's own allocation outside `report` doesn't change. `report` allocates the animations, the same in both trees.

### 4.3 Runtime

**No timing was measured** (the owner coordinates timing runs). What changes on the hot paths:

- **Per candidate,** `y()`'s and `xy()`'s scans call `_at` instead of reading a local array. In V8's optimizing compiler, the trace shows `_at` inlined into both scans, and `#read` and a sink's `displaced` inlined into `_measure` ([trace](measurements/2026-11-13-rect-index-access-inlining.txt)). Before a function is optimized, each candidate costs one more call. The trace ran on Node's V8 with stub elements, not in Chrome.
- **Per measured row,** with a sink composed, the index calls `displaced` once. With nothing in flight, the base's `settle` returned after one size check per measured range. P does one `Map` lookup per row that finds nothing. Each row already costs one `getBoundingClientRect`.
- **Per measured row with nothing in flight,** P computes `rect.left - 0` and so on before it writes: four subtractions and no second pass over the range. With a row in flight, the base wrote the six fields, then read four of them back and wrote six again. P writes six once.
- **Layout reads are unchanged.** P reads `getComputedTiming` between two rects of a measurement, where the base read all the rects first. Neither call writes to the tree, so this can't force a layout. `DRD-47`'s and `DRD-49`'s rect-count tests pass.

**A timing run that would separate P from the base**, if the owner wants one: `DRD-50` property 2's paired probe of `xy()`'s rebuild on 2,000 items, with no sink and with `layoutAnimation`, extended with a `y()` resolution arm, with the arms `before` (`f552e0ec9`), `production` (P) and `control`. It needs an `xy()` rebuild of a field and a `y()` scan of a window. It changes no instrument, and none of the deferred campaigns.

## 5. What you decide

1. **Whether `RectIndex` owns its storage and every write to it.**
   - **P. Recommended.** It meets every part of the owner's direction, it is smaller on "sortable + y" and "complete", and "complete" turns green in the gated build. `xy()` pays 37 B for the shift it carries.
   - VF, if "sortable + xy" must not carry `y()`'s shift (Part II §7). It gives up the class as the only writer for a module, and costs 8 to 20 B on the other two rows.
   - Neither: `DRD-52` and `DRD-58` stand.
2. **Its runtime, under §14.** Per candidate, one accessor call, which the optimizing compiler inlines. Per measured row with a sink, one `Map` lookup that finds nothing. Allocation falls per `y()` sample, per cold committed move and per drop with a sink, and shows no difference elsewhere (§4.2). **No timing was run.** Accept it on the inlining trace and the allocation, or name the timing run in §4.3 first.
3. **The sink's interface:** `displaced(element)` with read-only `dx` and `dy`, in place of `settle`. This amends `DRD-50` property 1 and W7.

## 6. If you adopt P

The architect records the decision. It amends:

- **`DRD-52`:** property 1 (`_shift` and `_travel` are added, and `_lend` goes), property 4 (removed), property 5 (`linearShift` passes `lo`, `hi` and `delta`), property 6 (the getters go, and `_at`, `_item` and `_insertion` read) and property 7 (the check copies through `_at`);
- **`DRD-58`:** property 1 (the storage holds the scratch slot and the placeholder too), property 4, property 5 (`_lend` goes), property 6 (`#placeholderRect`, the scratches and `ReadonlyFloat64Array` go, because the storage holds them) and property 7 (no union remains);
- **`DRD-50`:** property 1 and W7;
- **`DRD-33` choice 9:** the views become accessors that return one value.

**The patch uses the `_` names of `f552e0ec9`.** The owner is reverting `DRD-56`'s mangle separately, and this probe didn't read that revert. The unit applies P to the base current at the time, under the names the revert restores. The revert conflicts with `DRD-58` in `rect-index.ts` and `linear-shift.ts`, and P rewrites both files, so the unit should start after the revert lands.

The unit:

- applies P and runs the Chromium suite, lint and typecheck;
- gives the replaced W7 tests a discriminating mutation: a measurement that asks the sink about a different row than the one it read must fail them;
- measures every composition, with the seven control rows at exactly 0/0/0;
- runs the allocation probes listed in §4.2, per sample, per committed move cold and warm, and per drop with a sink;
- runs the timing named in §4.3 if the owner asks for it;
- reports the one `.d.ts` change and the `typedoc` warnings.

## 7. Limits

- **Chromium only,** on one machine. Firefox and WebKit are deferred to the CI the owner plans (`performance-plan.md` §3).
- **The plain build** was made by removing the rename step from a scratch copy of `tsdown.config.ts`, with the `_` names kept. It isn't the revert, whose names are one character shorter at each use.
- **The renamed build's control rows move** by up to 12 B, because each tree's map is regenerated and other properties' output names change. That noise affects the renamed column of every variant.
- **`xy()`'s cost** wasn't split between `_shift`, `_travel` and the accessor calls. VF's reading against VY bounds the first two at about 55 B in the plain build.
- **The inlining trace** ran on Node v26.13.0's V8 with stub elements, not in Chrome 157 with the real tree.
- **The allocation readings** come from one machine, three launches per tree, and a load average of 3.2 to 9.7 from other sessions. The base and P ran one after the other, not interleaved.
- **The suite and the flows** ran on the final patch, and so did the size table. The allocation probes ran on a tree equal to the final patch's `src`.