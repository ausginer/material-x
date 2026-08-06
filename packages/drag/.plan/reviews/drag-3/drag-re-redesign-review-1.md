# Review: `@ydinjs/drag` runtime architecture reset

## Verdict

**Revise before implementation.**

The proposed direction is strong. Replacing the event → immutable state → effect → owner → result-event loop with feature-local imperative control flow should reduce emitted machinery and make the package easier to follow. The document also preserves the right high-level constraints: FIFO reentrancy, one authority for live operation state, explicit async currency, separate interaction and presentation lifetimes, transactional activation, explicit consumer resolution, and measurement after vertical slices.

The current draft is not yet precise enough to preserve those constraints during the rewrite. Its most important examples mutate the authoritative runtime before entering the queue, while the queue stores tags without the external data that distinguishes invocations. That combination breaks the run-to-completion guarantee the queue is meant to provide. The draft also leaves callback abort checkpoints, unexpected failure behavior, the authored-presentation barrier, sortable release-time geometry, and the old/new implementation cutover underspecified.

Findings 1–6 should be resolved in the design before Phase 2 begins. Findings 7–12 should become explicit Phase 1 exit criteria or implementation gates.

## Findings

### 1. Blocker — native ingress mutates authoritative state before the run-to-completion boundary

The document promises that external code cannot interrupt a transition and leave the runtime half-mutated (`drag-re-redesign.md:205-209`). Its final control-flow summary is likewise enqueue → validate → mutate (`:765-774`). However, both hot path examples mutate the shared runtime before dispatch:

- `pointerMoved` writes `pointerId`, `x`, and `y`, then dispatches (`:283-310`);
- `moveSortable` writes `x` and `y`, presents motion, and schedules spatial work without first entering the runner (`:468-481`).

Consumer code can synchronously dispatch a synthetic pointer event from `onStart`, `onMove`, a bounds resolver, or a factory. Browser APIs may also emit synchronous follow-up events during an effect. Such an event can therefore change `runtime.input` while the current action is still using it. Two nested moves enqueue two identical tags after overwriting the same fields, so both actions observe only the second point.

The pointer example has an additional correctness bug: it replaces the admitted `pointerId` before checking that the event belongs to the active pointer. Document-level listeners receive events from other pointers. The active pointer identity must remain stationary, and an incoming event's ID must be checked before any committed input field changes.

The current implementation avoids both problems by queueing complete event snapshots and updating state only when the event reaches the session (`packages/drag/src/kernel/session.ts:89-115`). The redesign need not retain those object shapes, but it must retain the ordering property.

**Required revision:** make the runner the only boundary that may mutate authoritative state. Define one of these mechanisms for reentrant ingress:

1. an edge-triggered mailbox that stores the minimal data for every invocation;
2. a level-triggered pending slot with explicitly documented latest-wins semantics and one deduplicated action; or
3. an immediate path only when `running === false`, plus a separate safe reentrant path.

Pending ingress fields, if used, must be clearly separate from committed operation fields. Phase and pointer ownership must be validated before committing a sample. The examples at `:303-309` and `:475-480` should be replaced with code that demonstrates the chosen rule.

### 2. Blocker — tag-only actions do not preserve invocation data or identity

The queue “normally” contains only integer tags (`:174-183`), while dynamic data is expected to be in the runtime (`:170-172`). The proposal does not explain how the following distinct invocations remain associated with their queued positions:

- two pointer moves with different coordinates;
- two collection replacements;
- `cancel(reason)` calls with different reasons;
- a keyboard command and its destination;
- a pointer release and its release point;
- a consumer resolution and its result or error;
- callbacks that synchronously cancel one operation and start another.

A shared side slot is unsafe for edge-triggered actions because a later invocation overwrites data needed by an earlier queued tag. Phase validation is also insufficient currency. An old deferred checkpoint may encounter a new operation in the same phase and act on it. Every deferred continuation needs either proof that it cannot cross an operation boundary or identity belonging to the operation/attempt that created it.

