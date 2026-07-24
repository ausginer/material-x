# Experiment 01 — Event objects → discriminated tuples

**Plan reference:** Track B, item 5 — "Event objects → optional discriminated tuples
using the existing branded currencies."

**Branch:** `experiment/tuples` (kept out of `main`).

**Status:** ❌ Rejected — reverted. Measured win too small to justify the cost.

---

## Hypothesis

Draggable events are object literals (`{ type, operationId, point, bounds, … }`).
Their property-name strings (`operationId`, `resolutionId`, `point`, `bounds`, …) are
not manglable by the minifier and are repeated at every construct **and** every read
site. Re-encoding each event as a flat discriminated tuple (`[tag, subject, …payload]`)
should drop those key strings and shrink the bundle. Runtime was a secondary,
unproven hope.

## Scope

Draggable feature only, as a measured proof-of-concept before committing to sortable:

- `src/draggable/reducer.ts` — 22 event type defs + `classify` + `classifyMove` +
  `enterSettling` + all six slice reducers (~70 positional read sites).
- `src/draggable/gesture.ts`, `src/draggable.ts`, `src/draggable/resolution.ts` — every
  construction site.
- Added an `eventError(event)` helper to replace `'error' in event`, which tuples break.

## Encoding

Element `[0]` is the integer tag. Element `[1]` is the event's "subject": a shared
`PointerSample` or branded currency object where the event has one (honouring the plan's
"using the existing branded currencies"), otherwise the first scalar. Later elements are
the remaining payload. Switch/`if` narrowing on `event[0]` works — the source stays
type-safe and typechecks; only the test file (which still builds object-events) does not.

## Result

Measured under the **old Vite** size-limit plugin (before the Rolldown update):

| bundle    | before   | after    | delta       |
| --------- | -------- | -------- | ----------- |
| draggable | 7.48 kB  | 7.40 kB  | **−0.08 kB** |
| combined  | 14.63 kB | 14.56 kB | −0.07 kB    |

≈ **80 bytes** brotli on draggable (~1%). No runtime benefit expected.

> Baselines shifted after the size-limit plugin update (now Rolldown): current `main`
> baseline is draggable **6.55** / sortable **7.70** / combined **12.63 kB**. The
> plugin change does not affect the verdict — the delta is a property of the encoding,
> not the bundler.

## Why the win is so small

`size-limit` measures the **brotli-compressed** bundle. Brotli already deduplicates the
repeated key strings across the file, so removing them recovers almost nothing. The
raw-bytes intuition ("many repeated `operationId` strings") does not survive compression.

## Why the cost is real

Positional `event[1].pointerId` / `event[2]` indexing is threaded through `classify` and
all six slice reducers — the most invariant-dense code in the package — plus the extra
`eventError` helper. The events are already monomorphic objects with stable V8 hidden
classes, so there is no allocation or access win either; and only 4 of 22 event types are
hot-path.

## Verdict

Fails the plan's Track B gate: *"tuples accepted only after a meaningful measured win."*
80 bytes against that readability hit is not meaningful. Reverted.

## Takeaways for later experiments

- On this codebase, **brotli neutralizes property-name-string savings** — do not expect
  object→tuple / key-stripping transforms to pay. Target constructs that compress
  differently (class/prototype scaffolding, dead branches, duplicated logic).
- The reducer's parallel-slice architecture is fundamentally object-shaped; positional
  encodings fight it. This is corroborating evidence for the plan's own ordering
  (gesture representation before event representation).
