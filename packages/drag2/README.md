# `@ydinjs/drag2`

Implementation of the frozen `drag2` construction model: a private kernel executor, a private behavior runtime, and construction-time feature composition.

- **Contract (source of truth):** [`.agents/docs/drag/contract/`](../../.agents/docs/drag/contract/), documents 00–06, read with the precedence stated in `00-index.md`.
- **Implementation plan:** [`.agents/docs/drag/plan.md`](../../.agents/docs/drag/plan.md).

The shipped `@ydinjs/drag` is untouched while this package is built. Merging the two is phase 12 and a separate decision, so this package is `private` until then.

## Status

Phases 0–2 complete.

- **0 — scaffolding.** Every entrypoint declared in `files.json` exists as a stub.
- **1 — kernel primitives.** `realm`, `lifetimes` (+`LifetimeScope`), `queue`, `reporter`, `failures`, `presentation` (+ the kernel's `lift.write` pin), `pointer`, `invalidation`. The WAAPI `animation` helper is deliberately absent: it belongs to `landing()`, in phase 8b.
- **2 — frame slicing.** `KernelFrame`, `Frame`/`Draft`/`FramePartOf`, `composeFrame`, `validateFramePart`, `beginFrame`/`scrubFrame`, and the `DEV`-gated shape, descriptor and reset-completeness assertions.
- **3 — the seam driver.** `Transition`/`ActionTransition`/`SeamRejection`, the five `SeamOutcome` constants, `runCore`, `runLeaf`/`runLeafValue`, both failure latches, and the activation and release continuation policies.

No lifecycle exists yet — the driver is exercised against a fake kernel. Phase 4 supplies the real one.

Deliberate behavioural differences from the shipped `@ydinjs/drag`:

- `Lifetime.use()` after dispose runs the disposer immediately and reports.
- `acquirePointerCapture` lets a capture failure throw so the caller can classify it as `FAILURE_ACTIVATION` (D-17) instead of silently degrading the drag.
- `acquireLift` throws when the visual's box space cannot be read — a disconnected, fragmented, or 3D-transformed visual. The shipped package flattened 3D to its 2D projection, producing a wrong lift rather than a refused one.

## Geometry

There is no coordinate module here. All geometry goes through `@ydinjs/box-quad`, which owns the single flat-tree traversal and the single coordinate model for transforms, ancestor zoom, shadow DOM and the supported 3D cases.

`acquireLift` measures the visual **once** with `coordinates()` and takes everything from that one `Box`: the composed element→viewport matrix (the faithful mode's base transform), the untransformed border-box size (both lifted modes' fixed box), the inherited zoom the top layer does not escape, and the inherited linear basis the in-place mode inverts. The shipped package made two independent traversals for the first two and derived the third from `item.offsetParent`, which stops at a shadow boundary and is `null` for a fixed-position visual.

The in-place mode inverts the **inherited** basis rather than the visual's own space, because its translate is prepended to the visual's authored transform and so is scaled only by what the visual inherits. No flat-tree, shadow-root or `display: contents` knowledge lives in this package — box-quad produces that basis during the traversal it already performs.

One consequence worth noting against contract F-24: `compose` is now allocation-free in **every** lift mode, including in-place. The shipped in-place path allocated a `{ x, y }` projection per pointer sample.

## Export topology

The eight subpaths in `files.json` are frozen from phase 0 rather than grown as features arrive. That is a measurement precondition: it makes the minimal fixture's import graph physically unable to reach an optional feature, independent of bundler heuristics (contract 03 §The export topology this requires).

## Size budgets

`.size-limit.json` names the four M-3 compositions — minimal, minimal + `layoutAnimation()`, minimal + `landing()`, complete — deliberately **without limits**. They are unions of built entry files, which approximates a composition but is not the real measurement: M-3 requires checked-in consumer fixtures with their exact import statements and module-graph assertions naming each module that must be absent. Budgets are added only after that first measurement (contract 05 §Measurements owed).