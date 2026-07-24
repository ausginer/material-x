# Review of `05 — Explicit FSM Decisions and Effect Executors`

Reviewed document: `.agents/docs/drag-gesture-redesign.md`.

## Verdict

Proceed directly to the target `Decision<State, Effect>` architecture. I agree that a temporary production `planEffects(from, to, event)` layer is unnecessary for a pre-alpha package. Emitting commands in the same branch that accepts an event is a cleaner semantic model than preserving the current reducer plus transition-interpreter split.

The design is directionally excellent, but I would revise it before implementation. The central architecture is settled; several runtime contracts are not. In particular:

1. admitted-operation creation and pending input ownership are absent from the effect protocol;
2. run-to-completion batches do not yet define failure, destroy, or dependency abort behavior safely;
3. capability executors and `OperationResources` both claim the same handles;
4. representative commands are not self-contained enough to execute without reading mirrored semantic state;
5. failure reporting and terminal callbacks need explicit continuation states;
6. the session's unexpected-error policy currently contradicts its stated guarantee.

These are design amendments, not arguments for Variant B. With them addressed, the direct rebuild is the best option.

## What is strong

The following decisions should remain:

- One phase-specific decision machine owns both the next legal state and the commands caused by the accepted event (`drag-gesture-redesign.md:73-83`, `239-312`).
- Hierarchical state replaces a broad object of weakly related nullable slices (`181-235`).
- Commands are semantic data rather than transition callbacks or closures (`111-125`, `316-475`).
- Browser observations return as typed, fully tagged events; the FSM decides their meaning (`479-526`).
- State-local identity makes reduction replay-pure (`805-848`).
- The runtime may retain mechanical caches and handles, but not a mirror such as sortable's `#currentOperation` (`852-867`).
- Presentation readiness, landing, spatial work, and consumer resolution receive narrow lifetime owners (`613-658`).
- Draggable and sortable are rebuilt independently before extracting common abstractions (`934-993`).
- A shared/base `Gesture` class is rejected. That would reduce visible duplication without removing the second semantic interpreter, and prior experiments already found the runtime forms to be bundle regressions.

The design also makes a good deliberate choice in changing re-entrancy from recursive interruption to a FIFO run-to-completion model. That is easier to reason about, provided the exact batch and close rules below become normative.

## Required revisions

### R1 — Define admitted-operation creation and pending disarm

The effect vocabulary begins with activation acquisition after threshold crossing (`316-430`). It has `STOP_INTERACTION`, but it has no accepted-idle command that:

- creates the per-operation resource aggregate;
- creates its operation signal;
- arms document-level move/up/cancel/Escape input;
- associates the mechanical runtime with the new operation currency.

This lifetime starts at `idle -> pending`, before activation. Today it is performed after that committed edge in `draggable.ts:337-355` and `sortable.ts:345-358`. Without an explicit command, it will either be omitted or recreated as transition interpretation in the facade.

Add effects along these lines:

```ts
type BeginPointerOperationEffect = Readonly<{
  type: typeof BEGIN_POINTER_OPERATION;
  currency: OperationCurrency;
  pointerId: number;
}>;

type DisarmOperationEffect = Readonly<{
  type: typeof DISARM_OPERATION;
  currency: OperationCurrency;
}>;
```

`BEGIN_POINTER_OPERATION` creates operation resources and arms pointer input. Every pending exit that never activates emits `DISARM_OPERATION`, which releases input silently and invokes no normal terminal callback.

Keyboard admission should be specified separately. A keyboard command can move directly from idle into activation without installing pointer listeners; it should not pretend to be a pointer operation with a sentinel pointer ID unless that representation is shown to simplify the final machine.

The design also needs to say when the per-operation runtime is retired and how a second operation obtains a clean set of owners and caches.

### R2 — Make every effect payload actually self-contained

The rule at `111-114` is correct, but several representative commands cannot execute using only their payload and controller-level dependencies:

- `ACQUIRE_SORTABLE_ACTIVATION` contains currency and pointer ID, but acquisition also needs the admitted item and collection snapshot.
- `RESOLVE_ACTIVE_INSERTION` and `RESOLVE_PROPOSAL_INSERTION` contain a point and currency, but spatial resolution needs the dragged item, immutable collection snapshot, and relevant incumbent/basis.
- `PREPARE_SORTABLE_LANDING` does not carry all immutable activation/landing geometry unless a mechanical owner is expected to retain it.
- There is no `INVOKE_START` command after activation candidate data commits.

If executors recover these values from current FSM state, the runtime again has implicit state access. If `OperationResources` retains them, it becomes the semantic mirror the redesign is intended to remove.

Commands should carry immutable request records:

```ts
type AcquireSortableActivationEffect = Readonly<{
  type: typeof ACQUIRE_SORTABLE_ACTIVATION;
  currency: OperationCurrency;
  request: SortableActivationRequest;
}>;

type ResolveInsertionEffect = Readonly<{
  type: typeof RESOLVE_ACTIVE_INSERTION;
  currency: SpatialCurrency;
  request: SpatialInsertionRequest;
}>;
```

The request may contain DOM element identities and immutable collection snapshots. The prohibition should therefore be worded as:

> Effects contain no executable closure or mutable machine-state reference. They may carry explicitly typed external identities or one-shot capabilities required by the command.

That wording also resolves the apparent conflict between `113` and `WATCH_PRESENTATION.ready: PromiseLike<void>` at `329-332`. A thenable is an external capability. If it is carried by an effect, specify identity-based replay equivalence and consume-once ownership. Otherwise store it in an executor-owned table and put only a key in the command.

### R3 — Define batch failure and dependency semantics

The sample session executes every effect in an array (`530-559`), while known executor failures are converted into queued events. Consequently, failure of effect 1 does not stop effect 2.

The move example makes the problem concrete (`267-289`):

```text
PRESENT_MOTION
INVOKE_MOVE
```

If the renderer write fails and dispatches `RENDER_FAILED`, the failure event is queued, but `INVOKE_MOVE` still runs before that failure is reduced.

Add an execution disposition:

```ts
type EffectDisposition = typeof CONTINUE_BATCH | typeof STOP_BATCH;

type Execute<Effect> = (effect: Effect) => EffectDisposition;
```

A synchronous known failure dispatches its typed event and returns `STOP_BATCH` when later commands assume its success. An unexpected close also stops the batch. Alternatively, put dependent steps behind acknowledged result events. An async-starting command must never have a later command in the same batch that depends on its eventual success.

The design should state these command-ordering rules:

- commands before a consumer callback prepare that callback;
- a command that invokes arbitrary consumer code is last or the only command in its batch;
- a synchronous failure stops all dependent tail commands;
- independent tail commands may continue only when their independence is explicit;
- external result events are always processed after the current non-aborted batch.

This preserves the useful run-to-completion model without equating it with “always run the complete array.”

### R4 — Treat terminal `close()` as an in-flight batch barrier

`close()` sets `closed` and clears the event queue (`561-595`), but `runEffects()` never checks `closed`. If a consumer callback calls `destroy()`, the controller can destroy the effect owners and the current batch can then invoke its remaining commands against dead resources.

Specify one destroy sequence:

```text
controller.destroy()
  -> return if already terminal
  -> mark controller terminal
  -> session.close()
  -> effect runtime destroy()
  -> controller-lifetime input teardown
```

Session semantics should be:

- `close()` rejects new dispatch immediately;
- it clears queued events;
- it resets or releases the stored state so active DOM identities are not retained;
- after the current executor returns, `runEffects()` observes `closed` and skips the rest of the batch;
- effect execution itself becomes inert after runtime destroy.

Consumer cancel/update events remain queued and do not interrupt a batch. Terminal destroy is deliberately different because it revokes all mechanical ownership out of band.

