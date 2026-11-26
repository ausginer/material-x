#### DRD-58 — `RectIndex`'s slot buffer is one `number[]` for the index's life, and the rules that replacement required go

**Status:** active, decided on 2026-11-13 on the owner's direction. Replaces `RectIndex`'s growable `Float64Array` slot buffer with one `number[]`, and removes the lifetime and reentrancy rules that replacement required. Amends `DRD-52` properties 1, 4 and 6, and `DRD-50` W7's helpers. [`slot-array-handoff.md`](../slot-array-handoff.md) implements it after `DRD-57`'s unit. Costs are reported, not gated. **Implemented at `5ec3b4b2d`**, reported at `690769539` and accepted on 2026-11-13 in Chromium only (§Disposition of the slot array report). −31 to −32 B Brotli on the `sortable` rows, the controls unchanged, and allocation within its spread. The owner's separate mangling revert keeps it (its §Result). Property 8's first bullet was amended by `DRD-59`, and that amendment is withdrawn with `DRD-59`. **Amended on 2026-11-13 by `DRD-60`:** its prefixed member names lose the `_`, and the rollback keeps the types its §Result lists. **Amended on 2026-11-13 by `DRD-61`:** properties 1, 3 to 7 and 9. The array also holds the scratch slot and the placeholder. **Amended on 2026-11-13 by `DRD-62`:** property 7's row for `xy.ts`'s `before`. It goes into `RetainingRectIndex`

**`RectIndex.#values` is one `number[]`, created with the index and never replaced. It grows only by appending, in `_collect`, so it never has a hole. `#capacity` and `capacityFor` go. The `values` getter returns the same array, typed `readonly number[]`, for the index's life. `_lend` stays the only way a write leaves the class. It keeps its extent rule, and loses its lifetime and reentrancy clauses, which existed only because `_collect` could replace the buffer. The packed layout, the window and every value read from it are unchanged. Fixed-size buffers stay `Float64Array`.** [`slot-array-handoff.md`](../slot-array-handoff.md) implements it.

Decided on 2026-11-13 on the owner's direction. The owner chose the simplification for itself: the unit reports its costs, and a speed-up is not required to justify it. The member names below are `436b105c6`'s. `DRD-57` prefixes `values`, `items`, `end`, `invalidate` and `retire`, and the unit runs after it.

**The owner's direction:**

- **Replace the growable `#values` buffer with `number[]`,** and remove manual capacity management and buffer replacement.
- **Simplify the ownership rules that existed because `_collect` replaced the buffer.**
- **Keep the packed geometry and its behavior.**
- **Only the growable slot buffer is in scope.** Fixed-size buffers, such as box-quad's out parameters, are not.
- **Check the affected sink signatures and declarations explicitly.**
- **Use the existing behavior, geometry, allocation and size checks, and report the costs.**
- **The independent review stays pinned to `436b105c6`.**

**Why the rules go.** `DRD-52` gave `_lend` a lifetime ("valid during the call only") and a reentrancy rule ("`write` calls neither `_collect` nor a rebuild that calls it"), and the `values` getter a lifetime ("valid until the next `_collect`"). The owner asked for them because a reference could outlive its buffer ([proposal](../rect-index-ownership-proposal.md) §1, §3.1). An array that is never replaced can't be outlived, so all three go. **The class-encapsulation rule doesn't depend on replacement**, so changes still leave the class only through a method: a writer writes during its lend, and a reader gets a read-only view. The extent rule describes the window, not the buffer's lifetime, so it stays.

**Why it must grow by appending.** `y()`'s window starts at the placeholder's slot, so `_measure` writes slots in the middle of the collection first. A write past an array's length leaves a hole. In V8, a write at index 600 of an empty array left it holey, and a write at index 1,026, which is slot 171 at `STRIDE` 6, made it a dictionary ([probe](../measurements/2026-11-13-slot-array-kinds.js.txt), [output](../measurements/2026-11-13-slot-array-kinds.txt)). Assigning a larger `length` left the array holey too. Appending numbers keeps the array packed, and the engine manages its capacity.

**Required properties:**