This also exposes an internal terminology conflict. `START_SUCCEEDED` is central to the reentrancy example (`:178-201`, `:211-228`), but agent rule 6 prohibits success actions for ordinary synchronous calls (`:750`). The intended signal is not a generic operation-result message; it is a post-callback ordering checkpoint. Calling it that would make the exception and its purpose clear.

**Required revision:** add a normative action classification:

| Class | Required semantics |
| --- | --- |
| Edge-triggered external input | Preserve every invocation and its minimal arguments in FIFO order. |
| Level-triggered refresh | May use one pending slot and latest-wins coalescing, but only for enumerated tags. |
| Reentrant callback checkpoint | Queue after normal callback return; validate the creating operation identity. |
| Async completion | Validate attempt identity, stage its result once, then enter the runner. |
| Barrier action | Must not be reordered or coalesced across cancel, destroy, replacement, or operation retirement. |

The contract should include traces for `MOVE(A), MOVE(B)`, `MOVE(A), CANCEL, MOVE(B)`, `REPLACE(A), REPLACE(B)`, and `CANCEL_A, START_B, OLD_CHECKPOINT_A`.

### 3. Blocker — queued cancel/destroy does not stop work remaining in the current action

The runner checks `runtime.destroyed` only between actions (`:230-254`). Callback-triggered cancel or destroy is queued, so the operation still appears current for the remainder of the active action. Direct code may therefore acquire resources, mutate DOM, render, invoke another callback, or enqueue a success checkpoint after the consumer has canceled or destroyed the controller.

The current implementation deliberately checks operation currency again after consumer callbacks (`packages/drag/src/draggable/effects/callbacks.ts:53-98` and `packages/drag/src/sortable/effects/callbacks.ts:36-110`). Sortable activation also treats acquisition as a transaction and rolls back if a consumer factory destroys during acquisition. The existing browser test at `packages/drag/tests/sortable.browser.test.ts:141` covers placeholder creation destroying the controller.

“Callbacks should be placed as late as practical” (`drag-re-redesign.md:519`) is not an adequate replacement. Some callbacks produce values needed before later work, and some actions necessarily have work after a callback.

**Required revision:** define explicit callback checkpoints. For every external callback or factory, state:

- what phase, operation identity, resources, and DOM are visible on entry;
- whether cancel and destroy are queued or terminal immediately;
- which post-callback identity/terminal check is mandatory;
- what work may still run after reentrant cancel;
- what local resources must be rolled back after reentrant destroy;
- whether a normal return queues a checkpoint;
- how a throw is classified.

Activation should publish acquired resources to the runtime only at a defined commit point. Until then, locally acquired resources must be released in reverse order if the operation ceases to be current.

### 4. Blocker — the failure model can leave a partially mutated live controller

The sample runner clears the queue in `finally` but has no `catch` (`:230-254`). Later, the document says a shared action boundary _may_ catch unexpected failures (`:370-380`). If a direct operation throws after mutating phase or acquiring a resource, the sample drops queued cancellation, destroy, and cleanup actions and then makes the controller available for another dispatch. The runtime may remain both live and inconsistent.

`failCurrentOperation(runtime, error)` is not a complete policy. An error may occur before an operation exists, after terminal callbacks were selected, during cleanup, or inside `onError`. Recoverable failures also need their stage and recovery policy preserved for the public error context.

The current boundary has a useful last-resort rule: an unexpected session panic closes ingress, destroys effects once, and reports only after teardown (`packages/drag/src/kernel/session.ts:116-121` and `packages/drag/src/kernel/runtime.ts:42-52`). Expected failures are handled at more specific boundaries instead of being converted by one broad catch.

**Required revision:** make the following hierarchy normative:

1. known DOM, callback, resolver, renderer, geometry, presentation-ready, and landing failures are caught at their owning operation, assigned a typed failure stage, and enter a specified recovery path;
2. partial acquisitions roll back locally before that failure is published;
3. truly unexpected action/invariant failures terminally close ingress, retire queued work, release all resources exactly once, and report after teardown;
4. disposer failures are best-effort and cannot replace the initiating failure;
5. an absent or throwing `onError` falls through to platform `reportError` without reopening the operation.

