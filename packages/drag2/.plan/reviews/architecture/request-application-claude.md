# Requests and their application: request/effect separation for drag2's execution units

**Canonical entries:** `drag2:D-202`, which supersedes `drag2:D-201`, decides `drag2:F-432`, `drag2:F-433` and `drag2:F-434` in D-201's place, and raises and decides `drag2:F-435`. The decision, its required properties and its steps are stated in [`00-index.md`](../../contract/00-index.md) and are not restated here. This record holds the evidence, the reasoning, the alternatives, the contract and surface tables, the cases and the handoff.

**Input:** `6905af249` on `drag2/fin-review2`. `src/` is unchanged from D-201's input `0ed5483a0` except for the owner's uncommitted edits to `src/kernel/execution.ts` (a comment and a lint suppression at the post-admission latch read) and `tests/kernel/seams.node.test.ts` (one assertion spelling). Both were read and left as they are. They change no behavior, and every probe below ran with them in the tree. D-202 deletes the statement the `execution.ts` suppression is attached to, as D-201 did.

**Commission:** [`reentrancy-redesign-brief.md`](../../reentrancy-redesign-brief.md) §Governing owner follow-up. A consumer requests a transition and the library applies it at a defined execution boundary. Registering a request must not change the lifecycle, operation or other execution context of the running unit. Renaming `destroy()` while keeping immediate logical closure would not meet this, and neither would a pending-request flag read throughout the sequence. The snapshot property of §Governing owner clarification remains the goal, and [`snapshot-units-claude.md`](snapshot-units-claude.md) (D-201) holds the evidence this record reuses.

**Probes** are in the repository at [`.plan/probes/snapshot-units/`](../../probes/snapshot-units/), with a script that reruns all of them (Appendix).

## 1. Why D-201 does not meet the follow-up

D-201 made a unit's _context_ exclusive: frames, records and controller-scope bindings cannot change under a running unit. It kept the existing _control_ model, in which `destroy()` sets the logical latch on the calling statement and `cancel()` latches a request on the operation record. D-201 then confined the readings of those two facts to named points: seam commit (PP-1), round-trip opening (PP-2), admission publish (PP-3), controller publish (PP-4), and one event sink per route.

Each of those points is a place where a request changes what the running unit does next. That is the property the follow-up rules out.

| Point in D-201 | What a request raised earlier in the same unit changes |
| --- | --- |
| PP-1, seam commit | `effect` becomes `rollback`: the prepared transition is discarded |
| PP-2, round-trip opening | the consumer's resolver is not invoked |
| PP-3, admission publish | the minted operation is discarded rather than published |
| PP-4, controller publish | the controller is unwound rather than armed |
| event sinks | `onStart`, `onEnd`, `onError`, `onMove` are skipped |

**P5 records the same dependence in today's code**, at `6905af249`, in Chrome:

- `cancel()` in `activation.prepare` reads `closed=false`, yet the transition rolls back and the operation retires.
- `destroy()` in `activation.prepare` reads `closed=true` on the very next statement. Physical teardown has not run yet.
- `destroy()` in `release.effect` means the round-trip never opens.
- `destroy()` in `anchorTarget` means the join never runs.

D-201's participation-slot revision and its queued-slot fallback both took this latch-at-statement as given. They differ only in which consumer slots still run after it is set. The follow-up removes the premise, and that question goes with it (§2.5).

**One further defect came out of P5.** A `cancel()` raised inside `release.effect` reaches settlement with `stage: AT_CONSUMER`, although the consumer round-trip never opened. The kernel derives the stage from the phase (`RELEASING`), not from whether `invoke` ran. Both behaviors copy the kernel's `input.stage` into the public `canceled` result (`sortable/spec.ts:1574`, `free-drag/spec.ts:806`). A correctly integrated consumer therefore receives a stage that claims it saw a drop it never saw. **F-435**, tier A.

## 2. The design

### 2.1 Three kinds of call, kept apart

Every entry into the library from outside a running unit is one of three kinds. The design treats each differently.

| Kind | Examples | What the call may do |
| --- | --- | --- |
| **Request** | `requestDestroy()`, `requestCancel()`, `invalidate()`, `moveTo()`, `dispatch()`, the operation-level half of `fail()`, a pointer or key sample, an async completion | record an intention in the **ledger** and return. It never changes a unit's context or decides anything the running unit reads |
| **Result** | a `prepare` return, a throw, `kernel.fail()` inside an open phase | determine the outcome of the phase that is running. It is the unit's own computation, not a request |
| **Query** | `items()`, `handle`, `visual`, `box`, `placeholder`, `home`, the landing timing, the bounds source, `resolveInsertion`, `onReorder`'s return value | return a value the unit uses. Isolating it from later mutation is an ownership question (§2.12), not a control one |

**Native ingress is none of the three.** A `pointerdown` or command keydown has to be decided synchronously, inside the native listener, because `preventDefault()` cannot be deferred. It is therefore never queued. It is admitted as a unit when no unit is running and the controller is open, and refused otherwise before it touches any state (D-201 G2 and G3, unchanged).

### 2.2 The ledger

The **ledger** is every fact a request writes:

- the controller's lifecycle request: `LIVE`, `REQUESTED` or `CLOSED`;
- an operation's cancel request;
- the action queue, including kernel-queued continuations;
- a failure checkpoint's capture of the cancel state at intake (§2.10).

The ledger is read in exactly three places:

