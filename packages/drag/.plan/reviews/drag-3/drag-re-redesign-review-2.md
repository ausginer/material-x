# Review 2: `@ydinjs/drag` runtime architecture reset

## Verdict

**Approve Phase 1; revise before Phase 2.**

Revision 2 is a substantial improvement. It closes the first review's central architectural problems:

- external ingress no longer mutates committed pointer state before queueing;
- edge-triggered actions preserve their arguments;
- pointer identity is validated before coordinate commit;
- callback checkpoints carry operation identity;
- async completions stage once and re-enter the runner;
- unexpected panic is terminal and cleans up before reporting;
- the authored-presentation barrier is explicit and concurrent;
- sortable release uses the actual release point and synchronous geometry;
- the new implementation is built privately and cut over atomically.

The two-frame transaction model is coherent and gives direct imperative code a clear commit boundary without per-transition state allocation. It is a stronger foundation than v1.

Four correctness blockers remain in the normative examples:

1. the inactive frame retains the previous operation graph indefinitely after the last transition;
2. `cancel()` while idle can permanently poison the cancel latch;
3. native events are not uniformly safe to defer by reference because admission uses dispatch-scoped data and effects;
4. a callback that queues cancel/destroy and then throws has two contradictory failure orderings.

Phase 1 can begin because it is explicitly a contract-and-baseline phase. Findings 1–4 should be fixed in the proposal, and findings 5–11 should become concrete Phase 1 exit artifacts, before the private draggable runtime is implemented in Phase 2.

## Closure of the first review

| First-review area | V2 status |
| --- | --- |
| Pre-dispatch mutation and pointer ownership | Closed by `drag-re-redesign-v2.md:280-340`. |
| Tag-only actions and argument association | Architecturally closed by `:355-432`; caller-owned mutable arguments still need one rule, discussed below. |
| Reentrant callback checkpoints | Mostly closed by `:553-614`; post-commit notifications still need a final-effect rule. |
| Known and unexpected failure policy | Panic is closed by `:706-719`; known failure ordering remains ambiguous at `:693-702`. |
| Authored-presentation barrier | Core AND-gate is closed by `:772-810`; recovery replacement needs more detail. |
| Async completion/queue contradiction | Closed by `:399-409` and `:721-768`. |
| Phase/action/callback contracts | Correctly moved to Phase 1 at `:924-935`, but the required matrix contents should be enumerated. |
| Resource lifetimes and local rollback | Substantially closed by `:616-675`; leaf acquisition exception safety and exit ordering remain. |
| Sortable release freshness | Closed by `:822-837`. |
| Hybrid migration seam | Closed by the private implementation and atomic cutover at `:937-956`. |
| Public compatibility and declarations | Acknowledged at `:924-935`, but not yet a checked ledger. |
| Reproducible measurement | Exact bytes are fixed; benchmark and decision protocols are still deferred. |

## Findings

### 1. Blocker — the inactive frame retains the retired operation graph

Every commit swaps the old `current` frame into `draft` (`drag-re-redesign-v2.md:137-160`). The old frame still contains all fields from the previous committed phase, including references such as:

- operation identity and operation-owned values;
- item, visual, collection, and proposal objects;
- callback/policy references;
- public results and consumer reasons;
- DOM rectangles and other immutable snapshots.

The document says a discarded draft is overwritten by the next transition (`:147`). There may be no next transition after finalization, destroy, or panic. For example:

```text
current = active operation A
draft = older frame

prepare idle in draft
commit by swapping

current = idle
draft = old active operation A
```

If the controller remains reachable while idle, `draft` keeps operation A's DOM and consumer graph reachable indefinitely. The second frame makes this easier to miss because `current` is correctly idle. Current session close explicitly drops its state reference (`packages/drag/src/kernel/session.ts:57-65`).

`Object.assign()` also overwrites only keys present on `current`. If implementers add phase-specific properties dynamically instead of using an identical fixed shape, stale keys can survive into a later candidate.

**Required revision:**

1. require both frames to have one fixed own-key set created by the same factory;
2. define when the previous frame stops being available to post-commit code;
3. scrub every reference-bearing field in the inactive frame after that point;
4. on close/panic, clear both frames, queued arguments, attempt results/errors, cancel reasons, and geometry entries that reference elements;
5. require operation retirement to clear references even when the controller remains alive and idle.