Every executor that invokes consumer code must also recheck its own terminal/current-operation token afterward before performing another browser write or dispatch. Run-to-completion does not protect a continuation from synchronous `destroy()`.

### R5 — Choose one physical owner for every handle

The one-owner principle at `101-109` assigns runner, watch, frame/cache, and resolution lifetimes to narrow executors. The executor trees do the same (`617-646`). `OperationResources` then lists those same handles again (`730-762`), and the router independently destroys the narrow entities (`713-721`).

This is contradictory.

Recommended ownership:

| Handle/resource | Physical owner |
| --- | --- |
| General operation abort and interaction/presentation scopes | `OperationResources` |
| Consumer resolver/controller | Resolution executor |
| Readiness watch | Presentation-barrier executor |
| Landing runner | Landing executor |
| Frame task and rectangle cache | Spatial executor |
| Placeholder lease | Placeholder presenter or presentation scope, choose one |
| Lift and renderer | Motion/presentation owner or presentation scope, choose one |

`OperationResources` should coordinate ordered lifecycle operations, not store a second reference to every leaf handle. Narrow owners register suitable disposers with the interaction or presentation scope and expose idempotent lifecycle capabilities to the composition root.

The target destroy order must appear once and be authoritative:

```text
close ingress
-> stop/abort interaction and unresolved resolution work
-> stop spatial work and readiness watch
-> destroy landing runner
-> release placeholder/lift presentation
-> release controller resources
```

If instead `OperationResources` is chosen as the sole registry of all handles, the narrow executors must be stateless adapters. Either model can work; combining them cannot.

The composition root should also show the intentional dependency cycle once: effects need `dispatch`, while the session needs `execute`. A factory such as `createRuntime(initial, decide, createEffects)` can install a late-bound dispatch capability safely. Effect-owner constructors must be side-effect-free and unable to dispatch before the session is assigned; avoid solving the cycle with a broad mutable context object.

### R6 — Complete the accepted-transition/effect/result matrix

The document intentionally calls its effect vocabulary representative, but a direct rebuild needs an end-to-end protocol inventory before implementation. The current examples omit or do not route:

- begin pointer operation / arm input;
- pending disarm;
- activation success/failure result;
- `INVOKE_START`;
- start success/failure result;
- active invalidation;
- `STOP_INTERACTION` in the representative router;
- `PREPARE_SORTABLE_LANDING` in the router;
- presentation release before a terminal callback;
- finalization success/failure;
- operation runtime retirement.

Add one matrix per feature:

| Accepted state/event | Complete next state | Ordered effect(s) | Possible result event(s) |
| --- | --- | --- | --- |
| idle + admitted press | pending | begin pointer operation | arm failed |
| pending + threshold crossed | activating/acquiring | acquire activation | ready / failed |
| activating/acquired + ready | activating/starting | invoke start | succeeded / failed |
| dragging + move | dragging | present motion, invoke move | render/move failed |
| dragging + release | resolving | open consumer resolution | resolved / failed |
| settling + plan resolved | settling/starting | start landing | started / failed |
| settlement gates complete | finalizing | finalize operation | completed / callback failed |

The actual table should cover every current semantic edge, including keyboard input, collection replacement/removal, controlled updates, presentation failure, and landing replacement.

Make the production router exhaustive with an `assertNever`. The current illustrative router silently omits declared commands (`660-710`), which is the opposite of the explicit protocol the design intends.

### R7 — Add a finalizing/reporting protocol or narrow the universal failure claim

`FINALIZE_OPERATION` is routed directly to callbacks (`343-353`, `705-709`), while the design says all fallible callbacks produce events, commit failure state, and only then report (`776-801`). If `onFinish` or `onCancel` throws after the machine has already entered idle, there is no active currency against which to accept the failure.

The clean target architecture is:

```text
settlement gates complete
  -> FinalizingState(outcome)
  -> FINALIZE_OPERATION
       release presentation
       invoke finish/cancel
       dispatch FINALIZATION_COMPLETED or FINALIZATION_FAILED
  -> idle, or ReportingCallbackFailureState
  -> REPORT_FAILURE
  -> FAILURE_REPORTED
  -> idle
```

The domain outcome remains terminal and is not rewritten by a notification failure. `onError` failure is the terminal exception: `ErrorReporter` catches it, forwards it to platform `reportError`, and still dispatches/continues the original failure acknowledgement. It must not recursively dispatch another FSM failure.

If this protocol is considered too heavy, explicitly retain terminal callback errors as an out-of-band reporting path and narrow the claim that every callback failure first commits FSM failure state. The present document promises both models.

### R8 — Make failure reporting an acknowledged continuation

The event-first failure order is a major improvement (`776-801`). Run-to-completion adds a subtle requirement: a batch such as

```text
REPORT_FAILURE
PREPARE_RECOVERY
```

would prepare recovery before an `onError`-initiated destroy/cancel event is reduced.

Prefer:

```text
failed state
  -> REPORT_FAILURE only
  -> reporter invokes onError
  -> reporter dispatches FAILURE_REPORTED
  -> machine handles queued re-entry first
  -> FAILURE_REPORTED starts recovery only if the failure is still current
```

This restores the existing intended rule: commit failure, report it, recheck currency/terminality, then recover.

Use “committed post-failure state” unless the hierarchical model actually defines a failed/reporting phase. The document currently promises a “committed failure state” (`785-790`, `1009`, `1067`) without showing one in the state union.

### R9 — Specify the session panic policy

The sample `finally` clears the whole queue (`574-584`). If an unexpected executor error occurs after another command queued a required typed event, that event is silently discarded. Lines `609` and `801` acknowledge the problem but defer the answer.

Choose a production policy now. Recommended:

```text
unexpected decide/router/executor throw
  -> poison/close session ingress
  -> stop current batch
  -> clear remaining events
  -> synchronously destroy operation resources
  -> report one fatal error through a non-FSM platform boundary
  -> optionally rethrow in development after cleanup
```

Known browser, DOM, promise, timing, resolver, and consumer failures must never reach this boundary; they dispatch typed events. The panic path is for invariant/programmer failures and is terminal because continuing from partially executed physical work is not trustworthy.

The session should not promise to remain reusable after an unknown executor throw unless it can transactionally restore all resource owners.

### R10 — Make the hierarchical state concrete enough to enforce currency

The representative union is a good direction, but implementation should start only after defining:

- pointer versus keyboard admitted variants;
- pending operation currency and input ownership;
- activating/acquiring versus activating/starting substates;
- candidate data committed before `onStart`;
- active pointer/motion/insertion data;
- resolving proposal versus awaiting consumer;
- the current `ResolutionCurrency`;
- settling landing and presentation gate currencies;
- an in-flight `SpatialCurrency` where a spatial result is expected;
- finalizing/reporting states if R7/R8 are adopted;
- where generation counters persist across every non-idle phase.

Avoid flattening the full Cartesian product of landing and presentation states. Keep them as nested discriminated unions inside `SettlingState`, and centralize the join in a pure helper:

```text
finalize exactly once iff landing is terminal and presentation is terminal
```

The helper must define failure precedence, replacement generation, and the rule that stale completion can never reopen a settled gate.

Stable controller policy should not be copied into every phase. A useful shape is:

```ts
type DraggableState = Readonly<{
  policy: DraggablePolicy;
  nextOperationId: number;
  lifecycle: DraggableLifecycle;
}>;
```

The nested lifecycle union makes phase combinations legal while policy and the next operation generation survive idle/operation boundaries.

### R11 — Resolve invalidation and bounds as explicit architecture

The sortable section correctly bans semantic mirrors but leaves invalidation open (`852-867`, question 7 at `1087`). The draggable move example computes motion immediately, while the principles assign DOM reads to effects; no bounds observation protocol is shown.