1. **The runner's admission decision**: before each queued unit, before an ingress pass, and when the outermost unit ends.
2. **A unit's entry**: currency (identity, phase, attempt) and precedence (a held cancel at `START_COMMITTED` and `FAILED`). The entry is the unit's application boundary, so reading the ledger there decides whether and how the unit applies. It does not change a unit that is already running.
3. **Request intake**: whether a request is registered at all (§2.6 phase rule, duplicate cancel, `CLOSED`), and the diagnostic channel's refusal after application.

**No unit reads the ledger after its entry.** This is the follow-up's property, stated as something that can be checked. Every reading D-201 placed at PP-1 to PP-4 and at the event sinks is deleted, together with every reading D-201 had already marked for deletion.

### 2.3 Units and their application boundaries

The four unit kinds of D-201 §2.1 remain, with one boundary moved:

| Unit | Entered by | Its application boundary |
| --- | --- | --- |
| **U-C** construction | `draggable()`, **from before the behavior factory** through the arm and publication | when U-C returns, after the controller is published |
| **U-I** ingress pass | a native `pointerdown` or command listener, at depth 0 | when admission has published or discarded |
| **U-A** one queued action | the runner, one entry at a time | when the handler returns |
| **U-T** applied destruction | the runner at a boundary, or `requestDestroy()` at depth 0 | — (it is the application) |

**The rule.** A request registered while a unit runs is applied after that unit, and never inside it. When no unit is running, the next boundary is the request call itself, so the request is applied before the call returns. Today's `dispatch` already behaves this way, and the rule extends it to destruction and cancellation.

Two alternatives were rejected:

- **Always defer to a microtask.** This would add a hop the brief does not require. It would also open a window in which a `REQUESTED` controller must refuse native ingress, which is a second refusal state to maintain.
- **Apply destruction at the end of the whole drain rather than the running unit.** This would let units that were queued before the request run after it, which is the reverse of what a consumer asking to stop wants.

### 2.4 Destruction: requested, then applied

`requestDestroy()` on a `LIVE` controller sets `REQUESTED` and returns the controller's one promise. That is the whole of the call when a unit is running. At depth 0 it then applies at once.

**Between the request and its application** the running unit completes its captured sequence exactly as it would have without the request. Every callback it makes is a live controller's callback:

- participation slots;
- `onStart`, `onMove`, and `onEnd` with its `finalized` publication;
- diagnostic `onError`;
- frame commits and the effects of committed seams.

Requests raised in the interval are recorded as usual and discarded at application. The interval cannot contain a second unit. Units do not nest, and no other unit is admitted once `REQUESTED` is set. **This is not "callbacks after destruction"**, because destruction has not happened. It is the remainder of a unit that began before the request.

**Application** is one step, in this order:

1. lifecycle becomes `CLOSED`;
2. the queue is cleared, releasing its arguments;
3. physical teardown runs: steps 3–7 of today's sequence, in the same order and with the same wrapping;
4. the promise settles.

Logical and physical closure now coincide. D-36's window, in which the latch was closed while teardown was owed to a later boundary, no longer exists.

**After application:**

- no consumer slot is invoked;
- no operation is admitted;
- nothing is published or announced;
- every request is a no-op: `requestDestroy()` returns the settled promise, `requestCancel`, `invalidate`, `moveTo` and `dispatch` are dropped, and a `fail` is dropped silently;
- native ingress is refused.

The one exception stays as it is: **panic** (a throw escaping a handler) is an immediate application whose order is close, report, tear down. The unit that threw has already been abandoned by the exception, so there is nothing left to run against a snapshot. Teardown's own DOM effects can reach consumer code, for example a custom placeholder's `disconnectedCallback` on removal. These are effects of physical release, not slot invocations, as today.

**What a consumer learns.** The request is always accepted, so there is no acceptance signal. The promise settles exactly once, after application, which now includes physical teardown. Repeated calls return the same promise.

### 2.5 What happens to D-201's callback tradeoff

The tradeoff disappears rather than being decided. I-36 (a) is restated against **application**: no declared slot is invoked after applied destruction, and that holds literally because no unit runs after application. The per-invocation latch reading I-36 required of a participant is withdrawn in full. There is nothing to read, because nothing a callback can do changes the lifecycle a running unit could observe. With it go:

- `BehaviorContext.closed`, D-53's sanctioned liveness member;
- `InsertionRuntimeView.live` and the `live` parameter of `DisplacementReport`, D-13's fourth widening, which existed only to carry that reading into feature loops;
- every behavior's `kernel.closed` and `live()` reads, including D-201's event sinks.

The kernel keeps one read of its own, in `#notify`: it refuses a diagnostic after `CLOSED`. That is intake for producers and teardown, not a reading inside a unit.

**The consumer round-trip is the one place where the library chooses a boundary rather than inheriting one** (§2.8). Everywhere else the unit granularity D-201 settled is unchanged.

### 2.6 Cancellation: registration, target, application, lapse

- **Registration.** `requestCancel(reason)` registers against the operation committed at intake, `current.operation`, and records its identity. Nothing is registered, and the call is a no-op, if any of these holds:
  - there is no committed operation (idle, or inside admission or construction);
  - the operation's committed phase is not `PENDING`, `ACTIVATING`, `ACTIVE` or `RELEASING` (D-201 property 6; F-434);
  - a cancel is already registered for that operation;
  - the controller is `CLOSED`.

  The first registered request wins, with its reason and origin. Later ones are ignored.

- **Application.** A `CANCEL` entry carrying the identity is queued in FIFO order (§2.7). At its entry the unit applies the request only if the identity is still current and the phase is still cancellable:
  - `PENDING` retires the operation silently;
  - `ACTIVATING`, `ACTIVE` or `RELEASING` opens the cancellation settlement.

  The request is consumed either way.