1. **The slot array.** `#values` is a `readonly` field holding one `number[]`, created with the index. Nothing assigns it again. No field, function or comment states a capacity. Nothing in `src` allocates a typed array for the slots.
2. **Growth.** Before `_measure` writes a slot, the array's length covers that slot. `_collect` makes it so by appending numbers at the array's end, and only when the collection has more slots than the array holds. No write lands past the array's length, and nothing assigns `length` upward. **The array never shrinks:** it holds the largest collection the index has measured, and `retire` keeps it, as now. The unit shows this property by listing every write and growth site in the report. It adds no instrument.
3. **The geometry.** The layout is `[left, top, right, bottom, centerX, centerY]` per slot, at `STRIDE` 6. `pack`'s arithmetic, the window, `_measure`'s range, `settle`'s range and every read site don't change. A slot inside the window holds the same IEEE double that the `Float64Array` held. A slot outside the window is unspecified, and nothing reads it, as now.
4. **Reads.** The `values` getter returns `readonly number[]`: the same array for the index's life, like `items` and `_placeholderRect`. Its JSDoc says that the contents are valid inside the window. It no longer gives a lifetime. A read site no longer has to read after the `_collect` it depends on.
5. **`_lend(lo, hi, write)`** calls `write(values, lo, hi)` once with the writable `number[]`.
   - **Extent, unchanged:** `lo` to before `hi` is inside the window, and `write` reads and writes nothing outside it.
   - **Ownership:** `write` writes the array only during the call. This is the class-encapsulation rule. It no longer describes when the reference is valid.
   - **Removed:** the lifetime clause and the reentrancy clause.
   - The JSDoc still says that this is the rule `_measure` gives the sink's `settle`, and that nothing checks it at runtime.
6. **Fixed-size buffers stay `Float64Array`.** These are `#placeholderRect`, `_holds`'s one-slot scratch, `linear-shift.ts`'s one-slot probe scratch and `heldPlaceholder`, `ReadonlyFloat64Array`, which still types `_placeholderRect` and `verifyEquivalence`'s `heldPlaceholder`, and everything outside `src/sortable/` (box-quad's out parameters, `free-drag/geometry.ts`, the stories and the fixtures).
7. **Shared signatures.** A function or method that receives both the slot array and a fixed-size buffer takes `number[] | Float64Array`, with no cast, copy or conversion at any call site. A read-only view (`readonly number[]`, `ReadonlyFloat64Array`) is not assignable to it. **The union is written in each parameter and not named,** so that no `.d.ts` gains a declaration (property 8). The affected declarations:

   | Declaration | At `436b105c6` | After |
   | --- | --- | --- |
   | `rect-index.ts` module JSDoc | "one `Float64Array` plus one parallel element array"; "alone allocates the buffer" | One `number[]`; `RectIndex` alone grows it |
   | `pack(target, offset, rect)` | `target: Float64Array` | `number[] \| Float64Array`: the slot array, `#placeholderRect` and `_holds`'s scratch |
   | `capacityFor` | Power-of-two capacity | Removed |
   | `#values` and its JSDoc | `Float64Array`, replaced when outgrown, "never shrinks" | Property 1. "Never shrinks" stays true |
   | `#capacity` | Field | Removed |
   | `get values()` | `ReadonlyFloat64Array`, "valid until the next `_collect`" | `readonly number[]`, property 4 |
   | `_collect` | Replaces the buffer when outgrown | Property 2 |
   | `_lend`'s `write` parameter and JSDoc | `(values: Float64Array, lo, hi) => void`, three rules | `(values: number[], lo, hi) => void`, property 5 |
   | `verifyEquivalence`'s `predicted` | A `Float64Array` copy | A `number[]` copy, by `slice` as now |
   | `axis.ts` `DisplacementSink.settle`'s `values` | `Float64Array` | `number[] \| Float64Array`: `_measure` passes the slot array, and `_holds` and the probe pass a one-slot `Float64Array`. The range rule in its JSDoc is unchanged. **Emitted in `sortable/axis.d.ts`** (property 8) |
   | `layout-animation.ts` `settle`'s `values` | `Float64Array` | As `axis.ts`. The body is unchanged |
   | `linear-shift.ts` `advance`'s `values` | `Float64Array` | `number[]` |
   | `linear-shift.ts`, `xy.ts` and `y.ts` read sites | Untyped destructuring of `values` | Unchanged. A comment whose reason is replacement is rewritten or removed |
   | `xy.ts` `before` | A growable `Float64Array`, replaced when outgrown | **Unchanged.** It isn't the slot buffer (see "What this doesn't decide") |

