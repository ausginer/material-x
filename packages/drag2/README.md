# `@ydinjs/drag2`

Implementation of the frozen `drag2` construction model: a private kernel executor, a private behavior runtime, and construction-time feature composition.

- **Contract (source of truth):** [`.agents/docs/drag/contract/`](../../.agents/docs/drag/contract/), documents 00–06, read with the precedence stated in `00-index.md`.
- **Implementation plan:** [`.agents/docs/drag/plan.md`](../../.agents/docs/drag/plan.md).

The shipped `@ydinjs/drag` is untouched while this package is built. Merging the two is the last phase of the plan and a separate decision, so this package is `private` until then.

## Status

**Phases 0–11 complete: one production-shaped, pointer-driven vertical sortable.** That is a validated slice, not a successor to `@ydinjs/drag`. The shipped package additionally covers free dragging, keyboard reordering, and two-dimensional insertion — none of which exist here, and every measurement below was taken against a single behavior. (Two-dimensional insertion is not a *feature* of the shipped package: it has no axis concept at all, so 2-D is its default and `vertical()` here is a narrowing of it. See [`ledger.md`](../../.agents/docs/drag/ledger.md) §5.) The roadmap from slice to package is [`plan.md`](../../.agents/docs/drag/plan.md) Part II.

**Phases 3–5 are the frozen SPI** and **phase 9 froze the public surface**: any change to a seam signature, or any addition to the export table below, requires the failing-executable-case justification from contract 00. Three known pressure points against that freeze — discrete (keyboard) input, the authored-presentation protocol, and whether a second behavior fits the seam set — are probed and resolved together in Part II rather than one at a time.

- **0–2 — scaffolding, kernel primitives, frame slicing.** Every entrypoint in `files.json`, `realm`/`lifetimes`/`queue`/`reporter`/`failures`/`presentation`/`pointer`/`invalidation`, and the composed frame with its `DEV` assertions.
- **3–5 — the seam driver, the lifecycle, settlement.** `Transition`/`SeamOutcome`/`runCore` with both failure latches; `draggable()`, the two-phase handshake, admission, activation, the hot path, release, the cancel latch and its precedence, the failure checkpoint and the seven-step `destroy()`; the resolution attempt, the five-case `SettlementInput`, request → seal → arm, the landing completion latch and the join.
- **6 — the sortable behavior.** Every seam, `reconcileCollection`, the single canonical `movePlaceholder()`, and `updateItems()`.
- **7–8 — composition and the features.** `assemble()`, the opaque feature brand, `vertical()`, `callbacks()`, `placeholder()`, `handle()`/`visual()`, `landing()`, `layoutAnimation()`.
- **9 — the public surface.** The export table below, frozen and asserted as an equality in `tests/exports.node.test.ts` and against the packed tarball in `tests/consumer.node.test.ts`.

## Demos

`src/sortable.stories.tsx` re-implements the shipped package's sortable stories against this API, under the `Drag2/Sortable` title: **List**, **Custom Placeholder** and **Zoomed Context**. Each composes `vertical()`, `landing()`, `layoutAnimation()` and `callbacks()` explicitly, so what the shipped package inferred from an options object is visible as installed features. The React integration in there is the reference one: `onReorder` returns `ReorderResolution.accept(presentationReady)`, and a `useLayoutEffect` resolves that promise once React has committed the authored order.

Two of the shipped package's stories have **no drag2 equivalent yet**, because only the vertical sortable slice is implemented:

- the whole `Drag/Draggable` file — free drag with `axis`, `bounds` and `onDrop`. `draggable()` here is behavior-agnostic and requires a behavior; no free-drag behavior exists.
- `Drag/Sortable` → **Grid**. `vertical()` is the only axis rule, and a consumer cannot author one: `SortableFeature` is opaque and `brandFeature` is unexported (contract 03 §Closed for real). Two-dimensional insertion has to be first-party; what shape it takes is a plan decision, not a consumer one. The shipped story needs no options at all — it is the `List` story with different CSS.

The List story's hint also drops the shipped package's arrow-key reordering, which this package does not implement; `Escape` still cancels a live drag.

