# RectIndex ownership

**Status: proposed on 2026-11-12 for the owner, and not decided.** It revisits C6 of the [size pass](size-pass-assessment.md) and replaces C6's form in `DRO-14` item 2. If you accept it, the architect records it as a `D-*`. **Read at:** `c0d6b9205` on `drag/size`, whose `packages/drag/src` is identical to `0a28f909a`. The owner's staged `Callbacks` edit is left as it is, and one joint reading includes it. **Governing:** CONTRIBUTING's class-encapsulation rule, Part II §7, §13, §14 and §15, `DRD-51` and `DRO-14`. **Probe:** [`probes/rect-index-ownership/`](probes/rect-index-ownership/README.md). **Readings:** [`2026-11-12-rect-index-ownership-readings.txt`](measurements/2026-11-12-rect-index-ownership-readings.txt).

## 1. The question

`RectIndex` replaces its slot buffer in `collect` when the collection outgrows it. C6 moved `y()`'s two cache writes, `advance` and `remeasurePlaceholder`, into `linear-shift.ts`, which then cast the `values` and `placeholderRect` getters to `Float64Array` and wrote through them. That is a writer holding a reference whose lifetime nothing states, through a view the type marks read-only. **The owner wants access to the buffer to state its lifetime.** A callback-scoped borrow is an acceptable form. Keeping a borrowed reference past its stated scope is integrator misuse, and nothing checks it at runtime.

## 2. What the cache holds now

| State | Lifetime | Written by | Read by |
| --- | --- | --- | --- |
| The slot buffer, `#values` | Replaced by `collect` when the collection outgrows it | `measure`, the sink's `settle` inside `measure`, `advance` | `y()`'s and `xy()`'s resolution, `linear-shift.ts`'s window growth and first committed move, `xy()`'s committed move, `holds`, the development check |
| The placeholder's rect, `#placeholderRect` | One object for the index's life | `collect`, `remeasurePlaceholder` | Both resolutions, the window growth, the development check |
| The element array, `#items` | One array for the index's life | `collect`, `retire` | Both resolutions, both committed moves, `measure`, `holds` |
| The window and the staleness | `RectIndex`'s own | `RectIndex` only | Both axes through getters |

**Each axis carries the other's policy.** `refresh` is called only by `xy()`, and `advance` and `remeasurePlaceholder` only by `linear-shift.ts`. Class methods don't tree-shake, so "sortable + y" and "complete" carry `xy()`'s rebuild, and "sortable + xy" carries `y()`'s prediction.

**The buffer is lent once already.** `measure` passes it to the displacement sink's `settle` with a range. The sink may write only inside that range, and only during the call.

## 3. The proposed design

1. **`RectIndex` is the dimension-neutral cache, with no axis policy.** It alone allocates and replaces the slot buffer, writes the element array, the window and the staleness, and makes every measurement: `collect`, `measure`, `holds`, and a new `measurePlaceholder`, the placeholder packed like a slot, which `collect` also calls.
2. **Each axis module holds its own policy.** `xy.ts` holds its full rebuild as a module function over `collect`, `measure` and the read views, and it needs no access beyond them. `linear-shift.ts` holds the prediction, which is the only write that isn't a measurement.
3. **That write reaches the buffer only through `lend(lo, hi, write)`,** which calls `write(values, lo, hi)` with the writable slot buffer.
   - **Lifetime:** the reference is valid during the call only.
   - **Extent:** the range is inside the window, and `write` reads and writes nothing outside it.
   - This is the contract that `measure` already gives `settle`, so **one lending rule covers both borrowers.**
4. **Reads keep the read-only views.** `values` is valid until the next `collect`, the only operation that replaces it. `placeholderRect` and `items` are the same objects for the index's life, though their contents change. Every read site already reads after the `collect` it depends on, in the same call, and the unit writes this lifetime on the getter.
5. **Integrator misuse, not checked at runtime:**
   - keeping a lent reference after the call;
   - writing outside the lent range;
   - calling `collect` during the call;
   - writing through a read view.

**Who writes what, after the change:**

