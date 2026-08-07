# Parity ledger — `@ydinjs/drag` → `@ydinjs/drag2`

Phase 12 deliverable. One row per public capability of the shipped package's two entries, classified **retain / redesign / drop**, with a destination.

This is the definition of "parity" every later phase cites. Where a phase asks "does the successor have to do this?", the answer is a row here, not a judgement made in flight.

**Precedent.** [`../../drag/.plan/phase-1/08-compatibility-ledger.md`](../../drag/.plan/phase-1/08-compatibility-ledger.md) is the same instrument, written for the shipped package's own redesign. It is the form this follows.

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
| `SortableController.updateItems(items)` | retain | Shallow-copies, bumps version, notifies; **no-op after `destroy()` — the whole method, invalid input included.** The controller carries its own terminal latch, checked before validation, because the kernel's guards the dispatch and validation happens in front of it: a post-`destroy()` duplicate used to throw at a controller that is supposed to be inert. Closed at Checkpoint D (D3); pinned by `tests/sortable/sortable.browser.test.ts` §`updateItems after destroy`, valid **and** invalid. | shipped, phase 6 |
| `SortableController.cancel(reason?)` | retain | Wraps as a consumer cancellation; no-op when idle **and after `destroy()`**. It is the kernel's own member, spread through unchanged, and the kernel's closed latch makes it inert before it does any work — so it needs no controller-level check of its own (D3). | shipped |
| `SortableController.destroy()` | retain | Idempotent, synchronous, no terminal callback afterwards. Since Checkpoint D it also sets the controller's terminal latch before delegating, which is what `updateItems` reads. | shipped, phase 4 |
| `FreeDragController.update(DragUpdate)` | **open — retain, shape deferred** | The only live-policy mutator in the shipped package. drag2 composes once and is immutable for the controller's life (`sortable.ts` §assembled once), so this cannot be a feature contribution: a behavior must expose it as a controller method. | Phase 18 decides the method set; §L-5 |
| `FreeDragController.cancel` / `.destroy()` | retain | As sortable's. | Phase 18 |

---

## 2. Sortable — the option surface

Eleven members of `SortableOptions`.

| Option | Class | Shape | Destination |
| --- | --- | --- | --- |
| `items(): readonly HTMLElement[]` | redesign | A plain array argument: `sortable(items, …)`. **The thunk is called exactly once, at construction** (`sortable/runtime/controller.ts:109`, the only call site in the package) — every later change already goes through `updateItems`. The redesign removes a parameter that was never re-read. | shipped, phase 6; §L-1 |
| `getVisual(item)` | retain | `visual()` from `sortable/handle.js`. **Including candidate measurement** — the axis rule searches candidate visuals, not candidate items (D2, Checkpoint D). | shipped, phase 8b; §L-10 |
| `getHandle(item)` | retain | `handle()` from `sortable/handle.js`. | shipped, phase 8b |
| `createPlaceholder(context)` | retain | `placeholder({ create })`; `PlaceholderContext` keeps `item`, `visual`, `rect`. | shipped, phase 8b |
| `threshold` (default 8) | retain | `callbacks({ threshold })`, same default, now validated at construction. | shipped, phase 8a |
| `landingTiming(): AnimationTiming` — **read at settle time** | redesign | `landing({ duration, easing })` fixes timing at construction, but `landing({ run })` reaches the same moment. Per-drop dynamic timing is expressible today; only the ergonomics are short of parity. Corrected by probe 13b. **Closed at Phase 15** as `landing({ duration: number \| (() => number) })`, resolved once per landing; **repaired at Checkpoint D (D4)**, where the reduced-motion branch was skipping the thunk entirely, so the option's documented settle-time call — and a thrown or invalid result — did not hold for reduced-motion users. Resolution and validation now precede the collapse, as the shipped `landingTiming()` did. | shipped, phase 15; §L-6 |
| `onReorder` (required) | retain | `callbacks({ onReorder })`, same `ReorderResolution` protocol. | shipped, phase 8a |
| `onStart(item)` | retain | `callbacks({ onStart })`. | shipped, phase 8a |
| `onFinish(result)` | retain | `callbacks({ onFinish })`. | shipped, phase 8a |
| `onCancel(result)` | retain | `callbacks({ onCancel })`. | shipped, phase 8a |
| `onError(error, context)` | retain | `callbacks({ onError })`; `context.cause.stage` becomes a flat public `FailureStage`. | shipped, phase 8a |

