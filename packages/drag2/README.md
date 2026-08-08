# `@ydinjs/drag2`

Implementation of the frozen `drag2` construction model: a private kernel executor, a private behavior runtime, and construction-time feature composition.

- **Contract (source of truth):** [`.plan/contract/`](.plan/contract/), documents 00–06, read with the precedence stated in `00-index.md`.
- **Implementation plan:** [`.plan/plan.md`](.plan/plan.md).

The shipped `@ydinjs/drag` is untouched while this package is built. Merging the two is the last phase of the plan and a separate decision, so this package is `private` until then.

## Status

**Phases 0–17 complete: the sortable behavior, whole.** Pointer **and** keyboard input, one-dimensional **and** two-dimensional insertion, the full optional feature set, and the authored-presentation protocol the Phase 14 contract revision replaced. What is still missing against `@ydinjs/drag` is **free dragging**, which is a second behavior rather than a sortable capability — and with one behavior written, every measurement below is still a single-behavior number. The roadmap from slice to package is [`plan.md`](.plan/plan.md) Part II.

**Phases 3–5 are the frozen SPI** and **phase 9 froze the public surface**: any change to a seam signature, or any addition to the export table below, requires the failing-executable-case justification from contract 00. The three known pressure points against that freeze — discrete (keyboard) input, the authored-presentation protocol, and whether a second behavior fits the seam set — were probed in Phase 13 and resolved in **one** contract revision (Phase 14, D-32…D-35), which is re-frozen. Two of the four are implemented; D-34 and D-35 land with the second behavior.

- **0–2 — scaffolding, kernel primitives, frame slicing.** Every entrypoint in `files.json`, `realm`/`lifetimes`/`queue`/`reporter`/`failures`/`presentation`/`pointer`/`invalidation`, and the composed frame with its `DEV` assertions.
- **3–5 — the seam driver, the lifecycle, settlement.** `Transition`/`SeamOutcome`/`runCore` with both failure latches; `draggable()`, the two-phase handshake, admission, activation, the hot path, release, the cancel latch and its precedence, the failure checkpoint and the seven-step `destroy()`; the resolution attempt, the five-case `SettlementInput`, request → seal → arm, the landing completion latch and the join.
- **6 — the sortable behavior.** Every seam, `reconcileCollection`, the single canonical `movePlaceholder()`, and `updateItems()`.
- **7–8 — composition and the features.** `assemble()`, the opaque feature brand, `y()`, `callbacks()`, `placeholder()`, `handle()`/`visual()`, `landing()`, `layoutAnimation()`.
- **9 — the public surface.** The export table below, frozen and asserted as an equality in `tests/exports.node.test.ts` and against the packed tarball in `tests/consumer.node.test.ts`.
- **15–17 — the sortable, completed.** D-33's declare-and-acknowledge presentation protocol (`accept({ presentation: true })` + `controller.ready(request)`); D-32's keyboard command as a complete one-slot operation sharing the pointer path's proposal protocol; and `xy()`, the two-dimensional axis rule, beside the renamed `y()`.

## Demos

`src/sortable.stories.tsx` re-implements the shipped package's sortable stories against this API, under the `Drag2/Sortable` title: **List**, **Custom Placeholder** and **Zoomed Context**. Each composes `y()`, `landing()`, `layoutAnimation()` and `callbacks()` explicitly, so what the shipped package inferred from an options object is visible as installed features. The React integration in there is the reference one: `onReorder` returns `ReorderResolution.accept({ presentation: true })` and stores the request it was handed, and a `useLayoutEffect` calls `controller.ready(request)` once React has committed the authored order. There is no commit tracker — the protocol keys on the request object, which the consumer already has before the render starts (D-33).

**Grid** is restored and drives `xy()` explicitly, which is the difference from the shipped story worth seeing: `@ydinjs/drag` has no axis concept at all, so its Grid story is its List story with different CSS. Here the axis rule is a named, installed feature and the two behaviours are visible side by side — the same sideways drag that `xy()` reorders, `y()` proposes nothing for.

One of the shipped package's stories still has **no drag2 equivalent**: the whole `Drag/Draggable` file — free drag with `axis`, `bounds` and `onDrop`. `draggable()` here is behavior-agnostic and requires a behavior; no free-drag behavior exists yet (plan Phases 18–20).

The List story's arrow-key hint is restored, and the rows carry `role`/`tabindex` — because `keydown` is bound on the container and must originate inside a row, so a row that cannot take focus cannot be reordered from the keyboard. Roles, focus order and announcements are the consumer's; see [`accessibility.md`](../../.agents/docs/accessibility.md) §Drag.

## Migrating from `@ydinjs/drag`