Recommended sortable model:

- the machine emits a self-contained spatial request with full currency;
- the spatial executor may cache only that immutable latest request descriptor plus mechanical geometry;
- scroll/resize invalidation replays the descriptor or dispatches a currency-tagged invalidation event;
- placeholder placement and collection replacement dirty the rectangle index;
- release cancels scheduled work, marks geometry dirty, and resolves the true release point before proposal construction;
- collection rebase remains identity-gap semantic work, never pointer recomputation.

Recommended draggable model:

- static element/viewport bounds remain executor-cached and are refreshed on invalidation;
- a function bounds provider is read for each accepted active move/release;
- no bounds read occurs for foreign or sub-threshold movement;
- effectful bounds resolution returns an observation event if the pure machine requires its value to calculate motion;
- controlled position remains an authoritative semantic update and bypasses pointer bounds/axis constraints as specified.

Whichever path is chosen, distinguish normalized ingress data from browser observations so principle 3.2 remains accurate.

### R12 — Define live update behavior under FIFO semantics

The redesign explicitly changes recursive dispatch ordering (`119-125`, `133-136`). That is reasonable, but controller updates currently mutate live options as well as dispatching state changes (`draggable.ts:157-203`).

If a consumer callback calls `update()` during an effect batch, queued FSM policy may still be old while mutable executor options are already new. This can mix two configurations in one batch.

Define one of:

- all semantic configuration changes are events and become visible only when their queued decision commits;
- executor-only callbacks/timing are replaced immediately but cannot affect the remainder of the current batch;
- every effect captures the relevant option/capability version at decision time.

Document observable FIFO examples for:

- `onStart` calls `cancel()` and returns;
- `onStart` calls `destroy()` and returns;
- `onMove` calls `update()` or `cancel()`;
- `onDrop` calls `cancel()` and returns accepted;
- `onError` calls `destroy()`;
- a consumer getter replaces the sortable collection while a spatial command is executing.

FIFO arrival order gives a good default: callback-generated events precede the executor's success/failure event when they were dispatched first. The machine must explicitly define which event wins in each phase.

## Identity recommendation

Use machine-state generations for all identities, including the top-level operation ID:

```ts
type ControllerState = Readonly<{
  nextOperationId: number;
  lifecycle: DragLifecycle;
}>;
```

An accepted admission deterministically consumes `nextOperationId`. Resolution, landing, presentation (if independently replaceable), and spatial attempts consume counters stored with the operation. This gives:

```text
same state + same event -> equivalent Decision
```

without a session/facade allocator.

If operation IDs remain event-supplied, specify a controller-lifetime never-reuse invariant. Complete currency is only safe if a late result can never match a later operation.

`ResolutionCurrency` is sufficient for presentation readiness only if the protocol guarantees exactly one readiness watch per resolution. If the same resolution may replace/rearm its watch, add a distinct `presentationId`.

## Performance and representation

Skipping Variant B is architecturally sensible, but measurement should occur during the first vertical slice rather than after both ownership and representation are fixed.

The example move decision allocates:

- a `Decision`;
- a new state;
- two effect records;
- an effect array;
- public geometry.

It also constructs `publicGeometry(next)` even if `onMove` is absent unless callback capability is represented in machine policy or geometry construction is deferred.

Keep the logical algebra while allowing a compact physical representation:

- numeric private tags from the start;
- `null | single | batch` without one-element arrays;
- no per-command closures;
- no subscriber/event-bus iteration;
- no public DTO construction when the corresponding callback is absent;
- a combined motion-publication command if measurement shows two commands/array are too costly and its ordered failure contract remains explicit.

Take size and allocation baselines before the rewrite, measure the complete draggable vertical slice before deleting the old path, and add a large-sortable movement benchmark before locking the spatial representation. The architecture need not be rejected for a small justified size delta, but “small” and “bounded” should have recorded numbers.

