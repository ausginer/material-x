# Execution units: snapshot semantics for drag2's internal call sequences

**Canonical entries:** `drag2:D-201`, which supersedes `drag2:D-199`, decides `drag2:F-432`, and raises and decides `drag2:F-433` and `drag2:F-434`. The decision, the required properties and the steps are stated in [`00-index.md`](../../contract/00-index.md) and are not restated here. This record holds the evidence, the reasoning, the alternatives, the classification tables and the executable cases.

**Input:** `0ed5483a0` on `drag2/fin-review2`. The owner's uncommitted edits to `src/kernel/execution.ts` (a lint suppression at the post-admission latch read) and `tests/kernel/seams.node.test.ts` were read separately and are not part of the input. D-201 deletes the statement the suppression is attached to, so that edit becomes moot rather than wrong.

**Commission:** [`reentrancy-redesign-brief.md`](../../reentrancy-redesign-brief.md) §Governing owner clarification. Once an internal execution unit starts, later mutation of its originating classes, objects or variables must not change the inputs, receivers or targets its later internal calls use.

**Scope.** The kernel (`src/kernel/`), both behaviors' specs and construction paths (`src/sortable/`, `src/free-drag/`), and the async continuations and lifecycle entries where they meet a unit. Out of scope: other packages, an immutability migration, and any layout or presentation change.

## 1. What the code does today

### 1.1 Where the guards come from

The controller is one class whose handlers read mutable fields at every call: `#spec!`, `#frames.current`, `#operation!`, `#activation!`, the latch and the cancel request. When foreign code runs (behavior or consumer), the code after it reads the same fields again and re-checks them. Those re-checks are the guards the owner objects to. Classified by what each one protects, they fall into three families:

| Family | What the guard re-establishes | Examples at `0ed5483a0` |
| --- | --- | --- |
| **Context** | that the fields a later call reads still name the same operation, phase or armed spec | `#runAdmission`'s `current.operation` conjunct (`kernel.ts:935`); `#settlementLive`'s operation and phase conjuncts (`:1378–1379`); `#joinLive`'s (`:1393–1394`); `#retireOperation`'s `!this.#spec` (`:539`); `#cancelWith`'s `!this.#spec` (`:728`); the behaviors' "a reentrant `retire()` has already dropped the record" barriers (`sortable/spec.ts:1460`, `free-drag/spec.ts:724`) |
| **Control** | that a `destroy()` or `cancel()` requested by the foreign call stops whatever the sequence was about to do next | arm's latch test before each `createFramePart()` (`:2477`, `:2481`); `ExecutionBracket.runIngress`'s post-admission latch read (`execution.ts:186`); `#settlementLive`'s latch and cancel conjuncts; `#joinLive` at three sites (`:1510`, `:1537`, `:1634`); `#activationPolicy.committed` (`:1189`); `#settleResolution`'s latch (`:1692`); `#handleErrorReported`'s latch (`:2261`); all 27 behavior-side `kernel.closed` reads except the delivery sinks (§4.2) |
| **Publication** | that a result is still allowed to become current | the seam driver's `preparationValid()` between `prepare` and commit, and the staged-command conditional after `effect` (`seams.ts`); admission's latch reading before minting |

**Only the third family belongs in the design.** The first is needed because nothing guarantees a unit exclusive use of the state it reads. The second is needed because the same reading answers two different questions: _should this call still happen?_ and _are its inputs still valid?_

### 1.2 Exclusivity is nearly in place, and its gaps are exactly where the bugs are

Most of the machinery needed for exclusivity already exists:

- the drain is run-to-completion, so a nested `dispatch` appends and returns (I-1);
- the seam driver refuses a nested phase (`#refuseReentry`);
- physical teardown is deferred to the outermost transaction boundary (D-36), so `retire`, the frame scrub and the record drops never run under a running transaction.

With those three in place, no foreign call made from inside a running transaction can write frames, operation records, activation records or behavior per-operation state. Three gaps break this, and each one is reachable:

- **G1. Construction is not a transaction.** `arm()` runs at bracket depth 0, so a `destroy()` from `createFramePart()` runs physical teardown in the middle of `arm()`. That is the reason for the latch test before each factory call. Probe P2.
- **G2. Ingress is refused only during admission, not during every transaction.** `runIngress` refuses on `#closed || #admitting`. A primary press dispatched synchronously from consumer code inside a running drain unit, with no operation committed, therefore opens a full admission underneath that unit: `begin()` rebuilds the draft the outer seam is writing, and a mint commits `PENDING` with an armed operation. The outer seam then commits the old idle frame back over it. Probe P1 shows the outer `prepare`'s draft changing from phase `0`/operation `null` to `1`/`{id:1}` mid-call, the outer commit republishing `IDLE`, the first operation's listeners left armed, and a second press admitted on top of them (two sets of `pointermove` listeners). **F-433.** The `null`-identity retirement on a mint failure would scrub both frames under the outer unit in the same window.
- **G3. The click-suppressor disarm runs before the refusal** (`#onPointerDown`, `:1141`). A refused nested press still mutates `#disarmClick` and aborts a listener.