- **Lapse.** If the operation was retired or reached `SETTLING` before the entry is applied, the request lapses with no effect and no diagnostic. A lapsed request was never applied, and the operation's own terminal reports what happened.

- **Stage (F-435).** The settlement input carries `AT_CONSUMER` exactly when the consumer's `invoke` has been called for that operation, and `AT_PROPOSAL` otherwise. Phase is no longer the test. This agrees with the behaviors' own D-66 progress marker, which already sets `RESOLVING` as the first statement of `invoke`.

- **What a consumer learns.** `requestCancel` returns `void`, and acceptance is deliberately unobservable: it has no consumer consequence until application. Application is observable through the terminal:
  - an operation that announced a start gets `onEnd` with the `canceled` arm, carrying the registered reason by identity and the origin;
  - a `PENDING` operation ends silently (no start, no terminal);
  - a lapsed request leaves the operation's own terminal in place.

**Consequence for a cancel raised during activation.** A cancel raised in a slot reached from `activation.prepare` no longer rolls the activation back. The activation commits, `onStart` is delivered, and the queued `CANCEL` applies at `ACTIVATING` and settles `canceled` at `AT_PROPOSAL`. This is the result a cancel raised from `onStart` already produces, so the two now agree. `rollback` loses its only trigger (§2.11).

### 2.7 Ordering and priority

- **Destruction has priority.** It is applied at the next boundary, ahead of everything queued, and discards the queue.
- **Everything else is FIFO**: cancel, failure checkpoints, behavior actions, consumer `invalidate`/`moveTo`, pointer samples and kernel continuations. Requests registered by one unit apply in registration order, after any entries queued before them.
- **I-22's precedence `DESTROY > CANCEL > FAILURE_CHECKPOINT` is kept, and both halves are now decided at a boundary.**
  - Destroy by priority.
  - Cancel over a checkpoint by the rule in §2.10.
  - The `START_COMMITTED` entry still declines to commit `ACTIVE` while a cancel for its operation is registered. That is a unit-entry reading.
- **Native ingress is never ordered against the queue.** It runs only when no unit is running.

### 2.8 The consumer round-trip opens in its own unit

`release.effect` is followed by the consumer's resolver, `invoke`, which is `onReorder` for the sortable. Today the release unit opens it after the effect returns, if PP-1's predicate still holds (the staging conditional at `seams.ts:317`). Under request/effect separation that predicate is a ledger read inside the unit. Two designs are available.

- **(a) The release unit opens the round-trip unconditionally.** A cancel or destroy raised in `release.prepare` or `release.effect` would still see the consumer asked to commit a reorder. For destroy, the attempt is then aborted at application. For cancel, it settles `AT_CONSUMER`.
- **(b) The round-trip opens in its own queued unit** (**chosen**). The release unit commits `RELEASING`, runs `release.effect`, and queues `OPEN_RESOLUTION` carrying the operation identity. At its entry that unit opens the round-trip only if the operation is current and `RELEASING` and no round-trip has been opened for it.

**Why (b).** The round-trip is the one consumer callback that starts a consumer-side domain transaction and carries an abort channel. Every other slot is a lookup or a notification. Under (b), a cancel or destroy request registered before the round-trip is applied before it opens, because destroy has priority and a `CANCEL` queued earlier comes first in FIFO. **No round-trip opens after a request against its operation has been registered**, and that holds by queue order, not by a guard. It also removes the staging conditional, which is the last ledger reading in the driver. It also makes the stage rule in §2.6 exact, because the window between `RELEASING` and `invoke` now contains whole units.

**What (b) changes.** Work dispatched during `release.effect` now applies before the round-trip opens rather than after it. Today the resolver runs inside the release unit, ahead of anything that unit dispatched. The only producers of such work are consumer code reached from `release.effect`, such as a custom placeholder's reactions to the release move, and behavior actions that effect dispatches. The implementer inventories the second group (§8, step 3). One queue entry per drop is not on the per-sample path.

**Why D-201's objection to splitting does not carry over.** D-201 rejected splitting _participation slots_ into queued units. That would have moved many lookups and the `AT_PROPOSAL`/`AT_CONSUMER` staging. Here one call is split, the one whose position defines that staging, and the stage rule becomes exact rather than displaced.

The staged `ResolutionCommand` now outlives the release unit. It moves to operation scope until `OPEN_RESOLUTION` consumes it or the operation retires. The carrier is the implementer's choice: a slot beside the resolution attempt, or the queue argument. It must not add an allocation per pointer sample, and it must not be readable by a later operation.

### 2.9 Construction

U-C now spans the whole of `draggable()`: the behavior factory, the static validation, both frame-part compositions, ingress attachment and publication.

- **A destroy requested anywhere in U-C** is applied after U-C publishes. Both frame parts are composed, ingress is attached and then aborted by application, the spec is retired once and each frame is reset once. `draggable()` returns a controller whose destruction has been applied and whose promise has settled.

  This replaces the arm-time latch tests (`kernel.ts:2477`, `:2481`, `:2491`) and D-201's PP-4. Attaching and then aborting a listener within one synchronous call is unobservable: no event can arrive in between.

- **A failure in U-C**, whether static validation, a factory throw or an attachment throw, still unwinds and rethrows (01 §When construction itself fails). The queue is cleared with it.

