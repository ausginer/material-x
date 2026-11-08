# Lift representation: a proposal for discussion

**Status: proposed by the architect on 2026-11-08, for the owner. Nothing here is decided.** Accepted, it becomes `DRD-29`, which amends `DRD-27`'s `lift.js` surface and its required properties of the lift. No contract, source or test changes with this record. The record index is [`00-index.md`](00-index.md).

**Read at:** `b5f5f4046`, with the owner's uncommitted edits to `src/lift.ts`, `src/sortable.ts` and `src/free-drag.ts`, which turn `Lifter` into a class. Those edits are left as they are. Everything below is by reading. No suite, probe or measurement was run.

**The question:** `Lift` mixes measurements taken at acquisition, a mutable displacement, DOM operations and cleanup state, and its `Readonly` public type is built from a writable representation. Where does each value and each operation belong, and which values does existing state already hold?

## What each member of `Lift` is

| Member | What it is | Set | Read by | Does the lift use it? | Also held by |
| --- | --- | --- | --- | --- | --- |
| `visual` | The lifted element | `acquire` | The lift's `translate`, release and landing. `sortable`'s placeholder, `free-drag`'s home and request, the `commit` test | Yes, internally | The caller, who passed it or left it as `drag.item`. Both built-ins hold it as `state.visual` |
| `box` | The element whose size is reported | `acquire` | `sortable`'s placeholder | No | `sortable`'s `state.box` |
| `rect` | The visual's viewport rect at the grab | `acquire` | The lift's landing. Both built-ins: landing target, bounds, `moveTo`, geometry | Yes | Nothing |
| `boxWidth`, `boxHeight` | The box's offset size before the lift writes | `acquire` | `sortable`'s `activate`, once. The `drop-zone` fixture's `settle` | No | When `box` is the visual, the lift's own measured box also holds the size, at a different rounding |
| `visualSpace` | What the visual inherits | `acquire` | The lift's landing. `free-drag`'s geometry | Yes | Nothing |
| `itemSpace` | What the item inherits | `acquire` | `sortable`'s axis context | No | It is `visualSpace` when the item is the visual |
| `translatedX`, `translatedY` | The displacement `translate` last wrote | `translate` | The lift's landing, at release. Both built-ins' `settle`, only to pass to `LandingTiming` | Yes | `sortable` always translates by the drag's delta, so it can derive it. `free-drag` translates by `#motion`, a scratch value that its own rule says is written before every read |
| `translate(x, y)` | Writes the transform and records the displacement |  | Both built-ins, every sample |  |  |
| `land(landing)` | Records the landing for the release |  | Both built-ins' `settle` |  |  |

The rest is in `acquire`'s scope and never on the object: the base matrix, the `promoted` flag, the recorded landing and the two restore functions. Only the two disposers read them.

## What the reading shows

1. **Three kinds of value share one object:**
   - what the lift measured for itself: `visual`, `rect`, `visualSpace`;
   - what it measured for a caller, because a caller can't read the layout from before the lift once `acquire` has run: `box`, `boxWidth`, `boxHeight`, `itemSpace`;
   - what the lift's rendering changes: the displacement and the landing.
2. **The only mutable public values are `translatedX` and `translatedY`, and they are public only for the landing.** Each built-in reads them and `rect`, calls its `LandingTiming`, and builds a `Landing` in viewport coordinates. At release the lift turns that `Landing` back into a delta from `rect`. That is the repeated packing and unpacking that CONTRIBUTING §9 warns about, and both built-ins repeat the same five lines.
3. **The displacement is needed after the styles are restored only because the flight's geometry is computed in the landing disposer.** Every input of that geometry is fixed when `land` is called: `rect`, `visualSpace`, the displacement and the target. No built-in translates after `settle`, and a step receives `null` after the drop. Only two reads must follow the restore, and they don't need the displacement: `prefers-reduced-motion`, and whether the restored visual is `position: static`.
4. **`visual` duplicates the caller's value** (CONTRIBUTING §5, "cached aliases of objects already in operation state").
5. **The owner's edits, by reading:**
   - `Writable` from `type-fest` brings back what `DRD-27` removed ("`type-fest` and `Writable` leave the package"). The package doesn't declare `type-fest`. The import resolves from the root's dev dependencies and is erased from the output.
   - `class Lifter` replaces `createLifter` as `lift.js`'s value. `DRD-27`'s surface and `DRD-28`'s export table name `createLifter`, and 14 test, fixture and bench files still call it. So the working tree doesn't typecheck as it is. That is expected for work in progress, and wasn't run.
   - Moving the offset reads into the object literal keeps every read before the first write, so it is correct.
   - The class has two fields with the controller's lifetime. Either a class or `createLifter` fits the design below. If the class stays, the export table records it with this decision.

