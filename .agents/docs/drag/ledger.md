# Parity ledger — `@ydinjs/drag` → `@ydinjs/drag2`

Phase 12 deliverable. One row per public capability of the shipped package's two entries, classified **retain / redesign / drop**, with a destination.

This is the definition of "parity" every later phase cites. Where a phase asks "does the successor have to do this?", the answer is a row here, not a judgement made in flight.

**Precedent.** [`archive/phase-1/08-compatibility-ledger.md`](archive/phase-1/08-compatibility-ledger.md) is the same instrument, written for the shipped package's own redesign. It is the form this follows.

## How to read a row

| Class | Meaning |
| --- | --- |
| **retain** | The capability exists in the successor with the same consumer-visible shape. |
| **redesign** | The capability exists; the shape a consumer writes changes. The row says what changes. |
| **drop** | The capability is not offered. The row says **what a consumer loses**. |

A third column, **shape**, may read _deferred to Phase N_. That is a complete row: the capability is decided here, its public decomposition is not, because deciding it needs evidence a later phase produces. What is never permitted is a capability with no class.

**Verified against** `packages/drag/src/{draggable,sortable}.ts`, their `options.ts`, `kernel/{types,protocol}.ts`, both runtime controllers, and the `tests/` corpus, at commit `5c1a14a1`.

---

## 1. Constructor and controller shape

| Shipped | Class | Shape | Destination |
| --- | --- | --- | --- |
| `sortable(container, options)` | redesign | `draggable(container, sortable(items, ...features))`. The container survives as the `draggable()` root — it is the realm source and the delegation target for both listeners. | shipped, phases 7–8 |
| `draggable(item, options)` | redesign | `draggable(item, freeDrag(...features))`. `draggable()` is behavior-agnostic here, so the name no longer implies free drag. | Phase 18 |
| `sortable` throws `TypeError('sortable: \`onReorder\` is required.')` | retain | `callbacks()` owns the requirement and the throw. | shipped, phase 8a |
| `draggable` throws `TypeError('draggable: \`onDrop\` is required.')` | retain | Free drag's callbacks feature owns it. | Phase 18 |
| `SortableController.updateItems(items)` | retain | Shallow-copies, bumps version, notifies; no-op after `destroy()`. | shipped, phase 6 |
| `SortableController.cancel(reason?)` | retain | Wraps as a consumer cancellation; no-op when idle. | shipped |
| `SortableController.destroy()` | retain | Idempotent, synchronous, no terminal callback afterwards. | shipped, phase 4 |
| `FreeDragController.update(DragUpdate)` | **open — retain, shape deferred** | The only live-policy mutator in the shipped package. drag2 composes once and is immutable for the controller's life (`sortable.ts` §assembled once), so this cannot be a feature contribution: a behavior must expose it as a controller method. | Phase 18 decides the method set; §L-5 |
| `FreeDragController.cancel` / `.destroy()` | retain | As sortable's. | Phase 18 |

---

## 2. Sortable — the option surface

Eleven members of `SortableOptions`.

| Option | Class | Shape | Destination |
| --- | --- | --- | --- |
| `items(): readonly HTMLElement[]` | redesign | A plain array argument: `sortable(items, …)`. **The thunk is called exactly once, at construction** (`sortable/runtime/controller.ts:109`, the only call site in the package) — every later change already goes through `updateItems`. The redesign removes a parameter that was never re-read. | shipped, phase 6; §L-1 |
| `getVisual(item)` | retain | `visual()` from `sortable/handle.js`. | shipped, phase 8b |
| `getHandle(item)` | retain | `handle()` from `sortable/handle.js`. | shipped, phase 8b |
| `createPlaceholder(context)` | retain | `placeholder({ create })`; `PlaceholderContext` keeps `item`, `visual`, `rect`. | shipped, phase 8b |
| `threshold` (default 8) | retain | `callbacks({ threshold })`, same default, now validated at construction. | shipped, phase 8a |
| `landingTiming(): AnimationTiming` — **read at settle time** | redesign | `landing({ duration, easing })` fixes timing at construction, but `landing({ run })` reaches the same moment. Per-drop dynamic timing is expressible today; only the ergonomics are short of parity. Corrected by probe 13b. | Phase 15 or 22; §L-6 |
| `onReorder` (required) | retain | `callbacks({ onReorder })`, same `ReorderResolution` protocol. | shipped, phase 8a |
| `onStart(item)` | retain | `callbacks({ onStart })`. | shipped, phase 8a |
| `onFinish(result)` | retain | `callbacks({ onFinish })`. | shipped, phase 8a |
| `onCancel(result)` | retain | `callbacks({ onCancel })`. | shipped, phase 8a |
| `onError(error, context)` | retain | `callbacks({ onError })`; `context.cause.stage` becomes a flat public `FailureStage`. | shipped, phase 8a |