The generic `Effects<Effect>` representation should also constrain `Effect` to a tagged non-array record or use a tagged batch. Otherwise `Effect | readonly Effect[]` is conceptually ambiguous, and `Array.isArray` may be awkward with readonly generic arrays.

## Answers to the document's review questions

### 1. State hierarchy

Use a stable controller wrapper plus a lifecycle union. Make pointer/keyboard admission, activation acquisition/start, resolving stages, and finalization explicit variants. Keep landing and presentation as nested unions within settling rather than flattening their cross-product.

### 2. Effect atomicity

Keep activation acquisition transactional. Keep render and move notification as ordered commands unless measurements justify one motion-publication transaction. Make final cleanup plus finish/cancel callback one `FINALIZE_OPERATION` transaction or acknowledge cleanup before emitting a callback command. Any command that invokes consumer code is last/sole. Synchronous failure returns `STOP_BATCH`.

### 3. Queue semantics

Adopt FIFO run-to-completion for ordinary events. It is clearer than recursive interruption. Make terminal close interrupt the tail of the current batch, and add a failure disposition for dependent commands.

### 4. Operation resources

Let narrow executors physically own their replaceable handles. Let `OperationResources` own only the operation signal, interaction/presentation scopes, and teardown coordination. Register leases in the appropriate scope immediately; do not transfer untracked handles.

### 5. Identity

Allocate the operation ID from persistent machine state on accepted admission. Allocate subordinate generations from operation state. This is simpler and fully replay-pure.

### 6. Settlement sharing

Do not decide yet. After both implementations stabilize, share the two-gate join, currency checks, and landing state helpers only if their failure/recovery semantics are identical. Do not share complete settlement machines merely because the phase names match.

### 7. Mechanical invalidation

Use an executor-owned latest immutable request descriptor, not a semantic operation mirror. Invalidation replays or refreshes that descriptor; all results carry its full currency. Use explicit FSM events when invalidation itself changes semantic policy.

### 8. Failure surface

Keep the existing differentiated stages and add explicit coverage for operation arming, spatial observation, placeholder placement, finalization cleanup, and session panic if they have distinct recovery policies. `onError` failure is platform-reported and never recursively enters the FSM.

## Test and acceptance additions

Add these to sections 19 and 20:

- idle-to-pending creates operation resources and arms document input;
- every pending exit disarms without finish/cancel;
- a command-1 synchronous failure prevents dependent command 2;
- close during command 1 prevents command 2 and releases retained state/references;
- destroy from every consumer callback is silent after the currently executing callback returns;
- `onStart`, `onMove`, `onDrop`, and `onError` re-entry has exact FIFO ordering tests;
- failure reporting is acknowledged before recovery begins;
- terminal callback success/failure passes through the chosen finalization policy;
- two consecutive operations reset every owner, frame task, cache, watch, and runner;
- bounds caching, dynamic provider reads, controlled-position bypass, and release flushing remain covered;
- placeholder placement dirties geometry and release performs a fresh read-before-write resolution;
- collection replacement/removal has a complete phase matrix;
- owning-realm APIs and structural cross-realm input discrimination remain covered;
- resolver abort occurs exactly once while unresolved and never after normal completion;
- no executor callback touches DOM or dispatches after runtime destroy;
- move-path allocation and large-sortable performance have recorded baselines and gates.

Clarify the compatibility statement at line 6:

> No internal compatibility constraint. Existing behavioral contracts remain unless this redesign explicitly supersedes them and records the new ordering, cancellation, failure, and callback semantics.

The FIFO queue is one such explicit behavior change.

## Final assessment

This is the right architecture for the package, and the direct rewrite is justified. The document successfully removes the gesture classes' real design flaw: they are simultaneously transition decoders, effect executors, and resource owners.

Before implementation, make the admission/finalization edges, command payloads, batch-abort rules, terminal close behavior, and physical ownership map normative. Those changes complete the architecture; they do not weaken its central decision to emit semantic effects directly from the authoritative FSM.