### 2.1 Sortable — exported values and types

| Export | Class | Note |
| --- | --- | --- |
| `ReorderResolution` (const + type) | **retain, argument redesigned** | Same two members and the same _never inferred_ contract. The optional argument changes: `presentationReady?: PromiseLike<void>` becomes `options?: { presentation?: boolean }`, and the acknowledgement moves to `controller.ready(request)`. The **one breaking public change** the Phase 14 revision makes — contract D-33, probe 13b, revised at Checkpoint C. Phase 15 |
| `SortableResult.isAccepted/isRejected/isCanceled/isNoOp` | **drop** | **What a consumer loses:** four named type guards. What replaces them: the public results discriminate on **string literals** — `type: 'accepted' \| 'noop' \| 'rejected' \| 'canceled'` (`src/sortable/domain.ts:164-186`) — so `result.type === 'accepted'` narrows directly, with no import and no constant (F-41, plan.md phase 12). **Corrected at Checkpoint D (D5):** an earlier wording of this row said the discriminant was "a _public_ exported constant" and that `result.type === OUTCOME_*` was the replacement. That was never the implementation. `OUTCOME_*` are internal numeric frame codes under `domain.ts` §Behavior-private frame state, they are **not** the public discriminant, and they are correctly absent from the frozen entry. The drop stands; only its justification was wrong. |
| `PlaceholderContext` | retain | Plus `PlaceholderFactory`, which the shipped package left unnameable. |
| `SortableOptions` | redesign | Dissolves into per-feature option types. |
| `SortableFinishResult`, `SortableCancelResult` | retain | Same unions. |
| `SortableController` | retain | **Four** members after Phase 15: `updateItems`, `cancel`, `destroy`, and `ready(request)` — the consumer half of the D-33 authored-presentation protocol (§L-9). An earlier wording said three. **`ready()` deliberately keeps reporting after `destroy()`** rather than joining `updateItems`'s terminal latch (D3): a post-`destroy()` acknowledgement is stale by definition, and telling an integrator that its layout effect outlived the controller is the whole reason that `DEV` report exists. |
| `ReorderRequest` re-export | retain | Field-for-field: `{ item, version, from, to, before, after }`, verified against `packages/drag/src/kernel/types.ts:73-80`. Exported from `sortable.js`. |
| `AnimationTiming` re-export | **redesign — dissolved, not exported** | **Reclassified at Checkpoint D (D5).** This row previously read _retain_ while its own note deferred to the `landing()` row, and §7 classified the type itself _redesign_ — two readings of one name. The decision: it is not public. Phase 15's `LandingOptions.duration?: number \| (() => number)` is strictly wider than `Pick<EffectTiming, 'duration' \| 'easing'>`, so the shipped type can no longer describe the option it existed for. **What a consumer loses:** nothing nameable — `LandingOptions` and `LayoutAnimationOptions` are exported from their own subpaths and are what a consumer annotates. |
| `DragSubject` re-export | **drop** | **Reclassified at Checkpoint D (D5).** **What a consumer loses:** a name for the `{ item, visual }` pair. The pair survives on the public surface inside `PlaceholderContext` (`{ item, visual, rect }`, exported from `sortable/placeholder.js`), which is the only site the sortable entry exposes it. Precedent is this ledger's own `FreeHomeRequest` drop (§6.1): two exported names for one structural type is what makes a declaration surface hard to learn. **Consequence for Phase 18:** that `FreeHomeRequest` row justifies itself as "a bare alias of `DragSubject`, which is itself exported from the same entry" — a premise this decision removes. Phase 18 re-derives it. |
| `DragErrorContext`, `ReorderTransactionResult`, `CollectionSnapshot`, `OnReorder` | **redesign — exported** | Structurally reachable from `SortableOptions` and **none is exported** by the shipped entry: a consumer cannot name the argument of its own `onError`. drag2 exports all four. A defect fix, not an addition. §L-2 |
| `ResolutionContext` | **drop — structurally inlined** | **Reclassified at Checkpoint D (D5).** `OnReorder`'s second parameter is written out as `Readonly<{ signal: AbortSignal }>` (`domain.ts:143-146`) rather than named. Precedent is the frozen contract's own `MaybePromise` decision (03 §The export topology this requires): a one-field object of a platform type is not a name a consumer needs from us. **What a consumer loses:** contextual typing covers `const f: OnReorder = (request, context) => …`; a consumer writing a _standalone_ handler retypes one field literal. That is the same cost the frozen `OnReorder` return type already accepts. |
| `CancellationReason` | **redesign — dissolved into the result** | **Reclassified at Checkpoint D (D5).** Shipped `{ type: CANCEL_*, detail? }` becomes fields of `CanceledReorderResult`: `reason: unknown` carries the detail and `stage: CancelStage` says whether the operation was abandoned before or during the consumer round-trip, with `AT_PROPOSAL`/`AT_CONSUMER` exported as values. **What a consumer loses:** nothing against shipped — L-2 records that shipped exported the type but none of its `CANCEL_*` members, so a shipped consumer could not discriminate one either. drag2 is strictly better on the stage axis. It is **not** better on the reason axis; see §L-11, which is a new finding rather than part of this row. |
| the `OUTCOME_*`/`REORDER_*` constants | **not public** | **Reclassified at Checkpoint D (D5).** `OUTCOME_*` are internal numeric frame codes and are not the public discriminant (see the `is*` row above). `REORDER_*` **does not exist** in drag2 under any spelling; the name was carried into this table in error. Neither belongs on the frozen surface, and the frozen table correctly omits both. |

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
| Rect measurement reused while the insertion and version are unchanged | retain | shipped (the axis feature's `dirty`/`measured` pair) |
| Candidate rects measured through the installed visual resolver | retain | shipped, Checkpoint D (D2); `tests/sortable/{y,xy,features}.browser.test.ts`; §L-10 |
| A throwing `getHandle`/`getVisual` escapes to the browser, leaving the controller idle and usable | **redesign** | Admission failures are classified **`FAILURE_ADMISSION`** and reported through `onError` (D-17). Recorded as a deliberate difference in `packages/drag2/README.md`. **Corrected at Checkpoint D (D7):** this row said `FAILURE_ACTIVATION`, which is a different stage with a different recovery and belongs to the phase _after_ admission. The kernel (`src/kernel/kernel.ts`) and the test matrix both use `FAILURE_ADMISSION`; the ledger was the only document naming the wrong one. |
| `getHandle`/`getVisual` invoked **once** per admitted input event | retain | shipped, Checkpoint D (D1). The keyboard ingress resolved the item twice — once for the destination, once to seed the draft — so one keydown called the consumer's resolver twice where a press called it once. Both ingresses now share one resolution. `tests/sortable/keyboard.browser.test.ts` §`handle()` — the exact-once rows, including a resolver that queues `updateItems()`. |
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

Classified **retain**. Public decomposition **decided and shipped at Phase 17** — the deferral is closed (D7, Checkpoint D).

**The shape: a sibling axis feature, `xy()`, on `sortable/xy.js`.** Of the three candidates named below, the one with shipped precedent — an unrestricted 2-D default that an axis feature narrows — cannot be built without breaking consequence 3: a default lives in the behavior core and cannot be tree-shaken, so every list consumer would carry the 2-D metric _and_ the narrowing feature. One parameterized axis feature fails the same rule ~120 B more cheaply and in the same direction. Two subpaths keep each composition paying for its own rule.

The axis features are also **renamed to the axes they measure**: `vertical()` → `y()` on `sortable/y.js`, with `x()` reserved. That is a breaking public change, the second in Part II after D-33's `ResolutionOptions`, and it is recorded in 03 §The export topology this requires. The paragraphs below keep `vertical()` where they are describing what was known when the row was written; `sortable/vertical.ts` **no longer exists** and the module referred to is `sortable/y.ts`.

Measured cost: `minimal` 9.90 → 9.96 kB for the shared rect index; `minimal (xy)` measured as a peer at 10.01 kB rather than assumed equal. The 1-D case does not pay for the 2-D one, which is the constraint the decision was made under.

The material finding that led there, unchanged: **the shipped package has no grid capability, because it has no axis concept at all**:

- `nearestSlot` (`sortable/rect-index.ts:145`) is a squared-Euclidean search over both centre coordinates. `RectIndex` packs `centreX` _and_ `centreY`.
- `SortableOptions` has **no `axis` member**. The Grid story is the List story with different CSS; its hint — "a wrapping grid is one field of rectangles, so any direction works" — is literally the implementation.
- Gap derivation is DOM-order (`follows`), not geometric, so it is already dimension-independent.

So the successor's relationship to the shipped package is inverted from how the roadmap has been describing it: drag2's `vertical()` is a **narrowing** of shipped behavior, and 2-D is the shipped default. Consequences:

1. This is a **retain** row, not a new feature. "Grid support" is the removal of a restriction drag2 introduced, not the addition of one the shipped package had.
2. The 1-D rule consumes exactly one frame field, `pointerY` (now `sortable/y.ts`). A 2-D rule needs `pointerX` as well — the second consumer-declared-view widening, and the direct test of whether D-13's view mechanism generalises or whether phase 8a's widening was a one-off. **Answered at Phase 17: it generalised.** Both widenings were additive and satisfied structurally by the behavior's existing frame, with no wrapper, no allocation and no import edge back to the runtime. Two data points, so the honest reading is a _growing_ structural contract rather than a fixed one. Feeds Checkpoint E.
3. Whether the public shape is a `grid()` sibling, a parameterization, or an unrestricted default that the 1-D rule constrains. **Decided above: the first**, against the shipped precedent, because only it satisfies "the 1-D case must not pay for the 2-D one". `y()` is also not `xy()` with an axis switched off — in a single column, a horizontal excursion adds the same X term to every candidate and the squared sum lets it swamp the Y ordering near a boundary, so the suite pins a sideways drag that `xy()` reorders and `y()` proposes nothing for.

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
| `DragSubject` | **drop** | Decided at Checkpoint D; the loss and the Phase 18 consequence are stated in the §2.1 row. |
| `AnimationTiming` = `Pick<EffectTiming, 'duration' \| 'easing'>` | redesign | Dissolved into `LandingOptions`/`LayoutAnimationOptions` and **not itself public** — decided at Checkpoint D, see the §2.1 row. Phase 15 widened `duration` past what this type can express, which is what closed the question §L-6 left open. |
| `DragAxis` | retain | Free drag's motion axis. Phase 18. |
| `CoordinateMapper` | **open** | Follows the `coordinateSpace` row. |
| `ReorderRequest` | retain |  |
| `MaybePromise<T>` | **drop** | Structural helper; the successor inlines `T \| Promise<T>` at each site. **What a consumer loses:** nothing nameable — it is already unexported from both entries. |
| `PRESENTATION_READY_TIMEOUT = 500` | redesign | A hard constant in the shipped package; `callbacks({ readinessTimeout })` in drag2, same default, now a validated option. |
| Default landing timing `{ duration: 200, easing: 'ease' }` | retain | Same default in `landing()`. **Verified and repaired at Checkpoint D (D6):** `landing.ts` had shipped `DEFAULT_EASING = 'ease-out'`, so every consumer that installed `landing()` without an easing got observably different motion from the shipped package while this row read _retain_. No document anywhere recorded a deliberate redesign — no plan phase, no probe, no measurement — so this was drift, not a decision, and it is closed as **retain with the implementation corrected to `'ease'`** rather than reclassified. Pinned by `tests/sortable/features.browser.test.ts` — _should default the easing to the retained shipped value_ and _…the duration…_. `layoutAnimation()`'s own `'ease-out'` default is untouched: it has no shipped counterpart (§8) and therefore no parity constraint. |

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

  **Sharpened at Checkpoint D (D5).** The rule is _export what a public type structurally depends on and a consumer cannot otherwise write_, and it has two halves, both already exercised by the frozen contract. Unnameable-and-unwritable → export (`FailureStage`, `DOMRealm`, `Point`, `CollectionSnapshot`, `PlaceholderFactory`, the two `ReorderResolution` members, `ResolutionOptions`). Writable from platform or already-public names → inline (`MaybePromise`, and now `ResolutionContext`). "Structurally reachable" alone was too strong a reading and is what made this finding over-promise three names it should not have.

- **L-3 — `is*` predicates and a directly-comparable discriminant are alternatives, not layers.** Dropping them costs nothing, because the public results discriminate on string literals a consumer writes inline; keeping both would put eight functions in every consumer's bundle to save a `===`. **Corrected at Checkpoint D (D5):** this finding previously said "once the constants are public", inheriting §2.1's wrong premise. No constant is involved.
- **L-4 — keyboard is not axis-specific.** `ArrowLeft` and `ArrowUp` are the same command. Keyboard reordering therefore cannot live inside `vertical()`, and Phase 16 must not attach it to an axis feature — which also means Phase 17 does not inherit a keyboard question.
- **L-5 — `update()` has no home in the current composition model.** Features are assembled once and immutable for the controller's life, and a feature cannot contribute a controller method. Free drag's live-policy update must therefore be a _behavior_ affordance. This is independent of the SPI probes and does not by itself justify reopening the contract.
- **L-6 — settle-time `landingTiming()`. ~~The one capability drag2 cannot express.~~ Corrected by probe 13b: it fits.** `landing({ duration })` fixes timing at construction, but `landing({ run })` already accepts a full replacement `LandingStart`, and the kernel invokes a runner during _arming_ — after `settlement.effect` returns and after `anchorTarget` (`src/kernel/kernel.ts:1208`). That is exactly the moment the shipped package read `landingTiming()`. The capability is reachable today; only the **ergonomics** are short of parity, because a consumer wanting a distance-scaled duration must reimplement the default runner and lose its reduced-motion collapse, retarget replay and generation guard. That is a public-option change for Phase 15 or 22 — **not** a Phase 14 contract question. See [`probes/13b-settlement.md`](probes/13b-settlement.md) §B-2.
- **L-7 — `coordinateSpace` is the geometry question box-quad has to answer.** Two shipped stories exist only to exercise it (Zoomed Context, Transformed Stage), and drag2's Zoomed Context port works without any mapper. Whether that generalises — arbitrary consumer spaces, not just ancestor transforms — is Phase 18's, and a wrong answer is expensive: re-adding a coordinate module after cutover would undo the "no coordinate module here" property.
- **L-8 — 2-D is the shipped default, not a shipped feature.** See §5. Every document that has described grid support as "the shipped package additionally covers grid sorting" is describing an absence of restriction as a feature.
- **L-9 — the successor's authored-presentation protocol is not a port, and the shipped burden was inherited rather than introduced.** Added 2026-08-04, after probe 13b and the D-33 revision. `presentationReady` is identical in both packages, and so is the `createCommitTracker` helper each package's stories carry to satisfy it — create a promise before knowing a render will happen, supersede without dropping, resolve from a layout effect, never lose one. The successor replaces it with a **declaration plus a controller acknowledgement** (contract D-33): `accept({ presentation: true })`, then `controller.ready(request)`. That is a **redesign row, not a retain row**, and the one breaking public change in the parity boundary. Recorded here because §2.1 reads as a retain row at a glance and the difference is the point: the ledger's job is to say what a consumer has to change, and this is it.

  **What a consumer actually rewrites** is smaller than the promise version suggests: it stores the `request` it is already given instead of constructing a promise, and calls one method from the same layout effect it already had. What it stops needing is the supersede-and-never-drop tracker. What it loses is the ability to _reject_ readiness — a failed render now reaches the deadline rather than classifying immediately, which costs latency and nothing else.

- **L-10 — candidate measurement is a coherence question, not only a parity question.** Added at Checkpoint D (D2). Phase 8a measured candidate _items_ deliberately (plan.md:252), reasoning that reaching the `getVisual` slot from an axis feature would be a sibling-feature dependency in all but name. Both halves of that turned out wrong. The dependency objection is answered by precedent: the axis rule already names `placeholder` off the per-operation runtime view, and the placeholder is itself a product of the optional `placeholder()` slot — so one more nullable field on that view is the established D-13 mechanism, not a new coupling, and no axis module imports `handle.ts`. And measuring items is not merely _different_ from the shipped index, it is **incoherent within drag2's own rule**: the incumbent each candidate is compared against is the placeholder, which `placement.ts` sizes from the visual's offset box, so an inset or offset visual made the hysteresis compare centres of differently-derived boxes and biased which side of a boundary won. That is why this closed as _restore_ rather than as a documented drop — the behavior was defective on its own terms, and the loss was not statable as an ergonomic gap because it silently moves where every gap is crossed. Measured cost: **+10 B** on the minimal composition, +40 B on `complete`, all compositions still inside the M-3 budget.
- **L-11 — the cancel _reason_ sentinels are the last instance of L-2, and it is still open.** Added at Checkpoint D while resolving D5's `CancellationReason` row; **not** part of that row's close. `CanceledReorderResult.reason` is typed `unknown`, correctly — `controller.cancel(reason)` accepts anything, so the union is genuinely open. But every reason the _library itself_ produces is a namespaced string constant that is **not exported**: `'drag:escape'`, `'drag:pointercancel'`, `'drag:lostpointercapture'` (`src/kernel/kernel.ts:116-118`) and `'sortable:item-removed'`, `'sortable:collection-invalidated'` (`src/sortable/domain.ts:236-237`). `stage: CancelStage` does not cover this: `AT_PROPOSAL`/`AT_CONSUMER` say _when_ an operation was abandoned, never _why_. So a consumer that wants "say nothing when the user pressed Escape, warn when the item vanished" must hard-code an undocumented string it can also see change without notice.

  This is the same defect the whole of L-2 is about, freshly minted, and the argument that made `AT_CONSUMER`/`AT_PROPOSAL` public — "a `CanceledReorderResult` carries one and a consumer has to be able to discriminate it" (`src/sortable.ts:16-25`) — applies to `reason` verbatim. **The remedy is to export all five as public string constants**, the three kernel ones from `drag.js` beside the `FAILURE_*` constants, the two sortable ones from `sortable.js`, with `reason` left `unknown`.

  **Decided by the owner at Checkpoint D: deferred to Phase 23, and taken there.** Not declined, and not left as an omission — the phase carries the work, it is listed in that phase's deliverables in [`plan.md`](plan.md#phase-23--finalization-review), and Phase 23 is the review at which "deferred" is explicitly not an available classification, so this is the last phase at which it can still be open. The reason for deferring rather than taking it here is that it is the only change in the Checkpoint D pass that would **add** to the frozen public surface — five runtime cells across two frozen entries, plus an M-3 re-measurement — and Checkpoint D's exit condition is about closing parity items, not about growing the surface. Deferring costs nothing against parity: it is a gap against _nothing shipped_, since the shipped package's `CANCEL_*` were equally unexported.

---

## 10. Open questions for the owner

None blocking. Two worth flagging before Phase 18 spends effort:

1. **`coordinateSpace` (L-7).** Is the intent to retain arbitrary consumer-supplied coordinate spaces, or only the cases box-quad already handles? Retaining the general form is the larger commitment and is not obviously wanted by any shipped consumer — there are none.
2. **Public `lift` modes (§6).** The shipped option is consumer-facing; drag2's are kernel-internal. Exposing them re-publishes a kernel enum, which cuts against the surface discipline phase 9 froze. Phase 18 can decide either way, but it is a genuine architectural choice, not a port.

---

## Coverage

Every export, option member, controller method and pinned observable behavior of `packages/drag/src/{draggable,sortable}.ts` has a row above.

**Recounted at Checkpoint D**, after D2 and D5 moved rows between classes and split two composite rows into seven: **retain 49**, **redesign 16**, **drop 7**, **retain-with-deferred-shape 4**, and one row in a new class, **not public** (the `OUTCOME_*`/`REORDER_*` row, which asserts that a name does not belong on the surface at all). 77 rows. The count is by the second column of every classified table row; the four deferred-shape rows are listed separately rather than inside `retain`, which is where the previous total of "retain 54 / six deferred" put them.

The seven drops are six capabilities, each with its loss stated: `SortableResult.is*`, `FreeDropResult.is*`, `FreeHomeRequest`, `MaybePromise`, `ResolutionContext`, and `DragSubject` (two rows, §2.1 and §7).