### 1.3 Guards that conflate control with context can create the failure they guard against

`#settlementLive` (`:1374`) asks whether the operation is still live, and includes `!cancelRequest` in that answer. `#cancelWith` latches a cancel request in any phase, while `#handleCancel` acts only at `PENDING`, `ACTIVATING`, `ACTIVE` and `RELEASING`. Suppose a `cancel()` is raised inside `anchorTarget` (for example free drag's `home` resolver calling the published controller's `cancel()`). Then the measurement reports the settlement dead, the join never runs, and the queued `CANCEL` arrives at `SETTLING`, where it is ignored. Nothing releases presentation, delivers `onEnd` or retires the operation, and the controller admits no further press. Probe P4, in Chromium, prints `["onStart","settlement.effect","anchorTarget"]`, then `[]` for the next press. The control run prints `…,"presentation.released","finalized phase=7","retire"`. **F-434**, tier A. I-21 says a late cancel is a no-op, so the call is valid integration.

### 1.4 Behavior-side barriers defend states that deferral already rules out

Several behavior barriers cite premises such as "`retire()` nulls the session", "a frame teardown has already scrubbed" or "teardown has already removed this placeholder" (`free-drag/spec.ts:377`, `:694`, `:724`, `:771`; `sortable/spec.ts:1460`, `:1536`, `:1720`). Every one of those seams runs inside a transaction, where `destroy()` only sets the latch. The premise can arise only on G1, or after a `destroy()` at depth 0 between transactions. In the second case no seam is running, and `#settleResolution` drops the late completion before any seam opens. Once G1 is closed, every one of these premises is unreachable. What remains of each barrier is control: whether a consumer slot may still be called.

## 2. The design

### 2.1 The unit

An **execution unit** is one synchronous run of library code entered from outside library code and executed by the controller's `ExecutionBracket` at depth ≥ 1. There are exactly four kinds:

| Unit | Entered by | Ends |
| --- | --- | --- |
| **U-C** construction | `draggable()` calling `arm(spec)`, after the behavior factory returned | when the armed controller is published or unwound |
| **U-I** ingress pass | a native `pointerdown` or `command.types` listener | after admission publishes or discards and the post-admission drain has run |
| **U-A** one queued action | the drain, one entry at a time | when the handler returns; the next entry is the next unit |
| **U-T** physical teardown | `close()` at depth 0, or the boundary of the outermost unit | when step 7 has run |

Everything else that runs library code from outside is a **producer**: pointer and key listeners on the realm, the click suppressor, the rAF frame task, scroll and resize invalidators, thenable callbacks, the layout-animation `finished` continuation, and the controller methods a consumer calls. A producer calls no foreign code. It writes no state a unit reads as context. It may set an environment staleness flag (§2.3, class 6), and otherwise it only records a request (`cancel`, `fail`) or enqueues (`dispatch`). The code at `0ed5483a0` already meets this for every producer, so the design requires it rather than changes it.

**The behavior factory is not a unit.** It runs before the controller is armed. A `destroy()` there tears down at once, as it does today, and U-C is then not admitted.

### 2.2 The capture boundary

At its entry a unit fixes three layers of context. Nothing below the entry reads them from their originating fields again.

1. **Controller scope:** realm, root, the spec and every seam member, config, the frame pair object, the seam driver, the kernel's seam adapters and policies, and the notify and unwind channels. U-C publishes these once, as `readonly` fields of the armed controller, which exists only when it is complete (§2.5). Nothing can reassign them, so nothing tests for them.
2. **Operation scope:** the unit resolves its target operation record and activation record once, at entry, from its action argument (identity, attempt or checkpoint), and validates their currency there. Below the entry, every helper receives them as arguments. Today's handlers re-read `this.#operation!` and `this.#activation!` in `#joinSettlement`, `#startTail`, `#measureTarget`, `#acquireActivation`, `#settlementTransition.effect`, `#closeOperation` and `#openResolution`. Those reads become parameters.
3. **Action scope:** the tag, argument, settlement input and failure checkpoint are values of the unit. The settlement input already has a carrier the driver supports: `runCore`'s `capability` argument replaces the `#attempts.settlementInput` slot. The behavior-action tag and argument may stay in the two unit-local slots, because those slots are written at unit entry, cleared in its `finally`, and read by nothing outside the unit. That makes them equivalent to locals (§2.3, class 7).

### 2.3 Reachable mutable state, class by class

The owner's warning was that a `const` reference to an object whose mutable fields are still read establishes nothing. This table gives each kind of reachable mutable state a stated treatment and names what enforces it.