A simple rule is to clear the inactive frame in an action-finalization `finally` after post-commit effects no longer need the previous state. Any required previous values should be held in narrow locals. The queue does not drain a nested action until the current handler returns, so scrubbing at that boundary does not prevent the next action from preparing its draft.

Add structural retention tests through the private runtime factory. A GC/WeakRef probe can supplement them where reliable, but deterministic assertions that the inactive frame, attempts, queue, and caches contain no retired DOM references are the primary gate.

### 2. Blocker — idle cancellation can poison every later cancellation

The normative example installs the latch unconditionally:

```ts
runtime.cancelRequest ??= {
  operation: runtime.current.operation,
  reason,
};
```

See `drag-re-redesign-v2.md:561-573`.

If `cancel()` is called while idle, the request captures `operation: null`. An invalid `CANCEL` action may then be ignored, while the document only says to clear latches according to unspecified operation-retirement rules (`:599`). There is no operation to retire. A later active-operation `cancel()` sees a non-null `cancelRequest`, keeps the stale null-operation request because of `??=`, and cannot cancel the new operation.

This also conflicts with the action classification. `cancel(reason)` is declared edge-triggered and argument-preserving (`:359-371`), while the latch collapses every pending call to the first request and reason. First-cancel-wins is a reasonable public policy, but it must be stated as the deliberate per-operation exception.

Current controllers make idle cancellation a no-op (`packages/drag/src/draggable.ts:175-184` and `packages/drag/src/sortable.ts:156-164`).

**Required revision:** specify all of the following:

- `cancel()` returns without mutating latches or queue state when the controller is closed or there is no cancellable current operation;
- a fresh request is associated with the exact current operation;
- only the first valid cancel request for that operation wins, if that is the intended compatibility behavior;
- consuming, ignoring, retiring, destroying, and panicking all have exact latch clearing rules;
- public methods check `closed` before mutating `cancelRequest` or `destroyRequested`;
- `dispatch`/`enqueue` rejects work after close.

Required traces include:

```text
cancel while idle -> start A -> cancel A
cancel A(reason 1) -> cancel A(reason 2)
cancel A -> retire A -> start B -> cancel B
destroy -> cancel/update/input
```

### 3. Blocker — dispatch-scoped native-event data cannot always be queued by reference

The stable-coordinate example at `:300-353` is safe for `pointermove` and `pointerup`: `pointerId`, `clientX`, and `clientY` remain useful while the synchronous runtime queue drains.

The document generalizes this rule to pointer down and keyboard commands (`:359-371`, `:1077-1080`). Those paths use native-event data or effects that are valid only during the browser's own event dispatch:

- draggable handle admission calls `event.composedPath()` (`packages/drag/src/draggable/admission.ts:17-34`);
- sortable pointer and keyboard admission also depend on `composedPath()` (`packages/drag/src/sortable/admission.ts:7-30`);
- accepted sortable keyboard commands call `preventDefault()` (`packages/drag/src/sortable.ts:205-228`).

Consider a synthetic `keydown` or `pointerdown` dispatched synchronously from `onMove`:

```text
drag runner is active
  -> consumer dispatches native event
    -> listener enqueues event reference and returns
      -> native browser dispatch ends
        -> drag runner later handles queued event
```

At that point `preventDefault()` is too late, `currentTarget` is no longer the listener target, and the event's dispatch path cannot be assumed to remain available. “The drag queue is synchronous” does not mean its action runs before the nested native dispatch finishes.

**Required revision:** split native ingress into two categories:

1. stable-field input, which may queue the existing native object under a narrow type such as `PointerCoordinates`;
2. dispatch-scoped admission, which must synchronously capture the composed path, perform any required default prevention, or construct the minimal admitted input before the listener returns.

The second category may allocate a small admission value. That is meaningful external input, not an internal protocol envelope. The design should also define where `getHandle` runs because it is consumer code and may reenter the controller. If admissibility must be decided inside the runner, capture the path at listener time and queue that snapshot. If keyboard default prevention must be conditional, define the safe synchronous preflight separately from committed state mutation.

### 4. Blocker — callback throw versus queued cancel/destroy has contradictory ordering

V2 correctly makes reentrant cancel/destroy visible through latches and queues their authoritative actions (`:561-599`). A value-producing callback may run during preparation (`:493-504`). Known pre-commit failure may then either “dispatch or directly enter” failure recovery (`:693-702`).