## Directions considered

### A. An immutable value, with `translate` returning a new one

This is the owner's direction taken literally: `drag.state.lift = translate(lift, x, y)`.

- **It allocates one object on every sample.** The object escapes into `drag.state`, so escape analysis can't remove it. With compressed pointers, an object costs about 12 B plus 4 B per field, and each new object needs its own heap number for each non-integer coordinate. That is roughly 40 to 80 B per sample, depending on the shape. This is an estimate by reading, not a measurement, and the cost is not accepted.
- **The disposers would still need one mutable reference.** The landing and the release are registered at `acquire`, before the first write, so that a failed acquisition is restored. At release they need the newest displacement. They would have to read the behavior's state, which ties `lift.ts` to the layout of that state, or read a mutable cell, which brings back the mutation it was meant to remove.
- **Every caller must write the new value back.** A stale alias, such as `const lift = drag.state.lift!` in `drop` or `settle`, would make the flight start from an old position. No type catches that.
- **The DOM is the mutable thing.** A value that describes it is stale as soon as the next one exists.

**Rejected for the displacement.** For the grab's measurements the direction is right, and they are already immutable.

### B. The grab as plain data, with the operations on the `Lifter`

`lifter.translate(x, y)` and `lifter.land(…)` act on the current operation, whose rendering state the lifter holds. This matches "data and separate functions" literally.

**Rejected:**

- A retained `Drag`'s step would move a later operation's visual. `DRD-27` rejected the same shape, "The `Lift` on the behavior instance", for that reason.
- The lifter would grow to about seven fields, which is the class the owner doesn't want, with a controller's lifetime added.

### C. `Lift` as a class with private fields

This changes the representation and leaves the mix. It is the owner's own objection.

### D. Recommended: each value moves to its owner

The handle keeps only the grab's immutable measurements and two operations. Its mutable rendering state is private.

## The recommended design

**Public surface of `lift.js`:**

```ts
export type Lift = Readonly<{
  /** The visual's viewport rect at the grab. */
  rect: DOMRectReadOnly;
  /** What the visual inherits. Pass it to `localDelta` from `@ydinjs/box-quad`. */
  visualSpace: Space;
  /** Moves the lifted visual to a viewport delta from the grab. */
  translate(x: number, y: number): void;
  /**
   * From `settle`: after the release, the visual flies from where it is to the
   * viewport point `x`, `y`. `timing` is called now, with the displacement and
   * the target's delta from the grab. The last call wins. Without a call,
   * nothing lands.
   */
  land(x: number, y: number, timing?: LandingTiming): void;
}>;

// Lifter, a class or createLifter's result:
//   acquire(drag: Drag<unknown>, visual?: HTMLElement): Lift  — `visual` defaults to `drag.item`
//   cancelLanding(): void
```

`Landing` leaves `lift.js`. `LandingTiming` is re-exported from `lift.js` as a type. Without `timing`, the flight takes the default duration and easing, as a `Landing` without them does now.

**Where each value goes:**

| Value | Goes to | Why |
| --- | --- | --- |
| `rect`, `visualSpace` | The `Lift`, immutable, set once | The lift measured them for itself, and callers read them |
| `visual` | The caller | It passed it, or it is `drag.item` |
| `box`, `boxWidth`, `boxHeight`, `itemSpace` | The caller, read before `acquire` | The lift doesn't use them |
| The displacement | Private to the lift, read by `land` | It is the record of what the lift rendered. Callers can't always derive it |
| The landing | Private: the flight, fixed by `land` | The landing disposer reads only fixed values |
| Base matrix, restore captures, `promoted` | Unchanged, private to `acquire` | Only the disposers read them |

**Required properties:**

- **`acquire` is the operation's first write and its first `drag.use`.** A behavior reads any layout it needs from before the lift ahead of `acquire`. This replaces `DRD-27`'s "first statement of `activate`". The reason for that rule was the order of the disposers, and reads before `acquire` don't change it.
- **`acquire` is otherwise unchanged:**
  - it reads all its geometry before its first write;
  - it registers the landing and then the release before that write;
  - it cancels the running landing after measuring, also when it throws.
- **The release is unchanged:**
  - it restores the top layer, then the inline declarations;
  - the landing starts after the release, and is attempted when the release threw;
  - each throw is reported once.
- **`land` calls `timing` once, when it is called.** It receives the same four arguments that the built-ins pass now, and it fixes the flight. A `translate` after `land` doesn't change the flight. The landing disposer still reads reduced motion and the restored position.
- **No public member is writable, and the representation needs no assertion.** No `Writable`, no `type-fest`.
- **`translate` allocates nothing but its CSS string, also when the displacement isn't an integer.** Keep the displacement where a write doesn't allocate:
  - V8 updates a number field of an object in place once that field already holds a non-integer;
  - a captured `let` lives in a context slot, and V8 can store a new heap number there on every write of a non-integer.

  Which of these holds for this code is for a measurement to show, not a reading.