| # | State | Treatment | What makes it hold |
| --- | --- | --- | --- |
| 1 | The frame pair: which object is `current`, and both frames' fields | **Unit-exclusive.** Only the running unit begins, commits or retires | run-to-completion drain (I-1); the driver's re-entry refusal; **ingress refused at depth ≥ 1** (G2, G3); physical teardown only at depth 0, **construction included** (G1) |
| 2 | Frame referents | **Immutable or replace-on-write** | 04 §The shallow-copy contract, unchanged; tier C for part authors |
| 3 | Operation and activation records | **Immutable** after construction, apart from the cancel request (row 4). The controller's current-operation and current-activation slots are written only by U-I's publication, by retirement inside the owning unit, and by U-T | row 1's mechanisms, plus §2.2's rule that only unit entries read the slots |
| 4 | The logical latch, the cancel request, queued actions and failure checkpoints | **Requests.** No unit reads them to choose an input, a receiver or a target | they are read only at the points §2.4 enumerates |
| 5 | Consumer slots and config | **Captured at construction** into a record the assembler builds (`sortable/assemble.ts:117`, and free drag's equivalent); reassigning a field of the consumer's options object later has no effect | existing behavior, made a required property and given a test (E6) |
| 6 | The DOM and platform state: geometry, connectivity, computed style, scroll position, and the behaviors' environment staleness flags | **Environment, not context.** A unit captures its element _targets_ (visual, box, item, placeholder, root). It observes their _state_ live, as it must in order to measure | stated as the boundary of the property: a consumer DOM mutation is input the unit observes, exactly as today |
| 7 | Unit-local slots: the driver's open stage, failure latch, unclassified reason and staged value; the action tag and argument; the reporting flag; the behaviors' per-operation records | **Unit-local.** Written at unit entry or inside the unit's own sequence, and cleared by its end | row 1's mechanisms; behavior seams run only inside kernel units |

Two mechanisms were considered and not chosen. **Copy-on-commit frames**, a fresh frame per commit, would give row 1 by value. It costs one object per pointer sample and so violates I-26 and CONTRIBUTING §0, and exclusivity gives the same property for no allocation. **Freezing** is a development-time check rather than a runtime property, and it does not reach referents.

### 2.4 Where lifecycle state is read, and nowhere else

A unit runs its captured sequence to completion. It never re-reads the latch or a cancel request to decide its later internal calls. Lifecycle state is read in four places only:

- **Unit admission**, by the runner: the drain step (`#step`) before each U-A; U-I's entry (`closed`, or any unit on the stack); U-C's entry after static validation. The **currency checks** at a U-A handler's entry also belong here: identity, phase, the attempt slot, and the precedence of a held cancel at `START_COMMITTED` and `FAILED`. They ask _which_ operation an entry belongs to, not whether the controller is alive.
- **Publication points**, where a result would become current:
  - **PP-1, seam commit.** The driver commits or rolls back after `prepare` (latch or cancel request). This is I-3, unchanged.
  - **PP-2, round-trip opening.** The release seam executes its staged command only if PP-1's predicate still holds after `release.effect` has returned. The driver's staging conditional is the existing form of this point; it moves to the release seam's own policy because no other seam consumes a staged value.
  - **PP-3, admission publish.** U-I mints and commits `PENDING`, or discards, on the latch alone. The `current.operation` conjunct goes, because G2's closure makes it an invariant.
  - **PP-4, controller publish.** U-C publishes the armed controller and attaches ingress, or unwinds, on the latch.
- **Request intake**: `cancel()`, `fail()` and `dispatch()` deciding whether to accept a request. This includes the phase rule in §2.6.
- **Event sinks.** Each consumer event slot is delivered at exactly one site per route, and that site reads the latch immediately before the call (§2.7).

**Everything else that reads the latch or the cancel request today is deleted.** That is `#settlementLive` and `#joinLive` in full, the latch tests in `arm()`, the post-admission latch read in `runIngress`, the revalidation in `#activationPolicy.committed`, the latch conjunct in `#settleResolution`, the latch test in `#handleErrorReported`, `#runAdmission`'s `current.operation` conjunct, and the `!this.#spec` tests (§2.5). The behaviors' share is in §4.2.

**The drain runs unconditionally after admission.** `#step` already reads the latch before every entry, the first included (D-200 property 3). A drain that starts closed therefore handles nothing and clears the queue in its `finally`. The read the brief cited at `execution.ts:186`, and the TypeScript narrowing false positive with it, disappear. D-200's first-entry clause gains the falsifier its record says it lacked (E12).

### 2.5 Decomposition: split by lifetime, not by handler

`Kernel` becomes two entities:

- **`Kernel`**, the façade a behavior holds as `BehaviorContext`. It owns realm, root, the `ExecutionBracket`, the ingress `AbortController`, and **one** nullable reference to the armed controller. Before U-C publishes, its members behave as 01 §`BehaviorContext` states for the construction window: `dispatch` is dropped, `cancel` is the idle no-op, `fail` is demoted, and `destroy` and `closed` read the bracket. The bracket's four callbacks route through it.
- **The armed controller.** It holds every handler and seam adapter, controller-scope context as `readonly` fields, and the mutable current-operation, current-activation, resolution-attempt, operation-counter, tail and click-suppressor slots. U-C constructs it complete, so `#spec!`, `#frames!`, `#driver!` and the statement-order argument behind them are gone.

**Why this answers D-199's objection.** D-199 refused to split the class _along its handlers_, because the handlers share `#private` state and the non-null assertions over it rest on statement order inside the class. This split leaves every handler together with the state it shares. What it removes is the statement-order premise: a published spec now implies an assigned driver by construction. No context object crosses a module boundary, and none of the ownership proofs D-199 listed moves anywhere.

The per-sample path gains at most one property read and one call, through the façade's bracket callback. That is measured, not assumed (§6). D-199's extraction rule for _mechanisms_ is carried forward unchanged and applies to the armed controller.

The operation and activation records stay plain records (CONTRIBUTING §10). The minted operation becomes a local of U-I until PP-3 publishes it. A mint failure disposes that local's lifetimes directly, which removes the `#retireOperation(null)` mode and the frame scrub it carried.

### 2.6 Lifecycle interactions

- **`destroy()` from inside a unit.** The latch is set on the calling statement (I-6, unchanged). The unit is neither interrupted nor re-read; it finishes its captured sequence. The participation slots left in that sequence may still run (§2.7), but no event slot is delivered, every remaining publication point discards, `dispatch` drops, and the runner admits nothing further. Physical teardown runs at the outermost unit boundary, and the promise settles after it. Teardown is idempotent with anything the finished unit released, such as the join's presentation release.
- **`destroy()` between units** (async, or a consumer at top level). U-T runs immediately, as today. During U-T the latch refuses every request and every ingress.
- **`destroy()` during construction.** It defers to U-C's boundary. PP-4 unwinds: the spec is retired once and each composed frame is reset once. **F-432 becomes unreachable**, because no ingress pass can open while U-C is on the stack, so no operation can be minted inside `arm()`.
- **`cancel()`.** A request is latched only while the committed phase is `PENDING`, `ACTIVATING`, `ACTIVE` or `RELEASING`, the phases where `CANCEL` acts. Anywhere else, `cancel()` is the no-op I-21 promises and leaves no latch. **This closes F-434 at its source**, and the cancel conjunct leaves the settlement path together with the liveness predicate it sat in. A latched request is read at PP-1, PP-2, the `START_COMMITTED` and `FAILED` admissions, and `#failOperation`'s intake, and nowhere mid-unit.
- **Reentrant `dispatch` and `fail`.** Unchanged: they append, and `fail` latches its phase.
- **Reentrant ingress.** Refused when any unit is on the stack, before anything is touched. This replaces the admission-only refusal and closes F-433.
- **Stale asynchronous results.** The double validation by attempt identity is unchanged: at the producer, the `completed` latch and the slot holding this attempt; at application, the slot and `RELEASING`. The producer-side latch conjunct is deleted, because `dispatch` after closure is already a no-op.
- **Where results and resources go.** A unit owns what it acquires until its publication point: composed frames in U-C, the minted operation in U-I, a prepared value in a seam. When the publication is abandoned, the unit releases them itself (unwind, local disposal, rollback). Once published, they belong to the controller's lifetimes, and U-T releases them. This generalizes I-17 (ownership transfers at commit) to every unit.

### 2.7 Event slots and participation slots: the one promise revised

I-36 (a) forbids invoking **any** declared consumer slot after logical closure. It makes a participant that calls several slots inside one seam or admission read the latch between them. That per-invocation reading _is_ a guard on the internal call sequence, so I-36 (a) cannot coexist with the snapshot requirement as written. The brief requires the conflict to be exposed rather than excepted, so here it is, with the revision D-201 decides:

- **Event slots** are slots whose return value no library sequence consumes: `onStart`, `onEnd`, `onError` on every route including the composition-unwind report, `onMove`, and any later slot of that kind. They are **never** invoked after logical closure. Each is delivered at one site per route, and that site reads the latch. Gating at the sink changes no input, receiver or target of any later internal call, because nothing after a sink depends on whether it delivered. **I-31's D-40 clause, that no terminal follows a `destroy()`, is fully preserved.**
- **Participation slots** are slots whose result a unit consumes: `handle`, `visual`, `box`, `items`, `placeholder`, `resolveInsertion`, `movedInsertion`, `invalidateInsertion`, `home`, the landing timing, constraint and bounds sources, and a custom placeholder's own element reactions. A unit that started before closure invokes them as its captured sequence dictates. No unit starts after closure, so no _new_ sequence invokes one. Nothing they produce after closure is published, and U-T releases anything acquired with them.
- **`onReorder`, the resolution `invoke`,** is a participation slot opened only at PP-2, so a closed or cancelled operation never opens the consumer round-trip. This is preserved exactly.

**The consumer-visible consequence**, stated in full. A consumer that calls `destroy()` from inside one participation slot may still see the remaining participation slots of the same unit called. The cases are: `visual` and `box` after `destroy()` in `handle`; the axis installer's `movedInsertion` or `invalidateInsertion` after a placeholder reaction destroyed; `home` or the landing timing after `destroy()` in an earlier step of the same settlement unit. Nothing is admitted, published or announced afterwards. Every case is a lookup or a cache maintenance call against state that U-T releases immediately afterwards.

**Alternatives considered.**

- **Per-call slot gating that returns a neutral value** would make the inputs of later internal calls depend on the latch. That is the exact property the owner rejected, and it needs a neutral value per slot, which is a framework (CONTRIBUTING §2.2).
- **Splitting each participation slot into its own queued unit** would keep I-36 (a) literally true. It also reorders work: consumer-dispatched actions would land between the steps of today's single sequences, which moves the `AT_PROPOSAL`/`AT_CONSUMER` staging and the queue-order proof of exactly one `onEnd` (`#handleErrorReported`'s comment). It buys protection only for callbacks whose results are discarded anyway.