Those alternatives are not equivalent:

```text
callback
  -> controller.destroy() queues DESTROY
  -> callback throws
  -> catch directly enters failure
```

Direct recovery overtakes the already queued `DESTROY`, may report an error, and may run recovery effects or callbacks that destroy should have silenced. Dispatching a failure action instead preserves FIFO: `DESTROY` runs first and the later failure becomes inert. The same conflict exists for `cancel(); throw`.

Current callback effects enqueue their failure acknowledgement after any nested cancel dispatch, and the session drains FIFO (`packages/drag/src/draggable/effects/callbacks.ts:53-98`, `packages/drag/src/sortable/effects/callbacks.ts:36-59`, and `packages/drag/src/kernel/session.ts:89-120`). Reentrant destroy closes the current session, so a subsequent callback failure is not reported as if the operation were still live.

**Required revision:** choose one normative ordering:

- catches after arbitrary consumer code first inspect cancel/destroy latches;
- failures that remain current enter the queue behind actions raised by that callback;
- destroy terminalizes the controller and makes later operation failures inert;
- cancellation wins over a later failure checkpoint for the same operation if compatibility is to be preserved;
- direct failure transition is allowed only at boundaries where no arbitrary code could have enqueued an earlier action, or where an explicit precedence table proves it equivalent.

Add conformance traces for `CANCEL -> throw`, `DESTROY -> throw`, `update -> throw`, and `onError -> destroy/throw`, both before and after semantic commit.

### 5. High — queued destroy changes the observable teardown timing

The v2 example sets `destroyRequested` and queues `DESTROY`; authoritative cleanup occurs later when the current action returns (`:576-599`). Outside the runner, dispatch drains synchronously, but inside a callback `destroy()` returns before that queued action runs.

Current public destroy is synchronously terminal: it closes the runtime and aborts controller ingress before returning (`packages/drag/src/draggable.ts:186-194`, `packages/drag/src/sortable.ts:166-173`, and `packages/drag/src/kernel/runtime.ts:61-69`). Consumer code after a reentrant `destroy()` can currently observe restored presentation and detached ingress. Under the proposed latch alone, it may still observe the lift, placeholder, or listeners until its callback returns.

This is especially difficult during local transactional acquisition: resources not yet published to `runtime.resources` are invisible to an immediate global destroy. Their local scope must participate in synchronous destruction or the timing contract changes.

**Required revision:** either:

1. preserve synchronous physical teardown—close ingress and release all runtime-owned resources before `destroy()` returns, while the latch tells the preparing action to roll back local resources; or
2. explicitly record delayed reentrant teardown as a public behavioral change, define what DOM/resources remain visible until the callback returns, and add migration and compatibility tests.

Whichever rule is chosen, `destroy()` must be silent, idempotent, and prevent later callbacks. Phase 1 should test observations made immediately after `controller.destroy()` inside every reentrant callback/factory, not only after a later task flush.

### 6. High — post-commit notifications need a last-effect or recheck rule

The immediate latch check is required only after value-producing callbacks and factories during preparation (`:585-612`). Notification callbacks are merely placed “as late as practical, ideally” after commit (`:601-604`). The general rule at `:555-559` treats an already committed transition as sufficient for validity.

Commit makes semantic state valid, but it does not authorize further work after a notification synchronously requests destroy or cancel. If an action performs:

```text
commit
  -> DOM write
  -> onStart/onMove/onError/onFinish
  -> schedule work or run another callback
```

the final step can occur after the callback has made the operation terminal or requested cancellation.

**Required revision:** require each notification callback to be either:

- literally the last externally visible operation in its action; or
- followed by a mandatory `closed`/destroy/cancel/current-operation check before every remaining write, schedule, resource publication, or callback.

The Phase 1 callback matrix should state the exact post-callback continuation for `onStart`, `onMove`, `onDrop`, `onReorder`, `onError`, `onFinish`, `onCancel`, home/bounds/timing resolvers, and visual/placeholder/handle factories. “As late as practical” should remain guidance only after the executable rule is fixed.

### 7. High — the transaction boundary does not yet cover out-of-frame mutation or partial leaf acquisition

The document correctly notes that double buffering cannot roll back external effects and places resources, attempts, and caches outside the frames (`:225-239`). It also requires locally prepared resources to roll back before ownership transfer (`:636-664`).

