# Requests and their application: request/effect separation for drag2's execution units

**Amended a fifth time 2026-11-01 for `drag2:D-207`, which supersedes `drag2:D-206` during step 3.** D-207 carries D-206 in full, including its accepted steps 1 and 2, and adds one entry clause: the unit that would enter activation, `ACTIVATE` or `MOVE` at `PENDING`, declines while a cancel for its operation is registered, and the queued `CANCEL` retires the operation silently. Step 3's deletion of the activation's in-unit revalidation had made a command operation announce `onStart` and then `canceled` for a cancel registered at `PENDING`, where the baseline retires silently. §2.2, §2.6, §2.7, §4, §6–§9 and §15.3 below state the D-207 form. §16 records the escalation, the evidence and the options. Raises and repairs `drag2:F-440`.

**Step 2 accepted 2026-11-01, at `877fb9612`, after its feature proof.** D-206 stays unimplemented: steps 3–6 remain. The 13 budget overruns are the owner's tolerated size cost of step 2, and none is re-based. step2-A and step2-B stay with the implementer, to be repaired before `d206-requests.md` is written. step2-C is decided without editing 05, and the obligation goes to step 4's I-36 rewrite. §15 records the assessment, the dispositions and step 3's handoff.

**Step 1 accepted 2026-11-01, at `44e2074f1`, after the step-1 feature proof's recheck.** D-206 stays unimplemented: steps 2–6 remain. `drag2:F-438` and `drag2:F-439` close with the step. D-206's mutation requirement is amended in place to cover the R30 rows whose outcome the clause decides; the `invoke: null` row is an equivalent mutant. §14 records the assessment, the dispositions and step 2's handoff.

**Amended a fourth time 2026-11-01 for `drag2:D-206`, which supersedes `drag2:D-205` after its step-1 checkpoint (`3e44eaf62`).** D-206 carries D-205 in full and adds one clause to `OPEN_RESOLUTION`'s entry condition: the round-trip also declines while a failure checkpoint for its operation is registered and unapplied. Step 1's `release.effect` inventory met §8's first escalation clause: a custom placeholder's reaction to the release move queues collection work, that work fails, and its checkpoint lands behind `OPEN_RESOLUTION`. Under D-205 the round-trip then opened for an operation whose failure was already registered, and the terminal for a synchronous resolver moved from `accepted` to `canceled` at `AT_CONSUMER`. D-206 requires no round-trip and `canceled` at `AT_PROPOSAL` for either resolver. §2.2, §2.7, §2.8, §2.10, §4–§9 below state the D-206 form. §13 records the escalation, the evidence and the options. Raises and repairs `drag2:F-439`.

**Amended a third time 2026-11-01 for `drag2:D-205`, which supersedes `drag2:D-204` after its step 1 landed (`2c5212daf`).** D-205 carries D-204 in full and changes the step order. The consumer round-trip's own unit, with its entry condition, the cancel stage rule and the `release.effect` inventory, moves from step 3 into step 1. Step 1 had made in-unit readers blind to a destroy request before the round-trip left the release unit, so a destroy requested there opened `onReorder` (F-438). D-205 adds property 13: no landed step makes a consumer call that both the baseline and the target withhold. §7, §8 and §9 below state the D-205 form. §12 records the gap, the evidence and the options.

**Amended again 2026-11-01 for `drag2:D-204`, which supersedes `drag2:D-203` before implementation.** D-204 carries D-203 in full and settles one gap D-203 step 1 exposed: what a `dispatch` tag gets checked against when the dispatch arrives during construction. Armed dispatch keeps its intake check and report; a construction-window dispatch is queued unchecked, and an out-of-range tag there has no specified outcome; no check runs at application. §2.9, §3, §4, §5, §7, §8 and §9 below state the D-204 form. §11 records the gap, the policy and the options. Raises and repairs `drag2:F-437`.

**Amended 2026-11-01 for `drag2:D-203`, which supersedes `drag2:D-202` before implementation.** D-203 carries D-202 in full except one entry condition: `OPEN_RESOLUTION` also declines while a cancel for its operation is registered. §2.2, §2.7, §2.8, §6, §7 and §8 below state the D-203 form and are the handoff. §10 records what D-202 said, the counterexample that refuted it, and the choice. Raises and repairs `drag2:F-436`.

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
- a failure checkpoint's capture of the cancel state at intake (§2.10);
- an operation's registered, unapplied failure checkpoint, read only at `OPEN_RESOLUTION`'s entry (§2.10, D-206).

The ledger is read in exactly three places:

1. **The runner's admission decision**: before each queued unit, before an ingress pass, and when the outermost unit ends.
2. **A unit's entry**: currency (identity, phase, attempt) and precedence (a held cancel at the entries that would enter activation, `ACTIVATE` and `MOVE` at `PENDING` (D-207), and at `START_COMMITTED`, `OPEN_RESOLUTION` and `FAILED`; a registered failure checkpoint at `OPEN_RESOLUTION`). The entry is the unit's application boundary, so reading the ledger there decides whether and how the unit applies. It does not change a unit that is already running.
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

**A cancel registered before activation is entered (D-207).** The unit that would enter the activation seam declines at its entry while a cancel for its operation is registered: `ACTIVATE` for a command, `MOVE` at `PENDING` for a pointer. The operation stays `PENDING`, and its queued `CANCEL` retires it silently. Without the clause a command operation never reaches the `PENDING` row, because admission queues `ACTIVATE` last and every cancel registered at `PENDING` lands behind it (§16). The paragraph above is unchanged: a cancel registered inside the activation unit is not seen by its entry.

### 2.7 Ordering and priority

- **Destruction has priority.** It is applied at the next boundary, ahead of everything queued, and discards the queue.
- **Everything else is FIFO**: cancel, failure checkpoints, behavior actions, consumer `invalidate`/`moveTo`, pointer samples and kernel continuations. Requests registered by one unit apply in registration order, after any entries queued before them.
- **I-22's precedence `DESTROY > CANCEL > FAILURE_CHECKPOINT` is kept, and both halves are now decided at a boundary.**
  - Destroy by priority.
  - Cancel over a checkpoint by the rule in §2.10.
  - The entries that would enter activation, `ACTIVATE` and `MOVE` at `PENDING`, decline while a cancel for their operation is registered (§2.6, D-207). A unit-entry reading.
  - The `START_COMMITTED` entry still declines to commit `ACTIVE` while a cancel for its operation is registered. That is a unit-entry reading.
  - The `OPEN_RESOLUTION` entry declines to open the round-trip while a cancel or a failure checkpoint for its operation is registered (§2.8, D-206). Also a unit-entry reading. It decides no precedence between the two: whichever applies first, by the rules above, decides the operation.
- **Native ingress is never ordered against the queue.** It runs only when no unit is running.

### 2.8 The consumer round-trip opens in its own unit

`release.effect` is followed by the consumer's resolver, `invoke`, which is `onReorder` for the sortable. Today the release unit opens it after the effect returns, if PP-1's predicate still holds (the staging conditional at `seams.ts:317`). Under request/effect separation that predicate is a ledger read inside the unit. Two designs are available.

- **(a) The release unit opens the round-trip unconditionally.** A cancel or destroy raised in `release.prepare` or `release.effect` would still see the consumer asked to commit a reorder. For destroy, the attempt is then aborted at application. For cancel, it settles `AT_CONSUMER`.
- **(b) The round-trip opens in its own queued unit** (**chosen**). The release unit commits `RELEASING`, runs `release.effect`, and queues `OPEN_RESOLUTION` carrying the operation identity. At its entry that unit opens the round-trip only if the operation is current and `RELEASING`, no round-trip has been opened for it, **no cancel is registered for it**, and **no failure checkpoint is registered for it** (D-206, §13).

**Why (b).** The round-trip is the one consumer callback that starts a consumer-side domain transaction and carries an abort channel. Every other slot is a lookup or a notification. Under (b), **no round-trip opens once a destroy, a cancel or a failure checkpoint against its operation has been registered before `OPEN_RESOLUTION` is admitted.** These are I-22's three terminal requests. Each rests on a boundary, not on a reading inside a unit:

- **Destroy** by priority: it is applied when the requesting unit ends, ahead of `OPEN_RESOLUTION`.
- **Cancel** by the entry condition. FIFO alone covers only a cancel registered before `OPEN_RESOLUTION` was queued. A cancel registered by an entry queued ahead of it, such as a behavior action that `release.effect` dispatched, sits behind it in the queue (F-436). Declining at the entry covers both.
- **A failure checkpoint** by the entry condition, for the same reason. A checkpoint registered before `OPEN_RESOLUTION` was queued applies first and retires the held command. One registered by an entry queued ahead of it, such as collection work a placeholder's reaction to the release move queued, sits behind it (F-439).

**The resulting order and stage.** `OPEN_RESOLUTION` declines and leaves the operation `RELEASING`. The registered `CANCEL` is the next entry that can decide the operation, and it applies at `RELEASING` with `invoke` never called, so the stage is **`AT_PROPOSAL`** (§2.6). The consumer sees no `onReorder` and one `onEnd` `canceled` at `AT_PROPOSAL`. For a registered failure checkpoint the next deciding entry is its `FAILED`, which applies at `RELEASING`: `onError` with the failure's stage, then the fallback `onEnd` `canceled` at `AT_PROPOSAL` with origin `failed`.

**Declining cannot strand the operation**, which is the failure F-434 showed a cancel reading can cause:

- a held cancel is consumed only by its own `CANCEL` entry;
- a registered cancel is never dropped at intake;
- a failure checkpoint applied while the cancel is held is superseded (§2.10);
- only destruction, which tears the operation down anyway, precedes it.

The same holds for a registered failure checkpoint. Its `FAILED` entry is queued behind `OPEN_RESOLUTION`, and nothing between them can take the operation out of `RELEASING` except a cancel, which then decides it, or destruction. At its application the checkpoint is current and the phase is neither `IDLE` nor `REPORTING`, so it is applied, or superseded by a cancel that is.

A cancel registered after `OPEN_RESOLUTION` has run, from `onReorder` or later, finds the round-trip opened and settles at `AT_CONSUMER` (R6). It also removes the staging conditional, which is the last ledger reading in the driver. It also makes the stage rule in §2.6 exact, because the window between `RELEASING` and `invoke` now contains whole units.

**What (b) changes.** Work dispatched during `release.effect` now applies before the round-trip opens rather than after it. Today the resolver runs inside the release unit, ahead of anything that unit dispatched. The only producers of such work are consumer code reached from `release.effect`, such as a custom placeholder's reactions to the release move, and behavior actions that effect dispatches. The implementer inventories the second group (§8, step 1 since D-205; step 3 before it). One queue entry per drop is not on the per-sample path.

**Why D-201's objection to splitting does not carry over.** D-201 rejected splitting _participation slots_ into queued units. That would have moved many lookups and the `AT_PROPOSAL`/`AT_CONSUMER` staging. Here one call is split, the one whose position defines that staging, and the stage rule becomes exact rather than displaced.

The staged `ResolutionCommand` now outlives the release unit. It moves to operation scope until `OPEN_RESOLUTION` consumes it or the operation retires. The carrier is the implementer's choice: a slot beside the resolution attempt, or the queue argument. It must not add an allocation per pointer sample, and it must not be readable by a later operation.

### 2.9 Construction

U-C now spans the whole of `draggable()`: the behavior factory, the static validation, both frame-part compositions, ingress attachment and publication.

- **A destroy requested anywhere in U-C** is applied after U-C publishes. Both frame parts are composed, ingress is attached and then aborted by application, the spec is retired once and each frame is reset once. `draggable()` returns a controller whose destruction has been applied and whose promise has settled.

  This replaces the arm-time latch tests (`kernel.ts:2477`, `:2481`, `:2491`) and D-201's PP-4. Attaching and then aborting a listener within one synchronous call is unobservable: no event can arrive in between.

- **A failure in U-C**, whether static validation, a factory throw or an attachment throw, still unwinds and rethrows (01 §When construction itself fails). The queue is cleared with it.

- **`dispatch` during U-C is queued and applied after publication**, the first U-As the controller runs. Today it is dropped silently, because no machinery exists to run it. That was a request with no boundary to apply at, and U-C supplies one. A behavior that dispatches from its factory, or from a feature installer, now has the action applied instead of losing it. **The tag is not checked in the window**, because the count that bounds it is in the spec the factory has not yet returned. An out-of-range tag there is misuse with no specified outcome. Armed dispatch keeps its intake check and report, and nothing is checked at application (§11, D-204).

- **`requestCancel` during U-C** is a no-op, because there is no operation. **`fail` during U-C** is demoted silently, as today, because the reporter is not armed.

### 2.10 Failures: a result and a request

`kernel.fail(stage, error)` inside an open phase is two things:

- **A result** for the running phase. The driver latches it and the phase returns `FAILED`, exactly as for a throw. It is the unit's own outcome, not a request against it, and it stays.
- **A request**: the classified checkpoint, queued for the operation committed at intake.

`fail` outside a phase is demoted to a warning, as today.

