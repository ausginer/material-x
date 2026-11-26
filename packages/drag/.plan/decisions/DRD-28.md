#### DRD-28 — Public entries at the source root, and the kernel's modules internal

**Status:** active, implemented at `039e8e153` ([`ownership-report.md`](../ownership-report.md) item 1). Its `type-fest` packaging line was corrected on 2026-11-08. `DRD-29` amends its `lift.js` row. `DRD-33` amends it again and adds `lift/landing.js` and `free-drag/drop-targets.js`

**`src/lift.ts` and `src/fault.ts` return to the source root. `src/kernel/` holds only modules that no consumer imports. Each public type is exported from one public entry, and the built-ins, fixtures, tests and instruments import kernel types only through those entries.**

The owner moved `lift` into `src/kernel/` at `bb644d6d7`, and said on 2026-11-07 that the move came from mistaking its role. `lift` is an optional public module that the kernel never imports as a value. `DragFault` is a public entry for the same reason.

**At `bb644d6d7`, by reading:**

- **The typecheck fails, with 48 errors in 24 files.** `src/draggable.ts` exports no type, so neither a consumer nor `sortable/domain.ts`, `free-drag/domain.ts` or `free-drag/geometry.ts` can name `Drag`, `Behavior` or `CancelOrigin`.
- **The test files that import `src/lift.ts` or `src/fault.ts` can't load.** `files.json`, `typedoc.json` and the size instrument still address both modules at the source root.
- **`sortable.ts` and `free-drag.ts` import from `./kernel/*`,** while DRI-18 lets them import only public values and types.
- **Four `!` assertions on the built-ins' state are removed:** three in `sortable.ts` and one in `free-drag.ts`. Each guards a field that an earlier hook of the same operation fills, so behavior doesn't change, but the typecheck fails.

**Decided:**

- **Source layout:**
  - `src/draggable.ts`, `src/lift.ts` and `src/fault.ts` are the kernel's public entries.
  - `src/kernel/` holds `admission`, `behavior`, `drag`, `gesture`, `outcome` and `session`.
- **Exports:**

  | Entry | Values | Types |
  | --- | --- | --- |
  | `draggable.js` | `draggable` | `Behavior`, `Admission`, `Drag`, `DragDisposer`, `DraggableController`, `Outcome`, `SkippedOutcome`, `VerdictOutcome`, `CanceledOutcome`, `CancelOrigin` |
  | `lift.js` | `createLifter` | `Lifter`, `Lift`, `Landing` |
  | `fault.js` | `DragFault` |  |

  The kernel's types are type-only re-exports, so importing `draggable` alone still brings no lift code. This is the table after `DRD-27`. Until `DRD-27` is implemented, `draggable.js` also exports the lifted types and `lift.js` exports `lift`, `Landing` and `LiftHold`.

- **Packaging.** The build is unbundled, so it writes `kernel/*.js` beside `shared/`. `package.json`'s `files` and `files.json`'s `clean.extras` list `kernel` as they list `shared`. **Corrected 2026-11-08:** this used to say "`type-fest` leaves the dependencies (`DRD-27`)". The package declares `type-fest` as `DRD-29` states.
- **The four assertions return as they were at `0dcb80fb1`.**
- **Tests change only where the layout requires it.** The size test's exact module list for `draggable` alone becomes the new graph. That list is the kernel's modules that have code, and still no lift, `box-quad`, sortable or landing module.