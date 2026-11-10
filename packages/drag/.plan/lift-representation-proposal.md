# Lift representation

**Status: resolved on 2026-11-08 with the owner's clarifications, and decided as `DRD-29` in [`00-index.md`](00-index.md).** The implementation handoff isn't prepared yet. `DRF-2`'s repair comes first in it. This record holds the analysis, and `DRD-29` holds the decision. The first version of this record is at `793bb6713`. The parts of it that were withdrawn are listed at the end.

**Read at:** `b5f5f4046`, with the owner's uncommitted edits to `src/lift.ts`, `src/sortable.ts` and `src/free-drag.ts`, which turn `Lifter` into a class. Those edits are left as they are. Everything below is by reading. No suite, probe or measurement was run.

## The owner's clarifications, 2026-11-08

- **`type-fest` is a shared project dependency, and its utilities are preferred over equivalent handwritten types.** The owner introduced `Writable` in `lift.ts` deliberately. `DRD-27`'s "`type-fest` and `Writable` leave the package" was not meant as a prohibition, and replacing `Writable` with a handwritten mapped type is not an improvement.
- **The proposed `land` responsibility is approved.** The displacement is private, and `land` composes the landing, so `translatedX` and `translatedY` leave the public type. The goal is stable data that is immutable from outside, not a new object on every update. Private mutation and DOM writes are fine.
- **The owner's `Lifter` class stays.**
- **No incidental behavior change or performance cost is authorized.**

## What each member of `Lift` is

| Member | What it is | Set | Read by | Does the lift use it? | Also held by |
| --- | --- | --- | --- | --- | --- |
| `visual` | The lifted element | `acquire` | The lift's `translate`, release and landing. `sortable`'s placeholder, `free-drag`'s home and request, the `commit` test | Yes | The caller, who passed it or left it as `drag.item` |
| `box` | The element whose size is reported | `acquire` | `sortable`'s placeholder | No | `sortable`'s `state.box` |
| `rect` | The visual's viewport rect at the grab | `acquire` | The lift's landing. Both built-ins | Yes | Nothing |
| `boxWidth`, `boxHeight` | The box's offset size before the lift writes | `acquire` | `sortable`'s `activate`. The `drop-zone` fixture's `settle` | No | Nothing a caller can read after `acquire` |
| `visualSpace` | What the visual inherits | `acquire` | The lift's landing. `free-drag`'s geometry | Yes | Nothing |
| `itemSpace` | What the item inherits | `acquire` | `sortable`'s axis context | No | It is `visualSpace` when the item is the visual |
| `translatedX`, `translatedY` | The displacement `translate` last wrote | `translate` | The lift's landing, at release. Both built-ins' `settle`, only to pass to `LandingTiming` | Yes | `sortable` can derive it from the drag. `free-drag` can't: its `#motion` is scratch |
| `translate(x, y)` | Writes the transform and records the displacement |  | Both built-ins, every sample |  |  |
| `land(landing)` | Records the landing for the release |  | Both built-ins' `settle` |  |  |

The base matrix, the `promoted` flag, the recorded landing and the two restore functions are in `acquire`'s scope and never on the object. Only the two disposers read them.

**The one mutable public value is the displacement, and it is public only for the landing.** Each built-in reads `translatedX`, `translatedY` and `rect`, calls its `LandingTiming`, and builds a `Landing` in viewport coordinates. At release the lift turns that `Landing` back into a delta from `rect`. CONTRIBUTING §9 warns about this repeated packing and unpacking, and both built-ins repeat the same lines. Every other member is set once in `acquire` and never written again.

## The questions, resolved

### 1. What stays on `Lift`: the whole acquisition snapshot

**`visual`, `box`, `rect`, `boxWidth`, `boxHeight`, `visualSpace` and `itemSpace` stay, read-only and set once.** The first version moved `visual`, `box`, the box's size and `itemSpace` to the callers. That is withdrawn:

- The owner's goal is stable data that is immutable from outside, and these members already are.
- Moving `itemSpace` is what changed the failed-acquisition path (question 4).
- The move cost `sortable` three reads, cost a custom behavior its own state for the pre-lift size, and changed tests, all for fewer members.

`visual` and `box` still repeat the caller's references (CONTRIBUTING §5). That costs two references per operation. With them, the snapshot names the elements it describes, which a custom behavior that doesn't keep them needs. They stay.

### 2. `land`'s arguments: `land(x, y, timing?)`

- **`x` and `y`** are the viewport position of the visual's top-left, as `Landing`'s `x` and `y` are now. They are positional, like `translate(x, y)`.
- **`timing` is a `LandingTiming`.** `land` calls it once, when `land` is called. It passes the arguments that the built-ins pass now: the displacement, then the target's delta from the grab, `x - rect.x` and `y - rect.y`. `land` records the target with the returned duration and easing.
- **Without `timing`, the default duration and easing apply,** as they do now for a `Landing` without them.
- **When `timing` throws, `land` records nothing,** and an earlier call's landing stands. That is the same as now, where the throw in `settle` came before the call.
- **`Landing` leaves `lift.js`.** `lift.js` re-exports `LandingTiming` as a type, as `sortable/landing.js` and `free-drag/landing.js` already do.
- **A fixed timing** is `landing({ duration: 50 })` from a landing entry, or a function that returns it.

**Rejected:**

- **Keeping `Landing` with `duration?` and `easing?`.** A timing that depends on the displacement would need the displacement to be public.
- **`land(landing: { x, y, timing? })`.** It adds a type and an object for a positional pair.
- **Accepting either a `LandingTiming` or fixed fields.** That is two forms and a runtime branch for one input.

**Consumer-visible change:** a custom behavior that passed `{ x, y, duration }` now passes `x`, `y` and a timing. That is the surface change the approval implies. The built-ins' landings don't change.

### 3. A `translate` after `land`: as now

**`land` fixes the target and the timing. The landing disposer reads the flight's start from the private displacement, at release, as now.** So a `translate` between `land` and the release moves where the flight starts, exactly as at `b5f5f4046`. The built-ins never do it. A behavior's own disposer can, because it runs before the lift's release, and so can code that keeps the `Lift`.

The first version computed the flight's geometry inside `land`. That is withdrawn, because it changes this case. The displacement therefore stays needed after the styles are restored, as the owner noted, and it is now private.

### 4. A failed acquisition: unchanged

`acquire` still measures `itemSpace`. An item with no single 2D box throws `lift/visual-no-box-space` inside `acquire`, after it measures the visual and before any write. Its `finally` cancels the running landing. That is the same as at `b5f5f4046`, and the release that `acquire` registers before its first write is unchanged.

### 5. `type-fest`

- **`DRD-27`'s and `DRD-28`'s text is corrected.** Removing `type-fest` was a consequence of the code changing, not a rule. The rule in force is CONTRIBUTING's TypeScript section: prefer a `type-fest` utility over a handwritten type that does the same.
- **`lift.ts` uses `Writable` wherever it needs a writable view of a read-only type.** After this change, nothing writes the `Lift` after it is created. Whether `lift.ts` still names `Writable` depends on how the private displacement is typed. The import goes only if nothing uses it.
- **`KernelDrag` in `src/kernel/drag.ts` is a handwritten `-readonly` mapped type.** It was written under the old reading of `DRD-27`. It becomes `Writable<Drag<State>>`, provided that type checks at the kernel's generic sites with no new assertion. If it doesn't, the handwritten type stays, and the report says why. This is a type-only change.
- **The package declares `type-fest` again,** at the root's version, `5.10.0`. Before `89995c27e` it was in `dependencies`:
  - it goes in `dependencies` when an emitted declaration imports it. `kernel/drag.d.ts` will, if `KernelDrag` uses `Writable`;
  - otherwise it goes in `devDependencies`.

## The decided design

