#### DRD-29 — The lift's displacement is private, and `land` composes the landing

**Status:** active, decided on 2026-11-08 on the owner's clarifications. Implemented at `b33890461` ([`lift-representation-report.md`](../lift-representation-report.md) item 3). Read by the architect at `d258573fa`: it conforms except `DRF-3`, whose required property was added to its `land` bullets on 2026-11-08. Amends `DRD-27`'s public types and lift properties and `DRD-28`'s `lift.js` row. `DRD-33` amends it: `land(x, y, landing)` requires a `Landing`, which replaces `LandingTiming`, the default timing leaves the lift, and the `DRF-3` bullet keeps the caller's `Landing` value

**`Lift` keeps its acquisition snapshot, read-only and set once: `visual`, `box`, `rect`, `boxWidth`, `boxHeight`, `visualSpace` and `itemSpace`. It loses `translatedX` and `translatedY`. `land(x, y, timing?)` calls the timing with the private displacement and records the landing. `lift.js`'s value is the owner's class `Lifter`. Nothing else in acquisition, release, failed acquisition or the kernel changes.**

Decided on 2026-11-08 on the owner's clarifications. The reading, the questions and the rejected directions are in [`lift-representation-proposal.md`](../lift-representation-proposal.md). Its first version is at `793bb6713`.

**The owner's clarifications:**

- `type-fest`'s utilities are preferred over equivalent handwritten types.
- The displacement becomes private, and `land` composes the landing.
- The goal is stable data that is immutable from outside, not a new object on every update. Private mutation and DOM writes are fine.
- The `Lifter` class stays.
- No incidental behavior change or performance cost is authorized.

**Public surface of `lift.js`.** This amends `DRD-27`'s public types and `DRD-28`'s export table:

| Values | Types |
| --- | --- |
| `Lifter`, a class with `constructor(window)`, `acquire(drag, visual?, box?): Lift` and a read-only `cancelLanding` | `Lifter`, `Lift`, and `LandingTiming` as a type re-export |

`Landing` is no longer exported. `createLifter` goes.

**Required properties:**

- **Only `translate` writes the displacement, and no public member exposes it.** It isn't an own property of the `Lift`. Every public member of the `Lift` is set in `acquire` and never written again.
- **`land(x, y, timing?)`:**
  - `x` and `y` are the viewport position of the visual's top-left;
  - `timing` is called once, when `land` is called, with the displacement and then `x - rect.x` and `y - rect.y`. Those are the arguments the built-ins pass now;
  - without `timing`, the default duration and easing apply;
  - when `timing` throws, nothing is recorded;
  - the last call wins, and without a call nothing lands;
  - **the record copies the timing's `duration` and `easing` at the call, and keeps no object that the caller or the timing returned.** So code that runs between `land` and the release can't change a recorded landing. Added on 2026-11-08 for `DRF-3`. At `89995c27e` the built-ins copied these values with a spread in `settle`.
- **The landing disposer reads the displacement at release,** as now. So a `translate` after `land` moves where the flight starts, as at `b5f5f4046`. Reduced motion and the restored position are read there too, as now.
- **`acquire`, the release, the failed-acquisition path and the composition rules are `DRD-27`'s, unchanged.** That includes "`acquire` as the first statement of `activate`", measuring `itemSpace` inside `acquire`, and the cancel of the running landing in its `finally`.
- **Types:**
  - `lift.ts` uses `type-fest`'s `Writable` wherever it needs a writable view of a read-only type, and writes no handwritten equivalent.
  - `KernelDrag` in `src/kernel/drag.ts` becomes `Writable<Drag<State>>` if that type checks at the kernel's generic sites with no new assertion. If it doesn't, the handwritten type stays and the report says why.
  - The package declares `type-fest` at `5.10.0`: in `dependencies` when an emitted declaration imports it, and otherwise in `devDependencies`.
- **No new cost on every sample.** `translate` allocates only its CSS string, also at a non-integer displacement. `DRF-2`'s repaired test has to show this.
- **A cost on every operation is reported, not accepted.** A private displacement record adds about one object header, by reading. It goes to the owner with `DRO-7`'s figures.
- **The kernel doesn't change,** apart from the `KernelDrag` type. The lift grep stays empty.

**Changes a consumer sees:**

- `Lift` loses `translatedX` and `translatedY`.
- `land(landing)` becomes `land(x, y, timing?)`.
- `createLifter(window)` becomes `new Lifter(window)`.
- `Landing` is no longer exported.

No change to event order, hooks, outcomes, the built-ins' landings or timing is intended.

**Rejected:**

- **A new immutable value on every update.** It allocates an object on every sample. The disposers would still need a mutable reference, and every caller would have to write the value back.
- **The operations on the `Lifter`.** A retained `Drag`'s step would act on a later operation, which `DRD-27` already rejected.
- **Moving the snapshot's caller-only members to the callers.** It changes the failed-acquisition path and gains only fewer members.
- **Computing the flight's geometry in `land`.** It changes a `translate` after `land`.
- **Keeping `Landing`, an object argument, or two argument forms.**

**Before implementation:** `DRF-2`'s repair, so that the per-sample property can be shown.