The design should also say whether an initiating public method ever rethrows, whether later queued actions are drained or discarded on each failure class, and how a queued destroy is honored if another action fails first.

### 5. Blocker — the authored-presentation barrier is named but not preserved as an algorithm

The repository architecture makes presentation readiness a correctness contract, not an optional implementation detail (`.agents/docs/architecture.md:90-124`). Temporary presentation may be released only when:

```text
landing finished or was skipped
AND
the consumer's authored presentation is ready
```

Those two branches run concurrently. A rejected or timed-out readiness promise is reported as a presentation-ready failure and recovers home; the timeout is bounded at 500 ms. This matters especially for reduced motion and accepted free drops, where no landing animation exists to mask a missing authored render.

The redesign only mentions migrating presentation readiness (`:634-638`) and retiring its continuation (`:698-705`). An implementation can satisfy that wording while accidentally awaiting readiness before starting landing, releasing after whichever branch finishes first, omitting timeout recovery, or calling `onFinish` before presentation cleanup.

**Required revision:** copy the barrier into the target settlement model and the required invariants. Specify:

- landing and readiness start/settle independently;
- both gates are required before presentation release;
- absent readiness is immediately terminal for that gate;
- timeout/rejection selects the documented failure and home recovery;
- late settlement is inert by attempt identity;
- interaction may stop before presentation;
- terminal callbacks run only after the temporary presentation is released.

### 6. Blocker — async continuations contradict the queue contract

The error-handling example calls typed continuations directly (`:382-391`), and the currency example directly calls `completeResolution(runtime, result)` (`:406-421`). The final direction says an async completion enqueues a compact action (`:765-774`).

Those are materially different models. A direct continuation can mutate state and invoke callbacks outside the action error boundary. A tag-only queued completion needs a defined place to store its result/error and a rule preventing later completion from overwriting it. Cancellation and normal completion must also differ: the dedicated public `AbortSignal` is aborted on cancellation or destroy, but not retroactively after a normal resolver completion.

**Required revision:** choose one model. The simplest consistent rule is:

1. the promise/animation/frame callback checks owned attempt identity;
2. it atomically stages its result once on that attempt;
3. it dispatches a completion action associated with that attempt;
4. the runner revalidates identity before reading and clearing the staged value;
5. any consumer callback runs while the runner is active.

Direct continuation functions remain useful as action handlers, but external async callbacks should not bypass `dispatch`.

### 7. High — there is no executable phase/action/callback contract

The draft does not enumerate `Phase`, provide a transition table, or define which actions are valid in each phase. “Invalid actions are ignored deterministically” (`:681-688`) is not testable without that matrix. Similarly, the callback section lists boundaries but does not document the ordering it later requires (`:501-521`, `:716-721`).

This matters more with a mutable runtime. The current phase unions encode many cross-field invariants in types. The target sketch permits combinations such as `phase = IDLE` with a live operation, pending presentation watch, or landing runner. One aggregate object is only a single storage location; it does not by itself establish a single semantic authority.

**Required revision:** make Phase 1 produce per-feature tables with:

- phase;
- accepted action and guard;
- operation identity requirement;
- fields/resources required on entry;
- mutations and direct operations;
- callbacks and their exact checkpoint;
- queued continuation;
- next phase;
- invalid/stale behavior;
- fields/resources required or forbidden on exit.

The physical TypeScript type may remain a compact mutable record. Compile-time `Pick<>` views, module ownership, development assertions, and focused action tests can enforce write boundaries without recreating runtime owner objects. Only the action handler should change lifecycle phase.

### 8. High — resource lifetimes and closed-scope acquisition need a concrete exit matrix

The sample `ResourceRuntime` has two disposer arrays and one controller (`:428-466`), but the feature has at least three distinct lifetimes:

1. controller ingress (`pointerdown`/`keydown`);
2. admitted-operation interaction and presentation;
3. replaceable activation, resolution, presentation-watch, frame, and landing attempts.

One `AbortController` field cannot describe all of them. The proposal also does not say what happens when a consumer destroys during a factory, after a resource has been acquired but before its disposer is registered. Blindly pushing that disposer into an already closed/reused array can leak the resource into the next operation.