- **`dispatch` during U-C is queued and applied after publication**, the first U-As the controller runs. Today it is dropped silently, because no machinery exists to run it. That was a request with no boundary to apply at, and U-C supplies one. A behavior that dispatches from its factory, or from a feature installer, now has the action applied instead of losing it.

- **`requestCancel` during U-C** is a no-op, because there is no operation. **`fail` during U-C** is demoted silently, as today, because the reporter is not armed.

### 2.10 Failures: a result and a request

`kernel.fail(stage, error)` inside an open phase is two things:

- **A result** for the running phase. The driver latches it and the phase returns `FAILED`, exactly as for a throw. It is the unit's own outcome, not a request against it, and it stays.
- **A request**: the classified checkpoint, queued for the operation committed at intake.

`fail` outside a phase is demoted to a warning, as today.

**A checkpoint registered while a cancel request for its operation is registered and unapplied is superseded by that cancel.** Intake records the fact on the checkpoint. The checkpoint's application decides on that record (or on a cancel still held at its entry), and reports `drag: failure/superseded-by-cancel`.

The intake demotion `#failOperation` makes today on a held cancel (`kernel.ts:784`) is withdrawn. It delivered `onError` synchronously inside the running unit, depending on a request, and it ran under a different code (`failure/not-classified`). The other intake demotions are context checks, not ledger reads, and stay: no committed operation, a report already in flight. A failure raised by the cancellation settlement itself, registered after the cancel was applied, is reported, as today.

### 2.11 What deleting every in-unit reading removes

Once no request can invalidate a successful `prepare`, the following have no trigger:

- the seam driver's `preparationValid` dependency;
- `SEAM_INVALIDATED`;
- the `rollback` member of `Transition` and `ActionTransition`, and so `BehaviorSpec.activation.rollback` and `BehaviorSpec.action.rollback`;
- the `seam/rollback-failed` path;
- the sortable's D-39 placeholder undo ledger, which only `rollback` replays (`sortable/spec.ts:790`, `:816–829`).

**I-16 reduces to: a staged value reaches `effect` exactly when its transition commits.** A `prepare` that throws after writing onto a consumer-supplied placeholder is unchanged by this. The ledger never handled that case: it is reset by the next preparation. D-202 neither adds nor removes protection there.

### 2.12 Query results and request arguments

The follow-up warns that calling something a query does not isolate a mutable object reachable through it. Each source's treatment:

| Source | Result or argument | Treatment |
| --- | --- | --- |
| `items()` | an array | a **new identity** is shallow-copied before use (existing); **in-place mutation of the same array** is outside the contract, tier C under the integrator-trust policy, unchanged |
| `handle`, `visual`, `box`, `placeholder` | elements | **targets**, captured at the call; their state is environment, observed live (D-201 §2.3 row 6) |
| `home`, `anchorTarget`, landing timing, bounds source | points, rects, timing records | **read into unit-owned values at the call**, before any further foreign code runs. Implementation confirms each site and copies where it does not already |
| `onReorder`/resolver return | a value or thenable | read once at the call; `then` read and subscribed under one `try` (existing) |
| `moveTo(point)` argument | a consumer object | **captured at intake**. Today the action reads `point` at application, so a consumer that reuses one object across calls inside a unit can change an applied position after the request. One copy per `moveTo` call, not per pointer sample |
| `requestCancel(reason)` | an opaque value | passed through by identity and never read into, so no capture |
| consumer config and slot records | functions and options | **captured at construction** (D-201 §2.3 row 5, E6), unchanged |

### 2.13 What D-201 carries forward unchanged

- the unit kinds and the producer rule (§2.1 there);
- capture at entry: controller, operation and action scope (§2.2 there);
- the mutable-state classes (§2.3 there). Row 4, "requests", now includes the lifecycle request, and §2.2 here states where it is read;
- the ingress refusal while any unit runs, with the disarm behind it (F-433);
- construction at depth ≥ 1;
- the unconditional post-admission drain, which now handles nothing when destruction was requested;
- the `Kernel` split into a façade and an armed controller (§2.5 there). The façade now owns the ledger's lifecycle request;
- D-199's extraction rule, teardown deduplication and comment pass;
- no module-level mutable binding;
- I-26;
- stale asynchronous results' double validation by attempt identity, with no latch conjunct.

## 3. API and SPI contract

| Member | Today | After D-202 | Completion |
| --- | --- | --- | --- |
| `SortableController.destroy()`, `FreeDragController.destroy()` | closes logically on the statement; promise after physical teardown | **`requestDestroy(): Promise<void>`**: registers; applied at the next unit boundary, at once when none runs | settles once, after application, which includes teardown; same promise on every call |
| `…Controller.cancel(reason?)` | latches; first valid wins; may roll back a running preparation | **`requestCancel(reason?): void`**: registers against the committed operation in a cancellable phase; applied FIFO; lapses if the operation is decided first | no return; outcome is the terminal (§2.6) |
| `SortableController.invalidate()`, `FreeDragController.invalidate()` | queued action | unchanged name and semantics; documented as a request applied FIFO | none |
| `FreeDragController.moveTo(point)` | queued action; `point` read at application | unchanged name; **`point` captured at intake** | none; the next committed frame |
| `BehaviorContext.destroy()` | as the consumer member | **`requestDestroy()`**, same semantics as the consumer member | as above |
| `BehaviorContext.cancel(reason?)` | as the consumer member | **`requestCancel(reason?)`** | as above |
| `BehaviorContext.closed` | the latch, read live | **removed** (D-53 withdrawn) | — |
| `BehaviorContext.dispatch(tag, arg)` | dropped before arming; FIFO after | FIFO, **queued during U-C** and applied after publication | none |
| `BehaviorContext.fail(stage, error)` | phase result plus checkpoint; demoted outside a phase | unchanged, except supersession by a registered cancel is decided at application (§2.10) | `onError` at the checkpoint's application |
| `Transition.rollback`, `ActionTransition.rollback`, `BehaviorSpec.activation.rollback`, `BehaviorSpec.action.rollback` | called on an invalidated preparation | **removed** | — |
| `InsertionRuntimeView.live`, `DisplacementReport`'s `live` parameter | the latch as a predicate | **removed** | — |