## Migrating from `@ydinjs/drag`

The two packages are not source-compatible; this is a rewrite against a frozen contract, and this table covers only the vertical sortable — free drag, keyboard reordering and two-dimensional insertion have no counterpart here yet. The full boundary, per capability, is [`ledger.md`](../../.agents/docs/drag/ledger.md). The differences a consumer actually meets:

| `@ydinjs/drag` | `@ydinjs/drag2` |
| --- | --- |
| `draggable.js` | `drag.js` — behavior-agnostic, so a future free-drag consumer never imports the sortable behavior |
| one `sortable.js` barrel | `sortable.js` plus one subpath per optional feature; nothing is imported that is not composed |
| options object | `sortable(items, ...features)`, composed once at construction and immutable for the controller's life |
| callbacks passed inline | `callbacks({ onReorder, … })`, the sole owner of the `threshold` and `readinessTimeout` defaults |
| acceptance inferred from silence, DOM mutation or elapsed time | acceptance is **explicit**: `onReorder` returns `ReorderResolution.accept()` or `.reject(reason)`, or the drop does not complete as accepted |
| errors surfaced ad hoc | one `onError(error, { stage, domain })`, with `stage` a public `FailureStage` constant |
| third-party feature authoring by structural typing | features are **opaque branded values**: nameable and passable, not constructible (contract 03 §Closed for real) |

Behavioural differences are listed under _deliberate differences_ below.

Deliberate behavioural differences from the shipped `@ydinjs/drag`:

- `Lifetime.use()` after dispose runs the disposer immediately and reports.
- `acquirePointerCapture` lets a capture failure throw so the caller can classify it as `FAILURE_ACTIVATION` (D-17) instead of silently degrading the drag.
- `BehaviorSpec` carries a `reportFailure(stage, error)` member the frozen listing does not, because Q-1's answer for a throwing `admit` — report through `onError` with no operation — is otherwise unreachable from the kernel. See plan.md, phase 4.
- `LandingContext.from` and `.target` are **origin-relative deltas**, not viewport points, and the readiness-time `retarget(target)` receives a delta too. `anchorTarget` produces a viewport point and the kernel converts. Contract 02 shows the raw point being handed to the runner, but the runner's only writer is `compose(x, y)`, which consumes a delta from the grab rect — a point it cannot convert, because the context carries no `originRect`. The shipped package's landing plans were already in delta space.
- `acquireLift` throws when the visual's box space cannot be read — a disconnected, fragmented, or 3D-transformed visual. The shipped package flattened 3D to its 2D projection, producing a wrong lift rather than a refused one.

## Geometry

There is no coordinate module here. All geometry goes through `@ydinjs/box-quad`, which owns the single flat-tree traversal and the single coordinate model for transforms, ancestor zoom, shadow DOM and the supported 3D cases.

`acquireLift` measures the visual **once** with `coordinates()` and takes everything from that one `Box`: the composed element→viewport matrix (the faithful mode's base transform), the untransformed border-box size (both lifted modes' fixed box), the inherited zoom the top layer does not escape, and the inherited linear basis the in-place mode inverts. The shipped package made two independent traversals for the first two and derived the third from `item.offsetParent`, which stops at a shadow boundary and is `null` for a fixed-position visual.

The in-place mode inverts the **inherited** basis rather than the visual's own space, because its translate is prepended to the visual's authored transform and so is scaled only by what the visual inherits. No flat-tree, shadow-root or `display: contents` knowledge lives in this package — box-quad produces that basis during the traversal it already performs.

One consequence worth noting against contract F-24: `compose` is now allocation-free in **every** lift mode, including in-place. The shipped in-place path allocated a `{ x, y }` projection per pointer sample.

## Export topology

The eight subpaths in `files.json` are frozen from phase 0 rather than grown as features arrive. That is a measurement precondition: it makes the minimal fixture's import graph physically unable to reach an optional feature, independent of bundler heuristics (contract 03 §The export topology this requires).