The two packages are not source-compatible; this is a rewrite against a frozen contract, and this table covers the sortable — free drag has no counterpart here yet. The full boundary, per capability, is [`ledger.md`](.plan/ledger.md). The differences a consumer actually meets:

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
- **The authored-presentation protocol is a declaration plus an acknowledgement**, not a promise: `ReorderResolution.accept({ presentation: true })` and `controller.ready(request)`, keyed on the request the callback was handed. The shipped `presentationReady` promise put four obligations on the consumer whose only failure signal was a 500 ms silence (contract D-33).
- **A resolver that destroys the controller stops the sequence at that call** (contract I-36). `handle()` and `visual()` are consumer code the behavior invokes in a sequence — `handle()` then `visual()` at admission, and `visual()` once per candidate during a geometry rebuild — and `destroy()` is synchronous, so a resolver calling it returns into the middle of that sequence. Nothing after it runs: from `handle()`, admission **declines** (no operation, no `preventDefault()`, no `onError` — destroying your own controller is not a library failure); from `visual()` at admission, admission **also** declines — the draft is not seeded and the default is not prevented either, so on the keyboard ingress the arrow key keeps its native meaning; from `visual()` during a rebuild, no later candidate is resolved, no geometry is read, and the cache stays in the retired state teardown left it in. **The same holds for a composition that installs no `visual()` at all**: the library also calls `getBoundingClientRect()` on your rows and on your placeholder, and an override of it on a custom element is your code too, so destroying from one of those stops the traversal at exactly the same point. The shipped package's candidate rebuild has no such check and carries on.
- **The axis rule is a named, installed feature**, and there are two: `y()` for a column and `xy()` for a wrapping field. The shipped package has no axis concept at all — its `nearestSlot` is a 2-D search — so `y()` is a _narrowing_ of shipped behavior and `xy()` restores the shipped default explicitly (ledger L-8).

## Geometry

There is no coordinate module here. All geometry goes through `@ydinjs/box-quad`, which owns the single flat-tree traversal and the single coordinate model for transforms, ancestor zoom, shadow DOM and the supported 3D cases.

`acquireLift` measures the visual **once** with `coordinates()` and takes everything from that one `Box`: the composed element→viewport matrix (the faithful mode's base transform), the untransformed border-box size (both lifted modes' fixed box), the inherited zoom the top layer does not escape, and the inherited linear basis the in-place mode inverts. The shipped package made two independent traversals for the first two and derived the third from `item.offsetParent`, which stops at a shadow boundary and is `null` for a fixed-position visual.

The in-place mode inverts the **inherited** basis rather than the visual's own space, because its translate is prepended to the visual's authored transform and so is scaled only by what the visual inherits. No flat-tree, shadow-root or `display: contents` knowledge lives in this package — box-quad produces that basis during the traversal it already performs.

One consequence worth noting against contract F-24: `compose` is now allocation-free in **every** lift mode, including in-place. The shipped in-place path allocated a `{ x, y }` projection per pointer sample.

## Export topology

The subpaths in `files.json` are declared before the modules they name exist rather than grown as features arrive. That is a measurement precondition: it makes each composition's import graph physically unable to reach a feature it did not select, independent of bundler heuristics (contract 03 §The export topology this requires). Eight were frozen at phase 0; `sortable/xy.js` is the one addition, landed with the Phase 17 decision that owns it.

| Subpath | Runtime | Types |
| --- | --- | --- |
| `drag.js` | `draggable`, the 14 `FAILURE_*` constants | `Behavior` (opaque), `Point`, `DOMRealm`, `FailureStage` |
| `sortable.js` | `sortable`, `ReorderResolution`, `AT_PROPOSAL`, `AT_CONSUMER` | `SortableFeature` (opaque), `SortableController`, `CancelStage`, `DragErrorContext`, `ReorderRequest`, `ReorderProposal`, `CollectionSnapshot`, `PlaceholderFactory`, `ReorderResolution` and its two members, the four result types and their two unions |
| `sortable/y.js` | `y` | — |
| `sortable/xy.js` | `xy` | — |
| `sortable/callbacks.js` | `callbacks` | `SortableCallbacks`, `OnReorder`, `ResolutionOptions` |
| `sortable/placeholder.js` | `placeholder` | `PlaceholderOptions`, `PlaceholderContext` |
| `sortable/handle.js` | `handle`, `visual` | — |
| `sortable/landing.js` | `landing` | `LandingOptions`, `LandingStart`, `LandingContext`, `LandingHandle` |
| `sortable/layout-animation.js` | `layoutAnimation` | `LayoutAnimationOptions` |

Every type a public type structurally depends on is exported, rather than left reachable-but-unnameable: that is why `FailureStage`, `DOMRealm`, `Point`, `CollectionSnapshot` and `PlaceholderFactory` are on the list. TypeDoc over these nine entries emits **zero** unresolved-reference warnings, and none are suppressed — a warning there means a public type depends on something a consumer cannot name.