### 2.1 Sortable — exported values and types

| Export | Class | Note |
| --- | --- | --- |
| `ReorderResolution` (const + type) | **retain, argument redesigned** | Same two members and the same _never inferred_ contract. The optional argument changes: `presentationReady?: PromiseLike<void>` becomes `options?: { presentation?: boolean }`, and the acknowledgement moves to `controller.ready(request)`. The **one breaking public change** the Phase 14 revision makes — contract D-33, probe 13b, revised at Checkpoint C. Phase 15 |
| `SortableResult.isAccepted/isRejected/isCanceled/isNoOp` | **drop** | **What a consumer loses:** four named type guards. What replaces them: the `type` discriminant is a _public_ exported constant, so `result.type === OUTCOME_*` narrows directly (F-41). The guards existed because the discriminants were not exported; exporting them makes the helpers redundant weight in every bundle that imports the entry. |
| `PlaceholderContext` | retain | Plus `PlaceholderFactory`, which the shipped package left unnameable. |
| `SortableOptions` | redesign | Dissolves into per-feature option types. |
| `SortableFinishResult`, `SortableCancelResult` | retain | Same unions. |
| `SortableController` | retain | Same three members. |
| `AnimationTiming`, `DragSubject`, `ReorderRequest` re-exports | retain | `ReorderRequest` retained field-for-field. `AnimationTiming` follows the `landing()` row. |
| `DragErrorContext`, `ReorderTransactionResult`, `CollectionSnapshot`, `OnReorder`, `ResolutionContext`, `CancellationReason`, the `OUTCOME_*`/`REORDER_*` constants | **redesign — exported** | These are all structurally reachable from `SortableOptions` and **none is exported** by the shipped entry: a consumer cannot name the argument of its own `onError`. drag2 exports every one. This is a defect fix, not an addition. §L-2 |

---

## 3. Sortable — observable behaviors

Each is pinned by a shipped test; the destination is where drag2 pins it.