8. **The publication.**
   - No prefixed name is added or removed, so `build/property-names.json`, generated again, is byte-identical. The publication test passes.
   - **One `.d.ts` line changes:** `settle`'s `values` parameter in the emitted `sortable/axis.d.ts` becomes `number[] | Float64Array`. Every other emitted `.d.ts` is byte-identical, and no `.d.ts` file is added. `DisplacementSink` is one of `DRD-39`'s unpublished installer types, which no entry exports, and CONTRIBUTING Part II §8 keeps no compatibility for it. `DRD-50` changed the same signature on the same ground.
   - `DRD-39` property 3's instrument still holds: `typedoc` warns only about `AxisInstaller` and `DisplacementInstaller`.
9. **Tests.** Only the helpers in `tests/displacement-sink.browser.test.ts` that identify the cache by its `ArrayBuffer` change: they identify it by being an array. `DRD-50`'s W7 still asserts that every measurement's `settle` receives one slot array and one element array, each with the range it read, and no test title changes. **A copy mutation shows that W7 still discriminates:** `_measure` passing `settle` a copy of the slot array fails W7. M8 still fails W8.

**Costs, reported and not gated.** The owner asked for a report, and no reading returns the unit.

- **Size:** every row, minified, gzip-9 and Brotli-11, at the base and at the end. The seven rows without `sortable` are control rows and must read exactly 0/0/0 (`DRD-51` property 2). A non-zero control row is a finding.
- **Allocation:** `DRD-52`'s probes, per sample in each axis and per committed move cold and warm, at the base and at the end.
- **Expected, not measured:** the first `_collect` of each index appends six numbers per slot, where the base allocated one typed array. V8 first holds an array of zeros as small integers, and the first fractional coordinate converts it to doubles once. `pack` and `settle` now receive two representations.
- **Timing isn't measured.** The owner named the checks, and `DRD-50`'s result showed that a paired probe on this cache can't resolve an effect of this size. The report says that timing is unmeasured. `DRD-51` property 4 governs changes made for bytes in the size pass, and this isn't one.

**What this amends:**

- **`DRD-52` properties 1, 4 and 6,** by properties 1, 5 and 4 above. Its §Amendment states what they used to say.
- **`DRD-50` W7's implementation.** The helpers no longer read an `ArrayBuffer`, and the copy mutation stands in for M7, whose view-and-copy call no longer applies to an array.

**What this doesn't decide:**

- **`xy.ts`'s `before`,** the other growable typed buffer in `src/sortable/`. It belongs to `xy()`'s committed move, not to `RectIndex`, so it is outside the owner's scope. The owner may extend this decision to it.
- **Fixed-size buffers as `number[]`.** That would give `pack` and `settle` one representation, and the owner excluded it.
- Removing `_lend`. It is the class's write method, and `DRD-52`'s ownership stands.
- The independent review of `DRD-56`'s pipeline, its pin to `436b105c6`, and `DRO-4`'s re-base.

**Amended on 2026-11-13 by `DRD-59`:** once `DRD-59`'s unit lands, property 8's first bullet reads "the publication test passes", because no file holds the map. Nothing else changes, and the unit stays separate.

**Result, 2026-11-13:** implemented at `5ec3b4b2d`, reported at `690769539` and accepted (§Disposition of the slot array report). Properties 1 to 7 and 9 hold. Property 8 held under the publication pipeline as it stood: the map regenerated byte-identically, the publication test passed, one `.d.ts` line changed, and `typedoc` warned as before.

- **Chromium only.** On the owner's direction of 2026-11-13 ([`performance-plan.md`](../performance-plan.md) §3), local checks ran in Chromium only. Firefox and WebKit are deferred to the CI the owner plans, and this result claims no cross-engine verification. In Chromium, the copy mutation fails W7 for `y()` and `xy()`, and M8 fails W8.
- **Size,** with the same tools at the base `706b91481` and the end: "sortable + y" −31 B Brotli, "sortable + xy" −32 B and "complete" −31 B, each −121 B minified. The seven control rows read 0/0/0, and no verdict changed.
- **Allocation:** no probe moved by more than the spread inside either tree. The mean differences are +0.01 B per `y()` sample, −1.45 B per `xy()` sample, −0.04 B per cold committed move and −0.29 B per warm one.
- **Not measured:** timing, and the three costs §Costs lists as expected. They stay inferred.