**Required revision:** add an exit-path matrix for abandonment, cancellation, accepted/rejected resolution, failure, partial activation, normal finalization, and destroy. It should fix:

- abort order;
- interaction versus presentation release order;
- LIFO order within each scope;
- settlement-attempt retirement;
- DOM restoration;
- terminal callback timing;
- disposer-error reporting;
- behavior of registration after a scope closes;
- whether a disposed array can be reused only after an explicit reset.

Either keep a small `ResourceScope` or make arrays implement the same semantics; do not weaken ownership guarantees merely to remove an object.

### 9. High — sortable release-time geometry and collection behavior are underspecified

The latest-state rAF design explains active movement (`:468-499`) but not what happens when `pointerup` arrives before the scheduled frame. Canceling the frame and using the incumbent can commit a stale insertion. Flushing it can still use the last move point rather than the release point or current layout.

The current sortable implementation cancels pending frame work, marks geometry dirty, and synchronously resolves a proposal (`packages/drag/src/sortable/effects/spatial.ts:136-145`). The new design should preserve the property, not necessarily the same helper.

The collection invariant is similarly circular: collection changes in every phase must have “defined behavior” (`drag-re-redesign.md:707-714`), but the behavior is not defined. Pending source removal, active neighbor-gap changes, replacement during consumer resolution, and changes during landing do not have the same policy.

**Required revision:** specify that release:

1. validates and records the actual release event;
2. prevents further interaction input;
3. cancels/invalidates pending active-frame work;
4. refreshes the required geometry synchronously from the latest pointer, current collection, placeholder, and layout;
5. constructs exactly one proposal;
6. only then enters consumer resolution.

Add a phase × collection-change matrix covering source removal, neighbor changes, unrelated insertion/removal, complete replacement, repeated reentrant updates, post-proposal changes, and settlement. Also bind scheduled frames to an operation identity or prove that retirement cancels them before a new operation can reach the same phase.

### 10. High — Phase 2 has no coherent old/new architecture seam

Phase 2 proposes replacing the draggable pointer path and action runner (`:606-632`) while Phase 3 defers activation, release, resolution, landing, and cleanup (`:634-640`). During that intermediate state, either:

- the old immutable machine still owns phase and operation state, creating a second authority plus an adapter bridge; or
- the new runtime already implements enough lifecycle behavior that Phase 3 is not actually deferred.

The first option recreates the transport architecture under a temporary name, contradicts the one-authority rule, and makes intermediate size measurements hard to interpret.

Phase 1 also says to preserve the complete current suite (`:596-604`), but several Node tests intentionally target the event/effect/reducer representation, for example `packages/drag/tests/draggable/machine.node.test.ts`, `packages/drag/tests/draggable/effects.node.test.ts`, and `packages/drag/tests/sortable/machine.node.test.ts`. Those cannot remain unchanged after the named internals are deleted.

**Required revision:** choose an explicit cutover:

- build a complete private draggable runtime behind a test-only factory and switch the public controller atomically; or
- define a temporary seam with one named semantic authority, one-way data flow, a deletion milestone, and measurements that exclude compatibility scaffolding.

Classify tests before work starts:

1. observable contract tests that must pass unchanged;
2. deterministic semantic cases that must be rewritten one-for-one at new action/function boundaries;
3. representation-only tests that may be deleted after replacement coverage is reviewed.

“Test count and status” (`:733`) is not sufficient because a constant count can hide lost behavioral coverage.

### 11. Medium — externally observable compatibility needs a checked ledger

“Preserve externally observable behavior unless a behavioral change is explicitly documented and tested” (`:747`) is correct but too broad to serve as an acceptance gate. Observable behavior includes more than the seven named callbacks:

- controller method timing, idempotence, and post-destroy behavior;
- construction-time versus operation-time factory invocation;
- callback synchrony and arguments;
- update policy visibility within a current operation;
- cancel reason forwarding;
- invalid resolution handling;
- resolver `AbortSignal` lifetime;
- destroy silence;
- cleanup before `onFinish`/`onCancel`;
- pointer capture, keyboard/focus behavior, DOM placement, styles, and ARIA;
- public exports and declaration shapes.