The example assumes each acquisition is already exception-safe:

```ts
prepared.lift = acquireLift(runtime);
```

If `acquireLift()` performs several DOM writes and throws before returning its lease, the caller has nothing to put in `prepared` and therefore nothing to dispose. This is not hypothetical: the current lift primitive captures styles, writes multiple inline properties, and only afterward acquires the top-layer lease (`packages/drag/src/kernel/presentation.ts:217-299`). A throw in the later step can strand earlier changes unless the leaf primitive owns its own rollback.

There is a similar ambiguity in sortable release. Step 2 says to prevent further interaction input before the release state commits at step 7 (`:822-835`). If that means aborting listeners or releasing capture during preparation, a later geometry/proposal failure leaves committed state in the old phase while its interaction resources have already been destroyed.

Mutable geometry caches can likewise change during preparation. If semantic commit fails or a callback cancels, the cache needs an explicit rollback or “reconstructible and dirty” recovery rule.

**Required revision:**

- every leaf acquisition must be all-or-nothing, or receive/register with a local rollback scope before its first side effect;
- action-level rollback is not a substitute for leaf exception safety;
- preparation-time writes to attempts/caches/resources need a named rollback, invalidation, or terminal-failure policy;
- sortable release should commit a logical “no further input” phase/guard first, then abort interaction resources as a post-commit effect, unless a local reversible mechanism is specified;
- any unavoidable pre-commit external mutation must be included in the action's rollback proof.

Add injected failures at every step of multi-write DOM acquisitions and after every out-of-frame prepare mutation.

### 8. High — async attempt settlement needs an explicit fulfilled/rejected discriminant

The attempt sketch stores:

```ts
settled: boolean;
result: Resolution | null;
error: unknown;
```

and maps fulfillment to `(result, null)` and rejection to `(null, error)` (`:734-765`).

This cannot faithfully distinguish:

- a fulfilled invalid value such as `null`, which must become an invalid resolution failure;
- `Promise.reject(null)` or `Promise.reject(undefined)`, whose rejection reason must be preserved.

The two Promise branches know the distinction, but the staged record discards it before the action validates the payload. The current implementation keeps the branches separate and turns only invalid fulfillment into a generated validation error (`packages/drag/src/draggable/effects/resolution.ts:124-157`).

**Required revision:** make the attempt payload a discriminated union, for example:

```ts
type ResolutionSettlement =
  | Readonly<{ status: 'fulfilled'; value: unknown }>
  | Readonly<{ status: 'rejected'; reason: unknown }>;
```

Stage that value once, then let the queued action validate only the fulfilled branch. Clear the payload after consumption and on attempt retirement/panic.

### 9. High — presentation-readiness failure needs a replacement-settlement algorithm

The independent AND-gate is now correct (`:772-810`). The failure bullet says readiness timeout/rejection uses home recovery (`:796-804`), but two booleans and `canReleasePresentation()` do not describe the required replacement when the destination landing has already completed.

Consider:

```text
destination landing completes
landingDone = true

authored readiness later rejects
```

Home recovery must:

1. retire/invalidate the destination landing and readiness attempts;
2. retain temporary presentation;
3. replace the terminal outcome/recovery plan;
4. reset the landing gate for the new home landing;
5. start or skip that new landing;
6. release only after the replacement settlement is terminal.

The design also needs the free-drag fallback when no home target exists. Current draggable settlement builds a replacement failed settlement (`packages/drag/src/draggable/machine/settling.ts:68-102`). Current sortable settlement instead switches readiness failure to immediate recovery (`packages/drag/src/sortable/machine/settling.ts:85-106`), which conflicts with the repository architecture's general home-recovery statement. If v2 changes sortable to home recovery, that is an intentional observable change requiring a ledger entry and tests.

**Required revision:** describe readiness failure as settlement replacement, not merely a failed boolean gate. Specify both completion orders, old-attempt retirement, gate reset, no-home fallback, and which terminal result/error context survives.

Also state the existing bounded timeout explicitly: `PRESENTATION_READY_TIMEOUT = 500 ms`. Referring to a “documented” timeout without carrying its value into the superseding design leaves an externally observable contract implicit.

### 10. Medium — edge-triggered collection replacement must snapshot contents, not only preserve the array reference