| Entry     | Values            | Types                             |
| --------- | ----------------- | --------------------------------- |
| `lift.js` | `Lifter`, a class | `Lifter`, `Lift`, `LandingTiming` |

```ts
export type Lift = Readonly<{
  visual: HTMLElement;
  box: HTMLElement;
  rect: DOMRectReadOnly;
  boxWidth: number;
  boxHeight: number;
  visualSpace: Space;
  itemSpace: Space;
  /** Moves the lifted visual to a viewport delta from the grab. */
  translate(x: number, y: number): void;
  /**
   * From `settle`: after the release, the visual flies from where it is to the
   * viewport position `x`, `y` of its top-left. `timing` is called now. The last
   * call wins. Without a call, nothing lands.
   */
  land(x: number, y: number, timing?: LandingTiming): void;
}>;

export class Lifter {
  constructor(window: Window);
  acquire(drag: Drag<unknown>, visual?: HTMLElement, box?: HTMLElement): Lift;
  readonly cancelLanding: () => void;
}
```

**Usage.** `sortable`'s `settle`:

```ts
if (this.#landing && recovery !== RECOVERY_IMMEDIATE) {
  const { x, y } = landingPoint(drag, recovery); // the placeholder's top-left
  drag.state.lift!.land(x, y, this.#landing);
}
```

`free-drag`'s `settle`:

```ts
const lift = drag.state.lift!;
const { x, y } = this.#home(lift);

lift.land(x, y, timing);
```

A custom behavior:

```ts
lift.land(lift.rect.left, lift.rect.top); // the default timing
lift.land(x, y, landing({ duration: 50 }));
```

**Inside `acquire`:** the handle closes over a private displacement that `translate` writes. `land` calls `timing` with that displacement and records the target with its duration and easing. The landing disposer computes the local flight delta from the displacement at release, as `startLandingAnimation` does now.

## Per-sample and per-operation allocation

| Where | Now | Decided design |
| --- | --- | --- |
| Every sample, in `lift.ts` | The CSS string. The displacement's number fields are updated in place | The same, if the displacement is held in an object's fields |
| Every operation, at `acquire` | The `Lift` with eleven members | The `Lift` with nine, and a private displacement record if one is used: about one object header more, by reading |
| Every landing | The behavior's `Landing` and the timing's result | The timing's result and the recorded target: the same count |

- **Where the displacement goes decides the per-sample cost.** V8 updates an object's number field in place once the field holds a non-integer. A captured `let` lives in a context slot, and V8 can store a new heap number there on every non-integer write. So a captured `let` can add a cost on every sample, and a private record adds one object per operation.
- **No cost is accepted.** The implementer measures and reports both figures. A cost on every sample is a return condition. A cost on every operation goes to the owner with `DRO-7`'s figures.
- **Rejected for its cost:** a new immutable value on every update. That is one object on every sample, roughly 40 to 80 B, which escape analysis can't remove because the value escapes into `drag.state`. It also needs a mutable reference for the disposers, and every caller would have to write the value back.

**`DRF-2`:** the hot-path test can't see a cost in `translate` today, so its repair comes before the change.

## Changes a consumer sees

- `Lift` loses `translatedX` and `translatedY`.
- `land(landing)` becomes `land(x, y, timing?)`.
- `createLifter(window)` becomes `new Lifter(window)`.
- `Landing` is no longer exported. `lift.js` exports `LandingTiming` as a type.

No change to event order, hooks, outcomes, landings or timing is intended. Acquisition, release, failed acquisition and the kernel are unchanged.

## Withdrawn from the first version

- **Moving `visual`, `box`, `boxWidth`, `boxHeight` and `itemSpace` to the callers,** with the rule "read before `acquire`" (question 1).
- **Computing the flight's geometry in `land`** (question 3).
- **The changed failed-acquisition path** (question 4), which followed from moving `itemSpace`.
- **"`Writable` brings back what `DRD-27` removed"** (question 5).