# The entity model `drag2` wants — an independent reading at `b73b6779`

**Run 2026-09-04** against the frozen snapshot `b73b6779` (_drag2: let the kernel be the class it hands out, and give the cache a declared reader_), read in a detached worktree so that nothing landed after it — seven commits on `drag2/fin-review` at the time of writing — could reach the analysis. Commissioned by the owner as a fresh architect's pass over `packages/drag2` **as a system**, after the D-170 migration made the long-lived entities explicit as classes. The brief: derive the next decomposition from ownership and lifetime, not from line count; reject extractions that only move code; name what should stay where it is.

**What was read, and how it was weighed.** Every file under `packages/drag2/src` at the snapshot, in full. From the record, only what establishes a **constraint** rather than a **choice**: contract 01 (ownership table, teardown), 02 (queue semantics, release ordering, the tail, failure classification), 05 (I-1…I-37), and the decisions that bind a re-decomposition — D-4/M-2 (closure call cost), D-36/D-37/D-38/D-53 (deferred teardown and the latch), D-155/D-166 (the tail and the join), D-170 with its §The ownership boundary (classes, the receiver gate, no mutable public fields). A previous architect's decomposition is cited nowhere below as a reason to keep it. **No production source is modified by this pass, and nothing here is decided**: the candidates are for owner review, and a migration plan is a separate pass.

**One probe was run**, a field-to-member affinity scan over `kernel/kernel.ts` (every `this.#x` reference per member), because the cluster claims below should rest on a count rather than on an impression. Its figures are quoted where they carry an argument; the script is not kept.

---

## 1. The system as it stands

Four lifetimes, and the code already names three of them.

| Lifetime | Where it lives at `b73b6779` |
| --- | --- |
| **Controller** — one `draggable()` call to `destroy()` | `Kernel` (realm, root, queue, ingress abort, spec, frame pair, the channel, the driver, the bracket counters, the tail slot, the click suppressor, four bound handlers, three transition adapters); `SeamDriver`; `SortableBehavior` / `FreeDragBehavior` (slots, snapshot, source identity, version, spatial sequence, anchor buffer, frame task, invalidator, channel); feature closures (`RectIndex`, `LinearShift`, `layoutAnimation`'s map, `bounds`' rect) |
| **Operation** — admission to retirement | `Kernel.#operation` (`OperationRecord`: visual, box, item, three lifetimes, cancel latch), `Kernel.#activation` (`ActivationRecord`: origin rect, lift session, visual space), the frame's `operation` identity; the behavior's `#operation` record; the sortable's `PresentationView` |
| **Attempt** — one resolution round-trip, one settlement | `Kernel.#attempts` (`AttemptSlots`: resolution, settlement, settlement input) |
| **Transaction** — one `begin()` → `commit()` | `Kernel.#pinned`, `#armedStamp`/`#stamp`, `#admitting`, `#actionTag`/`#actionArgument`, `#reporting`; `SeamDriver.#openStage`/`#failureRequested`/`#staged`/`#reentry`; the behaviors' `#transaction` records |

And one lifetime the code does not name: the **execution bracket** — a synchronous entry into library code from outside it (a native listener, a drain, an async continuation). D-36 calls it a _library transaction_; its state is `#transactionDepth`, `#teardownPending`, `#admitting`, `#destroyed`/`#settleDestroyed`, and the `closed` latch that today sits on the queue record. Nothing owns it: five fields and five methods on `Kernel` hold its invariant between them.

The two behaviors and their feature tiers are, by contrast, well-sized entities already. The findings that matter are in the kernel, with one in the sortable's per-operation state.

## 2. The kernel's field census, by lifetime

The affinity scan over `Kernel` (72 members after the constructor) gives the reading the owner's second hypothesis asked for. Grouping the private fields by the lifetime of what they hold:

| Cluster | Fields | Members touching the cluster | What binds the fields |
| --- | --- | --- | --- |
| **Execution bracket** | `#queue` (incl. `closed`, `running`), `#transactionDepth`, `#teardownPending`, `#admitting`, `#destroyed`, `#settleDestroyed`, `#drainStep`, `#drainPanic` | `destroy`, `#leaveTransaction`, `#dispatchKernel`, `#openIngress` (bracket half), `#panic`, plus **fourteen reads of `#queue.closed`** across a dozen members, every one of them the liveness latch | _Physical teardown runs exactly once, at depth 0, after logical closure; a dispatch during admission enqueues and does not drain; a nested dispatch appends._ |
| **Transaction** | `#current`, `#draft`, `#pinned`, `#armedStamp`, `#stamp`, `#actionTag`, `#actionArgument`, `#reporting` | `#begin`, `#commit`, `#runStamped`, `#preparationValid`, `#scrub`, `#context` (five of seven closures), and **30 members that read `#current`** | _The draft is a shallow copy of the committed frame; commit swaps; a stamp armed for a transaction is consumed by it or dropped; the pinned identity is the one the transaction opened on._ |
| **Operation** | `#operation`, `#activation`, `#attempts`, `#nextOperationId` | `#mintOperation`, `#acquireActivation`, `#openResolution`, `#openSettlement`, `#measureTarget`, `#joinSettlement`, `#retireOperation`, `#retireAttempts`, the handlers | _Complete at construction, dropped whole at retirement (the record's own claim, [`kernel.ts`](../../../src/kernel/kernel.ts) §`OperationRecord`)._ |
| **Ingress** | `root`, `#ingress`, `#disarmClick`, `#pointerDownHandler`, `#commandHandler`, `#pointerHandler`, `#escapeHandler` | `arm` (listener half), `#onPointerDown`, `#onCommand`, `#armClickSuppressor`, `#onPointer`, `#onEscape`, `#mintOperation` (arming half) | _Every listener the controller binds dies with the ingress signal; the one-shot click suppressor is disarmed by the click, the next press, or teardown._ |
| **Channel** | `#spec` (as the delivery target), `#report`, `#unwind` | `#notify`, `#failOperation`, `#handleFailed`, every `unwind` site | _Nothing reaches the consumer after logical closure except a panic's own report; a throw from the handler is the terminus._ |
| **Trailing presentation** | `#tail` | `#cancelTail`, `#startTail` | _One tail per controller, cancelled at the next lift and at teardown._ |

Three things fall out of the table before any proposal is made.

- **The `closed` latch is not a queue property.** `queue.ts` re-reads it per drain iteration, which is why it landed there, but its fourteen readers on the kernel are entry guards and boundary revalidations — `preparationValid`, `runAdmission`, `settlementLive`, `joinLive`, `cancelWith`, `failOperation`, `notify`, `dispatch`, the `closed` getter. It is the bracket's field.
- **`SeamContext` is two entities' worth of closures.** Five of its seven members — `begin`, `commit`, `preparationValid`, `readCurrent`, `readDraft` — reach the transaction cluster; the other two reach the channel. The driver in `seams.ts` and the frame pair in `kernel.ts` are one entity split across a module boundary and bridged by a record of wrapped closures.
- **Six transaction-scoped fields sit on a controller-lifetime object.** `#pinned`, `#armedStamp`, `#stamp`, `#reporting`, `#actionTag` and `#actionArgument` each live for one transaction, and each is a workaround for the same fact: the driver runs the transaction but cannot see the phase the kernel means to stamp, the input a settlement is driving, or the action a behavior tag names.

---

## 3. The candidates

Ordered by leverage. Each is stated with what it owns, what it must not own, why the boundary is real, and what the implementation pass must measure.

### C1 — The execution bracket becomes an entity, and the queue is its member

**Current cluster.** `#queue`, `#transactionDepth`, `#teardownPending`, `#admitting`, `#destroyed`, `#settleDestroyed`, `#drainStep`, `#drainPanic`, and the methods `destroy`, `#leaveTransaction`, `#dispatchKernel`, `#openIngress`'s bracket half, `#panic`. Lifetime: the controller. Invariant: D-36's — the latch is set on the closing statement; physical teardown runs once, at the boundary of the outermost bracket; admission suspends draining (I-1's _every native admission is a queue boundary_).

**Problem with current ownership.** The invariant is held by five fields and five methods whose correctness argument is spread across five comment blocks in [`kernel.ts`](../../../src/kernel/kernel.ts) (§`#transactionDepth`, §`#admitting`, §`destroy`, §`#leaveTransaction`, §`#openIngress`). `queue.ts` carries the latch and the `drain(queue, handle, panic)` signature exists to avoid allocating a handler per dispatch inside a factory — a reason the class conversion has already removed, since `#drainStep` and `#drainPanic` are now fields regardless. And the bracket is the one piece of the kernel whose semantics can only be exercised through a real controller in a browser, although it touches no DOM: `tests/kernel/queue.node.test.ts` covers FIFO and run-to-completion, and nothing covers deferral in isolation.

**Proposed entity.** One controller-lifetime object — call it the bracket, the executor or the session; the name is secondary — owning: the two parallel arrays and `running`; the `closed` latch; `depth`; `teardownPending`; `admitting`; the destroy promise and its resolver. Its operations: `dispatch(action, argument)` (enqueue; drain unless admitting; enter/leave the bracket), `runIngress(admit)` (the bracket half of `#openIngress`: depth, `admitting`, the one drain after admission, leave), `close()` (the latch, and either immediate or deferred teardown), `panic(error)`, and the `closed` reading. It takes three callbacks at construction: the drain step, the physical teardown, and the panic report. **It does not own** the frames, the operation, the spec, or any DOM; `#openIngress`'s guard on `current.operation` and its `begin()` stay on the kernel side of the call.

**Whether the channel joins it.** `#notify`'s first job is _refuse after logical closure_ and `#panic`'s exception to that rule is the one place the two are read together. Folding `notify`/`report`/`unwind` into the bracket makes _what may still reach the consumer after close_ one entity's rule. The cost is that the bracket then holds a reference to `spec.reportError`, which exists only after `arm()`; a nullable delivery target is the same shape `#notify` has today. Recommended, but severable — C1 stands without it.

**Why this is a real boundary.** The four fields and the latch form one state machine — `{open, closed-awaiting-boundary, torn-down} × depth × admitting` — with one reason to change (D-36's policy) and no reader outside the kernel. After the move, fourteen `this.#queue.closed` reads become one accessor on one object, `queue.ts`'s `closed` field and its per-iteration comment disappear into the entity that owns the bit, `drain`'s two callback parameters become fields, and the deferral invariant is testable in the node suite with a fake teardown callback. Nothing is threaded back: the bracket needs nothing of the kernel but the three callbacks.

**Risks and constraints.** I-1, I-6 (the seven steps and their order), I-22's precedence and D-36/D-37/D-38 are unchanged in semantics and must be shown unchanged. `#dispatchKernel` is on the pointer-sample path (`MOVE` is one dispatch per sample); the entity adds one property load per dispatch, which is below M-1's noise floor in expectation but is the kind of claim the m1 harness exists to check. Bundle: a second class is +100…+250 B Brotli on every composition by D-167/D-170's evidence, against per-row slack in the low hundreds of bytes ([`budget-rebases.md`](../../measurements/budget-rebases.md)); D-170 records that the class decision is not made on bytes, but §15 still measures per composition and SC-1's attribution rule applies.

**Priority.** High leverage, low risk, first. It touches few readers and is the precondition for C2's `preparationValid` composition.

### C2 — The transaction becomes one entity: the frame pair moves to the driver

**Current cluster.** `#current`, `#draft`, `#begin`, `#commit`, `#pinned`, `#armedStamp`, `#stamp`, `#runStamped`, `#scrub`, the frame composition in `arm`, and `#preparationValid` — on the kernel; `#openStage`, `#failureRequested`, `#unclassifiedReason`, `#staged`, `#reentry`, `runCore`, `runLeaf`, `runUnclassifiedValue`, `consumeStaged`, `requestFailure` — on `SeamDriver`; `SeamContext` bridging them. Lifetime: one `begin()` → `commit()`, on a controller-lifetime pair of frames. Invariant: contract 04's shallow-copy contract, I-3 (revalidate between prepare and commit), I-16 (a staged value reaches exactly one of `effect`/`rollback`), and the driver's own _exactly one phase open at a time_.

**Problem with current ownership.** The split is the factory era's: `createKernel` owned the frames and `createSeamDriver` was a separate factory, so the driver reached the frames through seven closures. With both now classes the closures are a record of wrapped prototype reads ([`kernel.ts`](../../../src/kernel/kernel.ts) §`#context`) whose only job is to cross a boundary that no longer separates two owners. Three kernel fields exist solely because the driver cannot see what the kernel means: `#armedStamp`/`#stamp` carry the phase the kernel wants written between `prepare` and `commit`, with a two-half handover (`begin` takes, `commit` consumes, `runStamped`'s `finally` clears) and sixty lines of proof that a stamp cannot outlive its transaction; `#reporting` is true for the span of one report transition and is read by `failOperation` to refuse a second checkpoint — a fact the open transaction's stamp already carries (`runStamped(REPORTING, …)`); `#attempts.settlementInput` and `#actionTag`/`#actionArgument` are slots that hand a per-transaction input to a transition adapter built once per controller, because the adapters were written as closures over the kernel rather than as calls with arguments. `Transition.prepare(draft, capability)` already has a parameter for exactly this — `#settlementTransition` passes `undefined` for it and reads the slot instead, and `#handleFailed` fills the same slots as an ordinary settlement would, including a `SettlementAttempt` it never measures, so that one adapter can serve both paths.

**Proposed entity.** `SeamDriver<Part>` grows into the transaction: it owns `current` and `draft` (composed at arm, scrubbed at retirement), `pinned`, `begin()`, `commit(phase?)`, `scrub()`, and the phase machine it already has. `runCore` takes the phase to stamp as an argument and writes `draft.phase` immediately before the swap — which deletes `#armedStamp`, `#stamp`, `#runStamped`, the `NO_STAMP` sentinel and the handover argument, because the stamp no longer exists outside the call that consumes it. `preparationValid()` becomes a composition the kernel supplies — `!bracket.closed && !operation.cancelRequest && tx.pinnedIsCurrent()` — since it is legitimately the intersection of three entities' state. `SeamContext` shrinks to the two channel members or becomes two constructor callbacks. **It does not own** the operation, the lifetimes, the spec, or the queue.

**The kernel-only transactions** — the `MOVE` sample commit, `mintOperation`'s `PENDING`, `closeOperation`'s commit 1, `joinSettlement`'s `FINALIZING`, `handleStartCommitted`'s `ACTIVE` — keep calling `begin()`/`commit()` directly with field writes between them; nothing here proposes a closure per sample.

**Why this is a real boundary.** An invariant currently proved across two modules becomes structurally unviolable: a phase stamp cannot be armed for one transaction and taken by the next when it is an argument of the call that commits. `#reporting` becomes a reading of the open transaction rather than a parallel flag. The seven-closure record and its _wrapped, not detached_ apparatus disappear rather than move. The settlement and action inputs travel as capabilities and the dummy attempt in `#handleFailed` goes with the slot.

**The competing decomposition, stated rather than chosen.** C1 and C2 could be one entity — a session holding the queue, the latch and the frames — since both live for the controller and meet at `openIngress` and `preparationValid`. Against it: they have different invariants and different reasons to change (D-36's teardown policy against contract 04's slicing), and the bracket has no reason to know what a frame is. Two entities, with the bracket first, is the recommendation; the merged form is the fallback if measurement shows two extra objects cost what one would not.

**Risks and constraints.** Thirty members read `#current`; every one becomes a read through the transaction, and `#handleMove` reads it up to six times per sample. D-170 §The ownership boundary forbids a mutable public field, so `current`/`draft` are accessors — the same trade RectIndex made, with the same rule: count the hot path, add no read inside a loop, and measure with the m1 harness (M-1's whole sample is 2.64 µs; the frame copy is 0.098 µs of it). `Draft<Part>`/`Frame<Part>` typing and contract 04 are unchanged. `tests/kernel/seams.node.test.ts` drives `SeamDriver` through a stub `SeamContext` at four sites and would be rewritten against the entity's own surface; `isInSeam()` is test-only and `runLeafValue` has no production caller at the snapshot — both are candidates for deletion in the same pass rather than for preservation. Bundle: the class grows but the context record, the stamp machinery and one slot go; the direction is not predictable and must be measured.

**Priority.** Highest leverage; second in sequence, after C1, because `preparationValid`'s composition reads the bracket's latch.

### C3 — The operation owns its attempts, and retirement becomes one call

**Current cluster.** `#operation`, `#activation`, `#attempts`, cleared in three places — `#retireOperation`, `#runPhysicalTeardown`, and `#handleFailed`'s `retireAttempts()` — with `#retireAttempts` running at every retirement.

**Problem.** `AttemptSlots` is a controller-lifetime record of per-attempt state, kept as a record so that _a slot living for one round-trip and a slot living for the controller read differently_ ([`kernel.ts`](../../../src/kernel/kernel.ts) §`AttemptSlots`). That is the symptom described accurately and placed one lifetime too high: an attempt cannot outlive its operation, and the record's three fields do not share even the attempt lifetime — `settlementInput` lives for one seam transaction and is cleared at the seam's end, `resolution` for a round-trip, `settlement` for the join.

**Proposed shape.** The operation record carries `resolution` and `settlement` (nullable, as they are), so that dropping the record drops the attempts and the three retire sites collapse to `operation.release()` — attempts nulled, lifetimes disposed, in that order. `settlementInput` disappears into C2's capability argument. `ActivationRecord` stays a separate complete-or-absent sub-record for the reason the code gives (activation is a later transaction that may fail with the operation alive); whether it nests inside the operation record or beside it is representation, not ownership.

**Why real.** The lifetime claim the record already makes becomes true by construction. Nothing crosses a new boundary; the coupling that disappears is three synchronized clearing sites.

**Risks.** I-4's double validation (`#attempts.resolution !== attempt`) is unchanged in meaning and moves one property deeper. Zero hot-path exposure.

**Priority.** Small, safe, and naturally part of C2's landing rather than its own pass.

### C4 — Ingress as an entity: what binds to the DOM, and what disarms it

**Current cluster.** The two root listeners and their stable identities, `#ingress`, the click suppressor (`#disarmClick`, `#armClickSuppressor`), the primary-press test, the per-operation arming of document listeners and capture (`pointer.ts` in function form, called from `#mintOperation` and `#acquireActivation`), and the three ingress-side acts at the threshold crossing in `#handleMove` (`preventDefault`, selection clearing, suppressor arming).

**Problem.** These are the kernel's only DOM-listener concern and they have their own reason to change — O-3's touch measurement (long-press, tap highlighting) is a pending obligation that will land here and nowhere else — but they share a class with the phase machine. The click suppressor is controller-scoped for a stated reason (it catches an event that arrives after the operation) and is composed onto the ingress signal with `AbortSignal.any`; that relationship is the ingress's own.

**Proposed entity.** One controller-lifetime object owning `root`, the ingress abort, the bound listeners and the suppressor, with `arm(types, onPress, onCommand)`, `abort()`, `activated(sample)` for the crossing's three acts, and the arming helpers `pointer.ts` already provides. **It does not own** admission — `#runAdmission` is a frame transaction and a behavior call and stays with the kernel — nor the operation's lifetimes it arms listeners onto; those stay arguments.

**Why real, and why fourth.** The boundary is real: the state is one cluster with one invariant and one future reason to change. The leverage is lower than C1/C2 because the extraction removes no cross-module coupling — it relocates ~120 lines and one composed signal — and its value is mainly that a touch-policy change would not touch the phase machine. Worth doing when O-3 is taken up; not worth doing ahead of it.

**Risks.** `#commandHandler` must remain one identity per controller (dedup on `(type, callback, capture)`); step 7 of teardown aborts this entity's signal and the ordering with `#cancelTail` is normative.

### C5 — The sortable's per-operation state is one object, and the axis view is a projection of it

**Current cluster.** `SortableBehavior.#operation` (`presentation`, `activePlaceholder`, `lift`, `pendingSpatial`, `progress`) and `PresentationView` (`realm`, `placeholder`, `item`, `box`, `settle`, `space`, `live`, `snapshot`, `insertion`), both created in `effectActivation`, both cleared in `retire()`, with the frame part carrying `item`, `snapshot` and `insertion` as well.

**Problem.** Two per-operation objects for one operation, and the second mirrors state the first and the frame already hold: `activePlaceholder === view.placeholder` always; `view.snapshot` is rewritten in `effectAction` on every structural publication ([`sortable/spec.ts`](../../../src/sortable/spec.ts) §`effectAction`) and diverges from the frozen `frame.snapshot` after release — a divergence nothing reads, because the spatial action is refused outside `ACTIVE`, but one the code maintains on every `invalidate()`; `view.insertion` is written and nulled around the committed-move bracket so an axis sees the gap the frame already committed. The free-drag module states the rule this violates — _the behavior derives, the kernel records its own writes, and neither reads the other's copy_ ([`free-drag/frames.ts`](../../../src/free-drag/frames.ts)) — and the sortable keeps two mirrors.

**Proposed shape.** One per-operation object built at `effectActivation` and dropped at `retire()`, carrying the placeholder, the lift projection, the per-operation constants (`box`, `settle`, `space`, `live`, `realm`), `pendingSpatial` and `progress`. The axis receives the same object under the narrower `InsertionRuntimeView` — the projection-by-type arrangement `BehaviorLiftSession`/`VisualLiftSession` and `BehaviorContext`/`Kernel` already use — and reads `snapshot` and `insertion` from the frame view it is also handed, which holds the committed values at both call sites (`prepare` sees the draft copy of the committed snapshot; `effect` sees `current`).

**Why real.** One object per lifetime, and the two mirror writes become impossible rather than maintained. The `retire()` field list shrinks to the object.

**Risks and constraints.** `InsertionRuntimeView` is published at `sortable/feature.js`; removing `snapshot` and `insertion` from it, or reading them from `InsertionFrameView` instead, is a middle-tier surface change under §4 and the declaration suites. The per-operation object must still be allocated once per operation and never per call (I-26). `xy.ts` and `y.ts` read `runtime.snapshot` and `frame.insertion` today, so the axis rule modules change at their call signatures.

**Priority.** Medium; independent of C1–C4; blocked on an owner call about the middle-tier type.

---

## 4. Non-extractions — investigated and left where they are

- **The operation lifecycle is one state machine and stays one.** Activation, release, resolution, settlement, the join, the failure checkpoint and its `ERROR_REPORTED`, cancellation precedence and retirement — `#activate` through `#handleErrorReported`, roughly 1 200 lines — all read the frames, the driver, the spec and the operation record, because every step of an operation is a transaction over the published frame. An `Operation` executor would need all four handed to every method; that is the boundary the brief said to reject, and it is rejected. The reasons to change here are one reason: the phase table in contract 02. What C1–C3 remove from around it is the other five.
- **`SeamDriver` is not merged back into `Kernel`.** D-170 converted it as a long-lived entity and the reading here agrees; the correction runs the other way — the frames join it (C2).
- **`SortableBehavior`'s seam set stays together.** Admission, placeholder preparation and adoption, the spatial and collection actions, release, settlement, the anchor and the terminal are one lifecycle over one placeholder and one committed gap. The reasons to change that look separable — input policy, collection reconciliation, settlement mapping — are already separated as pure modules (`keyboard.ts`, `collection.ts`, `placement.ts`, `domain.ts`) and the class is what sequences them. C5 changes what it holds per operation, not what it does.
- **The `progress` marker is behavior knowledge and stays duplicated.** The kernel knows when `activation.effect` returned and when `invoke` ran; it cannot know that the effect reached `onStart` before returning, and `STARTED` is written on the statement before that call. Both behaviors carry the marker, the `#transaction.failure` out-of-band slot and the ~40-line `SETTLED_FAILED` fallback in near-identical form, and a shared base is still the wrong answer: the two differ in the domain result they build, and the brief's warning against symmetry abstractions applies. **One SPI change would remove the duplicated slot from both** — `PreparedSettlement` is `true` today, and `Transition.Prepared` already admits any object, so the settlement `prepare` could stage the failure report for its `effect` instead of parking it on the entity. It is a frozen-type change and is raised in §6 rather than proposed.
- **`#tail` and the click suppressor are correctly controller-scoped.** Both exist after the operation that created them and would be cleared by an operation-scoped slot before their only reader. C4 gives the suppressor an owner; the tail's slot stays on whatever owns the lift (the kernel, or a presentation entity if one is ever warranted — it is not, at ~100 lines with one field).
- **`Lifetime`, `FrameTask`, the action queue's arrays, `Invalidator` — handles, not entities.** D-170 graded them and the reading here concurs: one field or two, one operation, no lifecycle of their own.
- **`RectIndex`, `LinearShift`, `y()`, `xy()`, `layoutAnimation()`, `bounds()` — correctly sized.** Each owns one cache or one map, exposes operations rather than storage, and threads liveness rather than holding it. The one duplication across them and the kernel — the four inlined `space.a * dx + space.c * dy` projections in `presentation.ts`, `layout-animation.ts`, `geometry.ts` and `#startTail` — is inlined on purpose at three of the four sites for the hot path, and a helper would be an indirect call on the pointer-sample path for no ownership gain.
- **`slots.ts` / `assemble.ts` / `config.ts` on both sides.** Construction-time flattening with a total unwind; no mutable state survives into the behavior except the flat record and the retire hooks. Nothing to extract.
- **`createSortableSpec` / `createFreeDragSpec` adapters.** A record with nested namespaces cannot be a class instance; the adapter is the shape the SPI demands and adds nothing.

## 5. The owner's hypotheses, tested

| Hypothesis | Reading |
| --- | --- |
| `Kernel` is over 2 kLoC after the operation-specific extraction | True, and not the criterion. About 1 200 of its lines are the one state machine that should stay together (§4); the rest is five other reasons to change sharing its `this` (§2). C1, C2 and C4 remove roughly 400 lines and, more to the point, remove the cross-entity bookkeeping (§`SeamContext`, the stamp handover, the slots) rather than the lines. |
| Fields form different lifetime clusters now that they are visible | Confirmed and sharpened: six transaction-scoped fields and one attempt-scoped record sit on the controller-lifetime object (§2), and each exists because an entity that should hold the value cannot see it. |
| `kernel/queue.ts` may be an entity | Partly falsified. The queue is a real but subordinate mechanism — FIFO, `running`, `drain` — and the field that made it look like an entity, `closed`, is not the queue's. The entity is the execution bracket (C1), of which the queue is one member. |
| Queueing, transaction boundaries, logical closure and deferred teardown are coordinated from `Kernel` | Confirmed, and they are one invariant with one owner missing (C1). Note that _transaction_ names two things in the record — D-36's library transaction and contract 04's frame transaction — and they are two entities, not one. |
| Equally important boundaries elsewhere | One: the sortable's two per-operation objects and their mirror writes (C5). The feature tier and free drag are already decomposed by ownership. |

## 6. Questions raised, not answered

1. **`InsertionRuntimeView` is public at `sortable/feature.js`.** C5 either narrows it (drop `snapshot`, `insertion`) or leaves the axis reading mirrored fields. Which surface change is the owner willing to take?
2. **`PreparedSettlement = true` is a frozen SPI type.** Letting the settlement `prepare` stage the failure report removes an identical out-of-band slot from both behaviors. Is a Prepared-type widening acceptable at this tier, or does the slot stay as the accepted channel?
3. **Accessor cost on the sample path (C2).** M-1 shows the frame copy at 3.7% of a sample; it does not show what a `current` accessor costs, and D-170 accepted getters for `RectIndex` on a counted hot path. The implementation pass owes a count of per-sample reads and an m1 run, and the decision between _accessors_ and _a kernel-held reference the transaction reassigns_ turns on that number, not on this document.
4. **One entity or two (C1/C2).** Recommended as two; the merged session is the fallback if the second class costs more than its boundary buys on the size instrument.
5. **Where does `spec` live after C1?** The channel needs `spec.reportError`; the transaction needs `createFramePart`/`resetFramePart`; the kernel needs everything else. Holding the spec on the kernel and handing the two entities their one member each is the least coupling, and it is the shape the implementation pass should try first.

## 7. The proposed architecture map

```text
Controller lifetime ─────────────────────────────────────────────────────────
  Kernel (implements BehaviorContext; the façade the behavior holds)
  ├── Bracket        owns: queue arrays, running, closed, depth, teardownPending,
  │                        admitting, destroy promise; the channel (notify/report/
  │                        unwind, panic)                                    [C1]
  │                  calls: drain step, physical teardown, report (kernel callbacks)
  ├── Transaction    owns: current, draft, pinned, phase machine (open stage,
  │                        failure latch, staged value, re-entry), begin/commit/
  │                        scrub; stamps the phase it is asked to           [C2]
  │                  reads: bracket.closed and operation.cancelRequest through
  │                         the kernel's preparationValid composition
  ├── Ingress        owns: root listeners, ingress abort, click suppressor,
  │                        capture/document arming helpers                  [C4]
  ├── tail slot      owns: the one Animation; cancelled at lift and teardown
  └── Operation      owns: identity, visual/box/item, three lifetimes, cancel
      (nullable)           latch, activation sub-record, resolution + settlement
                           attempts; released as one act                    [C3]

  SortableBehavior / FreeDragBehavior (controller lifetime, unchanged)
  └── SortableOperation (per operation): placeholder, lift projection, per-op
      constants, pendingSpatial, progress — the axis sees it as a projection [C5]

Kernel keeps: the phase table's handlers, activation acquisition, release,
resolution, settlement, join, failure precedence, retirement — the operation
state machine, unchanged as one unit.
```

Who initiates each transition: the bracket closes on `destroy()`/panic and runs teardown at depth 0; the kernel mints and retires operations and asks the transaction to begin/commit; the transaction never retires an operation and the bracket never touches a frame; the behavior registers disposers on operation lifetimes it cannot close.

## 8. What the implementation pass must measure, and what it must not change

- **Measure:** the pointer-sample path under C1 and C2 (`tests/perf/m1*.browser.test.ts`), with a per-sample count of accessor reads stated before the run; Brotli per composition after each of C1, C2, C5 separately (§15), attributed under SC-1; retained heap per controller (M-2′) since two classes replace one.
- **Do not change:** I-1, I-3, I-4, I-6's seven steps and order, I-11/I-13, I-16, I-21/I-22, I-23, I-26, I-31, I-33, I-34, I-36/I-37; `BehaviorContext`'s seven members and the structural narrowing at `behavior(kernel)`; the `closed` getter's liveness (D-53); D-155/D-166's join order; D-170's ownership clauses and the receiver gate.
- **Delete with C2 rather than preserve:** `runLeafValue` (no production caller at the snapshot), `isInSeam` (test-only), the `NO_STAMP` sentinel and the stamp handover, the dummy `SettlementAttempt` in `#handleFailed`.