**Owner veto point.** If the owner rejects the participation-slot revision, the fallback is the queued-unit split at the enumerated sites. It is an owner decision because it moves the cancellation stages a consumer can observe. D-201 proceeds on the revision.

### 2.8 How independent and reentrant units are separated

- **Units of one controller never interleave.** Nested requests append (I-1). Nested phases are refused by the driver. Nested ingress is refused by the bracket at depth ≥ 1. Teardown runs only when no unit is on the stack.
- **Units of different controllers share no mutable state.** `src/` keeps no module-level mutable binding; only constants and sentinels live at module scope (a required property with a census, §5 step 2). A unit of controller A whose callback presses on controller B's root opens B's U-I at B's depth 0. The two units hold disjoint state.
- **An asynchronous continuation is not a unit**, so it cannot carry captured state across turns. It reaches a unit only through `dispatch`, and that unit re-resolves its target by identity at entry.

## 3. Contract text the implementation amends

Each amendment lands in the same commit as the step that makes it true. A present-tense contract statement must not run ahead of the code (F-63).

| Section | Today | After D-201 |
| --- | --- | --- |
| 05 I-36 (a), and the participant obligation | no declared slot after closure; the participant reads the latch between invocations | event slots never after closure, delivered at one latch-reading sink per route; participation slots: none in a unit that starts after closure, and a running unit's remaining ones may run, with nothing published; the per-invocation reading is withdrawn |
| 05 I-6 | the participant "invokes no declared consumer slot" after the latch; teardown deferral is scoped to library transactions | "delivers no event slot and starts no unit"; deferral covers construction (U-C) |
| 05 I-21 | the first valid cancel wins; an idle cancel leaves no latch | as before, and a **late** cancel at `SETTLING`, `REPORTING` or `FINALIZING` also leaves no latch |
| 05 I-1, 02 §Queue semantics | a nested ingress is refused during admission | a nested ingress is refused while **any** unit is on the stack, before any state is touched, the click-suppressor disarm included |
| 02 §Post-callback revalidation | admission rechecks terminal state and the live operation | admission's recheck is PP-3, on the latch alone; the live-operation conjunct is an invariant of the ingress refusal |
| 02 §What this actually guarantees | — | new tier-B row: _a unit's context cannot change under it_. Mechanism: §2.3, rows 1, 3 and 7, together with capture at entry |
| 02 §Attempts and stale continuation rejection | settlement measurement: "liveness before the join and again inside it" | the measurement and the join run against the unit's capture, and nothing is re-validated between them |
| 01 §When construction itself fails, §`draggable()` and the two-phase handshake | the latch is tested before each frame-part factory | U-C: validation first; not admitted if already closed (compose nothing, retire); once admitted, both parts are composed; PP-4 publishes or unwinds; teardown runs at U-C's boundary |
| `tests/COVERAGE.md` §The execution bracket | the first-entry clause has no falsifier | it has E12 |