| Writer | Writes |
| --- | --- |
| `RectIndex` | The buffer's allocation and replacement, every measured slot, the placeholder's rect, the element array, the window and the staleness |
| The displacement sink | The range `measure` lends it, during `settle`. Unchanged |
| `linear-shift.ts`, `y()` only | The top, bottom and center y of the crossed slots, during `lend`. It asks `RectIndex` to measure the placeholder again after a committed move |
| `y.ts`, `xy.ts` | Nothing. They read through the views |

**The writer is created once for each `y()` instance.** It reads the rule's `delta`, the committed move's displacement along y. `moved` sets `delta` before it lends, and its report loop reads `delta` after. `delta` was a local of `moved` before, and the patch makes it rule state, so the writer allocates nothing per move.

### 3.1 Reentrancy

- **Valid now, and unchanged.**
  - The sink's `settle` runs inside `measure` while the window growth holds `values` from the getter. `measure` writes in place, so the outer reference stays valid.
  - A consumer's `box` callback runs inside `measure` and `holds`. It may call the controller's `invalidate()`, which sets flags only.
- **Valid inside `write`:** reading any view, and calling any member except `collect`. None of the others replaces the buffer.
- **Not valid inside `write`:** `collect`, or `xy.ts`'s rebuild, which calls it. Nothing in the package does either. The writer calls no consumer code, so no consumer callback can run during a lend.

### 3.2 Optional code

After the change, both axes use every `RectIndex` member except `lend`, which only `y()` calls. "sortable + xy" no longer carries the shift arithmetic, and "sortable + y" and "complete" no longer carry `xy()`'s rebuild.

### 3.3 Hot-path cost

- **Per pointer sample: unchanged.** Measured in both axes: 84.6 B per sample with `y()` and 49.4 B with `xy()`, against 86 to 87 B and 50 to 52 B at the base.
- **Per committed move:**
  - `lend` and the writer run where one method call ran.
  - The lend allocates nothing.
  - The placeholder's re-read packs six fields instead of three: two more fields of the same rect, and no added layout read.
  - Measured: 123 to 135 B per committed move, against 117 to 124 B at the base, a mean of 7 B more. The probe's code wasn't warm: each function ran about 300 times.
- **This moves hot-path work,** so by `DRD-51` property 4 and §14 it needs your approval, and its unit runs `compare.ts`.

### 3.4 The development check

`verifyEquivalence` compares the placeholder's left, top, right and bottom with a fresh measurement. The proposal measures the placeholder's x again after a committed move, so **a placeholder that moves along x is no longer reported.** `y()` never reads the placeholder's x, and the check still compares every field of every slot in the window. Production behavior doesn't change.

## 4. Measured trade-offs

Each variant was measured against `c0d6b9205` (see [the probe](probes/rect-index-ownership/README.md)). Brotli-11 bytes. The minified and gzip-9 figures are in the readings file. **The seven rows that don't import `sortable` read exactly 0/0/0 in every variant.**

| Variant | "sortable + y" | "sortable + xy" | "complete" | Allocation per sample | Allocation per committed move | Writes leave `RectIndex` through |
| --- | --: | --: | --: | --- | --- | --- |
| Base |  |  |  | 86 to 87 B with `y()`, 50 to 52 B with `xy()` | 117 to 124 B | Nothing |
| C6, as patched in the size pass | −13 | −76 | −18 | Not measured | Not measured | A cast of the read view |
| A: both writes lent to closures | +18 | −63 | +1 | Not measured | Not measured | `lend` |
| B: a shared placeholder measurement | −27 | −22 | −25 | Not measured | Not measured | Nothing |
| C: B and a lend to a closure | −6 | −57 | −22 | Not measured | Not measured | `lend` |
| D: B and `xy()`'s rebuild in `xy.ts` | −46 | −18 | −52 | Not measured | 132 to 136 B | Nothing |
| E: D and a lend to a closure | −47 | −55 | −53 | As the base | 183 to 186 B | `lend` |
| F: D and C6's cast | −56 | −61 | −54 | Not measured | Not measured | A cast of the read view |
| G: E with every buffer access lent | −50 | −69 | −60 | 185 to 187 B with `y()`, 106 to 108 B with `xy()` | Not measured | `lend` |
| H: E with the writer created once and the span in three variables | −25 | −55 | −29 | As the base | 130 to 133 B | `lend` |
| **P: the proposal** | **−46** | **−57** | **−43** | **As the base** | **123 to 135 B** | **`lend(lo, hi, write)`** |