- **The kernel doesn't change.** Its lift grep stays empty.

## Usage sketch

`sortable`:

```ts
activate(drag: Drag<State>): false | undefined {
  const { item, visual, box } = drag.state;
  // Before the lift: lifting changes the size of a box inside the visual, and
  // the space of an item inside it.
  const width = box.offsetWidth;
  const height = box.offsetHeight;
  const itemSpace = item === visual ? null : spaceOf(item); // throws without one
  const lift = (drag.state.lift = this.#lifter.acquire(drag, visual));
  // … second pull, insertion …
  const placeholder = createPlaceholder(
    window.document,
    { item, visual, box, rect: lift.rect },
    width,
    visual.contains(box) ? height : height - box.offsetHeight,
    this.#config.placeholder ?? null,
  );
  // …
  drag.state.context = { …, space: itemSpace ?? lift.visualSpace };
}

settle(drag: Drag<State>, outcome: Outcome<ReorderResolution>): void {
  const recovery = recordResult(drag.state, outcome);

  if (this.#landing && recovery !== RECOVERY_IMMEDIATE) {
    const { x, y } = landingPoint(drag, recovery); // the placeholder's top-left
    drag.state.lift!.land(x, y, this.#landing);
  }
}
```

`free-drag`'s `settle`:

```ts
const lift = drag.state.lift!;
const { x, y } = this.#home(drag.state.visual, lift.rect);

lift.land(x, y, timing);
```

A custom behavior:

```ts
activate(drag) {
  drag.state.height = drag.item.offsetHeight; // the pre-lift size it needs later
  drag.state.lift = lifter.acquire(drag);
},
settle(drag) {
  const lift = drag.state.lift!;

  lift.land(lift.rect.left, lift.rect.top);
},
```

Inside `acquire`, the handle closes over the visual, the base matrix, one per-operation displacement record and the fixed flight. `translate` writes the transform and the record. `land` computes the local flight delta through `localDelta`, calls `timing`, and stores the flight, or `null` for a zero delta. The landing disposer, registered first, starts the stored flight.

## Tradeoffs

**Gains:**

- The `Lift` has four members instead of eleven, and no public mutable value. Its type is its representation.
- The pre-lift reads follow one rule: before `acquire`.
- The landing's timing is composed once, in the lift, instead of in each behavior. The viewport-to-delta round trip goes.
- The landing disposer reads only fixed values.
- The lift module loses the `box` parameter and the `itemSpace` branch.

**Costs:**

- `sortable`'s `activate` gains three reads before `acquire`.
- A custom behavior that needs the pre-lift size later keeps it in its own state. The `drop-zone` fixture does this.
- `land`'s signature changes. A caller with a fixed timing passes a `LandingTiming` or nothing.
- These tests read removed members and change: `authoring`, `authoring.declaration`, `landing`, `release`, `commit` and the `drop-zone` fixture.
- **One fault path changes.** An item with no box space now throws in `sortable` before `acquire`, so a running landing continues instead of being cancelled. Nothing else is written on that path, either now or then. No test reaches it. This needs the owner's acceptance, because it is a DRI-13 edge.
- Size goes down by reading. It isn't measured.

**A variant for the owner:** keep the visual's pre-lift offset size on the `Lift` as `width` and `height`, two more members for custom behaviors like `drop-zone`. It isn't recommended, because no built-in reads it.

## Per-sample allocation

| Design | In `lift.ts`, on every sample |
| --- | --- |
| Now | The CSS string. The displacement fields are updated in place, by reading |
| D, the displacement in an object's fields | The same |
| D, the displacement in captured `let`s | May add a heap number for each non-integer coordinate |
| A | One object on every sample, and its heap numbers |

**The hot-path test can't tell these apart.** Its lift assertion checks which lift functions allocate (`lift.ts:translate`), and not how much they allocate. That is `DRF-2` in [`00-index.md`](00-index.md) §Findings.

## Questions for the owner

1. **Is the split accepted?** That removes `visual`, `box`, `boxWidth`, `boxHeight`, `itemSpace`, `translatedX` and `translatedY` from `Lift`, with the rule "read before `acquire`".
2. **`land(x, y, timing?)`, or keep `Landing`?** Keeping `Landing` keeps the displacement public, as a read-only getter at best.
3. **A class `Lifter` or `createLifter`?** Either fits. The `type-fest` import goes either way.
4. **Is the changed fault path for an item with no space accepted?**

**After the answers:** the architect writes `DRD-29` and an implementation handoff that starts from the owner's edits. That handoff includes `DRF-2`'s repair before `translate` changes.