**Promises that survive unchanged:** I-3 (as PP-1), I-4, I-6's statement-level latch and promise settlement, I-22, I-31 including D-40's clause, I-32, I-36 (b) and (c), I-37, and every published type.

## 4. Classification of today's guard sites

### 4.1 Kernel and bracket (`0ed5483a0`)

| Site | Disposition |
| --- | --- |
| `execution.ts:166`, `#closed \|\| #admitting` | becomes `#closed` or any unit on the stack (U-I admission) |
| `execution.ts:186`, post-admission latch read | deleted; the drain runs unconditionally |
| `#step` latch read | kept (unit admission) |
| `dispatch` latch read | kept (request intake) |
| `kernel.ts:412`, `#notify` refusal | kept (event sink) |
| `:472`, `#preparationValid` | kept; it is PP-1 and PP-2's predicate |
| `:539`, `#retireOperation`'s `!this.#spec` | deleted (§2.5) |
| `:543`, stale-retirement identity | kept (currency) |
| `:726–730`, `#cancelWith` | latch and duplicate checks kept (intake); the `!spec` premise moves to the façade; **adds** the phase rule (§2.6) |
| `:782–786`, `#failOperation` | kept (intake) |
| `:935`, `#runAdmission`'s recheck | latch kept as PP-3; `current.operation` deleted |
| `:1074`, `#openIngress`'s live-operation precondition | kept (U-I admission) |
| `:1141`, click disarm | moved behind the U-I refusal |
| `:1189`, `#activationPolicy.committed` | deleted; dispatch is unconditional |
| `:1374–1396`, `#settlementLive` and `#joinLive`, and their five use sites | deleted |
| `:1692`, `#settleResolution`'s latch | deleted; identity and `completed` kept |
| `:1906`, `:1921`, `:1954`, `:1972`, `:2031`, `:2045`, `:2076`, `:2088`, `:2227`, handler-entry identity, phase, attempt and precedence checks | kept (currency and admission) |
| `:2261`, `#handleErrorReported`'s latch | deleted; `finalized` runs, and its `onEnd` is sink-gated |
| `:2359`, `dispatch`'s latch | kept (intake) |
| `:2477`, `:2481`, `:2491`, arm's latch tests | replaced by U-C admission and PP-4 |