**Why the two names change and `invalidate`/`moveTo` do not.** `destroy()` and `cancel()` promised immediacy: closure on the statement, and a latch that changes the running preparation. That promise is withdrawn, and the names would keep stating it. `invalidate()` is a notification that something external changed, and `moveTo()` was already documented as a queued action. Neither ever promised more than a request. Every change in this table is to an unreleased API (CONTRIBUTING §8, as D-200 recorded for `useWhile`).

## 4. Consumer-visible changes, complete

1. The two renames above, on both controllers.
2. **In the interval between a destroy request and its application**, the running unit completes. A consumer that requests destruction from a slot can therefore still see later callbacks of that same unit:
   - participation slots;
   - `onStart`, if the request came from `activation.prepare` or a placeholder reaction;
   - `onEnd`, if the request came from `anchorTarget` or `home`.

   No later unit runs, so there is no `onEnd` for an operation whose start was delivered in the requesting unit. I-31's antecedent ("the controller remains alive") fails.

3. **A cancel raised during activation** delivers `onStart` and then `onEnd` `canceled` at `AT_PROPOSAL`. Today the drag ends silently.
4. **A cancel or destroy raised in `release.prepare` or `release.effect`** never opens the round-trip. That is today's outcome, and it now holds by order rather than by a guard. A cancel raised there now reports `AT_PROPOSAL`; today it reports `AT_CONSUMER` (F-435).
5. **`dispatch` during construction** is applied after publication instead of being dropped. This is a behavior-author change, not a consumer one.
6. **`moveTo`** applies the coordinates the consumer passed at the call.
7. **A failure checkpoint superseded by a cancel** is reported at its application as `failure/superseded-by-cancel`, where some cases today report `failure/not-classified` at intake.

## 5. Contract text the implementation amends

Each amendment lands with the step that makes it true, never ahead of it (F-63).