**A checkpoint registered while a cancel request for its operation is registered and unapplied is superseded by that cancel.** Intake records the fact on the checkpoint. The checkpoint's application decides on that record (or on a cancel still held at its entry), and reports `drag: failure/superseded-by-cancel`.

**A registered checkpoint is also read at `OPEN_RESOLUTION`'s entry (D-206).** Intake records, on the operation, that a checkpoint for it is queued and unapplied. Only `OPEN_RESOLUTION`'s entry reads that record, and only to decline (§2.8). Registration changes nothing else: the held command, the attempts and the phase are the checkpoint's to change at its application, as for every other request. A failure demoted at intake registers nothing.

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
| `BehaviorContext.dispatch(tag, arg)` | dropped before arming, unreported; FIFO after, an out-of-range tag reported and dropped at intake | FIFO, **queued during U-C** and applied after publication, **the tag unchecked there**; armed intake check and report unchanged; no check at application (§11) | none |
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

3. **A cancel raised during activation** delivers `onStart` and then `onEnd` `canceled` at `AT_PROPOSAL`. Today the drag ends silently. A cancel registered before activation is entered still ends the drag silently, as today (D-207, §16).
4. **A cancel or destroy raised in `release.prepare` or `release.effect`** never opens the round-trip. That is today's outcome, and it now holds by order rather than by a guard. A cancel raised there now reports `AT_PROPOSAL`; today it reports `AT_CONSUMER` (F-435).
5. **`dispatch` during construction** is applied after publication instead of being dropped. Its tag is not checked there, so an out-of-range construction-window tag, previously dropped silently, now has no specified outcome (§11). This is a behavior-author change, not a consumer one.
6. **`moveTo`** applies the coordinates the consumer passed at the call.
7. **A failure checkpoint superseded by a cancel** is reported at its application as `failure/superseded-by-cancel`, where some cases today report `failure/not-classified` at intake.
8. **A failure registered by work that the release unit queued**, before the round-trip opens, now prevents the round-trip (D-206). The consumer gets `onError` with the failure's stage and then `onEnd` `canceled` at `AT_PROPOSAL` with origin `failed`, for a synchronous or an asynchronous resolver, and no `onReorder`. Today the round-trip opens first. A synchronous resolver then gets `onEnd` `accepted` and a late `onError`; an asynchronous one gets `canceled` at `AT_CONSUMER`. The sortable reaches this when a custom placeholder's reaction to the release move calls `invalidate()` and `items()` throws (§13).

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
| 02 §Release ordering, §`ResolutionCommand` | the command is executed by its own unit (§2.8), whose entry declines on a registered cancel or failure checkpoint (D-206) |
| 02 §The settlement input is discriminated and exhaustive | the cancel stage rule (§2.6, F-435) |
| 02 §Attempts | no latch conjunct at the producer |
| 01 §`BehaviorContext` | renamed members; `closed` removed; the construction-window rows (dispatch queued, its tag unchecked there, the armed report scoped to after arming (§11.5); cancel no-op; fail demoted; destroy deferred to U-C's boundary) |
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
| `OPEN_RESOLUTION`'s held cancel (new unit) | — | **added** (unit entry, §2.8; F-436) |
| `kernel.ts:2024` `ACTIVATE`'s entry; `kernel.ts:1858` `MOVE`'s entry at `PENDING` (`877fb9612`) | — | **added**: a held cancel declines activation (unit entry, §2.6; F-440, D-207) |
| `OPEN_RESOLUTION`'s registered failure checkpoint (new unit) | — | **added** (unit entry, §2.8, §2.10; F-439); written by `#failOperation` when it queues the checkpoint |
| `kernel.ts:412` `#notify` | kept (sink) | kept as diagnostic intake: refuses after `CLOSED` |
| `kernel.ts:2355` `closed` getter | kept | **removed** with the SPI member |
| `kernel.ts:2010` the cancel stage from phase | — | stage from whether `invoke` ran (F-435) |
| behaviors' sinks (D-201 §4.2) | kept as sinks | **deleted**; `sortable/spec.ts:346` `#live` and every feature `live()` read deleted |
| `execution.ts:166` | `#closed` or any unit on the stack | `CLOSED` or any unit running |
| `execution.ts:186` | deleted | deleted (the owner's suppression goes with it) |
| `execution.ts` `#step` | latch | the lifecycle request: stops at `REQUESTED` or `CLOSED` |
| `execution.ts` `close()` | sets the latch | `requestClose()`: `REQUESTED` inside a unit; applies at depth 0; `#leave` applies at the outermost boundary |

**After D-202**, `grep` over `src/` for reads of the lifecycle state finds the runner, intake and `#notify`, and nothing else. For the cancel request it finds intake, the `CANCEL`, `ACTIVATE`, `MOVE`-at-`PENDING`, `START_COMMITTED`, `OPEN_RESOLUTION` and `FAILED` entries, and nothing else. For the registered failure checkpoint it finds intake, `OPEN_RESOLUTION`'s entry and, if the implementation consumes the record there, `FAILED`'s entry. That is a structural acceptance criterion (§8). It is not a count.

## 7. Cases

**R1–R14, R22 and R28–R30 are executable today in the reference model** ([`model.ts.txt`](../../probes/snapshot-units/model.ts.txt)). The model is a self-contained toy with D-202's runner, ledger and unit boundaries. Its central check is trace equivalence: the unit that receives a request makes exactly the calls the baseline makes, and the request changes only what follows the boundary. The model establishes that the semantics are coherent and gives each case an executable statement. It is not evidence about `src/`. The implementation turns every row into a test against the real kernel and behaviors. _Today_ is `6905af249`, from P1, P2, P4, P5 or D-201's record.

| Case | Setup | Today | Required |
| --- | --- | --- | --- |
| **R1** | destroy requested in `handle` | admission discards (latch at PP-3) | `visual` and `box` still called; admission publishes `PENDING`; application after U-I tears it down; the post-admission drain handles nothing; next press refused |
| **R2** | destroy requested in `activation.prepare` | rollback; `closed=true` mid-unit (P5) | the activation unit's calls equal the baseline's; `onStart` delivered; then application; no `onEnd`; `START_COMMITTED` discarded |
| **R3** | cancel requested in `activation.prepare` | rollback; silent retirement (P5) | unit equals baseline; `onStart`; then `canceled` `AT_PROPOSAL` |
| **R4** | cancel requested in `release.effect` | no round-trip; `AT_CONSUMER` (P5, F-435) | no round-trip (`OPEN_RESOLUTION` declines at its entry); `canceled` `AT_PROPOSAL` |
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
| **R22** (F-436) | `release.effect` dispatches behavior action A; the release unit queues `OPEN_RESOLUTION`; A's seam requests cancel, so the queue is `[OPEN_RESOLUTION, CANCEL]` | — (`OPEN_RESOLUTION` does not exist yet) | `OPEN_RESOLUTION` declines; no `onReorder`; `CANCEL` applies at `RELEASING`; one `onEnd` `canceled` at `AT_PROPOSAL`; retired. Under D-202's stated entry conditions the same trace opens the round-trip and reports `AT_CONSUMER`, and the model shows that too |
| **R28** (D-205) | destroy requested in `release.prepare` | no `release.effect`, no round-trip (P7). At `2c5212daf`: `release.effect`, then **the round-trip opens** (P7, F-438) | the release unit equals the baseline's through `release.effect`; no round-trip; no `onEnd`; application after the release unit. The model's step-1 mode opens the round-trip, so the case discriminates |
| **R29** (D-205) | `release.effect` dispatches behavior action A; A's seam requests destroy | round-trip opened in the release unit, then A, then application (P7) | A applies; application follows A's unit and discards `OPEN_RESOLUTION`; no round-trip; no `onEnd`. The destroy half of R22 |
| **R30** (D-206, F-439) | work the release unit queued fails before `OPEN_RESOLUTION` runs, registering a checkpoint queued behind it: in the kernel, `release.effect` dispatches behavior action A and A's `prepare` fails; in the sortable, a custom placeholder's `connectedCallback` calls `invalidate()` during the release move and `items()` throws. Each with a synchronous and an asynchronous resolver | `582092c1f` (P8): `onReorder`, then `onEnd` `accepted` and `onError` with a synchronous resolver; `onReorder`, `onError`, `onEnd` `canceled` `AT_CONSUMER` with an asynchronous one. At `3e44eaf62`: `onReorder`, `onError`, `onEnd` `canceled` `AT_CONSUMER` with either | `OPEN_RESOLUTION` declines; no `onReorder`; `FAILED` applies at `RELEASING`; `onError` with the failure's stage (`FAILURE_ACTION_PREPARE` in the sortable); one `onEnd` `canceled` at `AT_PROPOSAL`, origin `failed`; retired. The same for both resolvers. The `invoke: null` command declines the same way. The failure half of R22. Under D-205's stated entry conditions the model opens the round-trip and reports `AT_CONSUMER` |

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
| **R23** (D-204) window order | `actionTags: 1`; the factory body dispatches `0` with `a`; the first frame-part factory dispatches `0` with `b` | both applied after publication and before `draggable()` returns, `a` then `b`; no report. Today both are dropped silently (P6) |
| **R24** (D-204) window dispatch overtaken | the factory body dispatches `0`, then requests destroy; separately, dispatches `0` and a frame-part factory throws | no action applied and no report in either; the first returns a controller whose destruction is applied and whose promise has settled (R11); the second rethrows from `draggable()` |
| **R25** (D-204) armed out-of-range | after arming, at depth 0 and from inside an action's `effect`: tags `RETIRE - BEHAVIOR_BASE` (`-22`), `0.5`, `config.actionTags`, `NaN`, each followed by `0`; then the same with a destroy request registered and not yet applied | each out-of-range tag reports one `DraggableWarning` `drag: dispatch/tag-out-of-range <tag>` through `reportError` before `dispatch` returns; none is queued: no `action.prepare` for it, and `-22` retires nothing; each `0` is applied. Today's depth-0 rows already behave this way (P6), and no test covers them |
| **R26** (D-204) armed after applied destruction | `dispatch(-22)` and `dispatch(0)` after `requestDestroy()` has been applied | no report and nothing applied. As today (P6) |
| **R27** (D-204) structural | `grep` for `actionTags` reads in `src/kernel/` | read at exactly two sites: U-C's static validation and armed intake in `dispatch`. Nothing on the drain path reads it, and no list of construction-window tags is held for later validation |
| **R31** (D-207, F-440) cancel registered before activation is entered | a command: an entry queued during admission registers a cancel at `PENDING`, so the queue is `[ACTIVATE, CANCEL]` (the sortable's `replace()` during `command.admit`, and a kernel action). A pointer: an action at `PENDING` dispatches a threshold-crossing `pointermove`, then requests cancel | `ACTIVATE`, or `MOVE` at `PENDING`, declines at its entry; `CANCEL` applies at `PENDING` and retires silently: no `onStart`, `onEnd` or `onError`, no placeholder; the next command or press is admitted. As the baseline `877fb9612`, where `#preparationValid` discarded the activation |

**No case pins an out-of-range tag dispatched during construction.** Its outcome is unspecified (§11.2 item 2), and a test asserting a report, a drop or an application would turn misuse into contract.

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
   - the arm-time latch tests deleted;
   - `dispatch`'s window path queued without a tag check, its armed intake check unchanged (§11);
   - **the consumer round-trip in its own unit** (D-205, §12), because the `closed` change above is safe only once the round-trip no longer runs inside the release unit:
     - the release unit queues `OPEN_RESOLUTION` carrying the operation identity instead of executing the staged command, the `invoke: null` path included;
     - the command in operation-scoped storage, under §2.8's constraints;
     - the entry condition in full: the operation current and `RELEASING`, no round-trip opened for it, no cancel registered for it (today's `cancelRequest`), **no failure checkpoint registered for it** (D-206, §13);
     - the cancel stage rule (§2.6, F-435);
     - the inventory of actions `release.effect` can dispatch in both behaviors, recording whether any changes order (§2.8), under the first escalation clause below. The checkpoint at `3e44eaf62` recorded it, and D-206 decided the one case it escalated;
     - the staging conditional may stay until step 3 or go now. With the entry condition in place the outcomes are the same.

   Cases R9, R10, R11, R13, R15, R17, R23–R27, R1's construction and drain half, and **R4, R5, R6, R22 and R28–R30**. Each of the last seven raises its request from a seam the bracket is running, not through a harness flag: `seams.node`'s _should never invoke the consumer when the release effect abandoned the operation_ flips `preparationValid` directly and witnesses none of them. Contract: I-1, I-6 (runner half), 01 construction sections including §11.5's `dispatch` text in 01 and `src/kernel/spec.ts`, 02 §Release ordering and §`ResolutionCommand` (the command executed by its own unit, with its entry condition), 02 §The settlement input's stage rule, COVERAGE. `closed` stays readable through this step and reports `CLOSED` only.

   **Step 1 is complete only when the round-trip's unit has landed.** `2c5212daf` landed the rest. The round-trip's unit lands before step 2, as reviewer-B's repair does. Step 1's record names the interval from `2c5212daf` to that commit as F-438 and lists the cases still at their baseline outcome (D-205 property 13).

   **The failure clause completes the round-trip's unit** (D-206, §13.5). `3e44eaf62` landed everything else in it. The clause and R30 land before step 2, and with them the 02 text for the entry condition.

   **Step 1 is accepted** (2026-11-01, at `44e2074f1`; §14).

2. **The split and capture** (D-201 step 2, unchanged):
   - the façade and the armed controller;
   - capture at entry and parameters below it;
   - teardown deduplication;
   - the module-binding census.

   Cases: D-201's capture assertions and R19. Its bounded handoff, with what it must keep from step 1, is §14.4.

   **Step 2 is accepted** (2026-11-01, at `877fb9612`; §15).

3. **Kernel requests.** Delete every in-unit ledger read in the kernel and driver (§6):
   - `#preparationValid`, `SEAM_INVALIDATED`, `rollback` and its SPI members together with the sortable D-39 ledger, the staging conditional if step 1 kept it;
   - `#activationPolicy.committed`'s revalidation, `#settlementLive`, `#joinLive`, `#settleResolution`'s latch, `#handleErrorReported`'s latch, `#runAdmission`'s recheck.

   Add:
   - the cancel phase rule;
   - supersession captured at intake;
   - activation's held-cancel entry clause, at `ACTIVATE` and at `MOVE` while `PENDING` (D-207, §16).

   `OPEN_RESOLUTION`, its entry condition, the cancel stage rule and the inventory moved to step 1 (D-205, §12; D-206, §13). Cases R1–R3, R7, R8, R12, R14, R16, R20, R31; R4–R6, R22 and R28–R30 stay green. Contract: I-3, I-16, I-21, I-22, I-31, the remaining 02 sections.

   Its bounded handoff, with what it must keep from steps 1 and 2, is §15.3.

4. **Surface and behaviors.**
   - rename `destroy`/`cancel` to `requestDestroy`/`requestCancel` on `BehaviorContext` and both controllers;
   - remove `closed`, `InsertionRuntimeView.live` and `DisplacementReport`'s `live`, and every `kernel.closed` and `live()` read in `src/`;
   - capture `moveTo`'s argument at intake;
   - confirm or add the query-result copies of §2.12.

   Cases R18, R21. Contract: I-36, I-37, 01 §`BehaviorContext`, 03, 07, README and the declaration surface (`tests/**/*.declaration.test.ts` as the surface tests require).

5. **The comment pass**, D-199's, carried by D-201, over the files D-202 rewrote, with its rules and runtime-hash check.
6. **The measurement record** `.plan/measurements/d207-requests.md`. It holds:
   - composition on every kernel-carrying row, per step;
   - the M-1 move path with I-26's structural check (one sample allocates nothing; `OPEN_RESOLUTION` and `moveTo`'s copy are per drop and per call);
   - M-2 controller cost with the façade;
   - R21's read census, reported by location.

   Writing it is the last act, and its absence is the witness.

**Acceptance** is every R-case as a test against `src/`, passing; R21's structural property; and each contract row of §5 present in the same commit as the code that makes it true. A reduced guard count is reported and is not acceptance.

**Escalate rather than decide** if:

- step 1's inventory finds an action dispatched from `release.effect` whose new position before the round-trip changes a published outcome other than the cancel stage. D-206 decided the one case `3e44eaf62`'s inventory found (§13); the clause stands for any other, including one a later step's behavior change creates;
- §2.12 finds a query result that is a consumer-owned mutable object read after a later foreign call, where a copy would cost an allocation per pointer sample.

## 9. Accounting

- **D-201** is superseded before implementation. Everything in §2.13 is carried and restated in D-202. The publication points, the event sinks, the participation-slot revision and its owner veto point are withdrawn: their premise, immediate logical closure, is gone. D-201's unimplemented row is replaced by D-202's.
- **D-199** stays superseded. D-202 restates the three things it carried through D-201.
- **D-200** keeps its pending independent acceptance. No `Lifetime` or `ActionQueue` property changes. The bracket's reason for stopping widens from the latch to the lifecycle request, and that decision is returned through the callback, as D-180 requires. Property 3's first-entry clause gains R1 and R12 as falsifiers.
- **D-202** is superseded by D-203 before implementation (§10). Every property carries forward except property 6's entry condition, and the unimplemented row moves to D-203 with the witness renamed `d203-requests.md`.
- **F-436** is raised and repaired by D-203. It is a contradiction in an unimplemented decision, not a code defect.
- **D-203** is superseded by D-204 before implementation (§11). Every property carries forward. D-204 adds the tag rule for `dispatch` (§11.2), cases R23–R27 and step 1's contract text. The unimplemented row moves to D-204 with the witness renamed `d204-requests.md`.
- **F-437** is raised and repaired by D-204: an unstated rule in an unimplemented decision, not a code defect.
- **D-204** is superseded by D-205 after its step 1 landed at `2c5212daf` (§12). Every property and the landed code carry forward. D-205 moves the round-trip's unit, its entry condition, the cancel stage rule and the inventory from step 3 to step 1, and adds property 13 and cases R28 and R29. The unimplemented row moves to D-205 with the witness renamed `d205-requests.md`.
- **F-438** is raised by the step-1 feature proof (reviewer-A) and decided by D-205. It is a regression in `src/` at `2c5212daf`, and it closes when step 1's round-trip unit lands.
- **D-205** is superseded by D-206 after its step-1 checkpoint `3e44eaf62` (§13). Every property, the step order and the landed code carry forward. D-206 adds the failure clause to `OPEN_RESOLUTION`'s entry condition and case R30. The unimplemented row moves to D-206 with the witness renamed `d206-requests.md`.
- **F-439** is raised by the implementer's escalation at `3e44eaf62` and repaired by D-206. It is a gap in D-205's entry condition, which the checkpoint implemented as stated, not a code defect.
- **Reviewer-B to reviewer-D** of the same report are step-1 defects for its implementer. Reviewer-B is repaired before step 2, as the report requires. All three were repaired at `3e44eaf62`, and the recheck resolves them.
- **Step 1** is accepted at `44e2074f1` (§14). **F-438** and **F-439** close with it. D-206 stays unimplemented, and its row lists steps 2–6.
- **Reviewer-E to reviewer-G** of the recheck are Tier C. E is the owner's and F the implementer's, and neither blocks step 2. G is repaired in the unimplemented row (§14.2).
- **Step 2** is accepted at `877fb9612` (§15). D-206's row lists steps 3–6. The 13 budget overruns are tolerated under the owner's ruling and are not re-based.
- **step2-A to step2-C** of the step-2 feature proof. A (Tier B) and B (Tier C) are the implementer's, nonblocking, and must be repaired before `d206-requests.md` is written. The decision's acceptance does not rely on property 12's census until A is closed. C (Tier C) is decided without an edit: both passages in 05 are dated or quoted history, and step 4's I-36 rewrite names the panic diagnostic by its route (§15.2).
- **D-206** is superseded by D-207 during step 3 (§16). Every property, both accepted steps, their dispositions and the owner's size tolerance carry forward. D-207 adds one clause to property 7, activation's held-cancel entry, and case R31. The unimplemented row moves to D-207 with the witness renamed `d207-requests.md`, and step2-A and step2-B are due before it is written.
- **F-440** is raised by the implementer's step-3 escalation and repaired by D-207. It is a gap in D-206's entry conditions, exposed when step 3 deleted the in-unit revalidation that had covered it, not a defect in landed code.
- **F-97** is unchanged. It still holds open whether the armed check survives the reachability gate (the audit's §3.5). D-204 scopes the armed promise to armed dispatch, which is all it ever covered, and is compatible with either answer.
- **F-432** is decided by D-202 (R15) and closes when it lands. **F-433** (R9) and **F-434** (R8) likewise move from D-201 to D-202. **F-435** is raised and decided here (R4, R6).
- **Live obligations** O-2, O-3, O-4, O-5 and O-7 are untouched. SC-1 and SC-7 are recognitions the measurement record may meet.

## Appendix — probes

**Location and command.** Sources are in [`.plan/probes/snapshot-units/`](../../probes/snapshot-units/), stored as `*.ts.txt` because the package lint walks `.plan/` and these files describe one revision of `src/`. Rerun everything with:

```sh
packages/drag2/.plan/probes/snapshot-units/run.sh
```

The script copies the sources under `tests/zz-snapshot-units-probe/` as `.ts`, where their `../../src/` imports resolve. It runs P1, P2, P6 and the model with `node`, and P4, P5, P7 and P8 in the package's `browser` Vitest project with `--silent=false`. That project's Chrome comes from `.scripts/vitest-config.ts`: `$CHROME_EXECUTABLE`, else `/usr/local/bin/chrome`. The script removes the copies on exit. No browser was installed for this run.

| Probe | What it shows | Source |
| --- | --- | --- |
| P1 | a press nested in a unit (F-433) | `p1-nested-ingress.ts.txt`, with `env.ts.txt` |
| P2 | destroy in the first frame-part factory | `p2-arm-destroy.ts.txt` |
| P4 | late cancel in `anchorTarget` (F-434) | `p4-late-cancel.browser.test.ts.txt` |
| P5 | requests raised inside a unit change its later calls today; F-435 | `p5-in-unit-requests.browser.test.ts.txt` |
| model | R1–R14, R22 and R28–R30 under D-206's semantics; R22 also under D-202's stated OPEN conditions; R5 and R28 also under D-204 step 1's inline round-trip (D-205); R30 also under D-205's stated OPEN conditions (D-206) | `model.ts.txt` |
| P6 | behavior-action tags from the factory body, a frame-part factory, after arming, and after destruction (D-204) | `p6-dispatch-tags.ts.txt`, with `env.ts.txt` |
| P7 | requests raised in `release.prepare` and by an action `release.effect` dispatched (D-205, F-438) | `p7-release-unit.browser.test.ts.txt` |
| P8 | a sortable placeholder's reaction to the release move queues collection work, with `items()` throwing or not and `onReorder` settling synchronously or not (D-206, F-439) | `p8-release-failure.append.ts.txt`, appended by `run.sh` to a copy of `tests/sortable/sortable.browser.test.ts` and run with `-t P8` |

**Output at `6905af249`**, with the owner's uncommitted edits in the tree, run 2026-11-01. The model's R22 line is from the D-203 amendment, rerun at `0f0bf0368`, where `src/` is unchanged:

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
ok  R22 cancel from an action queued ahead of OPEN: no round-trip, AT_PROPOSAL
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

**P6 output at `582092c1f`**, run 2026-11-01 against a clean extract of that commit's `src/`. The working tree gave identical output: it held the owner's edits and another session's uncommitted step-1 edits, which this record does not describe. `run.sh` runs P6 after P2, against whatever tree it finds. The window's four dispatches, `0` and `7` from the factory body, `0` and `-22` from the first frame-part factory, produce no line at all:

```text
== p6-dispatch-tags
-- armed
dispatch(0)
action.prepare [0,"armed 0"]
dispatch(-22)
reportError DraggableWarning: drag: dispatch/tag-out-of-range -22
dispatch(0.5)
reportError DraggableWarning: drag: dispatch/tag-out-of-range 0.5
dispatch(1)
reportError DraggableWarning: drag: dispatch/tag-out-of-range 1
dispatch(NaN)
reportError DraggableWarning: drag: dispatch/tag-out-of-range NaN
-- destroyed
spec.retire
dispatch(-22) after destroy
```

**P5 and P7 at `582092c1f` and at `88cb0be8c`**, run 2026-11-01 for D-205. `582092c1f` is a clean extract, and its `src/` equals `6905af249`'s. `88cb0be8c` is the working tree with the owner's uncommitted one-assertion edit to `tests/kernel/seams.node.test.ts`, and its `src/` equals `2c5212daf`'s. The rows that differ between the two trees, then the three P7 rows that differ only in the logged `closed` value:

```text
                                582092c1f                                          88cb0be8c
P5 destroy() in release.effect  …"release.effect","destroy() …; closed=true",      …"release.effect","destroy() …; closed=false",
                                "retire","presentation.released","destroy settled"  "invoke (round-trip opened)","retire","presentation.released","destroy settled"
P7 destroy() in release.prepare …"release.prepare","destroy() …; closed=true",     …"release.prepare","destroy() …; closed=false","release.effect",
                                "retire","presentation.released","destroy settled"  "invoke (round-trip opened)","retire","presentation.released","destroy settled"
```

```text
P7 cancel() in release.prepare: ["activation.prepare","onStart","release.prepare","cancel() in release.prepare; closed=false","settlement.prepare type=43 stage=AT_CONSUMER","settlement.effect","anchorTarget","presentation.released","finalized phase=7","retire"]
P7 cancel() in action.prepare: ["activation.prepare","onStart","release.prepare","release.effect","invoke (round-trip opened)","action.prepare","cancel() in action.prepare; closed=false","settlement.prepare type=40","settlement.prepare type=43 stage=AT_CONSUMER","settlement.effect","anchorTarget","presentation.released","finalized phase=7","retire"]
P7 destroy() in action.prepare: ["activation.prepare","onStart","release.prepare","release.effect","invoke (round-trip opened)","action.prepare","destroy() in action.prepare; closed=<true at 582092c1f, false at 88cb0be8c>","retire","presentation.released","destroy settled"]
```

The other P5 rows at `88cb0be8c` are those the feature-proof report quotes: R2 and R7 at their required outcome, both cancel rows unchanged. The model at `88cb0be8c`, with R28 and R29 added and R5 and R28 also run under the step-1 mode:

```text
ok  R22 cancel from an action queued ahead of OPEN: no round-trip, AT_PROPOSAL
ok  R28 destroy in release.prepare: the release unit runs as baseline, no round-trip
ok  R29 destroy from an action queued ahead of OPEN: no round-trip, no terminal
```

R1–R14 print as above.

**P8 at `582092c1f` and at `3e44eaf62`**, run 2026-11-01 for D-206. `582092c1f` is a clean extract, with the probe appended to that commit's own sortable suite. `3e44eaf62` is the working tree with the owner's uncommitted one-assertion edit to `tests/kernel/seams.node.test.ts`. The trace starts at the placeholder's connection. `errors` is the stage each `onError` carried (`4` is `FAILURE_ACTION_PREPARE`), and each terminal reads `type stage origin`:

```text
582092c1f
P8 throwing=false sync=true  ["placeholder connected","onReorder","items()","invalidateInsertion","onFinish"] errors [] terminals ["accepted"]
P8 throwing=false sync=false ["placeholder connected","onReorder","items()","invalidateInsertion","onFinish"] errors [] terminals ["accepted"]
P8 throwing=true  sync=true  ["placeholder connected","onReorder","items()","onFinish","onError"] errors [4] terminals ["accepted"]
P8 throwing=true  sync=false ["placeholder connected","onReorder","items()","onError","onCancel"] errors [4] terminals ["canceled AT_CONSUMER failed"]
3e44eaf62
P8 throwing=false sync=true  ["placeholder connected","items()","invalidateInsertion","onReorder","onFinish"] errors [] terminals ["accepted"]
P8 throwing=false sync=false ["placeholder connected","items()","invalidateInsertion","onReorder","onFinish"] errors [] terminals ["accepted"]
P8 throwing=true  sync=true  ["placeholder connected","items()","onReorder","onError","onCancel"] errors [4] terminals ["canceled AT_CONSUMER failed"]
P8 throwing=true  sync=false ["placeholder connected","items()","onReorder","onError","onCancel"] errors [4] terminals ["canceled AT_CONSUMER failed"]
```

The `3e44eaf62` rows are `run.sh`'s, from the stored probe. The `582092c1f` rows are from the same probe body before it named the stage and origin; it printed them as `21` (`AT_CONSUMER`) and `33` (`failed`). They match the implementer's `2c5212daf` baseline in `measurements/d204-step1.md`. The model at `3e44eaf62`, with R30 added and also run under D-205's stated conditions:

```text
ok  R29 destroy from an action queued ahead of OPEN: no round-trip, no terminal
ok  R30 failure from an action queued ahead of OPEN: no round-trip, failed at AT_PROPOSAL
```

R1–R14, R22 and R28 print as above.

## 10. Amendment: the round-trip guarantee and its entry condition (D-203)

**2026-11-01. Input:** `0f0bf0368` and the coordinator's handoff check [`request-ordering-coordinator.md`](request-ordering-coordinator.md) (`coordinator-a`). This section is that check's resolution. It records **F-436**.

**What D-202 said.** Property 6 promised that no round-trip opens after a cancel or destroy request against its operation has been registered. §2.8 attributed this to queue order, "not … a guard". `OPEN_RESOLUTION`'s entry conditions were current identity, `RELEASING`, and not previously opened.

**Why it does not hold.** FIFO orders a request against the entries queued _before it was registered_, not against those queued before the requesting unit ran. §2.8 explicitly lets `release.effect` dispatch work that applies before the round-trip opens, and a behavior action's seam can reach the controller.

The coordinator's case: `release.effect` dispatches action A, the release unit queues `OPEN_RESOLUTION`, and A requests cancel. The queue is `[OPEN_RESOLUTION, CANCEL]`. `onReorder` runs after the cancel was registered, and the cancel then settles at `AT_CONSUMER`. The coordinator's reproduction exits 1 against D-202's model, as reported.

**Options considered:**

| Option | Guarantee | Cost |
| --- | --- | --- |
| **(1) `OPEN_RESOLUTION` declines while a cancel for its operation is registered** (chosen) | the promised one, for every registration before the entry is admitted | one ledger read at a unit's entry, the form `START_COMMITTED` already has |
| (2) Weaken the promise to "registered before `OPEN_RESOLUTION` was queued" | consumers can see `onReorder` after their own cancel, then `AT_CONSUMER` | none in code; the guarantee becomes a statement about queue internals no consumer can observe |
| (3) Give cancel priority over the queue, as destroy has | the promised one | reorders every cancel against every queued action: R12's `A, CANCEL, B` becomes `CANCEL, A, B`, and I-22's FIFO tie-break with checkpoints changes; a broader redesign than the case asks for |

**Why (1).** It keeps request/effect separation intact. The reading happens at the boundary where `OPEN_RESOLUTION` applies, before any of its work. Nothing inside a running unit reads the ledger. It changes no order the other cases fix, and it cannot strand the operation (§2.8).

**What it changes:**

- §2.2's list of entry readings;
- §2.7;
- §2.8's entry conditions and its statement of the guarantee;
- §6's site table and R21's census, which now include `OPEN_RESOLUTION`;
- §7, which gains R22;
- §8 step 3, whose cases include R22;
- the measurement record's name.

Nothing in §3, §4 or §5 changes: `requestCancel`'s contract already says a registered cancel is applied unless destruction comes first.

**Stage.** In the coordinator's case the consumer receives one `onEnd` with the `canceled` arm at **`AT_PROPOSAL`**, because `invoke` was never called.

**Verification.** The model's R1–R14 still pass. R22 passes under D-203's condition, and under D-202's stated conditions the model reproduces the coordinator's trace (`onReorder`, then `AT_CONSUMER`). The coordinator's unmodified reproduction script, run against the amended model, exits 0 with the trace ending `onEnd(canceled AT_PROPOSAL)`, `retire #1`. The browser probes are unchanged and were not affected.

## 11. Amendment: behavior-action tags in the construction window (D-204)

**Raised by the implementer at D-203 step 1**, relayed by the owner at `582092c1f` with the owner's local edits in the tree. Recorded as `drag2:F-437`. While this amendment was written, the working tree also gained another session's uncommitted step-1 edits to `src/` and `tests/`. Every source citation below is at `582092c1f`, and none of those edits was read as evidence or changed.

**The gap.** D-203 carries D-202 §2.9: a `dispatch` during U-C is queued and applied after publication (R17). The SPI states two more things about every `dispatch` (`src/kernel/spec.ts:54–65`, 01 §`BehaviorContext`):

- the tag must be an integer in `0 .. config.actionTags - 1`;
- an out-of-range tag is reported and dropped, never enqueued.

In the factory body neither can be delivered. `config.actionTags` belongs to the spec the factory has not yet returned, so there is nothing to check the tag against at intake, and nothing to report through: `#notify` reports through the spec's `reportError`. Today the conflict is hidden because every window dispatch is dropped, in range or not, with no report (P6). Once R17 queues the in-range ones, the decision has to say what happens to an out-of-range tag from the same position. D-203 does not say.

### 11.1 What the contract promises, and what is misuse

Two different things share one sentence, and §1.1 and §13 of CONTRIBUTING separate them.

- **The precondition** is published and meetable. The tags are the behavior author's own constants, bounded by a count the author declares in the same spec. No platform behavior, race, end-user input or library-minted value produces an out-of-range tag. Under §1.1's gate, an out-of-range tag is integrator misuse and the library owes nothing at runtime for it.
- **The outcome**, "reported and dropped, never enqueued", is written into the published SPI. Under §13, a documented outcome is a promise even when the input is outside the contract, so the armed check and its report are contract and stay until a contract decision withdraws them. F-97 holds exactly that question open (the reachability audit's §3.5 recommends deletion with the text revised in the same change). D-204 neither decides it nor pre-empts it.

The promise was never made for the window. Until D-203, the window's own sentence overrode it ("dropped, without a report"), and D-203 replaced that sentence with R17 only for the action's application. So the question for the window is not whether to keep a promise. It is whether to extend one, and §1.1 says not to extend a misuse diagnostic to a position where it costs machinery.

### 11.2 The decision

1. **Armed dispatch is unchanged.** The check runs at intake, after the lifecycle test: once destruction has been applied, every dispatch is dropped with no report. An out-of-range tag is reported as `drag: dispatch/tag-out-of-range <tag>` through `reportError` before `dispatch` returns, and nothing is queued. This holds at depth 0, inside a unit, and while a destroy request is registered but not yet applied.
2. **Window dispatch is not checked.** From the factory's invocation until arming completes (`spec.ts`'s existing definition of the construction window), a dispatch is queued as a behavior action exactly as an in-range armed dispatch is. It is applied after publication, before `draggable()` returns, in dispatch order. The range is the author's precondition there, and an out-of-range tag has **no specified outcome**: no report, no drop and no application are promised. No case may pin one.
3. **No check at application.** A queued behavior action is applied without re-reading `config.actionTags`, whichever path queued it.
4. **Window entries follow the queue's existing rules.** A destroy requested in U-C is applied at U-C's boundary, ahead of every queued entry, and application clears the queue: no window dispatch is applied (R12's precedence, R11's boundary). A failure that unwinds U-C clears the queue with it, and `draggable()` rethrows.

**Kernel/behavior action separation.** For every dispatch inside the contract, the queue entry is a behavior action, applied through the behavior's action transition with the tag it was dispatched with, on either path. That follows from the offset alone (`BEHAVIOR_BASE + tag` with `0 ≤ tag`), with no check. The armed intake check also keeps out-of-range armed tags off the queue, because the contract promises it. A window tag outside the range is outside the contract, and the kernel does not defend separation for it, as it does not for any other misuse §1.1's gate closes on. P6 shows what such a tag would alias: `RETIRE − BEHAVIOR_BASE` is `−22`.

### 11.3 Why no check at application

An armed tag valid at intake is valid at application.

- **The bound cannot change.** `#spec` is assigned once, at the end of a successful arming (`kernel.ts:2521` at `582092c1f`; `draggable()` calls `arm()` once, `:305`). Its only other assignment is the failed-arm unwind (`:2583`), on a controller `draggable()` never returns. `BehaviorConfig` is `Readonly`, and `actionTags` is static spec data validated once.
- **The entry does not change.** The queue holds the encoded action and its argument, and nothing rewrites either.
- **What can change between intake and application is the ledger.** Applied destruction clears the queue. Whether an action still means something for the current operation is the behavior's own `action.prepare`'s question; sortable's spatial frame already validates its attempt there (`sortable/spec.ts:380–391`).
- **It would run on every applied action**, including sortable's `TAG_SPATIAL`, dispatched once per animation frame during a drag (`sortable/spec.ts:390`), to re-establish a fact that cannot have changed.

A check at application would also not help the window: a negative tag is already aliased once it is encoded, so detecting it would need the raw tag in each entry, the per-entry wrapper 01 §`BehaviorContext.dispatch` excludes.

### 11.4 Options considered

| Option | Window outcome for an out-of-range tag | Cost and consequence |
| --- | --- | --- |
| **(1) Armed check unchanged; window unchecked; no check at application** (chosen) | unspecified (misuse) | none: the window path skips a branch it cannot evaluate. The warning P6 shows the window allocating today, and `#notify` then discarding, is no longer built |
| (2) Validate window entries once, when U-C validates the spec, reporting and removing out-of-range ones before publication | reported and dropped, uniform with armed | a held list of raw tags or a filter over the bracket's queue, a loop and a second report site. It extends a misuse diagnostic the gate does not require, and hardens a guarantee F-97 holds open for deletion |
| (3) Validate at application | reported and dropped | per applied action, on the per-frame path, plus raw tags in every entry (§11.3) |
| (4) Refuse dispatch in the window | dropped | contradicts R17, which the commission keeps |
| (5) Withdraw the armed check now, as the audit's §3.5 recommends | unspecified on both paths | the smallest and uniform, but it changes a published armed-path promise this question did not open. It stays with F-97 |

**Why (1).** It is the only option that delivers R17 and the armed promise exactly as they stand, and adds nothing. It is also compatible with either outcome of F-97: if the armed check is later withdrawn, both paths become unchecked and uniform, with no window machinery to remove.

**Owner veto point.** If "preserve kernel/behavior action separation" is meant to cover out-of-range tags dispatched during construction, then option (2) is the fallback. It changes only §11.2 item 2, R24 (which gains a report) and step 1.

### 11.5 Contract text

Both land in step 1, with the window path:

- **`BehaviorContext.dispatch`** in `src/kernel/spec.ts` and 01 §`BehaviorContext` must state:
  - the precondition, unchanged;
  - that **after arming** an out-of-range tag is reported and dropped, never enqueued;
  - that **during construction** the action is queued and applied after `draggable()` publishes the controller, before it returns, in dispatch order;
  - that the tag is not checked there, because the count bounding it is in the spec the factory has not yet returned, so an out-of-range tag has no specified outcome;
  - that after applied destruction every dispatch is dropped.

  The current sentence "An action dispatched before the behavior is armed is dropped, without a report" is withdrawn.

- **The `BehaviorContext` header** keeps "`BehaviorContext.dispatch` is the one member in that position", with the limitation it points to now being the unchecked tag rather than the drop.

### 11.6 Cases and verification

R23–R27 (§7) carry the decision. **P6** records today's tree:

- the armed rows already deliver R25's and R26's required outcome at depth 0;
- the window rows show every window dispatch dropped silently, which R23 changes.

No test in `tests/` covers the armed out-of-range report today (`grep -rn tag-out-of-range tests` finds nothing), so R25 is the first test of a published promise.

**What it changes in this record:**

- §2.9's dispatch bullet;
- §3's `dispatch` row;
- §4 item 5;
- §5's 01 row;
- §7, which gains R23–R27;
- §8 steps 1 and 6;
- §9;
- the Appendix, which gains P6.

Nothing in §2.1–§2.8, §2.10–§2.13 or §6 changes, and D-203's other properties carry unchanged.

## 12. Amendment: the round-trip's own unit lands with the lifecycle request (D-205)

**2026-11-01. Input:** `88cb0be8c`, implementation `2c5212daf`, and reviewer-A of the step-1 feature proof [`d204-step1-feature-proof-claude.md`](../fin-review2/d204-step1-feature-proof-claude.md). This section is reviewer-A's resolution. It records **F-438**. Reviewer-B to reviewer-D are defects against step 1 for its implementer and are not decided here.

### 12.1 The gap

§8 split one mechanism across two steps:

- **Step 1** makes `closed` report `CLOSED` only. No reader inside a unit sees a destroy request any longer, which is the separation the owner asked for.
- **Step 3** moves the consumer round-trip out of the release unit into `OPEN_RESOLUTION`.

R5, and §4 item 4 for `release.prepare`, hold under D-204 because the round-trip is a later unit, and destruction applied at the release unit's boundary discards it. At the baseline they held because the staging conditional read the latch (`seams.ts:317`). Step 1 removed the latch reading without adding the later unit. From `2c5212daf` until step 3, the release unit therefore opens the round-trip after a destroy was requested in it. In the sortable, that means `onReorder`, a consumer model mutation, after the consumer or behavior asked to stop.

### 12.2 Evidence

P5 and the new P7 ran in Chrome on a clean extract of `582092c1f` and on the working tree at `88cb0be8c` (Appendix):

| Path | Baseline `582092c1f` | Step 1 `88cb0be8c` | Required |
| --- | --- | --- | --- |
| destroy in `release.effect` (P5, R5) | no round-trip | **round-trip opened** | no round-trip, no `onEnd` |
| destroy in `release.prepare` (P7, R28) | no `release.effect`, no round-trip | `release.effect`, then **round-trip opened** | `release.effect`, no round-trip, no `onEnd` |
| destroy from an action `release.effect` dispatched (P7, R29) | round-trip opened, then the action and application | the same | no round-trip: the action runs before `OPEN_RESOLUTION`, and the destroy it requests discards it |
| cancel from an action `release.effect` dispatched (P7, R22's shape) | round-trip opened, then canceled `AT_CONSUMER` | the same | no round-trip; canceled `AT_PROPOSAL` |

In the first two rows the step-1 tree makes a consumer call that both the baseline and the required outcome withhold. That is the defect. In the last two rows step 1 keeps the baseline outcome while D-204's intended change waits for step 3, which is allowed.

**Why the release unit is the only such path.** Relative to the baseline, D-204's unit table (§2.3) changes two boundaries:

- **U-C**, which step 1 delivered;
- **`OPEN_RESOLUTION`**, a new queued unit.

In every other unit, D-204 runs the baseline's trace without the request and then applies the request (§2.4; the model's trace-equivalence checks). Step 1 produces exactly that, because no reader inside a unit sees the request. So step 1 can differ from the target only where the target places a boundary that step 1 lacks. This argument rests on the design's unit table. It is confirmed by P5's activation and settlement rows and by P7's release rows. It is not an exhaustive probe of every path.

### 12.3 The decision

**The consumer round-trip's own unit lands in step 1, before step 2.** It brings with it:

- its operation-scoped carrier;
- its full entry condition;
- the cancel stage rule;
- the inventory of actions that `release.effect` dispatches.

Step 3 keeps the deletion of in-unit ledger reads, the cancel phase rule and supersession at intake (§8).

**Property 13, added: interim outcomes.** At every commit that lands a step of this decision, the consumer calls on each case's path match either the baseline's (`582092c1f`) or the required outcome's. These are participation slots, `invoke`, `onStart`, `onMove` and `onEnd`. A call that both withhold is never made, and a call that both make is never dropped. An argument value, such as a cancel stage, may come from either side. Each step's record lists the cases still at their baseline outcome, and `run.sh` reruns P5 and P7 against the tree it finds. The interval from `2c5212daf` to the round-trip's unit is F-438. It is a defect, not an accepted interval.

**Why the cancel clause and the stage rule move too:**

- **The cancel clause.** Once the round-trip is its own unit, an action dispatched from `release.effect` runs before it. A cancel requested by that action would then open the round-trip after the registration unless the entry declines, which is F-436's counterexample. The clause reads the cancel request that exists today (`#operation.cancelRequest`), so it needs nothing from step 3.
- **The stage rule.** The split creates paths where a cancel is applied at `RELEASING` before `invoke` was called, R22's among them. Today's phase test would report `AT_CONSUMER` on them, extending F-435 to paths the split itself creates. The rule, `AT_CONSUMER` exactly when `invoke` was called, is local to the round-trip's unit.
- **The inventory.** The order change lands with the split, so its inventory and escalation clause land there too.

**What the separation looks like at each commit.** After the round-trip's unit lands, no unit reads a destroy request after its entry, as at `2c5212daf`. The cancel request is still read inside units until step 3 deletes those readings. It is read at `OPEN_RESOLUTION`'s entry permanently, as §2.2 allows.

### 12.4 Options considered

| Option | Outcome between steps | Cost |
| --- | --- | --- |
| **(1) Land the round-trip's unit in step 1** (chosen) | R5 and R28 hold, by order as designed. R4, R22 and R29 reach their required outcome early, and R6 is unchanged | step 1 gains the unit, its carrier, its entry condition, the stage rule and the inventory; step 3 loses them. No new machinery, and nothing deleted later |
| (2) Let the staging conditional also read the lifecycle request until step 3 | baseline for R5 and R28 | puts back an in-unit read of a registered request: the running release unit changes what it does because a destroy was requested. That is the property the owner's follow-up forbids, reintroduced and then deleted again in step 3 |
| (3) Accept the interval through step 3 | `onReorder` after a stop request, on two landed steps | none in code; a consumer model mutation that both the baseline and the target forbid |
| (4) Revert step 1's `closed` change until step 3 | baseline | restores immediate logical closure inside units; reverts 22 revised rows and the early outcomes of R2, R7 and R11; step 3 then lands everything at once |

**Why (1).** It is the only option that holds the owner's separation at every commit and restores R5 without a reading that would later be deleted. It changes when D-204's work lands, not what that work is.

### 12.5 Cases and verification

**R28 and R29** are added (§7). R28 is the `release.prepare` half of §4 item 4, which had no case. R29 is the destroy half of R22. Both run in the model. The model also has a step-1 mode, an inline round-trip with no in-unit lifecycle reading. In that mode R5 and R28 open the round-trip, so both cases tell step 1 apart from the target.

**The six release-unit cases**, R4, R5, R6, R22, R28 and R29, land in step 1. Each must be driven by a request raised from a seam the bracket is running. The existing `seams.node` row sets its harness flag directly, so it reaches none of them, and it passes at both trees.

**What it changes in this record:**

- §2.8's inventory pointer;
- §7, which gains R28 and R29;
- §8 steps 1, 3 and 6, and the first escalation clause;
- §9;
- the Appendix, which gains P7 and the model's new lines.

§2.1–§2.13's design, §3–§6 and every carried property are unchanged.

## 13. Amendment: a registered failure declines the round-trip (D-206)

**2026-11-01. Input:** the implementer's escalation checkpoint `3e44eaf62` (D-205 step 1, not accepted) and its record [`d204-step1.md`](../../measurements/d204-step1.md) §The open escalation. This section resolves §8's first escalation clause for the case that record found. It records **F-439**. The checkpoint is evidence here, not an accepted step.

### 13.1 The escalation

D-205 moved the round-trip into `OPEN_RESOLUTION` in step 1, so work the release unit queues now applies before the round-trip opens (§2.8). Step 1's inventory found one producer of such work whose new position changes a published outcome. A custom placeholder's `connectedCallback`, run by the sortable's release move inside `release.effect`, calls `controller.invalidate()`. That queues collection work for the operation.

If `items()` throws, the collection action's `prepare` fails. That registers a checkpoint (`FAILURE_ACTION_PREPARE`), and its `FAILED` entry is queued **behind** `OPEN_RESOLUTION`. D-205's entry condition does not mention failures, so the round-trip opens: `onReorder` runs for an operation whose failure is already registered. `FAILED` then abandons the round-trip and settles with the failure fallback.

| Resolver | Baseline `582092c1f` | Checkpoint `3e44eaf62` (D-205 as stated) |
| --- | --- | --- |
| synchronous | `onReorder`; `onEnd` `accepted`; then `onError` | `onReorder`; `onError`; `onEnd` `canceled` `AT_CONSUMER` |
| asynchronous | `onReorder`; `onError`; `onEnd` `canceled` `AT_CONSUMER` | the same |

At the baseline a synchronous settlement is queued ahead of the late checkpoint and wins, and the checkpoint only reports. Under D-205 the checkpoint is queued ahead of the settlement and decides. **The question was whether that terminal change is an argument value under property 13 or a changed published outcome needing a decision.** It is the second. Its premise is also wrong: no outcome on this path should open the round-trip at all.

### 13.2 Evidence

P8 (Appendix) reproduces both rows in Chrome on a clean extract of `582092c1f` and on the working tree at `3e44eaf62`, for both resolver timings, with and without the throw. Without the throw the outcome is `accepted` on both trees, and only the order of `items()` and `onReorder` differs, as §2.8 anticipates. The baseline rows equal the implementer's, taken at `2c5212daf`.

The model gains a failure checkpoint with §2.10's intake and application rules, and R30. Under D-206's entry condition R30 gives no `onReorder` and `onEnd(canceled AT_PROPOSAL failed)`. Under D-205's stated conditions it gives `onReorder` and `canceled AT_CONSUMER`, so the case tells the two apart. R1–R14, R22, R28 and R29 are unchanged.

The other inventory items need nothing:

- free drag's actions are no-ops at `RELEASING`;
- neither behavior's `release.effect` dispatches;
- cancel and destroy from the same placeholder reaction are R4 and R5.

### 13.3 The decision

**`OPEN_RESOLUTION` also declines while a failure checkpoint for its operation is registered and unapplied.** The required outcome on R30's path, for either resolver:

- no `onReorder`;
- `FAILED` applies at `RELEASING`;
- `onError` with the failure's stage;
- one `onEnd` `canceled` at `AT_PROPOSAL`, origin `failed`;
- retirement.

**This completes §2.8's guarantee rather than adding a rule.** The round-trip is the one consumer callback that starts a consumer-side domain transaction (§2.8). I-22 names three terminal requests: destroy, cancel and the failure checkpoint. D-202 covered destroy by priority, and D-203 covered cancel by an entry reading, because FIFO alone misses a request registered by an entry queued ahead of `OPEN_RESOLUTION` (F-436). A failure checkpoint is the third, and it sits in exactly F-436's queue shape. Without the clause, the kernel asks the consumer to commit a reorder that it already knows will be abandoned. With a synchronous resolver that reorder is committed and cannot be aborted, and the operation still reports `canceled`.

**Request/application separation holds:**

- **Registration** records a fact on the operation when `#failOperation` queues the checkpoint. It changes nothing a running unit uses: the held command, the attempts and the phase are left for `FAILED`'s application.
- **The reading** happens at `OPEN_RESOLUTION`'s entry, before any of its work, in the form `START_COMMITTED` and D-203's clause already have (§2.2 reading 2).
- **Application** stays with `FAILED`. Declining changes nothing, and the operation stays `RELEASING` for the entry that decides it.

**Declining cannot strand the operation.** The checkpoint's `FAILED` is behind `OPEN_RESOLUTION`. Only a cancel or destruction can intervene, and each decides the operation itself. At application the checkpoint is current and the phase is neither `IDLE` nor `REPORTING`, so it applies, or is superseded by a cancel that does (§2.8).

**Required properties of the record, not its form:**

- It is written only when a checkpoint is queued for the operation. A failure demoted at intake writes nothing.
- It is read only at `OPEN_RESOLUTION`'s entry. `FAILED` may consume it.
- It is operation-scoped, so a later operation cannot read it, and it costs no allocation per pointer sample.
- A checkpoint superseded at intake (step 3) may write it or not. The cancel clause declines either way.

**Scope.** The clause covers the `invoke: null` command too, as the cancel clause does. `START_COMMITTED` gains no failure clause. Committing `ACTIVE` makes no consumer call, and a checkpoint applied at `ACTIVATING` or at `ACTIVE` produces the same terminal.

**Consumer-visible change** (§4 item 8):

- **With a synchronous resolver:** `onEnd` `accepted` plus a late `onError` becomes `onError` plus `onEnd` `canceled` at `AT_PROPOSAL`, with no `onReorder`.
- **With an asynchronous resolver:** `onReorder` is no longer called, and the stage moves from `AT_CONSUMER` to `AT_PROPOSAL`.
- **Unchanged:** a failure raised after the round-trip has opened still abandons it and settles `AT_CONSUMER`.

### 13.4 Options considered

| Option | Outcome on R30's path | Why not |
| --- | --- | --- |
| **(1) Decline on a registered failure checkpoint** (chosen) | no `onReorder`; `onError`; `canceled` `AT_PROPOSAL`; the same for both resolvers | — |
| (2) Accept `3e44eaf62`'s outcome | `onReorder`, then `onError` and `canceled` `AT_CONSUMER` for both resolvers | the outcome is FIFO-consistent and satisfies property 13's call rule. But it opens a consumer domain transaction the kernel has already doomed, the gap F-436 closed for cancel. With a synchronous resolver the consumer commits a reorder and is then told `canceled` |
| (3) Keep the baseline's synchronous `accepted` | timing-dependent, as today | needs the settlement to outrank a failure registered before the round-trip opened. That requires the round-trip to run ahead of the work the release unit queued (F-438's shape) or a priority rule I-22 does not have |
| (4) Make the sortable's collection action a no-op at `RELEASING` | no failure on this producer | a behavior change outside the escalation, and it covers one producer. Any other work queued ahead of `OPEN_RESOLUTION` that fails leaves the gap |

**Why (1).** It applies to failures the reasoning D-203 applied to cancel, at the same boundary and in the same form. It makes the outcome independent of resolver timing and of where the checkpoint's entry falls relative to `OPEN_RESOLUTION`. It adds one entry reading and one operation-scoped fact, and moves no order that another case fixes.

### 13.5 Cases, handoff and verification

**R30** is added (§7). It is the failure half of R22. It runs in the model, and it discriminates against D-205's stated conditions.

**Handoff: the clause completes step 1's round-trip unit** (§8 step 1). The rest of the unit landed at `3e44eaf62`. Before step 2:

- **The clause**, with the record's properties from §13.3.
- **R30 as tests**, each driven through the bracket with no harness flag:
  - in `kernel.browser`: an action that `release.effect` dispatched fails in its `prepare`, with a synchronous resolver, an asynchronous resolver and the `invoke: null` command;
  - in the sortable suite: P8's throwing path, with both resolvers, asserting the full outcome in §13.3 and the stage `FAILURE_ACTION_PREPARE`.
- **A mutation**: removing the clause reddens the R30 rows. _Amended by §14.3:_ the four rows whose outcome the clause decides. On the `invoke: null` row the mutant is equivalent.
- **Contract text**: 02 §`ResolutionCommand` and §Release ordering state the clause; COVERAGE records the rows and the mutation.
- **The step-1 record** replaces §The open escalation with a pointer to this section and reports the composition change.

None of the D-205 checkpoint's other work changes. **The checkpoint is not accepted by this decision.** Its acceptance, with the clause, is the step-1 review's.

**What it changes in this record:**

- §2.2, §2.7, §2.8 and §2.10;
- §4 item 8, and the §5 and §6 rows;
- §7, which gains R30;
- §8 steps 1, 3 and 6, and the first escalation clause;
- §9;
- the Appendix, which gains P8 and the model's new line.

§3 and every carried property other than the entry condition are unchanged.

## 14. Step 1 accepted (D-206)

**Input.** `e9eaf657c` on `drag2/fin-review2`. The implementation reviewed is `44e2074f1`. Step 1 landed in three commits:

- `2c5212daf`: the runner and construction;
- `3e44eaf62`: the round-trip's own unit, and the repairs for reviewer-B to reviewer-D;
- `902810cae`: the failure clause and R30.

`44e2074f1` commits the owner's `seams.node` assertion edit. The assessment rests on the step-1 feature proof ([`d204-step1-feature-proof-claude.md`](../fin-review2/d204-step1-feature-proof-claude.md)): its review of `2c5212daf` and its §Recheck at `44e2074f1`.

### 14.1 Assessment

**Step 1 is accepted.** Each of §8 step 1's completion conditions holds:

- **The round-trip runs in its own unit.** The release unit holds the command and queues `OPEN_RESOLUTION`. Its entry reads the five clauses of D-206 property 6. The cancel stage is `AT_CONSUMER` exactly when that unit reached `invoke`. The `release.effect` inventory is recorded, and its one escalation is decided (§13). Registration is written in `#failOperation` only after the demotion return, it lives on the operation record, and nothing but the round-trip's entry reads it.
- **The step's cases are rows through the running controller.** The review of `2c5212daf` covered R1's construction and drain half, R9–R11, R13, R15, R17 and R23–R27. The recheck covered R4–R6, R22 and R28–R30.
- **Mutations discriminate where they can.** Removing the clause or the registration reddens four rows. Opening the round-trip inline reddens eleven, including R5, R28 and both null-command rows. Removing the cancel clause reddens two, and reading the stage from the phase reddens three. Removing reviewer-B's repair reddens one.
- **The step's contract text is in the tree**: 02 §Release ordering, §`ResolutionCommand` and the stage rule, 01's construction sections, and COVERAGE.
- **Property 13 holds on the paths probed** (P4, P5, P7, P8). R3 and R8 remain at their baseline outcome; both belong to step 3.
- **The failing sets are the input's**: the ten test failures, an eslint set that is a subset of the baseline's, and the two `.scripts/vitest-*.ts` typecheck errors.

**Checked independently, at `e9eaf657c`:**

- **`run.sh`:** the model's R1–R14, R22 and R28–R30 are `ok`. P4, P5 and P7 pass 12 of 12. P8's throwing rows show no `onReorder` and `canceled AT_PROPOSAL failed` for both resolvers, and its non-throwing rows are `accepted`.
- **The five R30 rows** pass.
- **The `invoke: null` argument** (§14.3) was read in the code. In `kernel.ts`: `#openResolution`'s null path, `#settleResolution`, `#handleFailed` and `#handleResolutionSettled`. In both behaviors' `spec.ts`: the only place `RESOLVING` is set.

**Limits, carried from the recheck and not discharged by this acceptance:**

- Browser runs used Chromium only.
- The four surviving round-trip mutants in COVERAGE were not re-run.
- Reviewer-B's repair is verified at the bracket, not through a real `Kernel` panic.
- 01's and 02's amendments were sampled rather than read in full.

None of these limits leaves a step-1 property without a row. **The decision's own acceptance (§8 Acceptance) still re-reads every §5 contract row against the tree. Step 1's acceptance does not discharge that.**

**What this does not do:**

- **D-206 stays `Unimplemented (Remediation)`.** Its witness, the absent `d206-requests.md`, holds.
- **F-432 to F-435 stay open** and close when the whole decision lands. Their step-1 rows (R15, R9, R4, R6 and R22) have landed. F-434's R8 is step 3's.
- **D-200's independent acceptance is still pending**, unchanged.

### 14.2 Dispositions

| Item | Disposition |
| --- | --- |
| **F-438** (Tier A) | **Closed.** Its property is held by order rather than by a reading: application discards the queued `OPEN_RESOLUTION`. R5 and R28 are bracket-driven rows that the inline-open mutation reddens |
| **F-439** (Tier B) | **Closed.** The clause and registration landed at `902810cae`. The four discriminating R30 rows redden under either mutation. The fifth row is §14.3's |
| Reviewer-A to reviewer-D | **Resolved**, as the recheck records. A was decided as D-205 and is carried by D-206 |
| Reviewer-E (Tier C) | **The owner's**, for `seams.node.test.ts:1174–1178`. The comment and the unused `oxlint-disable` describe a spelling the assertion no longer uses. Nonblocking |
| Reviewer-F (Tier C) | **The implementer's.** The census in `d204-step1.md:235` says "three of the five", and COVERAGE's inline-open count of 6 belongs to `3e44eaf62`, not to the tip. Required property: a census states the count for the tree it names. Nonblocking. It may land with step 2's record |
| Reviewer-G (Tier C) | **Repaired here.** D-206's row in §Decisions not yet implemented now lists steps 2–6, with a dated note beneath the table |
| The `invoke: null` mutation requirement | **D-206 amended in place** (§14.3) |

### 14.3 The `invoke: null` mutation requirement

**The observation is correct.** D-206 said _"A mutation that removes the clause must redden the R30 rows"_, and §13.5 put the null-command row among them. On that row no surface can see the clause.

**The mutant is equivalent.** Without the clause, opening a null command calls `#settleResolution`, which queues `RESOLUTION_SETTLED` behind the `FAILED` already queued. `#handleFailed` retires the attempt slots, so the late settlement finds no slot and reports nothing. The behaviors take a failed drop's stage from `RESOLVING`, which only the `invoke` closure sets. With no closure, the stage is `AT_PROPOSAL` either way. No consumer call, report or warning differs.

**Decided:** the requirement covers the R30 rows whose outcome the clause decides. Those are the kernel's two resolver rows and the sortable's two. The clause keeps covering the null command, and property 6 is unchanged. The null row stays and asserts the decided outcome. It is not counted as the clause's falsifier, and the inline-open mutation holds it as a regression row. This is a verification sentence, so D-206 is amended in place under a dated paragraph, as the ledger amends decisions. No decision is minted.

**Not chosen:**

- **Require a discriminating null row.** The only ways are a harness flag that forces the queue order, which §8 rules out for these cases, or a production change that makes a null command settle in the opening unit. That would be a behavior change made for testability.
- **Take the null command out of the clause.** The entry condition would stop being uniform. The null path's outcome would then depend on where the skipped settlement happens to land in the queue, an incidental property that a later step may change. The clause costs nothing there, because the conjunct is already evaluated.
- **Delete the row.** It fixes the null command's outcome, and it is one of the eleven rows the inline-open mutation reddens.

### 14.4 Handoff: step 2, the split and capture

**Scope.** D-201's split and capture, as D-202 property 1 carries it: D-201's properties 3, 4, 10 and 12, and its decomposition.

- **Decomposition.** The `BehaviorContext` façade owns realm, root, the bracket, the ingress `AbortController`, and one nullable reference to the armed controller. The armed controller holds every handler, controller-scope context as `readonly` fields, and the current-operation slots.
- **Property 3.** Controller-scope context is published complete by U-C and never reassigned. No reader tests for its presence.
- **Property 4.** A unit resolves its target operation and activation once, at entry, and validates their currency there. Helpers below the entry receive them as arguments. The current-operation slots are read only:
  - at unit entries;
  - at request intake;
  - by the statements that publish or retire them.

  The settlement input travels as the seam's capability.

- **Property 10.** Teardown deduplication, as D-201 lists it.
- **Property 12.** `src/` holds no module-level mutable binding, with a census. One pointer sample allocates nothing (I-26).

**Cases:** D-201's capture assertions and R19. The tests D-201 §5 lists as encoding a revised promise change with the step that revises them.

**Step 2 keeps from step 1:**

- **Every step-1 row stays green**, the five R30 rows and both null-command rows included.
- **`OPEN_RESOLUTION` reads its five clauses at its entry, and nowhere else.** The cancel and failure records may move to the armed controller's operation record. They stay operation-scoped. Registration is still written only where a checkpoint is queued.
- **Reviewer-B's property.** A `destroy()` after a panic settles its promise, and its three `execution.node` rows stay green. Step 2 rewrites the teardown that promise depends on, so this is the row most at risk.
- **`closed` stays readable** and reports `CLOSED` only until step 4.
- **Property 13.** No landed step makes a consumer call that both the baseline and the target withhold. The step's record carries the interim accounting forward.
- **D-200.** No `Lifetime` or `ActionQueue` property changes.

**Out of scope:**

- deleting in-unit ledger reads and the staging conditional (step 3);
- the renames and the surface (step 4);
- the comment pass (step 5);
- `d206-requests.md`, which is step 6 and whose creation would falsify the witness early;
- reviewer-E and reviewer-F, which do not gate step 2.

**Record:** `.plan/measurements/d206-step2.md`. It holds:

- composition on every kernel-carrying `bench/size` row, before and after (CONTRIBUTING §15);
- the module-binding census;
- each mutation census, with the tree it was taken at;
- property 13's interim table.

M-1 and M-2 belong to step 6. If the façade hop measurably changes the move path before then, the record reports it.

**Escalate rather than decide** if:

- the split needs a module-level mutable binding, or the façade hop allocates per pointer sample;
- a step-1 row stays green only by reading a request inside a unit, or by reading the cancel or failure record anywhere but `OPEN_RESOLUTION`'s entry;
- teardown deduplication changes an outcome that a step-1 row or reviewer-B's rows assert.

**Review.** Step 2 gets its own feature proof before step 3 starts.

## 15. Step 2 accepted (D-206)

**Input.** `889bfc23c` on `drag2/fin-review2`. The implementation reviewed is `877fb9612`, which landed step 2 in one commit on the step-1 acceptance at `222445777`. The assessment rests on the step-2 feature proof ([`d206-step2-feature-proof-claude.md`](../fin-review2/d206-step2-feature-proof-claude.md)) and on the step's record ([`d206-step2.md`](../../measurements/d206-step2.md)).

### 15.1 Assessment

**Step 2 is accepted.** Each requirement §14.4 states holds at `877fb9612`:

- **Decomposition and property 3.** The `Kernel` façade owns the realm, root, bracket, ingress `AbortController` and one nullable `#armed` reference. `ArmedController` holds every handler, the slots and the controller-scope context. That context is in `readonly` fields assigned only in its constructor, and no reader tests them for presence.
- **Property 4.** Each unit entry resolves its operation and activation records once and passes them down. The settlement input is the seam's capability, and the `settlementInput` slot is gone. One read of a slot below a unit entry remains, `#preparationValid`. It is step 3's, and §14.4 kept it out of step 2.
- **Property 10.** Steps 3–6 are written once, in `#release`, and are reached only from retirement by identity and from teardown. The `null` retirement mode is gone. A mint failure disposes its local record and touches no frame and no published slot. That is the behavior change D-201 property 10 decides, and it makes no consumer call.
- **Property 12.** `src/` holds no top-level `let` or `var` and no mutable `static`. `let verifying` and `setRefreshVerification` are gone. The development-only instrument is switched off by a `shipped` test project that defines `__DEV__` false, so no `src/` state remains for a test to flip. Project routing was verified in package and workspace modes. One pointer sample allocates nothing.
- **Kept from step 1.** `OPEN_RESOLUTION` reads its five clauses at its entry. Registration is written only in `#failOperation`, after the demotion return. `closed` reads the bracket. `lifetimes.ts`, `queue.ts` and `execution.ts` are unchanged, so D-200 is untouched. Every step-1 row passes, including the five R30 rows, both null-command rows and reviewer-B's three `execution.node` rows. The failure clause still reddens four rows and the cancel clause two. The inline-open mutation reddens eleven, and removing reviewer-B's repair reddens one.
- **Property 13.** `run.sh` gives the same set of lines at the input and the tip. R3 and R8 stay at their baseline outcome, as step 3's.
- **The failing sets are the input's**, plus the 13 budget rows below. These are the ten test failures (six `size.node` controls and four `docs.node` rows), the same six eslint errors in the changed files, and the two `.scripts/vitest-*.ts` typecheck errors.

**Checked independently at the tip:**

- **`run.sh`:**
  - the model's R1–R14, R22 and R28–R30 are `ok`;
  - P4, P5 and P7 pass 12 of 12;
  - P8's throwing rows show no `onReorder` and `canceled AT_PROPOSAL failed` for both resolvers, and its non-throwing rows are `accepted`;
  - P5 still shows `activation.rollback` for a cancel in `activation.prepare`, and P4 still strands the first operation. Those are R3 and R8 at baseline.
- **`capture.node`** passes 11 of 11. A text search finds no top-level `let` or `var` in `src/`.
- **step2-A's premise.** `objectConstants` accepts only an initializer that is itself an object literal, array literal or `new` expression. The seven constants it misses are each initialized with `as`, `as const` or `as const satisfies`.
- **step2-B's premise.** The input's bracket callback already called the private `#handle` (`222445777` `kernel.ts:345–347`).
- **step2-C's premise.** The two passages in 05 name `Kernel.#panic`, and §15.2 reads both.

**Runtime.** The independent measurement used 56 runs per tree. It resolves no end-to-end difference at about 0.1 µs, which is roughly 3%. A smaller one cannot be excluded. Allocation stays at zero per sample. Corrected for step2-B, the call-path analysis predicts one more field read, one more argument and one call fewer per active sample. No runtime regression is demonstrated or predicted above call-overhead scale. The owner's ruling authorizes no runtime regression, and none is found. M-1's resolving measurement remains step 6's.

**Composition: the owner's tolerated overrun.** Thirteen kernel-carrying budget rows exceed their Brotli budgets by 11 to 77 B. The growth is +118 to +160 B Brotli on the composed rows and +128 B on the kernel root, and every tip figure equals the record's _after_ column. Under the owner's ruling (record §Owner rulings, 2), this growth is **a tolerated size cost of step 2, now verified**:

- **No budget is re-based.** The rows stay red in `size.node`, and this acceptance authorizes no re-base. Only the owner can authorize one.
- **The tolerance is step 2's attributed growth.** A later step's growth on a kernel-carrying row is not covered by it. Each step's record reports its composition against the unchanged budgets, with the delta and each row's distance to budget, and attributes any growth. Whether that growth is tolerated is put to the owner at the step's acceptance. It does not stop the step.

**Limits, carried from the review and not discharged here:**

- Chromium only, and M-2 was not measured.
- Thirteen of the record's eighteen mutations were not re-run.
- `react.browser` and `stories.browser` load at neither tree.
- 02 and 05 were searched for the replaced member names, not read in full.

**What this does not do:**

- **D-206 stays `Unimplemented (Remediation)`.** Steps 3–6 remain. The witness, the absent `d206-requests.md`, holds.
- **F-432 to F-435 stay open** and close when the whole decision lands.
- **D-200's independent acceptance is still pending.**
- **Reviewer-E and reviewer-F** of the step-1 recheck stay open, the owner's and the implementer's, as §14.2 assigned them.

### 15.2 Dispositions

| Item | Disposition |
| --- | --- |
| **Step 2** | **Accepted** at `877fb9612` |
| The 13 budget overruns | **Tolerated** under the owner's ruling. Not re-based. Later steps report against unchanged budgets (§15.1) |
| **step2-A** (Tier B) | **The implementer's. Open, nonblocking for steps 2 and 3.** Completion boundary below |
| **step2-B** (Tier C) | **The implementer's. Open, nonblocking.** Completion boundary below |
| **step2-C** (Tier C) | **Decided here: neither passage is edited.** The current-state obligation goes to step 4's I-36 rewrite (below) |

**step2-A: the object-valued constant census.**

- **Required property.** The census in `capture.node`'s _should hold only these object-valued constants in library modules_, and in the step-2 record, enumerates every module-level constant initialized with an object literal, an array literal or a `new` expression, whatever wraps the initializer:
  - `as`, `as const` and `satisfies`;
  - parentheses;
  - a non-null assertion;
  - an angle-bracket assertion.

  The row's list is exact for its tree. Each constant it adds is classified by reading its uses.

- **The record states the count for the tree it names.** `d206-step2.md`'s census says 6 for `877fb9612`, and the review counted 13. The implementer corrects the record with a dated correction that names the tree. COVERAGE's claim that the row "pins the list exactly, so a seventh is classified when it appears" becomes true when the row is repaired, and not before.
- **Completion boundary.** It lands **before `d206-requests.md` is written**, and before any record or acceptance cites the census as property 12's evidence. Step 6's record states the census for its own tree. **D-206's acceptance (§8) does not rely on property 12's census until step2-A is closed.** It may land with step 3, which edits `capture.node` anyway, because the slot-read row loses its `#preparationValid` exception there.

**step2-B: the call-path count.**

- **Required property.** The analysis states the counted difference for the trees it names. At `877fb9612` against `222445777`, that is one more field read and one more argument per active sample, and one call fewer.
- **Completion boundary.** The implementer corrects `d206-step2.md` §Runtime with a dated correction **before `d206-requests.md` is written**. It may land with step 3's record. Step 6's record states its own call-path analysis for the trees it names.

**step2-C: `Kernel.#panic` in 05.** Neither passage is current-state text.

- **`05-lifecycle-invariants.md:839`** is Q-22's original question. It is struck through and quoted under its resolution ("Original text follows."). Quoted history is never re-pointed.
- **`:233`** is D-178's dated amendment paragraph (_Amended by D-178, 2026-09-04_). It records what D-178 decided about the site as the tree stood on that date. The ledger amends by adding dated paragraphs and does not rewrite earlier ones. Its date already marks it as of then, so a further marking would add nothing.

**The obligation behind the finding is real, and it belongs to step 4.** A reader of I-36 must be able to locate the post-closure diagnostic by a site that exists. I-36 is rewritten at step 4 (§5, §8 step 4). That rewrite restates D-178's exception members in the present tense, naming each by its route rather than by a private member:

- the two `retireHooks` walks under relinquishment;
- the panic route's `onError` delivery under diagnosis, which is the bracket's panic callback into the armed controller.

A refactor then cannot stale the text. Until step 4, the dated paragraph's member name is a known, recorded mismatch. §8's acceptance re-read confirms the rewrite.

### 15.3 Handoff: step 3, kernel requests

**Governing design:** §2.2 (the ledger and its three reading places), §2.6 (cancellation), §2.10 (failures), §2.11 (what the deletions remove), §6 (the guard sites), §7 (the cases) and §5 (the contract rows). Sites below are cited at `877fb9612`.

**Scope.** No unit reads the ledger after its entry, in the kernel and the seam driver. Every lifecycle-request and cancel-request read below a unit entry is deleted. The ledger's three reading places are the only ones left: the runner, unit entries and request intake (§2.2).

**Delete:**

- **`ArmedController.#preparationValid`** (`kernel.ts:539–549`) and the driver's dependency on it (`seams.ts:159`, `:227–232`). With it go both of its reads in the shared core:
  - the invalidated arm (`seams.ts:289–292`);
  - the staging conditional (`:315`), which step 1 kept.
- **`SEAM_INVALIDATED`** (`seams.ts:80`, `:104`) and the activation policy's invalidated arm (`:618`).
- **`rollback`**:
  - `Transition.rollback` and `ActionTransition.rollback` (`seams.ts:56`, `:74`);
  - `BehaviorSpec.activation.rollback`, `BehaviorSpec.action.rollback` and the kernel's adapter (`kernel.ts:1370–1371`);
  - the `seam/rollback-failed` path (`seams.ts:199`, `:290`);
  - the sortable's D-39 placeholder undo ledger, which only `rollback` replays (§2.11).
- **The activation policy's `committed` revalidation** (`kernel.ts:1218`). `START_COMMITTED` is queued unconditionally. Its entry keeps the held-cancel reading (§2.7).
- **The lifecycle and cancel conjuncts of the in-unit liveness checks**:
  - `#settlementLive` (`:1409–1416`);
  - `#joinLive` (`:1425–1431`) at each of its call sites;
  - `#settleResolution`'s latch (`:1755`);
  - `#handleErrorReported`'s latch (`:2388`);
  - `#runAdmission`'s recheck (`:952`). Admission publishes unconditionally (R1).

  A phase, identity or attempt conjunct is a currency check. It stays only where it is read at a unit entry, or is shown reachable below one. If it is neither, it goes too.

- **`#failOperation`'s cancel conjunct** (`:797`). Supersession moves to the checkpoint's application (§2.10). The intake's context checks stay: `CLOSED`, no committed operation, and a report in flight.

**Add:**

- **The cancel phase rule** (§2.6). `cancel` registers only against an operation committed at intake in `PENDING`, `ACTIVATING`, `ACTIVE` or `RELEASING`. It is a no-op otherwise, on a duplicate, and when `CLOSED`.
- **Supersession captured at intake** (§2.10). The checkpoint records at intake whether a cancel for its operation is registered and unapplied. `FAILED`'s entry decides on that record, or on a cancel still held at its entry, and reports `drag: failure/superseded-by-cancel`.
- **Activation's held-cancel entry clause** (D-207, §16.3). `ACTIVATE`'s entry, and `MOVE`'s entry while the committed phase is `PENDING`, decline while a cancel for the operation is registered. It lands in the same commit as the deletion of the activation policy's `committed` revalidation and of `#preparationValid`.

**Cases.**

- **New rows through the running controller:**
  - R1's admission half;
  - R2 and R3;
  - R7 and R8;
  - R12, R14, R16 and R20;
  - R31 (D-207): the keyboard row _should enqueue an invalidate() rather than drain it_, unchanged, and the two `kernel.browser` rows of §16.5, with their mutations.
- **Must stay green:**
  - R4–R6, R22 and R28–R30, including the five R30 rows and both null-command rows;
  - reviewer-B's rows;
  - every step-2 row. The slot-read row loses its `#preparationValid` exception.
- **Tests that encode a withdrawn promise.** The ones §7 lists for these behaviors change in this step:
  - the `SEAM_INVALIDATED` and `rollback` rows in `seams.node`;
  - the D-39 ledger tests;
  - the rows asserting a silent drag for a cancel during activation.
- **The declaration surface.** Any declaration row that names a removed `rollback` member changes in the same commit.
- **Not this step's:** the renames, `closed`, `live` and `moveTo`, which are step 4's.

**Contract, in the same commit as the code that makes it true** (§5):

- I-3 and 02 §Post-callback revalidation;
- I-16;
- I-21 and I-22;
- I-31;
- 02 §The tri-phase transition, §Every classification entrypoint latches and §What this actually guarantees, with the new tier-B row _no unit reads the ledger after its entry_;
- 02 §Attempts.

**No present contract sentence is left false.** Step 3's deletions falsify some text booked to step 4: I-36's per-invocation latch reading on the kernel's own routes, and D-179's `joinLive` route coverage. Step 3 amends those sentences as far as its deletions reach. The participant clause for the behaviors' `closed` and `live()` reads stays until step 4 removes those reads, as does the rest of I-36's rewrite (§15.2).

**Keep:**

- `OPEN_RESOLUTION`'s five-clause entry, and registration written only where a checkpoint is queued. With the intake's cancel conjunct gone, a failure raised while a cancel is held is now queued and registered rather than demoted. The round-trip declines either way, and `FAILED` reports the supersession.
- `closed` stays readable and reports `CLOSED` only, until step 4.
- D-200: no `Lifetime` or `ActionQueue` property changes.
- I-26: one pointer sample allocates nothing.

**Property 13.** R3 and R8 leave their baseline outcome in this step. The record reruns `run.sh` at the input and the tip. It shows P5's R3 trace and P4's R8 trace changing to the required outcomes. It also shows that no probed row makes a consumer call that both the baseline and the target withhold. It carries the table forward with R3, R8, R12, R14, R16 and R20 moved to _required_, and R31 listed with its baseline and required outcomes coinciding.

**Out of scope:**

- the renames and the surface, and the behaviors' sinks (step 4);
- the comment pass (step 5);
- `d207-requests.md`, which is step 6, because creating it would falsify the witness early;
- re-basing any budget.

step2-A, step2-B and reviewer-F may land with this step. Reviewer-E stays the owner's.

**Record:** `.plan/measurements/d207-step3.md` (renamed by D-207). It holds:

- composition on every kernel-carrying row against the unchanged budgets, with delta and distance to budget (§15.1);
- each mutation census, with the tree it was taken at;
- the guard-site census, by `grep`, for lifecycle-request, cancel-request and failure-record reads in `src/kernel/`. It must find only §6's places;
- property 13's table.

**Escalate rather than decide** if:

- a deletion changes a published outcome other than those §4 and §7 state for R1–R3, R7, R8, R12, R14, R16, R20 and R31. The case raised under this clause on 2026-11-01 is decided by D-207 (§16);
- a step-1 or step-2 row stays green only through a reading this step deletes;
- R16's two orders, or any reachable order, disagree with §2.10's _or on a cancel still held at its entry_;
- a currency conjunct proves necessary below a unit entry for a reason the design does not state;
- removing `rollback` leaves a `prepare` side effect that nothing undoes and that a test or contract row asserts is undone. §2.11 says the ledger never covered a throwing `prepare`, so this would be new evidence.

**Review.** Step 3 gets its own feature proof before step 4 starts.

## 16. Amendment: a held cancel declines activation (D-207)

**2026-11-01. Input:** the implementer's escalation during step 3, under §15.3's first escalation clause, relayed by the owner. The baseline is `add2d5ca8`, whose `src/` equals `877fb9612`. Step 3's changes are uncommitted; they were run for one row and not otherwise read. This section records **F-440**.

### 16.1 The escalation

The case is `keyboard.browser`'s _should enqueue an invalidate() rather than drain it_. During `command.admit` the consumer's `replace()` reverses the collection, which queues collection work. Admission then queues `ACTIVATE` as its last act. The collection work runs first, at `PENDING`, finds that the commanded downward gap cannot survive, and registers a cancel. That leaves the queue `[ACTIVATE, CANCEL]`.

| Tree | Outcome |
| --- | --- |
| Baseline `877fb9612` | `ACTIVATE` runs `activation.prepare`; the driver's `#preparationValid` reads the held cancel (`kernel.ts:548`); the invalidated arm retires the operation (`seams.ts:292`, `:618`). No `onStart`, no `onEnd`, no `onError`, no placeholder. `CANCEL` then finds no current operation |
| Step 3 as D-206 states it | `ACTIVATE` commits `ACTIVATING` and `activation.effect` delivers `onStart`; `CANCEL` applies at `ACTIVATING`: one `onEnd` `canceled` at `AT_PROPOSAL`, origin `CANCEL_SUPPLIED`, reason `sortable:collection-invalidated`. No error, and the placeholder is removed |

§4 item 3, §2.6's consequence paragraph and R3 describe a cancel raised **inside** the activation unit, from a slot reached from `activation.prepare`. This cancel was registered **before** `ACTIVATE`'s entry, by an entry queued ahead of it. D-206 states no reading at `ACTIVATE`'s entry (`#handleActivate`, `kernel.ts:2024`, checks identity and `PENDING` only). Step 3's deletion therefore changes a published outcome that §4 and §7 do not state, which is the clause's trigger.

### 16.2 Evidence

- **The baseline row passes.** The step-2 feature proof's full run at `877fb9612` fails only `docs.node` and `size.node`.
- **The step-3 row fails as reported.** On the uncommitted step-3 tree, `vitest run --project browser tests/sortable/keyboard.browser.test.ts -t "enqueue an invalidate"` fails at `:756`: `fixture.started` holds the commanded row. The rest of the implementer's trace (the terminal's stage, origin and reason) is taken from the escalation and was not rerun.
- **On the command path, no cancel registered at `PENDING` is ever ahead of `ACTIVATE`.** Admission queues `ACTIVATE` last (`#admitCommand`, `kernel.ts:1060`). A cancel requested during admission registers nothing, because no operation is committed (§2.6). The post-admission drain is synchronous, so nothing at depth 0 runs before `ACTIVATE`. Every cancel that registers at `PENDING` therefore comes from an entry queued during admission, ahead of `ACTIVATE`, and lands behind it. **Under D-206 as written, §2.6's `PENDING` row, "retires the operation silently", is unreachable for a command operation.** Every such cancel would announce a start first.
- **On the pointer path, ordinary orders already retire silently.** Activation is entered by the `MOVE` that crosses the threshold (`#handleMove`, `kernel.ts:1858`). Pointer samples arrive at depth 0 after the drain, so a cancel registered at `PENDING` is applied before the crossing sample. The one order that puts a held cancel behind an activating `MOVE` is a synthetic `pointermove` dispatched from a slot inside a unit at `PENDING`, followed by a cancel registered in that unit or a later one. It is reasoned from the code and was not probed.

### 16.3 The decision

**A unit that would enter the activation seam declines at its entry while a cancel for its operation is registered.** The entries are:

- `ACTIVATE`'s entry;
- `MOVE`'s entry while the committed phase is `PENDING`.

Declining changes nothing. The operation stays `PENDING`, and the request stays held. Its own `CANCEL` entry, queued at registration and behind the declining entry, applies at `PENDING` and retires the operation silently (§2.6).

**The required outcome on the escalated path** is no `onStart`, no `onEnd`, no `onError` and no placeholder, with the next command admitted. That is the baseline's outcome, reached now by a unit-entry reading rather than an in-unit invalidation. The keyboard row's assertions are the required outcome, and the row does not change.

**Why.**

- **It makes §2.6's `PENDING` row hold on both paths.** Whether activation is queued (a command) or reached inline (a pointer) no longer decides whether a cancel registered before activation announces a start.
- **No start is owed for an operation cancelled before it started** (I-31, D-32). Without the clause the kernel announces a start whose only consequence is its cancellation.
- **It is the rule already used at the other entries that open a phase.** `START_COMMITTED` declines `ACTIVE` while a cancel is held, and `OPEN_RESOLUTION` declines the round-trip while a cancel or a failure checkpoint is held (F-436, F-439). In each case FIFO alone covers only a request registered before the entry was queued, and a request registered by an entry queued ahead of it sits behind it. This is that queue shape at activation.
- **R3 and §4 item 3 are unchanged.** A cancel registered inside the activation unit, after its entry, is not seen by the entry. It still delivers `onStart` and then `canceled` at `AT_PROPOSAL`.

**Request/application separation holds:**

- **Registration** is unchanged: §2.6's intake rule.
- **The reading** happens at a unit's entry, before any of its work (§2.2 reading 2).
- **Application** stays with `CANCEL`. The declining entry consumes nothing.

**Declining cannot strand the operation.** The `CANCEL` entry was queued at registration and is behind the declining entry. Between them only these can run:

- behavior actions and consumer requests, which do not change the phase;
- a `FAILED`, which the held cancel supersedes (§2.10);
- another `MOVE` at `PENDING`, which declines likewise;
- destruction, which tears the operation down.

`CANCEL` therefore finds the operation current at `PENDING` and retires it.

**Scope.**

- **Cancel only.** The failure record stays read only at `OPEN_RESOLUTION`'s entry (D-206 property 6). A checkpoint registered at `PENDING` on the command path also lands behind `ACTIVATE`. Its outcome is the baseline's, step 3 does not change it, and this decision does not decide it. It was not probed.
- **Destroy needs no clause.** Priority applies it at the registering unit's boundary, ahead of `ACTIVATE`.
- **`MOVE` at `ACTIVE` is untouched**, so the per-sample path gains no read. `MOVE` at `PENDING` gains one field read and no allocation (I-26).
- **No other entry changes.** §15.3's first escalation clause still governs any other outcome step 3 changes.

### 16.4 Options considered

| Option | Outcome on the escalated path | Why not |
| --- | --- | --- |
| **(1) Decline activation at its entry while a cancel is held** (chosen) | silent retirement, as the baseline | — |
| (2) Accept FIFO | `onStart`, then `canceled` `AT_PROPOSAL` | §2.6's `PENDING` row is unreachable for a command. A start is announced only to be cancelled. The pointer and command paths diverge for the same registration. It adds an unstated §4 change to the keyboard's ordinary invalidation case |
| (3) Apply the held cancel at `ACTIVATE`'s entry | silent retirement | moves application into another unit. The request would be consumed by an entry other than its own `CANCEL`, and §2.8's no-strand argument and §2.6's lapse rule rest on that not happening |
| (4) Keep `#preparationValid`'s cancel conjunct for activation | silent retirement | an in-unit ledger read, which the owner's separation forbids (§1) |
| (5) Change the producer: the sortable's collection work does not cancel at `PENDING`, or `ACTIVATE` is queued ahead of admission's work | varies | a behavior change covering one producer. Queuing `ACTIVATE` ahead of work queued before it reverses I-1's FIFO |

**Why (1).** It applies the entry rule already used at `START_COMMITTED` and `OPEN_RESOLUTION`, in the same form. It keeps the published outcome of the escalated row and of the pointer path. It adds one reading at each of two entries and moves no order that another case fixes.

### 16.5 Cases, handoff and verification

**R31** is added (§7, implementation-only).

**Handoff.** The clause lands in step 3, in the same commit as the deletion of the activation's in-unit revalidation, because that deletion removes the baseline's protection (§15.3).

- **The clause** at both entries, with the property in §16.3.
- **R31 as tests**, each driven through the bracket with no harness flag:
  - the keyboard row, unchanged;
  - a `kernel.browser` command row: an action queued during admission requests cancel at `PENDING`; no `onStart`, `onEnd` or `onError`; retired; the next command admitted;
  - a `kernel.browser` pointer row: an action at `PENDING` dispatches a threshold-crossing `pointermove` and then requests cancel; no `onStart` or `onEnd`; retired. If the harness cannot express the synthetic sample, `d207-step3.md` records why, and the `MOVE` clause is held by the census and the mutation below.
- **A mutation**: removing `ACTIVATE`'s clause reddens the command rows, and removing `MOVE`'s reddens the pointer row.
- **Contract text** with step 3's set: I-21 and I-22 name the activation entries, and 02's unit-entry currency rule names them beside `START_COMMITTED` and `OPEN_RESOLUTION`.
- **Property 13**: the row's baseline and required outcomes coincide. `d207-step3.md` lists R31 with them.
- **The guard-site census** finds the cancel request read at intake and at the `CANCEL`, `ACTIVATE`, `MOVE`-at-`PENDING`, `START_COMMITTED`, `OPEN_RESOLUTION` and `FAILED` entries (§6).

**Renamed:** the witness is `.plan/measurements/d207-requests.md`, and step 3's record is `.plan/measurements/d207-step3.md`. step2-A and step2-B keep their boundary, now before `d207-requests.md` is written. Steps 1 and 2 stay accepted.

**What it changes in this record:**

- §2.2, §2.6 and §2.7;
- §4 item 3;
- §6;
- §7, which gains R31;
- §8 steps 3 and 6;
- §9;
- §15.3.

§3, §5's rows and every carried property other than property 7 are unchanged.