### 4.2 Behaviors (`0ed5483a0`)

| Site | Disposition |
| --- | --- |
| `sortable/spec.ts:320` and `free-drag/spec.ts:225`, `#notify` | kept (sink: `onError`) |
| `sortable/behavior.ts:145` and `free-drag/behavior.ts:70`, composition-unwind `report` | kept (sink: `onError`) |
| `free-drag/spec.ts:528`, `onMove` | kept (sink) |
| `sortable/spec.ts:964` and `free-drag/spec.ts:472`, the barrier before `onStart` | becomes the `onStart` sink, read immediately at the delivery call; the internal work between today's reading and the call runs regardless |
| the `onEnd` delivery inside each behavior's `finalized` | **gains** a sink if it lacks one (the kernel's `#joinLive` and `#handleErrorReported` latch tests were standing in for it) |
| `sortable/spec.ts:462`, `:518`, `:548`, `:901`, `:1058`, `:1076`, `:1223`, `:1269` (latch conjunct), `:1393`, `:1460`, `:1536`, `:1720` (latch conjunct), `:1739` | deleted |
| `free-drag/spec.ts:344`, `:377`, `:694`, `:724`, `:771`, `:941` (latch conjunct) | deleted |
| `sortable/spec.ts:346`, `#live` (handed to the axis view as `live`) | **an open question for implementation**: if the axis installers read it between participation calls, it goes with the rest; if a reading in it gates an event-shaped call, it becomes that call's sink. The implementer settles it by reading the installers and records which |

After D-201, each behavior reads `kernel.closed` only at its sinks. Running `grep 'kernel.closed'` over `src/` then lists the sinks and nothing else.

## 5. Executable cases

These are the discriminating cases the implementation turns into tests. _Today_ is what `0ed5483a0` does; _Required_ is what D-201 demands. The node probes use a stubbed root and document. P4 ran in Chromium through the package's browser project. Sources and outputs are in the appendix.