**Joint readings:**

- **Over the owner's staged edit,** P reads −51 B on "sortable + y", −54 B on "sortable + xy" and −47 B on "complete". The seven other rows read 0/0/0.
- **With U1, the first unit,** P reads −53, −64 and −56 B. U1 alone reads −17, −2 and −17 B. The two patches apply together and typecheck.

**No red row turns green.** "complete" goes from 7,356 B to 7,313 B against its 7,065 B ceiling, and to 7,300 B with U1. `DRO-4`'s re-base stays yours.

**Why not the others:**

- **C6 and F** write through a view typed read-only. The class's own surface then no longer states who may write, which CONTRIBUTING's class-encapsulation rule requires, and nothing states the reference's lifetime. On P's layout, F is 4 to 11 B smaller than P, so that is what the lend costs.
- **A** lends both writes before the placeholder measurement is shared, and costs 18 B on "sortable + y".
- **B and C** are steps toward P that leave `xy()`'s rebuild in `RectIndex`.
- **D** lends nothing, so `RectIndex` stays the only writer and everything goes through methods. It reads the same as P on "sortable + y" and is 9 B smaller on "complete". It is 39 B larger on "sortable + xy", because that row carries the shift arithmetic. **It is the alternative if you decline lending.** Its cost per committed move is like P's.
- **E** is up to 10 B smaller than P on "complete", but it allocates a closure on every committed move, about 60 B more than P. §14 puts the runtime first.
- **G** makes even the reads callback-scoped. It is 4 to 17 B smaller than P, but it doubles the allocation per sample in both axes, which §14 rejects. A scope on the reads adds no safety, because every read site already follows its `collect` in the same call.
- **H** allocates nothing per move, but it is 21 B larger than P on "sortable + y" and 14 B larger on "complete". P passes the span as `lend`'s arguments instead of through rule variables.
- **Not prototyped:**
  - A resizable `ArrayBuffer`, so that the buffer is never replaced. It needs a maximum length up front, which the contract doesn't state, and an engine may reserve address space for that maximum.
  - A `y()` subclass of `RectIndex`. A subclass can't reach the base's private fields without the same lend.
  - A receiver argument on `lend`. The writer is created once and already closes over its rule, so a receiver would add a parameter that nothing uses.

## 5. What you decide

`DRO-14` item 2, as revised:

1. **Whether `RectIndex` lends its slot buffer.**
   - **P, which lends it. Recommended.**
   - D, which lends nothing.
   - Neither: C6 stays untaken.
2. **P's runtime, if you choose P.** No change per sample. Per committed move: one more call, and about 7 B more allocated in unoptimized code by the full placeholder pack. Under §14 this needs your approval, and its unit runs `compare.ts`.

## 6. If you adopt P

The architect records the decision, then writes the unit's handoff when you start it. The unit:

- applies P's patch to the base current at the time. It applies with U1;
- revises the comments that name `RectIndex.refresh`: the module header says the window is "every slot after `refresh`";
- writes the `values` getter's lifetime on the getter;
- runs the three-engine suite, lint and typecheck;
- measures each composition, with the seven rows that don't import `sortable` as control rows at exactly 0;
- runs both allocation probes;
- runs `compare.ts --before <its base> --only <the rows that reach y()'s committed move>`.

## 7. Limits

- **The allocation readings** were taken in Chromium only, on one machine, with 20 rows and heap sampling at 16 B. The committed moves ran in code that wasn't warm. One of P's three per-move readings is inside the base's range. Neither probe read warm code, and no timing was measured.
- **P's suite run** was in Chromium only: 414 tests passed, and the 5 failures are the five size rows already over their ceilings at the base. Firefox, WebKit and lint weren't run.
- **The owner's staged edit** was read through `git diff --cached` and applied only to scratch copies. Its two typecheck errors are in files that still import `kernel/callback-list.ts`, which the edit removes. They come from the edit and not from P.