**The slot array doesn't depend on the publish-time mangle.** Properties 1 to 7 and 9 don't use `DRD-56`'s pipeline or `DRD-57`'s prefixes. Property 8's map and publication-test clauses checked that pipeline as it stood, and they lapse with it. **The owner is reverting property mangling separately, and that revert keeps `5ec3b4b2d`'s slot array, signatures and test helpers.** A plain `git revert b50204f66` conflicts with `5ec3b4b2d` in `rect-index.ts` and `linear-shift.ts`, and the reverted side of the getter hunk is `get values(): ReadonlyFloat64Array`. The architect found this on 2026-11-13 in a scratch worktree at `690769539`, which has been removed. A resolution keeps this decision's types and comments under whichever member names the revert restores:

- the getter returns `readonly number[]`;
- `_lend`'s `write` takes `number[]`;
- `pack`'s `target` and `settle`'s `values` are `number[] | Float64Array`;
- `#capacity` and `capacityFor` stay removed.

The `sortable/axis.d.ts` line stays too.

**Amended on 2026-11-13 by `DRD-60`.** `DRD-59`'s amendment above is withdrawn with `DRD-59`. The §Result above stands, and the rollback keeps the types it lists. The members that this entry writes with the prefix, such as `_collect`, `_lend`, `_measure`, `_holds` and `_placeholderRect`, are named without it once `DRD-60`'s unit lands. Property 8's first bullet then stops applying, because neither the map nor the publication test exists. The other properties stay.

**Amended on 2026-11-13 by `DRD-61`, properties 1, 3 to 7 and 9.** The slot array stays one `number[]` that grows only by appending, and it now holds every geometry value of the index.

- **Property 1:** the array holds the scratch slot and the placeholder before the destination slots. Apart from `xy.ts`'s `before`, nothing in `src/sortable/` allocates a typed array for geometry.
- **Property 3:** `pack` goes into the one read path, with its arithmetic, and `settle`'s range goes with `settle`. The layout, the window and every value read don't change.
- **Property 4:** no getter returns the array. `at(slot, field)` returns one value.
- **Property 5 is removed,** with `lend`. Its §What this doesn't decide left removing `lend` open, and `DRD-61` decides it.
- **Property 6:** `#placeholderRect`, `holds`'s scratch, `linear-shift.ts`'s probe scratch, `heldPlaceholder` and `ReadonlyFloat64Array` go, because the storage holds what they held. Everything outside `src/sortable/` stays.
- **Property 7:** no signature takes `number[] | Float64Array`, because `pack` and `settle` go. The emitted `sortable/axis.d.ts` changes as `DRD-61` property 6 states.
- **Property 9:** W7 is replaced by `DRD-61` property 10, and its copy mutation by M7a and M7b.
- **What they used to say:**
  - property 1: the array held the destination slots, and "Nothing in `src` allocates a typed array for the slots";
  - property 3: "`pack`'s arithmetic, the window, `_measure`'s range, `settle`'s range and every read site don't change";
  - property 4: "The `values` getter returns `readonly number[]`: the same array for the index's life";
  - property 5: "`_lend(lo, hi, write)` calls `write(values, lo, hi)` once with the writable `number[]`", with its extent and ownership rules;
  - property 6: "Fixed-size buffers stay `Float64Array`. These are `#placeholderRect`, `_holds`'s one-slot scratch, `linear-shift.ts`'s one-slot probe scratch and `heldPlaceholder`, `ReadonlyFloat64Array` …";
  - property 7: "A function or method that receives both the slot array and a fixed-size buffer takes `number[] | Float64Array`";
  - property 9: "`DRD-50`'s W7 still asserts that every measurement's `settle` receives one slot array and one element array, each with the range it read".

**Amended on 2026-11-13 by `DRD-62`:** property 7's row for `xy.ts`'s `before`, and the first bullet of §What this doesn't decide. `before` is removed. `xy()`'s previous geometry is in `RetainingRectIndex`'s `#retained`, a `number[]` that grows only by appending, as property 2 requires of the slot array. **What they used to say:** the row's last column, "**Unchanged.** It isn't the slot buffer (see "What this doesn't decide")", and the bullet, "`xy.ts`'s `before`, the other growable typed buffer in `src/sortable/`. It belongs to `xy()`'s committed move, not to `RectIndex`, so it is outside the owner's scope. The owner may extend this decision to it."