| Case | Setup | Today | Required |
| --- | --- | --- | --- |
| **E1** nested press inside a unit (P1) | idle controller; a behavior action's `prepare` fires a primary `pointerdown` on root, then commits | the draft changes under `prepare`; the outer commit republishes `IDLE`; listeners leak; a second press stacks a second operation | the nested press is refused; the draft is untouched; the action commits; no document listener is added; a later top-level press is admitted once |
| **E2** destroy in the first frame-part factory (P2) | `createFramePart` #1 calls `destroy()` | one part composed; teardown runs inside the factory | both parts composed; spec retired once; both reset once; teardown and settlement after U-C returns; `pointerdown` never bound |
| **E3** F-432 | a command-type `addEventListener` dispatches a primary press and a command, then throws | an operation minted against the half-armed spec is never disposed | `arm()` rethrows; no document listener exists; nothing is lifted; the destroy promise settles once |
| **E4** late cancel in `anchorTarget` (P4, F-434) | `anchorTarget` calls `cancel()` | stranded in `SETTLING`; the next press is ignored | the cancel leaves no latch; the join runs; `finalized` once; retired; the next press activates |
| **E5** destroy in `anchorTarget` | `anchorTarget` calls `destroy()` | join skipped; `onEnd` not delivered; teardown releases | the join runs against the captured operation: presentation released once, `finalized` called with that operation's committed frame, and its `onEnd` refused at the sink; `RETIRE` dropped; teardown at the boundary; no animation survives U-T |
| **E6** mutable call target | inside `onStart`, the consumer reassigns `options.onEnd` and `options.items` on the object it passed in | (believed to already hold; assert it) | the later `onEnd` and every later `items()` call reach the construction-time functions |
| **E7** destroy in `handle` | sortable or free drag `handle` resolver calls `destroy()` | `visual` and `box` not called | `visual` and `box` may be called; no operation, no `preventDefault()`, no `onError`, no `onStart`; teardown at the U-I boundary |
| **E8** destroy in a placeholder reaction | a custom placeholder's `connectedCallback` destroys during `activation.effect` | the effect returns early; no `onStart` | the effect finishes; `onStart` refused at its sink; `START_COMMITTED` dropped; U-T removes the placeholder and restores styles |
| **E9** destroy in `release.effect` | a placeholder reaction in the release move destroys | resolver not invoked | PP-2 refuses; `onReorder` never called; no settlement |
| **E10** destroy while the resolution is pending | the resolver's promise settles after `destroy()` | nothing happens | unchanged, with the producer-side latch gone (the dispatch is the drop) |
| **E11** cancel in `activation.prepare` | `prepare` calls `cancel()` | rollback | unchanged (PP-1) |
| **E12** a drain that starts closed | a `handle` resolver dispatches a behavior action, then `destroy()` | the drain is skipped by the latch read | the drain runs and handles nothing; the queue is cleared; the action's argument is released |

**Tests that encode a revised promise and must change:**

- `tests/kernel/construction.node.test.ts`:
  - _should reset only the frame parts a destroying factory composed_: becomes two composed and two reset.
  - _should unwind both frames when the second frame-part factory destroys the controller_: expected values unchanged, but the premise moves to PP-4.
  - The factory-body cases are unchanged (U-C not admitted).
- `tests/kernel/execution.node.test.ts` _should refuse a nested pass before the caller prepares one_: widened to any unit on the stack.
- Every behavior test asserting that a **participation** slot is _not_ called after a `destroy()` inside an earlier slot of the same unit: rewritten to assert that nothing is published or announced. The implementer inventories them by grepping the browser suites for `destroy()` inside resolvers and placeholder reactions (`activation-barrier`, `calling-convention`, `free-drag/lifecycle` and `free-drag/validation` are the first places to look). Tests asserting that an **event** slot is not delivered survive.

**Tests that keep proving supported behavior:** the remaining construction-window rows, every queue and bracket row except the widened refusal, the seam-driver suite including the re-entry refusal, the double resolution validation, and the precedence rows.

## 6. Measurements implementation owes

Recorded in `.plan/measurements/d201-units.md`. That file's existence is the decision's witness, so it is written last.

- **Composition (CONTRIBUTING §15):** `bench/size` on every kernel-carrying row after each step, recorded rather than defended. If any row's budget goes negative, SC-1 is recognized.
- **Move path (M-1 harness):** time per `MOVE` before and after, and the structural check that one sample allocates nothing (I-26). The façade hop is the only candidate cost.
- **Controller cost (M-2 harness):** construction time and retained heap per controller with the façade and the armed controller as two objects.
- **Guard census:** latch and cancel-request reads, before and after, by family (§1.1). **Reported, not used as acceptance**; acceptance is E1–E12.

## 7. D-199, D-200, F-432 and the live obligations

- **D-199** is superseded by D-201. Carried forward:
  - its extraction rule for mechanisms, unchanged;
  - its approved teardown deduplication, restated for the new shape (property 2 there, dropping the records with no armed behavior, becomes vacuous because no operation can exist unarmed);
  - its focused comment pass, as D-201's penultimate step.

  Not carried: the one-class conclusion, and "liveness guards stay in the kernel". The D-199 row in the unimplemented table is replaced by D-201's.

- **D-200** keeps its pending independent acceptance. D-201 changes no `Lifetime` or `ActionQueue` property. It changes the bracket's refusal and post-admission drain, and gives property 3's first-entry clause a falsifier. D-200's acceptance is to be read at its own revision.
- **F-432** is decided by D-201 and closes when D-201 lands (E3).
- **Live obligations O-2, O-3, O-4, O-5 and O-7** are untouched. SC-1 and SC-7 are recognitions D-201's measurements may meet, and the measurement record says so if they are met.

## Appendix — probes

### Shared node environment (`env.ts`)