Everything the kernel and a behavior say to each other — `BehaviorSpec`, `KernelHost`, every seam, scope, contribution and slot type, and the phase/lift/outcome/recovery constants — is internal, unstable, and reaches no entry module. The consumer fixture asserts each one is unreachable, and a `@ts-expect-error` that stops erroring fails the build, so the list cannot rot into a no-op.

### Option domains

| Option                            | Unit   | Domain         | Default |
| --------------------------------- | ------ | -------------- | ------- |
| `callbacks({ threshold })`        | CSS px | finite, `>= 0` | `8`     |
| `callbacks({ readinessTimeout })` | ms     | finite, `>= 1` | `500`   |
| `landing({ duration })`           | ms     | finite, `>= 0`; or `() => number` returning one | `200`   |
| `layoutAnimation({ duration })`   | ms     | finite, `>= 0` | `160`   |

Each throws a `TypeError` on a value outside the domain, so a `NaN` threshold fails at the call that introduced it rather than as a drag that never activates. **One documented exception:** `landing({ run })` replaces the built-in runner outright, so `duration` and `easing` have nothing left to configure and are neither read nor checked — `landing({ duration: -1, run })` does not throw.

**Where the check runs follows when the value exists.** A fixed option is validated **at construction**, once, before any drag. `landing({ duration })` additionally accepts a **thunk**, whose result does not exist until the landing opens: it is invoked and validated **once per landing**, at settlement — the moment the shipped package read `landingTiming()` — so a distance-scaled or per-drop duration keeps the default runner instead of replacing it. A thunk is checked for being a function at construction; its *result* is checked at settlement, ahead of the reduced-motion collapse, so an invalid or thrown result is reported under `prefers-reduced-motion: reduce` exactly as it is without.

`easing` is not validated: it is a CSS easing function and the platform is the only correct parser for one. `readinessTimeout` is a **failure bound, not a schedule** — exceeding it is `FAILURE_PRESENTATION_READY` and replaces the settlement.

## Size budgets

Baselined 2026-08-02 (M-3 — `.plan/measurements/m3.md`), re-measured **2026-08-08** at Checkpoint D and again after each of its four reviews. `just size` runs `bench/size/measure.ts`, where each composition is one declaration: the exact named imports a consumer writes, a budget, and the modules its graph must and must not contain. It exits non-zero on any of the three.

| composition                                         | brotli       | modules |
| --------------------------------------------------- | ------------ | ------- |
| minimal (`y()`)                                     | **10.12 kB** | 31      |
| minimal (`xy()`)                                    | 10.17 kB     | 31      |
| minimal + `layoutAnimation()`                       | 10.56 kB     | 32      |
| minimal + `landing()`                               | 10.40 kB     | 32      |
| complete                                            | **10.93 kB** | 35      |
| _baseline A_ — feature-matched, non-composed        | 10.67 kB     | 30      |
| _baseline B_ — shipped `@ydinjs/drag` `sortable.js` | 6.89 kB      | 26      |

Five compositions, not four: Phase 17's second axis is a peer rather than an assumed equal, so `minimal (xy)` is measured. The growth over the M-3 baseline is accounted for — D-33's settlement protocol (+70 B), Phase 16's keyboard ingress (~300 B, deliberately not tree-shakeable), Phase 17's shared rect index (+60 B), Checkpoint D's fixes (+40 B) and its second review's terminal barrier (+30 B to +90 B, composition-dependent), its third review's abort return channel (±20 B, inside brotli's noise band) and its fourth review's completion of that barrier (+37 B minimal, +70 B with `layoutAnimation()`, +70 B complete). Every composition is still inside the budget it already had — no budget was re-based for the fourth review — with **0.11–0.16 kB of headroom against budgets originally set with ~0.3 kB**, tightest on `+ layoutAnimation` and `complete`. Phase 21 re-bases rather than absorbing again.

The import maps _are_ the measurement, and the graph half is why this is not a `size-limit` config: a byte delta cannot tell "absent" from "present and mostly shaken" (`.agents/docs/measure/brief.md`). The two baselines are checked-in modules under `bench/size/`, because neither is expressible as a set of imports.

**The two baselines answer different questions and are never substituted for each other.** A costs 0.27 kB less than `complete` with the same features — 266 B exactly, 2.5% — and that is what composition costs. B is 3.23 kB smaller than `minimal` — 3,227 B exactly — and is not feature-equivalent to anything here: that is what migrating costs. Both come from the same `just size` run as the table above; the exact bytes are quoted because every earlier revision of this paragraph published a rounded figure that was stale on arrival.

`tests/bench/size.node.test.ts` runs the same declarations in CI, plus a determinism check and a fidelity check that the hand-written non-composed baseline still fills exactly the slots `assemble()` fills.