The current browser tests cover many of these cases, including late acceptance, destroy silence, cleanup order, resolver abort, and callback reentry. They should be cataloged rather than rediscovered during migration. There are no `packages/drag/tests/**/*.declaration.test.ts` tests, so public type regressions may otherwise survive the internal rewrite.

**Required revision:** make Phase 1 publish a versioned compatibility ledger linked to a test for each promise. Add public declaration/API snapshot coverage. Every intentional change should record the old behavior, new behavior, rationale, test, and migration consequence.

### 12. Medium — measurement gates are not yet reproducible or binding

The baseline is rounded (`:46-56`) even though exact current measurements are already recorded elsewhere as 7,517 B draggable, 8,831 B sortable, and 14,609 B combined. The performance figures lack a repository snapshot, browser/hardware, fixture, sample size, and variance. The required allocation and frame measurements (`:723-733`) have no harness or command in `packages/drag`; the package currently automates only Size Limit.

The final requirement for a “material reduction” (`:739`) also has no threshold. Without a precommitted decision rule, the rewrite can be accepted or rejected after the fact based on the same data.

**Required revision:** record:

- exact baseline bytes, commit, build mode, Size Limit and Brotli versions;
- benchmark browser, hardware, collection size/layout, move count, warmup, repetitions, and reported statistic;
- allocation measurement method;
- allowed performance/allocation regression;
- minimum final size improvement or an explicit reviewer waiver process;
- commands and artifact location for every Phase 2–5 measurement.

Because architectural simplification is the primary goal, also record structural counters such as emitted modules, action variants, controller-construction closures/objects, and deleted protocol routes. Those counters are evidence, not targets to game.

## Required Phase 1 deliverables

Before implementation, Phase 1 should produce:

1. an action classification and FIFO/coalescing conformance traces;
2. draggable and sortable phase/action tables;
3. a callback/factory reentrancy table;
4. a failure-stage and recovery table;
5. a resource exit-path matrix;
6. the complete authored-presentation barrier algorithm;
7. a sortable collection-change and geometry-invalidation matrix;
8. a public compatibility ledger with declaration coverage;
9. a coherent old/new runtime cutover plan;
10. reproducible size, performance, allocation, and structural baselines.

These are not requests to recreate the current protocol in prose. They define the behavior that the much smaller imperative implementation must preserve.

## High-value regression cases

The redesigned runner should add or retain focused tests for:

1. two synthetic pointer moves dispatched reentrantly with distinct points;
2. a foreign pointer event that must not overwrite active pointer identity;
3. move → cancel → move ordering from inside a callback;
4. cancel/destroy from every value-producing callback and factory;
5. partial activation rollback when destruction occurs before disposer registration;
6. an old queued checkpoint after a new operation reaches the same phase;
7. async acceptance/rejection racing cancel and destroy;
8. `onError` destroying or throwing;
9. disposer failure while later disposers still run;
10. pointer move and pointer up in the same frame;
11. collection replacement between frame scheduling and release;
12. a stale frame from operation A after operation B becomes active;
13. both presentation-barrier completion orders, timeout, rejection, reduced motion, and accepted free drop;
14. public declaration/export stability.

## What should remain

Several decisions are worth preserving as the document is revised:

- replace the internal message protocol rather than renaming it;
- keep one feature-local mutable runtime authority;
- keep direct top-level functions and cohesive behavior-oriented modules;
- use native events synchronously when no deferred ordering is required;
- retain identity only across genuine stale-work boundaries;
- keep interaction and presentation lifetimes distinct;
- preserve explicit consumer resolution and never infer it from DOM shape;
- allow meaningful allocations rather than pursuing allocation purity;
- migrate draggable before sortable;
- measure complete vertical behavior, then consolidate only proven sharing;
- update `DESIGN.md` only after the shipping architecture is accepted.

With the queue/ingress boundary and lifecycle contracts made precise, this can be a substantially smaller architecture without sacrificing the correctness work already embodied in the current implementation and tests.