| Section | After D-202 |
| --- | --- |
| 05 I-1, 02 §Queue semantics | a request registered while any unit runs applies after it, in FIFO order, construction included; native ingress is refused while any unit runs, before any state is touched |
| 05 I-3, 02 §Post-callback revalidation | a successful preparation commits; no request can invalidate it, because requests apply at boundaries; the revalidation section becomes the unit-entry currency rule |
| 05 I-6 | rewritten: requested versus applied destruction (§2.4), application as one step, the promise, idempotence, panic's order, and "afterwards" counted from application; the participant clause is withdrawn |
| 05 I-7 | "`destroy()` during a tail" becomes "applied destruction during a tail" |
| 05 I-16 | a staged value reaches `effect` exactly when committed; `rollback` withdrawn |
| 05 I-21 | registration phases, first registration wins, FIFO application, lapse |
| 05 I-22 | the precedence, stated at application (§2.7, §2.10) |
| 05 I-31 | D-40's clause counts from **applied** destruction; a terminal delivered by the unit in which destruction was requested precedes application |
| 05 I-36 | (a), (b) and (c) after application; the interval clause; the per-invocation reading withdrawn; D-51's list unchanged and empty |
| 05 I-37 | unchanged rule; there is no liveness reading inside a unit for it to govern, only intake |
| 02 §The tri-phase transition, §Every classification entrypoint latches, §What this actually guarantees | no invalidated outcome; no `rollback` row; a new tier-B row: _no unit reads the ledger after its entry_ |
| 02 §Release ordering, §`ResolutionCommand` | the command is executed by its own unit (§2.8) |
| 02 §The settlement input is discriminated and exhaustive | the cancel stage rule (§2.6, F-435) |
| 02 §Attempts | no latch conjunct at the producer |
| 01 §`BehaviorContext` | renamed members; `closed` removed; the construction-window rows (dispatch queued; cancel no-op; fail demoted; destroy deferred to U-C's boundary) |
| 01 §`draggable()` and the two-phase handshake, §When construction itself fails, §Teardown across two owners | U-C spans `draggable()`; application at its boundary; teardown is application |
| 03 §`InsertionRuntimeView`'s `live` row, the `DisplacementContribution.report` and `MovedInsertion` documentation, the placement barrier | removed; the D-13 widening count is recorded, not rewritten |
| 07 | free-drag controller members; `moveTo`'s capture |
| `tests/COVERAGE.md` | §The execution bracket's first-entry clause gains R1/R12's falsifier |
| package README and the controllers' declarations | `requestDestroy`, `requestCancel` |

**Promises that survive unchanged:** I-4, I-17, I-18, I-19, I-20, I-23 to I-30, I-32 to I-35, and D-51's exception shape.

## 6. Guard sites, relative to D-201's classification

D-201 §4 classified every site at `0ed5483a0`. Its deletions stand. D-202 adds these to them:

| Site (`6905af249`) | D-201 | D-202 |
| --- | --- | --- |
| `kernel.ts:468–472` `#preparationValid`; `seams.ts:289`, `:317` | kept as PP-1/PP-2 | **deleted**, with `SEAM_INVALIDATED` and `rollback` |
| `seams.ts:608`, the activation policy's invalidated arm | — | deleted |
| `seams.ts:617–645` `runReleaseSeam`'s `execute` | kept, gated by PP-2 | the release unit queues `OPEN_RESOLUTION` instead (§2.8) |
| `kernel.ts:935` `#runAdmission`'s latch | kept as PP-3 | **deleted**: admission publishes unconditionally |
| `kernel.ts:2477`, `:2481`, `:2491` arm's latch tests | replaced by PP-4 | **deleted**: no PP-4; application at U-C's boundary |
| `kernel.ts:784` `#failOperation`'s cancel conjunct | kept (intake) | **moved** to the checkpoint's application (§2.10) |
| `kernel.ts:2045` `START_COMMITTED`'s held cancel; `:2076` `FAILED`'s | kept | kept (unit entry) |
| `kernel.ts:412` `#notify` | kept (sink) | kept as diagnostic intake: refuses after `CLOSED` |
| `kernel.ts:2355` `closed` getter | kept | **removed** with the SPI member |
| `kernel.ts:2010` the cancel stage from phase | — | stage from whether `invoke` ran (F-435) |
| behaviors' sinks (D-201 §4.2) | kept as sinks | **deleted**; `sortable/spec.ts:346` `#live` and every feature `live()` read deleted |
| `execution.ts:166` | `#closed` or any unit on the stack | `CLOSED` or any unit running |
| `execution.ts:186` | deleted | deleted (the owner's suppression goes with it) |
| `execution.ts` `#step` | latch | the lifecycle request: stops at `REQUESTED` or `CLOSED` |
| `execution.ts` `close()` | sets the latch | `requestClose()`: `REQUESTED` inside a unit; applies at depth 0; `#leave` applies at the outermost boundary |

**After D-202**, `grep` over `src/` for reads of the lifecycle state finds the runner, intake and `#notify`, and nothing else. For the cancel request it finds intake, the `CANCEL`, `START_COMMITTED` and `FAILED` entries, and nothing else. That is a structural acceptance criterion (§8). It is not a count.

## 7. Cases

**R1–R14 are executable today in the reference model** ([`model.ts.txt`](../../probes/snapshot-units/model.ts.txt)). The model is a self-contained toy with D-202's runner, ledger and unit boundaries. Its central check is trace equivalence: the unit that receives a request makes exactly the calls the baseline makes, and the request changes only what follows the boundary. The model establishes that the semantics are coherent and gives each case an executable statement. It is not evidence about `src/`. The implementation turns every row into a test against the real kernel and behaviors. _Today_ is `6905af249`, from P1, P2, P4, P5 or D-201's record.

| Case | Setup | Today | Required |
| --- | --- | --- | --- |
| **R1** | destroy requested in `handle` | admission discards (latch at PP-3) | `visual` and `box` still called; admission publishes `PENDING`; application after U-I tears it down; the post-admission drain handles nothing; next press refused |
| **R2** | destroy requested in `activation.prepare` | rollback; `closed=true` mid-unit (P5) | the activation unit's calls equal the baseline's; `onStart` delivered; then application; no `onEnd`; `START_COMMITTED` discarded |
| **R3** | cancel requested in `activation.prepare` | rollback; silent retirement (P5) | unit equals baseline; `onStart`; then `canceled` `AT_PROPOSAL` |
| **R4** | cancel requested in `release.effect` | no round-trip; `AT_CONSUMER` (P5, F-435) | no round-trip (`OPEN_RESOLUTION` lapses); `canceled` `AT_PROPOSAL` |
| **R5** | destroy requested in `release.effect` | no round-trip (P5) | no round-trip; no `onEnd`; application after the release unit |
| **R6** | cancel requested in `onReorder` | `AT_CONSUMER` | unchanged: `AT_CONSUMER` |
| **R7** | destroy requested in `anchorTarget` | join skipped; no `onEnd` (P5) | the settlement unit equals the baseline's, through `finalized`/`onEnd`; `RETIRE` discarded; application tears down |
| **R8** | late cancel in `anchorTarget` (F-434) | stranded in `SETTLING` (P4) | nothing registered; the drag is the baseline; next press admitted |
| **R9** | primary press dispatched from inside a unit (F-433) | second admission underneath (P1) | refused before any state change |
| **R10** | destroy requested with no unit running | — | applied before the call returns |
| **R11** | destroy requested in U-C (first frame-part factory) | teardown inside the factory; one part composed (P2) | both parts composed; controller published, then application: spec retired once, each frame reset once, ingress aborted; the promise has settled when `draggable()` returns |
| **R12** | in `onStart`: `dispatch A`, `requestCancel`, `dispatch B`; then the same plus `requestDestroy` | — | applied order `A`, `CANCEL`, `B`; with destroy, none of the three |
| **R13** | repeated `requestDestroy` | same promise | same promise, settles once |
| **R14** | cancel requested in `onEnd` | — | nothing registered; exactly one terminal |

**Implementation-only rows**, with no model counterpart:

| Case | Setup | Required |
| --- | --- | --- |
| **R15** F-432 (D-201 E3) | a command-type `addEventListener` dispatches a press and a command, then throws | `arm()` rethrows; no operation was minted; no listener left; nothing lifted |
| **R16** failure supersession | in one seam: `requestCancel` then `kernel.fail`; and the reverse order across two units | the first is reported `failure/superseded-by-cancel` at the checkpoint's application with one `onEnd` `canceled`; the second reports the failure |
| **R17** dispatch during U-C | the behavior factory dispatches an action | the action applies after publication, before `draggable()` returns |
| **R18** `moveTo` argument | inside `onMove`, `moveTo(p)` then mutate `p` | the committed position is the passed coordinates |
| **R19** mutable call target (D-201 E6) | reassign `options.onEnd` and `options.items` in `onStart` | construction-time functions reached |
| **R20** destroy while a resolution is pending (D-201 E10) | destroy at depth 0, then the thenable settles | applied at once; resolver's signal aborted; late settle dropped at intake |
| **R21** structural | `grep` for lifecycle and cancel-request reads | only the places §6 names |

**D-201's E-cases map as follows:**

- carried: E1 → R9, E3 → R15, E4 → R8, E6 → R19, E10 → R20, E12 → R1 and R12;
- changed: E2 → R11 (now published, then applied), E5 → R7 (`onEnd` now delivered), E7 → R1, E8 → R2 (`onStart` now delivered), E9 → R5 (now by order), E11 → R3 (now start and cancel).

**Tests that encode a withdrawn promise.** The implementer inventories them with `grep` and revises them with the step that changes the behavior:

- every test calling `destroy()` or `cancel()` on a controller or `BehaviorContext` (a mechanical rename);
- `kernel.closed` readers;
- `SEAM_INVALIDATED` and `rollback` rows in `tests/kernel/seams.node.test.ts`, including whether the owner's edited row is among them;
- the sortable D-39 ledger tests;
- the `live` threading tests in the rect-index, linear-shift and placement suites;
- construction rows asserting one composed part or a skipped factory (`tests/kernel/construction.node.test.ts`);
- tests asserting that a participation slot or `onStart`/`onEnd` is _not_ delivered after a destroy raised earlier in the same unit (`activation-barrier`, `calling-convention`, `free-drag/lifecycle`, `free-drag/validation`);
- the admission-only nested-pass refusal row in `tests/kernel/execution.node.test.ts`.

## 8. Implementation handoff

**Six steps, each one commit or more, each landing its cases and the contract text it makes true.** The `bench/size` composition figure is recorded on every kernel-carrying row after each step (CONTRIBUTING §15).

1. **The runner and construction.**
   - the lifecycle request (`LIVE`/`REQUESTED`/`CLOSED`) in the bracket;
   - `requestClose()` with depth-0 application and application at the outermost boundary;
   - `#step` stopping at `REQUESTED`;
   - U-C spanning `draggable()`, with dispatch queued during it;
   - ingress refused while any unit runs, with the click disarm behind the refusal;
   - the unconditional post-admission drain;
   - the arm-time latch tests deleted.

   Cases R9, R10, R11, R13, R15, R17, and R1's construction and drain half. Contract: I-1, I-6 (runner half), 01 construction sections, COVERAGE. `closed` stays readable through this step and reports `CLOSED` only.

2. **The split and capture** (D-201 step 2, unchanged):
   - the façade and the armed controller;
   - capture at entry and parameters below it;
   - teardown deduplication;
   - the module-binding census.

   Cases: D-201's capture assertions and R19.

3. **Kernel requests.** Delete every in-unit ledger read in the kernel and driver (§6):
   - `#preparationValid`, `SEAM_INVALIDATED`, `rollback` and its SPI members together with the sortable D-39 ledger, the staging conditional;
   - `#activationPolicy.committed`'s revalidation, `#settlementLive`, `#joinLive`, `#settleResolution`'s latch, `#handleErrorReported`'s latch, `#runAdmission`'s recheck.

   Add:
   - the cancel phase rule;
   - supersession captured at intake;
   - `OPEN_RESOLUTION` with operation-scoped command storage;
   - the cancel stage rule.

   **Inventory** the actions `release.effect` can dispatch in both behaviors and record whether any changes order (§2.8). Cases R1–R8, R12, R14, R16, R20. Contract: I-3, I-16, I-21, I-22, I-31, the 02 sections.

4. **Surface and behaviors.**
   - rename `destroy`/`cancel` to `requestDestroy`/`requestCancel` on `BehaviorContext` and both controllers;
   - remove `closed`, `InsertionRuntimeView.live` and `DisplacementReport`'s `live`, and every `kernel.closed` and `live()` read in `src/`;
   - capture `moveTo`'s argument at intake;
   - confirm or add the query-result copies of §2.12.

   Cases R18, R21. Contract: I-36, I-37, 01 §`BehaviorContext`, 03, 07, README and the declaration surface (`tests/**/*.declaration.test.ts` as the surface tests require).

5. **The comment pass**, D-199's, carried by D-201, over the files D-202 rewrote, with its rules and runtime-hash check.
6. **The measurement record** `.plan/measurements/d202-requests.md`. It holds:
   - composition on every kernel-carrying row, per step;
   - the M-1 move path with I-26's structural check (one sample allocates nothing; `OPEN_RESOLUTION` and `moveTo`'s copy are per drop and per call);
   - M-2 controller cost with the façade;
   - R21's read census, reported by location.

   Writing it is the last act, and its absence is the witness.

**Acceptance** is every R-case as a test against `src/`, passing; R21's structural property; and each contract row of §5 present in the same commit as the code that makes it true. A reduced guard count is reported and is not acceptance.

**Escalate rather than decide** if:

- step 3's inventory finds an action dispatched from `release.effect` whose new position before the round-trip changes a published outcome other than the cancel stage;
- §2.12 finds a query result that is a consumer-owned mutable object read after a later foreign call, where a copy would cost an allocation per pointer sample.

## 9. Accounting

- **D-201** is superseded before implementation. Everything in §2.13 is carried and restated in D-202. The publication points, the event sinks, the participation-slot revision and its owner veto point are withdrawn: their premise, immediate logical closure, is gone. D-201's unimplemented row is replaced by D-202's.
- **D-199** stays superseded. D-202 restates the three things it carried through D-201.
- **D-200** keeps its pending independent acceptance. No `Lifetime` or `ActionQueue` property changes. The bracket's reason for stopping widens from the latch to the lifecycle request, and that decision is returned through the callback, as D-180 requires. Property 3's first-entry clause gains R1 and R12 as falsifiers.
- **F-432** is decided by D-202 (R15) and closes when it lands. **F-433** (R9) and **F-434** (R8) likewise move from D-201 to D-202. **F-435** is raised and decided here (R4, R6).
- **Live obligations** O-2, O-3, O-4, O-5 and O-7 are untouched. SC-1 and SC-7 are recognitions the measurement record may meet.

## Appendix — probes

**Location and command.** Sources are in [`.plan/probes/snapshot-units/`](../../probes/snapshot-units/), stored as `*.ts.txt` because the package lint walks `.plan/` and these files describe one revision of `src/`. Rerun everything with:

```sh
packages/drag2/.plan/probes/snapshot-units/run.sh
```

The script copies the sources under `tests/zz-snapshot-units-probe/` as `.ts`, where their `../../src/` imports resolve. It runs P1, P2 and the model with `node`, and P4 and P5 in the package's `browser` Vitest project with `--silent=false`. That project's Chrome comes from `.scripts/vitest-config.ts`: `$CHROME_EXECUTABLE`, else `/usr/local/bin/chrome`. The script removes the copies on exit. No browser was installed for this run.

| Probe | What it shows | Source |
| --- | --- | --- |
| P1 | a press nested in a unit (F-433) | `p1-nested-ingress.ts.txt`, with `env.ts.txt` |
| P2 | destroy in the first frame-part factory | `p2-arm-destroy.ts.txt` |
| P4 | late cancel in `anchorTarget` (F-434) | `p4-late-cancel.browser.test.ts.txt` |
| P5 | requests raised inside a unit change its later calls today; F-435 | `p5-in-unit-requests.browser.test.ts.txt` |
| model | R1–R14 under D-202's semantics | `model.ts.txt` |

**Output at `6905af249`**, with the owner's uncommitted edits in the tree, run 2026-11-01:

```text
== p1-nested-ingress
action.prepare sees draft.phase=0 op=null
after nested press, draft.phase=1 op={"id":1}
action.effect sees current.phase=0 op=null
pointermove listeners after unit: 1
pointermove listeners after second press: 2
== p2-arm-destroy
createFramePart #1
  after destroy: pointerdown listeners=0
spec.retire
resetFramePart(tag=1)
arm returned; pointerdown listeners=0
destroy promise settled
== model
ok  R1 destroy in handle: admission completes, then destruction applies
ok  R2 destroy in activation.prepare: the unit runs as baseline, no terminal
ok  R3 cancel in activation.prepare: start, then canceled AT_PROPOSAL
ok  R4 cancel in release.effect: applied before the round-trip opens
ok  R5 destroy in release.effect: no round-trip, no terminal
ok  R6 cancel in onReorder: the attempt was opened, so AT_CONSUMER
ok  R7 destroy in anchorTarget: the join and its terminal complete first
ok  R8 late cancel in anchorTarget registers nothing (F-434)
ok  R9 a press dispatched inside a unit is refused (F-433)
ok  R10 destroy with no unit running applies before the call returns
ok  R11 destroy during construction applies after publication
ok  R12 FIFO among requests; destroy outranks everything queued
ok  R13 repeated destroy returns one promise that settles once
ok  R14 a cancel from onEnd registers nothing; exactly one terminal
== browser probes (P4, P5)
P4 first: ["onStart","settlement.effect","anchorTarget"]
P4 second press: []
P4-control: ["onStart","settlement.effect","anchorTarget","presentation.released","finalized phase=7","retire"]
P5 cancel() in activation.prepare: ["activation.prepare","cancel() in activation.prepare; closed=false","activation.rollback","retire"]
P5 destroy() in activation.prepare: ["activation.prepare","destroy() in activation.prepare; closed=true","activation.rollback","retire","retire","destroy settled"]
P5 destroy() in activation.effect: ["activation.prepare","destroy() in activation.effect; closed=true","onStart","retire","presentation.released","destroy settled"]
P5 cancel() in release.effect: ["activation.prepare","onStart","release.effect","cancel() in release.effect; closed=false","settlement.prepare type=43 stage=AT_CONSUMER","settlement.effect","anchorTarget","presentation.released","finalized phase=7","retire"]
P5 destroy() in release.effect: ["activation.prepare","onStart","release.effect","destroy() in release.effect; closed=true","retire","presentation.released","destroy settled"]
P5 destroy() in anchorTarget: ["activation.prepare","onStart","release.effect","invoke (round-trip opened)","settlement.prepare type=40","settlement.effect","anchorTarget","destroy() in anchorTarget; closed=true","retire","presentation.released","destroy settled"]
 Test Files  2 passed (2)
      Tests  8 passed (8)
```

The browser lines are regrouped by probe; Vitest interleaves them. `type=43` is `SETTLED_CANCELED` and `type=40` is `SETTLED_FULFILLED`. `retire` is `BehaviorSpec.retire`, which runs once per operation retirement and once more at teardown, so a destroyed operation logs it twice. P4's first and control rows reproduce D-201's record.