| Behavior | Class | Destination |
| --- | --- | --- |
| Press below threshold disarms with no callback | retain | shipped |
| Drop in place finishes as a **no-op without calling `onReorder`** | retain | shipped |
| Explicit rejection routes through `onCancel`, not `onError` | retain | shipped |
| `Escape` cancels a live drag | retain | shipped |
| Removing the dragged item from the collection cancels | retain | shipped |
| Collection invalidation during flight | retain | shipped |
| Visual animates home **before** `onCancel` on rejection | retain | shipped |
| Placeholder returns home **before** rejected landing timing is read | retain | shipped; ordering confirmed by probe 13b |
| Partial-activation rollback when `createPlaceholder` throws or destroys | retain | shipped |
| Rect measurement reused while the insertion and version are unchanged | retain | shipped (`vertical()`'s `dirty`/`measured` pair) |
| A throwing `getHandle`/`getVisual` escapes to the browser, leaving the controller idle and usable | **redesign** | Admission failures are classified `FAILURE_ACTIVATION` and reported through `onError` (D-17). Recorded as a deliberate difference in `packages/drag2/README.md`. |
| Silence after `destroy()` | retain | shipped, phase 4 |
| **Arrow-key reordering** — see §4 | retain | Phase 16 |
| **Two-dimensional insertion** — see §5 | retain | Phase 17 |

---

## 4. Sortable — keyboard reordering

Classified **retain**. The capability and its destination are settled; the mechanism is what Phase 13a probes.

| Detail | Shipped behavior | Bearing on the successor |
| --- | --- | --- |
| Keys | `ArrowUp`/`ArrowLeft` → up, `ArrowDown`/`ArrowRight` → down. **No modifier, no activation gesture.** | The left/right aliasing is why keyboard is _not_ axis-specific and does not belong to `vertical()`. §L-4 |
| Ingress | One delegated `keydown` on the container, alongside the `pointerdown` listener. | Both admissions share `resolveSortablePress`, so `getHandle` gates the keyboard path too. |
| Geometry | Pure: `keyboardInsertion(snapshot, item, direction)` produces the **same `Insertion` shape** the pointer path feeds to the proposal builder, deliberately, so request semantics cannot diverge. | The rule is portable as-is. |
| Feasibility | Decided **synchronously, before dispatch**: an edge item produces `null` and the command is inert. | See below. |
| `preventDefault()` | Called synchronously in the listener, before the action is queued, and only when the command is possible. | **This is the pressure point.** drag2 admission is a two-phase handshake through the kernel queue; there is no seam that lets a behavior answer "is this command possible" and consume the event _before_ the action is queued. A command is a complete one-slot operation — admission, activation and release with no pointer at all. |

02 §`ActionTransition` already states the position: keyboard is expected to **revise the kernel contract**, not to be worked around with a third action tag. This ledger row does not decide the revision; Phase 13a produces the failing executable case and Phase 14 revises.

**Revised — D-32, 2026-08-04.** The pressure point is resolved by a **second admission member** on `BehaviorSpec` (`command: { types, admit(event, draft) }`), not by a third action tag and not by a behavior-to-kernel intent protocol. `command.admit` runs synchronously inside the declared listener with the draft open, so feasibility is decided and `preventDefault()` is called exactly where the shipped package calls it. A non-null return mints a **pointerless** operation (`pointerId === -1`, no pointer listeners, no capture) that the kernel activates and releases in one slot. Every row above is retained unchanged, including the shared handle gate, because the discrete member is admission and `getHandle` is what admission consults.

**One parity boundary is now explicit.** A command is _one slot_, matching this package. A multi-press mode — pick up, arrows, drop — is not expressible under D-32 and would reopen the contract (05 §Q-13). Phase 16's accessibility review is where that case would come from.

---

## 5. Sortable — two-dimensional insertion

Classified **retain**. Public decomposition **deferred to Phase 17**, following the discipline in plan.md §Phase 17.

The material finding is that **the shipped package has no grid capability, because it has no axis concept at all**:

- `nearestSlot` (`sortable/rect-index.ts:145`) is a squared-Euclidean search over both centre coordinates. `RectIndex` packs `centreX` _and_ `centreY`.
- `SortableOptions` has **no `axis` member**. The Grid story is the List story with different CSS; its hint — "a wrapping grid is one field of rectangles, so any direction works" — is literally the implementation.
- Gap derivation is DOM-order (`follows`), not geometric, so it is already dimension-independent.

So the successor's relationship to the shipped package is inverted from how the roadmap has been describing it: drag2's `vertical()` is a **narrowing** of shipped behavior, and 2-D is the shipped default. Consequences:

1. This is a **retain** row, not a new feature. "Grid support" is the removal of a restriction drag2 introduced, not the addition of one the shipped package had.
2. `vertical()` consumes exactly one frame field, `pointerY` (`sortable/vertical.ts`). A 2-D rule needs `pointerX` as well — the second consumer-declared-view widening, and the direct test of whether D-13's view mechanism generalises or whether phase 8a's widening was a one-off. That evidence is a Phase 17 deliverable and feeds Checkpoint E.
3. Whether the public shape is a `grid()` sibling, a parameterization, or an unrestricted default that `vertical()` constrains, is **not decided here**. Note that the shipped precedent is the third option, and that whichever is chosen must not make the 1-D case pay for the 2-D one — the minimal composition's 9.34 kB is a measured budget (M-3).

---

## 6. Free drag — the option surface

Classified **retain** as a behavior. Its decomposition into features and subpaths is **deferred to Phase 18**; 13c probes it as a typed probe first.

| Option | Class | Note |
| --- | --- | --- |
| `handle` — element _or_ resolver | redesign | Sortable's `handle()` takes a resolver only. Free drag's element form is a single-item convenience; unifying them is a Phase 18 decision. |
| `getVisual(item)` | retain | Same as sortable's `visual()`. |
| `lift` — `'top-layer'` \| `'flatten'` \| `'none'` (default `'top-layer'`) | **retain, shape deferred** | **This is not drag2's lift-mode renaming.** drag2's `LIFT_FAITHFUL`/`LIFT_FLAT`/`LIFT_IN_PLACE` are _kernel-internal_ and selected by the behavior; the shipped modes are a _consumer option_. Making them public again requires deciding whether a behavior may expose a kernel-internal enum. Phase 18. |
| `axis` — `'both'` \| `'x'` \| `'y'` (default `'both'`) | retain | Motion constraint, distinct from sortable's insertion axis; do not conflate the two in the API. |
| `bounds` — `'viewport'` \| `HTMLElement` \| `() => DOMRectReadOnly \| null` | retain | Three-form source resolved per read (`draggable/bounds.ts`). The `'viewport'` sentinel is currently a _type-only_ export — the value `BOUNDS_VIEWPORT` is not exported, so the string literal is the only way to write it. Fix in the successor. §L-2 |
| `coordinateSpace: CoordinateMapper` | **open — retain, shape deferred** | drag2 has no coordinate module: all geometry is `@ydinjs/box-quad`. Whether a consumer-supplied mapper is still needed, or whether box-quad's traversal subsumes the cases it existed for (ancestor zoom, transformed stage — both are shipped stories), is the sharpest open geometry question. Phase 18; §L-7 |
| `threshold` (default 8) | retain | Same default as sortable's. |
| `landingTiming()` | redesign | Same as §2; reachable through a replacement runner, see L-6. |
| `onDrop` (required) | retain | Mirrors `onReorder`, including the authored-presentation declaration — which is now a boolean acknowledged through the controller rather than a promise (D-33). |
| `resolveHomeTarget` → `FreeHomeTarget` | retain | Synchronous rollback target. A throwing resolver is an **error, not a cancel**, and an invalid result is an error too — both pinned by shipped tests; keep. |
| `onStart(geometry)` / `onMove(geometry)` | retain | `onMove` runs _after_ the visual is written for that motion. Sortable has no per-move callback; do not unify. |
| `onFinish` / `onCancel` / `onError` | retain | Same discipline as sortable's. |

### 6.1 Free drag — exported values and types

| Export | Class | Note |
| --- | --- | --- |
| `FreeDropResolution` (const + type) | retain |  |
| `FreeDropResult.isAccepted/isRejected/isCanceled` | **drop** | Same justification as `SortableResult.is*`. |
| `DraggableOptions`, `DragUpdate` | redesign | Dissolve into per-feature options; `DragUpdate` follows the `update()` row in §1. |
| `DragBounds`, `LiftMode`, `FreeHomeTarget` | retain |  |
| `FreeHomeRequest` | **drop** | It is a bare alias of `DragSubject`, which is itself exported from the same entry. **What a consumer loses:** a name. Two exported names for one structural type is what makes a declaration surface hard to learn. |
| `FreeDragCancelResult`, `FreeDragFinishResult` | redesign | Export-site renames of `FreeDropCancelResult`/`FreeDropFinishResult`; the successor picks one vocabulary — _drop_ or _drag_ — and uses it in both the type name and the entry. |
| `FreeDropRequest`, `DragGeometry` | retain | Field-for-field. `DragGeometry` carries both `viewportDelta` and `localDelta`, so it follows the `coordinateSpace` decision. |
| `FreeDropProposal`, `OnDrop`, `ResolveFreeHomeTarget`, `DragErrorContext`, `CancellationReason` | **redesign — exported** | Reachable from the public surface, not exported. Same defect as §2.1. |

### 6.2 Free drag — observable behaviors

All **retain**, destination Phase 19–20, pinned by `tests/draggable.browser.test.ts` and `tests/draggable/{bounds,motion}.node.test.ts`:

threshold disarm; lift into the top layer on activation; no jump on the first move after activation; accumulated grab delta reported to `onStart`; visual released **before** `onFinish`/`onCancel`; never both terminal callbacks for one operation; async acceptance awaited; an invalid resolution is an error, not an acceptance; animate home on rejection when a home target is configured; `pointercancel` and `Escape` disarm a pending press with no completion callback; ingress closed after `destroy()`; no document listeners retained after any terminal path; a late acceptance after cancel or destroy is ignored; `update({ position })` retargets a controlled drag mid-flight.

---

## 7. Shared kernel types

| Type | Class | Note |
| --- | --- | --- |
| `Point` | retain | Already public on `drag.js`. |
| `DragSubject` | retain |  |
| `AnimationTiming` = `Pick<EffectTiming, 'duration' \| 'easing'>` | redesign | Survives as `landing()`/`layoutAnimation()` options. Whether the type itself stays public follows §L-6. |
| `DragAxis` | retain | Free drag's motion axis. Phase 18. |
| `CoordinateMapper` | **open** | Follows the `coordinateSpace` row. |
| `ReorderRequest` | retain |  |
| `MaybePromise<T>` | **drop** | Structural helper; the successor inlines `T \| Promise<T>` at each site. **What a consumer loses:** nothing nameable — it is already unexported from both entries. |
| `PRESENTATION_READY_TIMEOUT = 500` | redesign | A hard constant in the shipped package; `callbacks({ readinessTimeout })` in drag2, same default, now a validated option. |
| Default landing timing `{ duration: 200, easing: 'ease' }` | retain | Same default in `landing()`. |

---

## 8. Present in the successor, absent from the shipped package

Not parity rows — recorded so later phases do not mistake them for parity work, and so Phase 21's size numbers are read against the right baseline.

| Capability | Note |
| --- | --- |
| `layoutAnimation()` | The shipped sortable **animates nothing but the lift**: siblings jump when the placeholder moves. There is no `.animate()` call anywhere in `sortable/`. This is a pure addition, and it is the one M-3 composition with no shipped counterpart. |
| Explicit feature composition | The shipped package infers everything from one options object. |
| Opaque branded features | No shipped equivalent; third-party feature authoring is closed by construction (03 §Closed for real). |
| Eight frozen subpaths | The shipped package is two barrels. Baseline B's 6.89 kB is measured against a barrel, which is why M-3 keeps it separate from baseline A. |
| A complete exported type surface | §L-2. |
| Construction-time option validation | The shipped package accepts a `NaN` threshold and fails later as a drag that never activates. |

---

## 9. Findings

Numbered so later phases can cite them.

- **L-1 — the `items()` thunk was never re-read.** Called once, at construction; `updateItems` is the only other path. Verified by reference search on the member: 53 references, of which exactly one is an invocation (`sortable/runtime/controller.ts:109`) — every other is an option-object declaration in the tests or the stories. The array-argument redesign is behavior-preserving, not a simplification with a cost.
- **L-2 — the shipped type surface leaks.** `DragErrorContext`, `ResolutionContext`, `CancellationReason`, `ReorderTransactionResult`, `CollectionSnapshot`, `OnReorder`, `OnDrop`, `FreeDropProposal`, every `OUTCOME_*`/`CANCEL_*`/`FAILURE_*` constant, and the `BOUNDS_VIEWPORT` value are all reachable from the public surface and none is exported. A consumer cannot annotate its own `onError` handler. drag2's "every structurally reachable type is exported, TypeDoc emits zero unresolved references" is therefore a **defect fix**, and the four `is*` predicate drops are safe only _because_ of it.
- **L-3 — `is*` predicates and exported discriminants are alternatives, not layers.** Dropping them costs nothing once the constants are public; keeping both would put eight functions in every consumer's bundle to save a `===`.
- **L-4 — keyboard is not axis-specific.** `ArrowLeft` and `ArrowUp` are the same command. Keyboard reordering therefore cannot live inside `vertical()`, and Phase 16 must not attach it to an axis feature — which also means Phase 17 does not inherit a keyboard question.
- **L-5 — `update()` has no home in the current composition model.** Features are assembled once and immutable for the controller's life, and a feature cannot contribute a controller method. Free drag's live-policy update must therefore be a _behavior_ affordance. This is independent of the SPI probes and does not by itself justify reopening the contract.
- **L-6 — settle-time `landingTiming()`. ~~The one capability drag2 cannot express.~~ Corrected by probe 13b: it fits.** `landing({ duration })` fixes timing at construction, but `landing({ run })` already accepts a full replacement `LandingStart`, and the kernel invokes a runner during _arming_ — after `settlement.effect` returns and after `anchorTarget` (`src/kernel/kernel.ts:1208`). That is exactly the moment the shipped package read `landingTiming()`. The capability is reachable today; only the **ergonomics** are short of parity, because a consumer wanting a distance-scaled duration must reimplement the default runner and lose its reduced-motion collapse, retarget replay and generation guard. That is a public-option change for Phase 15 or 22 — **not** a Phase 14 contract question. See [`probes/13b-settlement.md`](probes/13b-settlement.md) §B-2.
- **L-7 — `coordinateSpace` is the geometry question box-quad has to answer.** Two shipped stories exist only to exercise it (Zoomed Context, Transformed Stage), and drag2's Zoomed Context port works without any mapper. Whether that generalises — arbitrary consumer spaces, not just ancestor transforms — is Phase 18's, and a wrong answer is expensive: re-adding a coordinate module after cutover would undo the "no coordinate module here" property.
- **L-8 — 2-D is the shipped default, not a shipped feature.** See §5. Every document that has described grid support as "the shipped package additionally covers grid sorting" is describing an absence of restriction as a feature.
- **L-9 — the successor's authored-presentation protocol is not a port, and the shipped burden was inherited rather than introduced.** Added 2026-08-04, after probe 13b and the D-33 revision. `presentationReady` is identical in both packages, and so is the `createCommitTracker` helper each package's stories carry to satisfy it — create a promise before knowing a render will happen, supersede without dropping, resolve from a layout effect, never lose one. The successor replaces it with a **declaration plus a controller acknowledgement** (contract D-33): `accept({ presentation: true })`, then `controller.ready(request)`. That is a **redesign row, not a retain row**, and the one breaking public change in the parity boundary. Recorded here because §2.1 reads as a retain row at a glance and the difference is the point: the ledger's job is to say what a consumer has to change, and this is it.

  **What a consumer actually rewrites** is smaller than the promise version suggests: it stores the `request` it is already given instead of constructing a promise, and calls one method from the same layout effect it already had. What it stops needing is the supersede-and-never-drop tracker. What it loses is the ability to _reject_ readiness — a failed render now reaches the deadline rather than classifying immediately, which costs latency and nothing else.

---

## 10. Open questions for the owner

None blocking. Two worth flagging before Phase 18 spends effort:

1. **`coordinateSpace` (L-7).** Is the intent to retain arbitrary consumer-supplied coordinate spaces, or only the cases box-quad already handles? Retaining the general form is the larger commitment and is not obviously wanted by any shipped consumer — there are none.
2. **Public `lift` modes (§6).** The shipped option is consumer-facing; drag2's are kernel-internal. Exposing them re-publishes a kernel enum, which cuts against the surface discipline phase 9 froze. Phase 18 can decide either way, but it is a genuine architectural choice, not a port.

---

## Coverage

Every export, option member, controller method and pinned observable behavior of `packages/drag/src/{draggable,sortable}.ts` has a row above. Classification totals: **retain 54**, **redesign 14**, **drop 4** (`SortableResult.is*`, `FreeDropResult.is*`, `FreeHomeRequest`, `MaybePromise`), each with the loss stated. Six rows are retain-with-deferred-shape, each naming the phase that decides it.