| Subpath | Runtime | Types |
| --- | --- | --- |
| `drag.js` | `draggable`, the 14 `FAILURE_*` constants | `Behavior` (opaque), `Point`, `DOMRealm`, `FailureStage` |
| `sortable.js` | `sortable`, `ReorderResolution`, `AT_PROPOSAL`, `AT_CONSUMER` | `SortableFeature` (opaque), `SortableController`, `CancelStage`, `DragErrorContext`, `ReorderRequest`, `ReorderProposal`, `CollectionSnapshot`, `PlaceholderFactory`, `ReorderResolution` and its two members, the four result types and their two unions |
| `sortable/vertical.js` | `vertical` | — |
| `sortable/callbacks.js` | `callbacks` | `SortableCallbacks`, `OnReorder` |
| `sortable/placeholder.js` | `placeholder` | `PlaceholderOptions`, `PlaceholderContext` |
| `sortable/handle.js` | `handle`, `visual` | — |
| `sortable/landing.js` | `landing` | `LandingOptions`, `LandingStart`, `LandingContext`, `LandingHandle` |
| `sortable/layout-animation.js` | `layoutAnimation` | `LayoutAnimationOptions` |

Every type a public type structurally depends on is exported, rather than left reachable-but-unnameable: that is why `FailureStage`, `DOMRealm`, `Point`, `CollectionSnapshot` and `PlaceholderFactory` are on the list. TypeDoc over these eight entries emits **zero** unresolved-reference warnings, and none are suppressed — a warning there means a public type depends on something a consumer cannot name.

Everything the kernel and a behavior say to each other — `BehaviorSpec`, `KernelHost`, every seam, scope, contribution and slot type, and the phase/lift/outcome/recovery constants — is internal, unstable, and reaches no entry module. The consumer fixture asserts each one is unreachable, and a `@ts-expect-error` that stops erroring fails the build, so the list cannot rot into a no-op.

### Option domains

| Option                            | Unit   | Domain         | Default |
| --------------------------------- | ------ | -------------- | ------- |
| `callbacks({ threshold })`        | CSS px | finite, `>= 0` | `8`     |
| `callbacks({ readinessTimeout })` | ms     | finite, `>= 1` | `500`   |
| `landing({ duration })`           | ms     | finite, `>= 0` | `200`   |
| `layoutAnimation({ duration })`   | ms     | finite, `>= 0` | `160`   |

All four are validated at construction and throw a `TypeError` on a value outside the domain, so a `NaN` threshold fails at the call that introduced it rather than as a drag that never activates. `easing` is not validated: it is a CSS easing function and the platform is the only correct parser for one. `readinessTimeout` is a **failure bound, not a schedule** — exceeding it is `FAILURE_PRESENTATION_READY` and replaces the settlement.

## Size budgets

Measured 2026-08-02 (M-3 — `.agents/docs/drag/measurements/m3.md`). `just size` runs `bench/size/measure.ts`, where each composition is one declaration: the exact named imports a consumer writes, a budget, and the modules its graph must and must not contain. It exits non-zero on any of the three.

| composition                                         | brotli       | modules |
| --------------------------------------------------- | ------------ | ------- |
| minimal                                             | **9.34 kB**  | 29      |
| minimal + `layoutAnimation()`                       | 9.74 kB      | 30      |
| minimal + `landing()`                               | 9.60 kB      | 30      |
| complete                                            | **10.11 kB** | 33      |
| _baseline A_ — feature-matched, non-composed        | 9.83 kB      | 28      |
| _baseline B_ — shipped `@ydinjs/drag` `sortable.js` | 6.89 kB      | 26      |

The import maps _are_ the measurement, and the graph half is why this is not a `size-limit` config: a byte delta cannot tell "absent" from "present and mostly shaken" (`.agents/docs/measure/brief.md`). The two baselines are checked-in modules under `bench/size/`, because neither is expressible as a set of imports.

**The two baselines answer different questions and are never substituted for each other.** A costs 0.26 kB less than `complete` with the same features: that is what composition costs. B is 2.44 kB smaller than `minimal` and is not feature-equivalent to anything here: that is what migrating costs.

`tests/bench/size.node.test.ts` runs the same declarations in CI, plus a determinism check and a fidelity check that the hand-written non-composed baseline still fills exactly the slots `assemble()` fills.