```ts
export type Registry = {
  live(type: string): number;
  fire(type: string, event: unknown): void;
  add: any;
  remove: any;
};
export function registry(): Registry {
  const entries: {
    type: string;
    fn: (e: unknown) => void;
    signal?: AbortSignal;
  }[] = [];
  return {
    add(type: string, fn: any, options?: { signal?: AbortSignal }) {
      const signal = options?.signal;
      if (signal?.aborted) return;
      const entry = { type, fn, signal };
      entries.push(entry);
      signal?.addEventListener('abort', () => {
        const i = entries.indexOf(entry);
        if (i >= 0) entries.splice(i, 1);
      });
    },
    remove() {},
    live(type) {
      return entries.filter((e) => e.type === type).length;
    },
    fire(type, event) {
      for (const e of entries.filter((x) => x.type === type)) e.fn(event);
    },
  };
}
export function createEnv() {
  const doc = registry();
  const rootReg = registry();
  class FakeElement {}
  const view = { HTMLElement: FakeElement, getSelection: () => null };
  const document = {
    defaultView: view,
    addEventListener: doc.add,
    removeEventListener: doc.remove,
  };
  const root = {
    ownerDocument: document,
    addEventListener: rootReg.add,
    removeEventListener: rootReg.remove,
    isConnected: true,
  } as unknown as HTMLElement;
  const element = () =>
    Object.assign(new FakeElement(), {
      ownerDocument: document,
    }) as unknown as HTMLElement;
  const press = (pointerId: number) => ({
    type: 'pointerdown',
    button: 0,
    isPrimary: true,
    pointerId,
    clientX: 0,
    clientY: 0,
    preventDefault() {},
  });
  return { doc, rootReg, root, element, press };
}
```

### P1: an admission nested in a running unit (`node p1-nested-ingress.ts`)

```ts
import { draggable } from '/workspaces/material-x/packages/drag2/src/kernel.ts';
import { LIFT_FLAT } from '/workspaces/material-x/packages/drag2/src/kernel/presentation.ts';
import { createEnv } from './env.ts';

const env = createEnv();
const log: string[] = [];
let nest = true;
const noop = () => {};
const controller = draggable(env.root, (kernel) => ({
  controller: kernel,
  spec: {
    createFramePart: () => ({ tag: 0 }),
    resetFramePart: noop,
    config: { threshold: 3, liftMode: LIFT_FLAT, actionTags: 1 },
    admit: () => env.element(),
    activation: { prepare: () => true, effect: noop },
    release: { prepare: () => ({ invoke: null }), effect: noop },
    settlement: { prepare: () => true, effect: noop },
    action: {
      prepare(_tag, _arg, draft) {
        log.push(
          `action.prepare sees draft.phase=${draft.phase} op=${JSON.stringify(draft.operation)}`,
        );
        if (nest) {
          nest = false;
          env.rootReg.fire('pointerdown', env.press(7));
          log.push(
            `after nested press, draft.phase=${draft.phase} op=${JSON.stringify(draft.operation)}`,
          );
        }
        return true;
      },
      effect(_tag, _arg, current) {
        log.push(
          `action.effect sees current.phase=${current.phase} op=${JSON.stringify(current.operation)}`,
        );
      },
    },
    moved: noop,
    anchorTarget: () => ({ x: 0, y: 0 }),
    finalized: noop,
    reportError: (e) => log.push(`reportError ${String(e)}`),
    retire: noop,
  },
}));
(controller as any).dispatch(0, null);
log.push(`pointermove listeners after unit: ${env.doc.live('pointermove')}`);
env.rootReg.fire('pointerdown', env.press(8));
log.push(
  `pointermove listeners after second press: ${env.doc.live('pointermove')}`,
);
console.log(log.join('\n'));
```

Output at `0ed5483a0`:

```text
action.prepare sees draft.phase=0 op=null
after nested press, draft.phase=1 op={"id":1}
action.effect sees current.phase=0 op=null
pointermove listeners after unit: 1
pointermove listeners after second press: 2
```

### P2: `destroy()` from the first frame-part factory (`node p2-arm-destroy.ts`)

Built the same way, with `createFramePart` calling `ctx.destroy()` on its first call and logging the `pointerdown` listener count. Output at `0ed5483a0`:

```text
createFramePart #1
  after destroy: pointerdown listeners=0
spec.retire
resetFramePart(tag=1)
arm returned; pointerdown listeners=0
destroy promise settled
```

### P4: a late `cancel()` in `anchorTarget` (Chromium, the package's browser project)

A kernel-tier spec over a real absolutely positioned item, with `setPointerCapture` stubbed as in `tests/kernel/kernel.browser.test.ts`. Sequence: press, move past the threshold, `pointerup`, flush; then press and move again. `anchorTarget` calls `kernel.cancel('late')`, and the control row does not. Output at `0ed5483a0`:

```text
P4 first: ["onStart","settlement.effect","anchorTarget"]
P4 second press: []
P4-control: ["onStart","settlement.effect","anchorTarget","presentation.released","finalized phase=7","retire"]
```

The probe file was placed under `tests/` only for the run and then deleted, so the tree is unchanged. Chromium's headless shell was installed into the container's Playwright cache for this run.