Collection replacement is correctly classified as edge-triggered (`:359-371`). The same section permits consumer-owned “immutable” values to be queued by reference. A TypeScript `readonly HTMLElement[]` is not frozen. The caller can mutate its contents after a reentrant `updateItems(items)` returns but before the queued action runs, changing the meaning of an already ordered invocation.

The current collection explicitly shallow-copies every replacement so published order cannot change without a version increment (`packages/drag/src/sortable/collection.ts:1-34`).

**Required revision:** preserve that snapshot contract. Each `updateItems` invocation should synchronously shallow-copy its ordered elements—or otherwise own an immutable snapshot—before enqueueing. Queueing the same caller-owned array reference is not argument preservation.

Phase 1 should classify every public argument as one of:

- stable native scalar view;
- library-owned immutable snapshot;
- caller-owned value read synchronously only;
- intentionally retained identity/reference;
- normalized async result.

Runtime-owned mutable frames and attempt records must never escape through public callbacks.

### 11. Medium — Phase 1 and measurement need explicit exit gates

Phase 1 now requests phase/action and cleanup matrices, test classification, public declaration preservation, and reproducible benchmarks (`:924-935`). That is the right direction, but it does not enumerate the contents needed to make Phase 2 reviewable.

Before Phase 2, require approved artifacts for:

1. per-feature phase/action tables containing guards, operation identity, required entry fields/resources, draft mutations, commit, post-effects, callbacks, queued checkpoints, next phase, invalid/stale behavior, and exit invariants;
2. callback/factory ordering and reentrancy;
3. known-failure stage, precedence, reporting, and recovery;
4. abandonment/cancel/accept/reject/failure/destroy cleanup order;
5. sortable phase × collection-change outcomes and invalidation sources;
6. presentation-readiness replacement settlement;
7. public behavior/type compatibility linked promise-by-promise to tests, including resolver `AbortSignal` behavior;
8. an API/declaration snapshot or declaration-test gate;
9. explicit intentional-change entries with rationale and migration impact.

The collection section currently allows any final policy as long as it is intentional and tested (`:839-853`). That is weaker than preserving current observable behavior. The Phase 1 matrix must select outcomes before sortable implementation begins.

Measurement also remains non-reproducible beyond exact size bytes (`:1048-1062`). Record commands, source commit, build/tool versions, browser/hardware, fixtures, collection size/layout, move count, warmup, repetitions, statistic/variance, allocation method, and artifact location. Precommit allowed performance/allocation regression limits and define who may waive the otherwise subjective “material” size decision.

These are Phase 1 outputs, not reasons to restore the old protocol.

## Required additional regression cases

In addition to the v2 test list, add:

1. final transition to idle leaves no retired references in the inactive frame;
2. panic/destroy clears both frames, queue arguments, attempts, and geometry element references;
3. idle cancel → start → active cancel;
4. repeated cancel reasons and cancel after operation replacement;
5. reentrant pointerdown whose composed path is needed after listener return;
6. reentrant sortable keyboard admission and timely `preventDefault`;
7. callback cancel → throw and destroy → throw, before and after commit;
8. immediate DOM/resource observations after reentrant `destroy()` returns;
9. notification callback destroy with a would-be later effect;
10. failure inside every multi-step leaf acquisition;
11. sortable release failure after logical input stop but before commit;
12. fulfilled invalid resolver value versus rejection with `null`/`undefined`;
13. landing-first then readiness failure and readiness-failure-first recovery;
14. reentrant `updateItems()` followed by caller mutation of the original array.

## What should remain

The following v2 decisions are strong and should not be weakened while resolving the findings:

- one runtime container with exactly one committed semantic frame;
- a reusable draft and swap-based commit;
- fixed action plus argument FIFO ordering;
- native-event reuse for stable scalar input;
- explicit action classes instead of one universal storage policy;
- direct top-level operations rather than effect descriptions;
- local acquisition before ownership publication;
- identity only at real stale-work boundaries;
- terminal panic with teardown before reporting;
- concurrent authored-presentation gates;
- synchronous release-time sortable geometry;
- private complete implementation followed by atomic public cutover;
- semantic test migration rather than preserving representation tests;
- consolidation only after both feature implementations measure successfully.

V2 is close. Once frame retirement, ingress extraction, latch semantics, and failure precedence are made explicit, the proposed runtime can preserve the current package's hard-won correctness guarantees while removing most of the protocol machinery.