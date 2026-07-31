# 2. The behavior–kernel callback contract

## The tri-phase transition

The shipped package and probe 1 both state the same rule in prose:

> Every substantial action is three stages. **Prepare** — validation, pure
> calculation, DOM reads, *local* acquisition; must not mutate `current`.
> **Commit** — short, effectively non-throwing. **Post-commit effects** — DOM
> writes, lifetime closes, continuations, callbacks.

Probe 1 asked the behavior to obey it, including calling `kernel.begin()`,
`kernel.preparationValid()` and `kernel.commit()` in the right order inside each
seam. Here it is the shape of the contract. (D-3)

Every signature in this document is compiled. The **type fixture** is
[`packages/drag/docs/contract-probe-2/contract.ts`](../../../../packages/drag/docs/contract-probe-2/contract.ts),
covered by `npx just typecheck` from `packages/drag`. It is not an executable
copy — it has no queue, cancellation machine or failure checkpoint — and where
it and this document disagree, **this document wins**. It carries
`@ts-expect-error` assertions for each tier-A claim that is *expressible* as a
type error, so those cannot silently degrade to discipline.

```ts
type Frame<Part extends object> = KernelFrame & Part;

/**
 * What a `prepare` may write: its own part, plus a read-only kernel slice.
 * The `Omit` is not cosmetic — see §04 §Write protection.
 */
type Draft<Part extends object> = Omit<Part, keyof KernelFrame> & Readonly<KernelFrame>;

type Transition<
  Part extends object,
  // `extends {}` excludes `null` and `undefined` while still admitting the
  // `true` sentinel, an element, or any object. It keeps `Prepared | null`
  // unambiguous as the discard signal without leaving it to prose.
  Prepared extends {} = true,
  Capability = void,
> = Readonly<{
  /**
   * Prepare. Returns the staged value, or `null` to discard. Must not touch
   * `current`, must not perform DOM writes, and must keep every acquisition
   * local — everything it acquires travels out through `Prepared`.
   *
   * Seams that stage nothing use `Prepared = true` and return the literal.
   */
  prepare(draft: Draft<Part>, capability: Capability): Prepared | null;

  /**
   * Post-commit effects, for an already-published transition. A throw here
   * becomes a classified failure from the committed state; the transition is
   * not reverted.
   */
  effect(current: Readonly<Frame<Part>>, prepared: Prepared, capability: Capability): void;

  /**
   * Called instead of `effect` when the kernel discards a successful `prepare`
   * because a reentrant `cancel()` or `destroy()` invalidated it. Releases
   * whatever `prepare` staged. Publishes nothing, reports nothing.
   *
   * Unused by vertical sortable, because after D-17 nothing it stages holds an
   * external resource. It exists because the contract must define what happens
   * to a `Prepared` value that does.
   */
  rollback?(prepared: Prepared): void;
}>;
```

### The shared core, and why it is not the whole driver

There is one core routine. **No seam is only the core** — the discard policy and
the failure policy differ per seam, and pretending otherwise hid four real gaps
(review 4, §8).

#### The core returns an outcome, not a boolean

A `boolean` conflates five outcomes, and each caller needs a different
continuation for each. Worse, it conflates *discarded* with *failed*, which made
the failure model internally inconsistent: classification happened, and then
success work continued anyway (review 5, §1).

```ts
const SEAM_DISCARDED      = 0;  // `prepare` returned null — nothing happened
const SEAM_INVALIDATED    = 1;  // reentrant cancel/destroy after a good prepare
const SEAM_PREPARE_FAILED = 2;  // classified; nothing committed
const SEAM_COMMITTED      = 3;  // committed, effect returned normally
const SEAM_EFFECT_FAILED  = 4;  // classified, from the committed state

const seamFailed = (o: SeamOutcome): boolean =>
  o === SEAM_PREPARE_FAILED || o === SEAM_EFFECT_FAILED;
```

**Classification is not sufficient on its own. A classified failure must also
stop incompatible continuation**, because the failure checkpoint is *queued* —
so between the throw and the checkpoint there is a window in which the driver
was still doing success work:

| Seam | What the boolean caused | Rule now |
| --- | --- | --- |
| activation | A classified `prepare` failure returned `false`, which the wrapper read as an ordinary discard and retired the operation — making the queued `FAILED` entry stale, so `onError` might never fire | Retire on `SEAM_DISCARDED`/`SEAM_INVALIDATED` **only**. On a failure the operation stays live for its checkpoint. |
| release | `openResolution(command)` ran unconditionally, so the consumer could receive `onReorder` for a release whose committed presentation effect had thrown, racing the failure through the same queue | Execute the command **only** on `SEAM_COMMITTED`. |
| settlement | A `effect` that requested one hold and then threw still got sealed and armed, starting readiness or a runner for an already-failed settlement | On `SEAM_EFFECT_FAILED`, seal, then **discard every unarmed request** and arm nothing. |
| join | `spec.finalized(current)` ran after a classified target or renderer failure, and the committed frame still said `OUTCOME_ACCEPTED` — so `onFinish` fired for a drop about to be reported through `onError` | Always release presentation; **skip the terminal callback** after a consequential failure. |

That last row is a direct contradiction of the rule that a failed operation
reports through `onError` only, and it is the reason **F-19 was not actually
resolved** by catching throws.

#### Every classification entrypoint latches

Throwing is not the only way a seam classifies. The contract also permits:

```ts
host.fail(stage, error);
return normally;
```

and an earlier driver had no state connecting that call to its result, so it
returned `SEAM_COMMITTED` and **every continuation D-23 forbids ran anyway** —
activation queued `START_COMMITTED`, release invoked `onReorder`, settlement
armed its gate plan, an action's committed transition carried on (review 6, §2).

The kernel therefore keeps one private `seamFailureRequested` latch, cleared as
each seam phase opens and set by `host.fail`. **A latched failure is
indistinguishable from a throw at the driver boundary.** Enqueuing a checkpoint
is not enough on its own: the checkpoint is queued, and the window before it
applies is exactly what the latch closes.

```ts
const runCore = <P extends {}, C>(
  t: Transition<Part, P, C>, capability: C, stage: FailureStage,
): SeamOutcome => {
  begin();                                   // Object.assign(draft, current)
  let prepared: P | null;
  seamFailureRequested = false;
  inSeam = true;
  try {
    prepared = t.prepare(draft, capability);
  } catch (error) {
    fail(stage, error);
    return SEAM_PREPARE_FAILED;              // nothing staged escaped
  } finally { inSeam = false; }

  if (seamFailureRequested) { return SEAM_PREPARE_FAILED; }   // explicit fail
  if (prepared === null) { return SEAM_DISCARDED; }           // draft abandoned

  if (!preparationValid()) {                 // reentrant destroy/cancel
    inSeam = true;
    try { t.rollback?.(prepared); }
    catch (error) { report(error); }         // never classified — see below
    finally { inSeam = false; }
    return SEAM_INVALIDATED;
  }

  commit();                                  // swap two references
  seamFailureRequested = false;
  inSeam = true;
  try { t.effect(current, prepared, capability); }
  catch (error) {
    fail(stage, error);                      // classified, from the committed state
    return SEAM_EFFECT_FAILED;
  }
  finally { inSeam = false; }
  return seamFailureRequested ? SEAM_EFFECT_FAILED : SEAM_COMMITTED;
};
```

Non-transition seams get the same treatment through a `runLeaf` wrapper, so
`moved`, `anchorTarget` and `finalized` all behave identically whether the
behavior throws or calls `host.fail`.

Two things this makes explicit that the earlier sketch did not:

- **`effect` is wrapped.** Its throw was promised to be a classified failure,
  but nothing caught it, so under the queue contract it escaped to panic and
  destroyed the controller. It is now caught at the seam that owns the stage.
- **A `rollback` throw is a best-effort report, never classified.** `rollback`
  runs only when the operation is *already* invalid; classifying its failure
  would open a transition against an operation the kernel has just decided to
  abandon.

Per seam:

| Seam | Discard | Failure policy |
| --- | --- | --- |
| `action` | Normal. Nothing published, operation continues. | Stage per tag (`INSERTION`, `PLACEHOLDER_MOVE`). |
| `activation` | **Retires the operation** — the kernel releases capture, disposes the lift and returns to `IDLE`; there is no such thing as a pending operation with no presentation. On `SEAM_COMMITTED` the kernel re-checks `preparationValid()` and only then dispatches `START_COMMITTED`. | `ACTIVATION`, and **no retirement** — the queued checkpoint owns it. |
| `release` | **Not expressible.** `prepare` returns `ResolutionCommand \| SeamRejection` — motion is already closed, so "changed my mind" has no meaning. | `RELEASE`; the staged command is **not** executed. |
| `settlement` | **Not expressible.** `prepare` returns `PreparedSettlement \| SeamRejection`; the kernel classifies the rejection itself. | The stage the behavior names in the rejection; on an `effect` failure the gate plan is discarded unarmed. |

The last two close a hole the generic driver had: `release.prepare` returning
`null` left a truthful but stranded `RELEASING` operation with no resolution, no
failure and no retirement, and `settlement.prepare` returning `null` depended on
the behavior having queued a failure first — which the kernel could not check,
after the resolution payload was already consumed.

`SeamRejection` is shared by both, because both are non-discardable seams that
still need to say *this is a failure, at this stage*:

```ts
type SeamRejection = Readonly<{ stage: FailureStage; error: unknown }>;
```

### Post-callback revalidation

A rule the reserve-before-call discipline does not cover on its own:

> **Reserving a resource before a reentrancy-capable callback protects only
> resources that already exist. A resource returned *from* that callback needs
> its own stale-return disposal path.**

Two places this bites, at opposite ends of the lifecycle:

- **`admit`** runs consumer-supplied handle and visual resolvers during native
  dispatch, and a resolver can close over the already-returned controller and
  synchronously `destroy()` it. The kernel therefore rechecks terminal state
  **after `admit` returns** and before minting identity or acquiring anything.
  Without it, a terminal controller publishes a new operation.
- **`LandingStart`** can `destroy()` the controller and *then* return a live
  handle. Teardown, running first, sees no published handle and retires the
  attempt; the arm code would then store a live runner on a stale attempt with
  nothing owning it. The kernel revalidates after `start` returns and, if the
  attempt is stale, **destroys the returned handle immediately, best-effort, and
  never publishes it**.

The same shape applies to any future seam that returns a resource from a
callback the consumer can reach.

### What this actually guarantees

| Tier | Property | Mechanism |
| --- | --- | --- |
| **A** | Preparation cannot mutate committed frame state | `prepare` never receives `current` |
| **A** | An effect cannot assign a **top-level** frame slot | `effect` receives `Readonly<Frame<Part>>` |
| **A** | The behavior cannot write kernel frame fields | `Draft<Part>` omits them, then re-adds them `readonly` |
| **A** | A post-commit failure cannot revert a committed transition | `effect` runs after the swap and has no way to express a revert |
| **A** | Release and settlement cannot discard | Non-nullable `prepare` return types |
| **B** | Revalidate-then-commit is never skipped | The kernel drives it; there is no behavior-callable `commit()` |
| **B** | A discarded transition's staged value reaches exactly one of `effect` or `rollback` | The driver branches; the behavior does not |
| **B** | A seam throw is classified, never a panic | Every `prepare`/`effect` call is wrapped by the driver |
| **C** | Preparation performs no externally visible mutation | Discipline. `prepare` can call anything. |
| **C** | Frame *referents* are immutable or replace-on-write | Discipline. `Readonly` is shallow — §04 §The shallow-copy contract. |
| **C** | Ownership transfers only at commit | Discipline. Physical acquisition inside `prepare` precedes the swap. |

**`Readonly<Frame<Part>>` is shallow.** It prevents `current.insertion = x`; it
does not prevent `current.insertion.index = 4`. Since `begin()` shallow-copies,
both frames reference the same nested objects, so mutating a referent mutates
committed state. That is why the shallow-copy contract exists, and why it is
tier C for every part author including a custom behavior the kernel cannot
inspect.

The third and fourth rows of tier C matter. **The kernel revalidates once, after
`prepare` returns — not after every callback boundary inside it.** Probe 1's
prose claimed per-boundary revalidation; its own trace shows the same single
check. This model makes that check unforgettable, which is a real but smaller
gain.

What makes tier C *vacuous for vertical sortable* is D-17 plus the placement of
the placeholder insertion: after both, `activation.prepare` creates a detached
element, measures, and returns it. It performs no externally visible mutation at
all. That is a property of the reference behavior, not of the API.

## `BehaviorSpec`

```ts
type BehaviorSpec<Part extends object> = Readonly<{
  /* ---- the behavior's frame part (§04) ---- */
  /** `FramePartOf` rejects a part that declares a kernel frame key. */
  createFramePart(): FramePartOf<Part>;
  resetFramePart(frame: Part): void;

  /* ---- static configuration ---- */
  config: Readonly<{
    /** Activation travel in viewport pixels. The kernel owns the distance test. */
    threshold: number;
    /** Which lift strategy the kernel acquires at activation. */
    liftMode: number;
    /** Bound on the authored-presentation gate, in ms. Default 500. */
    readinessTimeout: number;
  }>;

  /* ---- admission (native dispatch, not queued) ---- */
  /**
   * Runs synchronously inside `pointerdown`, after the kernel's own guards,
   * with the draft open. Returns the element the kernel should lift, or `null`
   * to leave the controller idle. (D-5)
   *
   * `composedPath()` and `preventDefault()` are valid only here.
   */
  admit(event: PointerEvent, draft: Draft<Part>): HTMLElement | null;

  /* ---- transactional seams ---- */
  activation: Transition<Part, HTMLElement, ActivationScope>;
  release:    ReleaseTransition<Part>;
  settlement: SettlementTransition<Part>;
  action:     ActionTransition<Part>;

  /* ---- non-transactional seams ---- */
  /**
   * The committed pointer sample changed. The hot path.
   *
   * **The kernel wraps this call** and classifies a throw as
   * `FAILURE_RENDERER_WRITE`. It is not a transition, so without a wrapper a
   * CSSOM or scheduling throw escaped the handler and became a *panic* that
   * destroyed the controller — contradicting the existence of both
   * `FAILURE_RENDERER_WRITE` and `FAILURE_SCHEDULED_FRAME`, and diverging from
   * the shipped implementation's classified handling (review 6, §8).
   *
   * Rendering and scheduling stay **one callback with two stages**, narrowed
   * from the inside via `host.fail(FAILURE_SCHEDULED_FRAME, …)` rather than
   * split into two seams: splitting would add an indirect call to the one path
   * that counts them, and the failure latch makes the narrowing visible to the
   * driver anyway. If the render succeeded and only scheduling threw, the
   * committed pointer and the visual are still truthful and the checkpoint
   * chooses recovery from there.
   */
  moved(current: Readonly<Frame<Part>>, lift: VisualLiftSession): void;

  /**
   * Produce the viewport point the lifted visual should end at. (D-16)
   *
   * `authoredReady` says only whether the consumer's authored presentation is
   * final *now*. It does not say whether to re-anchor: that follows the
   * recovery, which is the behavior's own committed frame state.
   */
  anchorTarget(current: Readonly<Frame<Part>>, authoredReady: boolean): Point;

  /** Presentation is released and both gates are complete. Terminal callback. */
  finalized(current: Readonly<Frame<Part>>): void;

  /** Drop per-operation references. Idempotent, best-effort. */
  retire(): void;
}>;
```

Twelve top-level members, ~16 functions once the transitions expand. Probe 1:
fifteen. The count is a wash; the difference is that each phase of each seam now
has one job.

### Seam-by-seam, for vertical sortable

| Seam | Phase in | Phase out | What sortable does |
| --- | --- | --- | --- |
| `admit` | `IDLE` | `PENDING` | Resolve the pressed item against the published snapshot; apply the `handle` slot; write `item`, `visual`, `snapshot` into its part; return the visual (via the `visual` slot or identity). |
| `activation.prepare` | `PENDING` | `ACTIVATING` | Create the placeholder **detached** (default mechanics or the `placeholder` slot), size it from the visual's **offset** box, seed the home insertion into the draft, return the element. No DOM insertion, no acquisition. |
| `activation.effect` | `ACTIVATING` | — | Register removal on `scope.presentation`, **then** `item.after(placeholder)`; arm scroll/resize invalidation and the frame-task cancel on `scope.motion`; publish `rt.placeholder`, `rt.lift` and the per-operation `rt.view`; `slots.invalidateInsertion()`; `slots.onStart(item)` last. See §Post-commit ordering. |
| `moved` | `ACTIVE` | — | `lift.composeXY(dx, dy)` → transform; `spatialSeq += 1`; `frame.schedule(spatialSeq)`. **Kernel-wrapped** — see below. |
| `action.prepare(SPATIAL)` | `ACTIVE` | — | `slots.resolveInsertion(draft, rt.view)`; write `insertion`, or return `null`. |
| `action.effect(SPATIAL)` | — | — | `beforeMove` pipeline → placeholder DOM move (sole writer) → `slots.invalidateInsertion()` → `afterMove` pipeline. |
| `action.prepare(COLLECTION)` | any | — | **Stage only, and never discard.** Reconcile against the replacement, rebase the insertion into the draft where the phase allows it, and return a `PreparedCollection` — carrying `cancelReason` when the gap cannot survive. Nothing private is written here. |
| `action.effect(COLLECTION)` | — | — | Publish `rt.snapshot` and `rt.view.snapshot` from the staged value; `slots.invalidateInsertion()`; **then**, last, `host.cancel(staged.cancelReason)` if one was staged. |
| `release.prepare` | `RELEASING` | — | `slots.invalidateInsertion()`; re-resolve the insertion synchronously from the committed release point; fall back to incumbent, then home; build the immutable proposal; write both; **return the `ResolutionCommand`**. |
| `release.effect` | — | — | Move the placeholder to the final gap **and render the lift at the committed pointerup sample**. The kernel executes the staged command afterwards. |
| `settlement.prepare` | `RELEASING` | `SETTLING` | Map the discriminated `SettlementInput` exhaustively to `outcome`, `recovery`, `domain`, and stage the readiness promise. A non-resolution or a rejected thenable returns a `SeamRejection`. |
| `settlement.effect` | — | — | *Request* holds: `scope.holdForReadiness(prepared.ready)` when one was staged; `scope.holdForLanding(start)` when a `landing()` slot exists and recovery is not immediate. Nothing is armed here. |
| `anchorTarget` | `SETTLING` / `FINALIZING` | — | Re-anchor when the recovery is destination and `authoredReady`; measure; return the point. See §Landing. |
| `finalized` | `FINALIZING` | — | `onFinish` for accepted/no-op, `onCancel` for rejected/canceled, nothing for failed. |
| `retire` | → `IDLE` | — | Cancel the frame task, clear `pendingSpatial`, drop `placeholder` and `lift`, run feature retire hooks. |

## Post-commit ordering

`prepare` gets rollback. An `effect` does not: it runs after the swap, and a
throw inside it opens a *new* failure transition from the committed state
(I-18). So a partially completed effect must never leave a resource that is
externally visible but not yet owned by cleanup.

**The rule, for every `effect`, in this order:**

```text
1. register the release      — for each resource, before it can be observed
2. make it externally visible
3. publish private-runtime references
4. invoke consumer callbacks — last, because they may cancel or destroy
```

Applied to `activation.effect`:

```ts
// 1 → 2, per resource. Registering first is free: removing a detached node
// is a no-op, so an over-eager disposer can never over-release.
scope.presentation.use(() => placeholder.remove());
item.after(placeholder);

// listeners bound to `motion.signal` are self-releasing, so the signal *is*
// the registration; the explicit disposer cancels a scheduled frame
scope.motion.use(() => rt.frame.cancel());
invalidate(scope.motion.signal, () => slots.invalidateInsertion());

// 3 — every resource above is now owned
rt.placeholder = placeholder;
rt.lift = scope.lift;
rt.view = { realm, placeholder, snapshot: current.snapshot };
slots.invalidateInsertion();

// 4
slots.onStart(item);
```

`rt.frame` is **not** created here. The coalesced frame task is created once per
*controller*, at behavior construction, and cancelled on retirement and destroy
(review 4, §3). Nothing in the earlier draft created it at all, which made the
first active pointer move a null dereference. Per-controller is chosen over
per-operation because it removes both the nullability and an allocation from the
activation path, and the task's identity is never operation-scoped — staleness
is carried by the monotonic spatial attempt number it schedules.

`rt.view` **is** per-operation. It is the object both feature views bind to, and
it exists because they need a non-null `placeholder`, which a controller-lifetime
runtime cannot promise before activation (§[03](03-feature-composition.md)
§Consumer-declared views). One small object per drag, written twice per
operation, never per call.

Why each step sits where it does:

- **Registration before insertion.** If registration or any later step throws
  once the placeholder is in the DOM but unregistered, the operation fails with
  a visible orphan the presentation lifetime does not own. Reversing the two
  costs nothing.
- **Private references after all registrations.** `rt.placeholder` and `rt.lift`
  are how `retire()` and the feature hooks find their targets. Publishing them
  before ownership is established would let a throw produce a runtime that
  points at resources nothing will release.
- **Consumer callbacks last.** `onStart` may reentrantly `cancel()` or
  `destroy()`. Everything must be owned before that becomes possible, or
  teardown races an incomplete effect.

This is **I-29's sibling, I-30**, and it is tier C — the API does not enforce
ordering inside an effect. It is stated here because it is the one place where
post-commit failure has a non-obvious correct answer.

## Capabilities passed at call time

The kernel grants exactly what a seam needs, as arguments. Behavior code *can*
stash one — nothing stops it retaining an `ActivationScope` — so the guarantee
is not "it cannot be kept" but that **every capability becomes closed and
late-use-safe** once its operation ends: a `LifetimeScope` whose lifetime has
disposed invokes a late `use()` disposer immediately, and a `SettlementScope`
past sealing ignores and reports a late hold.

### `ActivationScope`

```ts
/** The same physical `Lifetime`, with `dispose` projected away. */
type LifetimeScope = Readonly<Pick<Lifetime, 'signal' | 'use' | 'useWhile'>>;

type ActivationScope = Readonly<{
  /** The element the kernel is lifting — what `admit` returned. */
  visual: HTMLElement;
  /** Its viewport rect at grab. Basis for every landing measurement. */
  originRect: DOMRectReadOnly;
  /** The lift session. The behavior keeps it for `moved`. */
  lift: VisualLiftSession;
  /** Closed at release, cancel, destroy, panic. */
  motion: LifetimeScope;
  /** Closed at finalization, after both gates. */
  presentation: LifetimeScope;
}>;
```

One object per operation. `prepare` reads `visual` and `originRect`; `effect`
uses the rest. `Lifetime` is unchanged from the shipped package: an
`AbortSignal`, a disposer stack, a latched best-effort LIFO `dispose()`,
`use(disposer)` and `useWhile(guard, disposer)`.

**`dispose()` is projected away** (review 4, §15). An earlier draft passed the
full `Lifetime` and justified it by saying a restricted façade would cost an
object per lifetime per operation — which was simply wrong: a `Pick` is a
type-level projection and the kernel passes the *same physical object* under the
narrower type. Zero allocations, and I-11's "the behavior has no opportunity to
sequence release incorrectly" becomes true instead of aspirational.

**Registration after closure.** `use(disposer)` on a lifetime that has already
disposed **invokes the disposer immediately** and reports a failure through the
platform reporter, rather than silently registering something that can never
run. A late registration is always a bug, but the resource it names is real, so
dropping it leaks and running it does not.

### Pointer capture is not here (D-17)

The kernel acquires pointer capture on **`root`** at activation and registers
its release on the motion lifetime. The behavior is not involved and the
admission result does not identify a capture target.

Why `root` rather than the pressed item:

- The kernel already owns pointer identity, ingress, the motion lifetime,
  release ordering, cancellation and teardown. Capture is the same concern.
- `root` is the ingress boundary, so in the reference behavior it is the
  connected ancestor of every admissible subject. The API does not *enforce*
  that — `admit` may return any `HTMLElement`, and a consumer resolver can
  detach or move either element — so the kernel validates `root.isConnected`
  immediately before capture, and **a capture failure is an activation
  failure** (`FAILURE_ACTIVATION`, recovery immediate) rather than a silently
  degraded drag.
- Capturing the **item** loses capture (and fires `lostpointercapture`) if the
  item leaves the DOM — which `updateItems()` can cause mid-drag. Capturing
  `root` makes that path a clean `CANCEL_ITEM_REMOVED` rather than a capture
  loss racing a cancellation.
- Capture is acquired at **activation**, never at admission, so a
  below-threshold press never captures and never retargets subsequent pointer
  events to `root`. It does **not** follow that a click always survives:
  admission already calls `preventDefault()` on `pointerdown`, and what that
  suppresses is a platform question this contract does not decide. The
  guarantee is about capture, not about clicks.

No semantic reason was found that requires a behavior-chosen capture target.
Vertical sortable performs no hit testing during a drag — its geometry is a
packed rect scan — so the fact that capture retargets `event.target` to `root`
costs nothing. A behavior that needed `document.elementFromPoint()` would be
unaffected, since capture does not change hit testing.

The residual: releasing capture for a pointer that no longer exists throws
`NotFoundError`, so the disposer is guarded. That is a kernel detail.

### `ResolutionCommand` — the choice is staged, not called

The kernel does not know what a reorder resolution is. An earlier draft passed a
`ResolutionGate` with `open()` and `skip()` and left "exactly one of these, once"
to discipline: zero calls stranded `RELEASING`, two calls created competing
attempts, and `open()` then `skip()` was undefined (review 4, §9).

Making the choice the *staged value* removes the whole class of problem.

```ts
type ResolutionCommand = Readonly<{
  /**
   * The consumer round-trip, or `null` to settle immediately with no round-trip
   * (a no-op proposal). The kernel creates the attempt, arms the guarded abort
   * on the cancellation lifetime, invokes it, and queues the settled value back
   * to `settlement.prepare` as an opaque `unknown`.
   */
  invoke: ((signal: AbortSignal) => unknown) | null;
}>;

type ReleaseTransition<Part extends object> = Readonly<{
  prepare(draft: Draft<Part>): ResolutionCommand | SeamRejection;
  effect(current: Readonly<Frame<Part>>, prepared: ResolutionCommand): void;
}>;
```

Exactly one choice, made exactly once, executed by the kernel after
`release.effect` returns **and only if it returned normally**. No
`unused → used → sealed` state machine, no duplicate-call policy, no
missing-call failure stage. There is one object and at most one closure per drag
— not a hot path.

**`invoke: null` asserts a *proven semantic no-op*, and nothing else.** It is not
a fallback for missing state. A release that finds no published view, no item,
no snapshot or no insertion has a broken invariant, and reporting that as a
successful no-op drop would tell the consumer the drag completed normally
(review 5, §4). Those paths return a `SeamRejection` at `FAILURE_RELEASE`. The
only legitimate skip is `proposal.from === proposal.to`.

The kernel treats a thenable as asynchronous and anything else as immediately
settled, then hands the result to `settlement.prepare` with a status code. It
never names `ReorderResolution`, `accept`, `reject` or `presentationReady`.

Acceptance is still **never inferred**: `settlement.prepare` is where a fulfilled
value that is not an explicit resolution becomes `FAILURE_REORDER_RESOLUTION`.
That check lives with the party that can perform it — and it is now returned as
a value rather than announced through a side call:

```ts
/** The readiness promise travels through `Prepared`, not a private write. */
type PreparedSettlement = Readonly<{ ready: PromiseLike<void> | null }>;

type SettlementTransition<Part extends object> = Readonly<{
  prepare(
    draft: Draft<Part>, input: SettlementInput,
  ): PreparedSettlement | SeamRejection;
  effect(
    current: Readonly<Frame<Part>>, prepared: PreparedSettlement, scope: SettlementScope,
  ): void;
}>;
```

### The settlement input is discriminated and exhaustive

An earlier draft passed `(value: unknown, status: number)` across five statuses
and never defined a total mapping from them to outcome, recovery, domain result,
callbacks and failure stage. The compiled behavior then did the predictable
thing and mapped **every** non-fulfilled status to rejection with home recovery
— which turned `SETTLED_SKIPPED`, produced by `{ invoke: null }` for a semantic
no-op, into a rejected drop that animates home and calls `onCancel`
(review 4, §4).

The fix for that was the discriminant, **not** removing cases. A subsequent
draft also dropped `canceled` and `failed` on the grounds that they are
kernel-*triggered*, and that was wrong (review 5, §1): `outcome`, `recovery` and
`domain` are fields of the **behavior's** frame part, which the kernel cannot
name or write, and `BehaviorSpec` has no other terminal-classification hook. A
kernel `CANCEL` could commit `SETTLING` and then had no way to produce the
canceled result `onCancel` requires.

**Ownership of the trigger and ownership of the resulting domain state are
different things.** All five cases go to the behavior:

```ts
type SettlementInput =
  | Readonly<{ type: SETTLED_FULFILLED; value: unknown }>
  | Readonly<{ type: SETTLED_REJECTED;  error: unknown }>
  | Readonly<{ type: SETTLED_SKIPPED }>
  | Readonly<{ type: SETTLED_CANCELED; reason: unknown; stage: CancelStage }>
  | Readonly<{ type: SETTLED_FAILED;   stage: FailureStage; error: unknown }>;
```

The complete mapping, which the behavior must cover exhaustively:

| Input | Outcome | Recovery | Domain result | Callback |
| --- | --- | --- | --- | --- |
| `skipped` | `OUTCOME_NOOP` | **immediate** — the placeholder is already where the item belongs | `{ type: 'noop', proposal }` | `onFinish` |
| `fulfilled`, an accepted `ReorderResolution` | `OUTCOME_ACCEPTED` | destination | `{ type: 'accepted', proposal }` | `onFinish` |
| `fulfilled`, a rejected `ReorderResolution` | `OUTCOME_REJECTED` | home | `{ type: 'rejected', reason, proposal }` | `onCancel` |
| `fulfilled`, not a resolution at all | — | — | — | `SeamRejection(FAILURE_REORDER_RESOLUTION)` |
| `rejected` (the thenable rejected or `invoke` threw) | — | — | — | `SeamRejection(FAILURE_REORDER_RESOLUTION)` |
| `canceled` | `OUTCOME_CANCELED` | home | `{ type: 'canceled', reason, stage, proposal }` | `onCancel` |
| `failed` | `OUTCOME_FAILED` | immediate | **none** | `onError` only; `finalized` is never called |

A rejected thenable is a **resolver malfunction, not a considered consumer
verdict**, so it is a named classified failure rather than an inferred
`onCancel`. Acceptance is still never inferred, and now neither is rejection.

`CancelStage` is `AT_PROPOSAL` or `AT_CONSUMER`, carried through to the public
cancel result — probe 1's preserved product requirement, which the intermediate
draft had no constructor for.

## Settlement gates (D-7)

Both gates start **complete**. The behavior *holds* the ones it needs, and only
during `settlement.effect`. Gate state lives on a **kernel-private settlement
attempt**, not on the transactional frame: nothing outside `advanceSettlement`
reads it, it is unobservable, and it is per-settlement rather than
per-operation.

```ts
// kernel-private
type SettlementAttempt = {
  holds: number;
  /** Requested during `effect`, armed after sealing, cleared on release. */
  readiness: PromiseLike<void> | null;
  readinessHeld: boolean;
  /** Requested during `effect`, invoked after sealing. */
  start: LandingStart | null;
  /** Retained past its gate release, so the join can `destroy()` it. */
  landing: LandingHandle | null;
  landingHeld: boolean;
  /** Whether the authored presentation is final. Not "readiness was supplied". */
  authoredReady: boolean;
  /** False once a `destroy()` throw leaves runner control unrelinquished (I-24). */
  relinquished: boolean;
  /** Once-only completion latch: the first `done()`/`fail()` wins. */
  completed: boolean;
  /** Set when landing creation or the runner reported a consequential failure. */
  failed: boolean;
  sealed: boolean;
};

type SettlementScope = Readonly<{
  /** Hold the authored-presentation gate until `ready` settles, bounded by
   *  `config.readinessTimeout`. At most once. */
  holdForReadiness(ready: PromiseLike<void>): void;
  /** Hold the landing gate. The kernel builds the context and owns the attempt.
   *  At most once. */
  holdForLanding(start: LandingStart): void;
}>;
```

### Request, seal, then arm

The gate methods **record a request; they arm nothing** (review 4, §6, §10).
Arming happens once, after the scope seals, when the complete gate plan is
known.

```text
> RESOLUTION_SETTLED
    begin()
    spec.settlement.prepare(draft, input)           → outcome, recovery, domain
                                                      + the staged readiness promise
                                                    ← a SeamRejection here is
                                                      classified and nothing
                                                      below runs
    preparationValid(); draft.phase = SETTLING; commit()
    attempt = { holds: 0, readiness: null, readinessHeld: false, start: null,
                landing: null, landingHeld: false, authoredReady: false,
                relinquished: true, sealed: false }
    lifetimes.cancellation.dispose()

    spec.settlement.effect(current, prepared, scope)
        scope.holdForReadiness(p)   → holds += 1; readiness = p; readinessHeld = true
        scope.holdForLanding(start) → holds += 1; attempt.start = start; landingHeld = true
        ── record only. A second call to either is ignored and reported. ──

    attempt.sealed = true

    ── if `settlement.effect` threw, or the operation was invalidated:
       drop every unarmed request, arm NOTHING, and let the queued failure
       checkpoint decide. Arming a half-requested plan starts readiness or a
       runner for an already-failed settlement.                    [review 5 §1]

    attempt.authoredReady = attempt.readiness === null    ← no promise ⇒ final now

    arm → ARM_ARMED | ARM_STALE | ARM_FAILED
          if (readiness)  watch it, bounded by config.readinessTimeout
          if (start)      target = spec.anchorTarget(current, authoredReady)
                          ↳ throws or latches → roll the hold back, ARM_FAILED
                          ── revalidate BEFORE `start`: `anchorTarget` is
                             behavior code and may have destroyed the
                             controller. Calling the consumer's runner after
                             that violates I-6.                            ──
                          if (stale)  roll the hold back, ARM_STALE, no `start`
                          handle = start(context, done, fail)
                          ↳ throws → roll the hold back, ARM_FAILED
                          ── revalidate AFTER `start`: it may have destroyed
                             the controller or called `fail()` and STILL
                             returned a live handle ──
                          if (stale) handle.destroy() best-effort; never publish
                          else       attempt.landing = handle

    if (arm === ARM_FAILED) return    ← the settlement is REPLACED; do not
                                        advance, and never let the original
                                        accepted/rejected outcome finalize
    advanceSettlement()               ← may finalize in this drain
```

### Arming has three outcomes, and one of them is consequential

An earlier draft classified an arm-time `anchorTarget` or `start` throw as
`FAILURE_LANDING_CREATE`, rolled the landing hold back, "opened the gate" and
**continued the original settlement** (review 6, §3). If readiness was also
open, the hold count then reached zero and the accepted settlement finalized —
calling `onFinish` — before the queued failure checkpoint ran.

That is the exact continuation D-23 prohibits. A consequential landing-create
failure cannot both become `OUTCOME_FAILED` reporting through `onError` only
*and* carry the original accepted outcome through to `finalized`.

```ts
const ARM_ARMED = 0;   // the plan is live
const ARM_STALE = 1;   // the operation went away; nothing armed, nothing failed
const ARM_FAILED = 2;  // classified; the settlement is replaced
```

`ARM_FAILED` suppresses `advanceSettlement` and every terminal callback for the
original settlement. Presentation is still owned and still released — by the
failure path's own recovery, which is `RECOVERY_IMMEDIATE` — so returning from
the arm helper is not by itself sufficient, and the outcome has to be visible to
the caller.

### The landing completion latch

`LandingStart` receives `done` and `fail`. Both route through one **once-only**
latch on the attempt:

```text
completeLanding(attempt, error):
    if (attempt.completed) return          ← duplicate, or done-after-fail
    attempt.completed = true
    if (error)  attempt.failed = true; fail(FAILURE_LANDING_INTERRUPTED, error); return
    if (producer-side validation passes)   dispatch(LANDING_SETTLED, attempt)
```

Three properties this fixes at once:

- **First completion wins.** `done()` then `fail()`, `fail()` then `done()`, and
  a duplicate `done()` all resolve to the first call.
- **A synchronous `fail()` inside `start` is honoured.** It sets `attempt.failed`
  *before* `start` returns, so the post-`start` revalidation destroys the
  returned handle and never publishes it. Without the latch there was no attempt
  field recording the failure, so the handle was published anyway.
- **The completion is queued, then revalidated again when applied** (I-4), so a
  completion for a retired attempt is inert at both points.

**Reserve-before-call and revalidate-after-return are two different fixes.** The
first makes a synchronous `done()` safe; the second makes a synchronous
`destroy()` safe. A `start` that destroys the controller and *then* returns a
live handle would otherwise leak that runner: teardown runs first, sees no
published handle, retires the attempt, and the arm code stores a live runner on
a stale attempt with nothing owning it (review 5, §3). Reserving a resource
before a callback protects resources that already exist; it does nothing for one
the callback *returns*.

Why the split matters: a `landing({ duration: 0 })` runner, or any custom runner
that finishes synchronously, calls `done()` **from inside `start`**. In the
earlier ordering the hold was installed *after* `start` returned, so the
completion either found no hold (and was dropped, stranding the gate) or applied
against a half-built attempt. Reserving the hold before calling `start`, and
publishing the handle only after `start` returns, makes both safe: the
completion is queued, so it cannot be applied before the handle is stored.

If arm-time `anchorTarget` or `start` throws, or the attempt-scoped
`fail()` wins synchronously, the reserved hold is rolled back deterministically
and the failure is `FAILURE_LANDING_CREATE`. `armSettlement` returns
`ARM_FAILED`: the original settlement is replaced, `advanceSettlement()` is not
called, and no terminal callback from the original accepted/rejected/no-op result
may run. Presentation remains owned until the queued failure checkpoint enters
failed immediate recovery.

Consequences:

1. **A gate release is not a frame transition.** Probe 1 ran
   `begin(); flag = true; commit()` per gate. The only transition in settlement
   is `phase = FINALIZING`.
2. **A hold count is safe**, because each gate owns a distinct guard: readiness
   releases only while `attempt.readinessHeld`, landing only while
   `attempt.landingHeld`. Each release is idempotent and duplicate-proof, and
   the guard still names which gate is outstanding for a diagnostic. The landing
   *handle* outlives its gate release, because the join needs it to `destroy()`
   the runner before the pin.
3. **Staleness handling is free.** A `done()` for a retired attempt finds no
   attempt.
4. **Each hold may be requested at most once, and only before sealing.** A
   duplicate or late request is ignored and reported through the **platform
   reporter** — the same non-consequential channel as a failing disposer, not
   `onError`, which this document reserves for classified failures. It never
   overwrites a watch, never double-increments, and never panics, because a
   bookkeeping error should not destroy a live drop.
5. **The two gates are genuinely independent.** With no `landing()` feature the
   behavior holds no *landing* gate — but it still holds readiness whenever the
   resolution carried a promise. **Same-drain finalization happens only when
   neither gate is held.** An earlier draft said absence of `landing()` meant
   "the behavior holds nothing and finalizes in the same drain", which
   contradicted both I-8 and the trace, and would have released presentation
   before the consumer's authored commit.
6. **Two gates are v1 product vocabulary, not a generic mechanism.** Adding a
   third means touching the attempt record, the scope API, the arm step,
   teardown, diagnostics and tests. That is a small deliberate change, not a
   free one; an earlier claim that "a third gate is a third guard" understated
   it.

## Landing (D-16)

The kernel computes nothing about geometry beyond the delta arithmetic; it owns
the *attempt*, the *timing of measurement*, and the *final pin*.

```ts
type Point = Readonly<{ x: number; y: number }>;

type LandingStart = (
  context: LandingContext,
  done: () => void,
  fail: (error: unknown) => void,
) => LandingHandle;

type LandingContext = Readonly<{
  visual: HTMLElement;
  /** Full transform string for a viewport delta, including the lift's base. */
  compose(x: number, y: number): string;
  from: Point;
  /** Provisional. May be superseded; correctness does not depend on it. */
  target: Point;
  realm: DOMRealm;
}>;

type LandingHandle = Readonly<{
  /**
   * Stop, and relinquish control of the visual's transform so the kernel's
   * final pin is not overridden. A WAAPI runner cancels its animation here.
   * Never writes a final position, never dispatches.
   */
  destroy(): void;

  /** Optional trajectory-quality capability. Absent runners are fully correct. */
  retarget?(target: Point): void;
}>;
```

There is deliberately no `pin()` on the handle. **The kernel performs the
authoritative pin through the lift session it already owns**, which makes
correctness independent of the runner:

```text
arm (after sealing)
    target = spec.anchorTarget(current, attempt.authoredReady)
             ← `authoredReady` is true here exactly when no readiness promise
               was supplied. With one pending, React has not committed yet, so
               re-anchoring now would drag the placeholder back beside the
               item's OLD slot.
    context = { visual, compose, from, target, realm }
    handle  = start(context, done, fail)
    attempt.landing = handle

readiness releases (no error)
    attempt.authoredReady = true
    if (attempt.landingHeld && attempt.landing !== null) {
      target = spec.anchorTarget(current, true)  ← re-anchor, then measure
      attempt.landing.retarget?.(target)         ← quality only
    }
    ── the `landingHeld` guard matters: the handle is deliberately retained
       past its gate release so the join can `destroy()` it, so a bare
       `landing !== null` test would call `retarget()` on a runner that has
       already reported `done()`. There is no such runner obligation, and
       there should not be: a completed trajectory cannot be improved. ──

join — both holds released
    begin(); draft.phase = FINALIZING; commit()
    failed = false
    try {
      target = spec.anchorTarget(current, attempt.authoredReady)  ← authoritative
              ↳ throws → FAILURE_LANDING_TARGET; skip the pin; failed = true
      attempt.landing?.destroy()               ← relinquish the transform
              ↳ throws → best-effort report; attempt.relinquished = false
      if (target) lift.write(target.x - originRect.x, target.y - originRect.y)
              ↳ throws → FAILURE_RENDERER_WRITE; failed = true
    } finally {
      lifetimes.presentation.dispose()         ← placeholder removed, inline
                                                 styles restored once
    }
    if (failed) return                         ← the queued checkpoint drives
                                                 REPORTING, then retirement
    spec.finalized(current)                    ← throws → FAILURE_TERMINAL_CALLBACK
    dispatch(RETIRE, operation)
```

**The terminal callback is skipped after a consequential failure.** Presentation
release is unconditional; `finalized` is not. The committed frame still says
`OUTCOME_ACCEPTED` at this point, so calling it would fire `onFinish` for a drop
that the queued checkpoint is about to report through `onError` — violating the
rule that a failed operation reports through `onError` **only**.

Ordering is normative. `destroy()` precedes the pin so a running WAAPI animation
cannot override the inline transform. `anchorTarget` runs while presentation is
still owned; it may never be called after `presentation.dispose()`.

**Presentation release is in a `finally`, and every step before it is
individually fallible** (review 4, §12). The join calls into three pieces of
code the kernel does not own — a behavior measurement, a possibly-custom runner
handle, and a lift write — and an earlier draft let any of them skip the pin
*and* strand temporary presentation. Now a thrown `destroy()` from a custom
runner costs a report; a failed final write costs a classified failure; neither
prevents the placeholder from being removed and the inline styles from being
restored. A terminal-callback throw still leads to retirement.

**Runner obligation.** A landing runner drives the lift's transform and nothing
else. After `destroy()` it must leave no committed animation that overrides
inline style.

### `authoredReady` is not "a readiness promise was supplied"

Those are two different questions, and an earlier draft conflated them
(review 4, §6):

1. **Is the authored presentation final now?** That is `authoredReady`. Absent
   readiness means the consumer asserted its presentation is ready
   *synchronously* — a consumer may perfectly well apply the reorder
   imperatively before returning `accept()` — so `authoredReady` is `true` from
   settlement entry. A pending promise means `false` until it resolves;
   rejection or timeout leaves it `false`.
2. **Should this outcome re-anchor at all?** That follows the **recovery**,
   which is committed behavior state. Only `RECOVERY_DESTINATION` re-anchors to
   the semantic item. `RECOVERY_HOME` deliberately returns the placeholder to
   the home slot, and `RECOVERY_IMMEDIATE` deliberately keeps the placeholder
   where it stands.

The earlier reading — "no readiness promise means the authored DOM never
changed, so never re-anchor" — is not what an optional promise means, and it
disagrees with the shipped package, which treats an absent promise as ready
(`packages/drag/src/sortable/runtime/actions.ts:1133-1148`).

| Recovery | Target | Held? |
| --- | --- | --- |
| destination (accepted) | the placeholder, re-anchored when `authoredReady` | yes, if `landing()` is installed |
| home (rejected, cancelled, most failures) | the home slot; the behavior returns the placeholder there before measuring | yes, if `landing()` is installed |
| immediate (no-op, readiness failure, landing failure) | the placeholder as it stands | no |

**Correctness vs quality.** Correctness is *the final pin agrees with the
authored DOM before presentation is released*, and it holds for every runner and
every completion order. Quality is separate: when a short landing completes
*before* readiness, the authoritative correction at the join is a visible step
(F-16). A retargetable runner smooths it; the kernel guarantee does not depend
on one.

### Failure on the quality track versus the correctness track

`anchorTarget()` is called at two points that differ in what depends on the
result, and the failure response follows the **dependency, not the function**:

| Call site | The result is | On throw |
| --- | --- | --- |
| arm, `anchorTarget(current, authoredReady)` | the runner's provisional target | classified `FAILURE_LANDING_CREATE`; the reserved landing hold is rolled back, so settlement proceeds with the landing gate open and the join still pins |
| arm, `start(context, done, fail)` | the runner handle | classified `FAILURE_LANDING_CREATE`; hold rolled back |
| readiness, `anchorTarget(current, true)` | advisory — it only feeds an optional `retarget()` | **best-effort report; not classified.** Skip the retarget, leave every hold untouched, let the runner continue toward its provisional target |
| readiness, `landing.retarget?.(target)` | a trajectory improvement | **best-effort report; not classified.** The runner is *not* destroyed and the hold is *not* released |
| join, `anchorTarget(current, authoredReady)` | **authoritative** — it feeds the pin | classified `FAILURE_LANDING_TARGET`; skip the pin; **still** release presentation |
| join, `landing.destroy()` | relinquishment of the transform | **best-effort report.** A custom runner must not be able to strand presentation; the pin proceeds — but `attempt.relinquished` goes false and **I-24 no longer holds**, see below |
| join, `lift.write(...)` | the pin itself | classified `FAILURE_RENDERER_WRITE`; **still** release presentation; **skip** `finalized` |
| join, `spec.finalized(current)` | the terminal callback | classified `FAILURE_TERMINAL_CALLBACK`; the operation still retires |

**A thrown `destroy()` costs the final-position guarantee, not just tidiness.**
"Report and continue" is the right *cleanup* policy — a custom runner must never
strand presentation — but if `destroy()` threw before cancelling its WAAPI
animation or stopping its rAF loop, that runner may keep writing the transform
after `lift.write`. So I-24 is conditional on **three** things, not two:
authoritative measurement, a successful pin, *and* successful relinquishment of
runner control. The kernel cannot independently detach a runner it did not
create; making the guarantee unconditional would require redesigning runner
ownership so the kernel holds an infallible detach, which no first-iteration
runner needs.

"Best-effort report" is the existing channel used for a failing disposer: the
platform reporter, no `REPORTING` phase, no `onError`, no
`pendingContinuation`. It is deliberately *not* a classified failure, because
every classified failure in this model is consequential — it settles the
operation with `OUTCOME_FAILED` or retires it — and destroying a perfectly good
drop because one advisory measurement blipped would be wrong when the join is
about to measure again anyway.

A runner left running after a thrown `retarget()` cannot damage correctness: the
join calls `destroy()` before the pin, and the pin is computed from a fresh
measurement regardless of where the animation ended up.

`attempt.authoredReady` is still set to `true` when readiness itself succeeded,
even if the readiness-time re-anchor or retarget threw. It records that the
*consumer's* DOM is committed, which is independent of whether the library's
measurement worked — and the join needs it in order to re-anchor.

**New invariant (I-29): no failure on the trajectory-quality path may change
the settlement outcome, release or add a hold, or destroy the runner.** Only the
join's authoritative measurement is allowed to be consequential, and even it
must release presentation rather than strand the controller.

### `ActionTransition`

Behavior action tags get the same envelope, which is what makes "the behavior
never calls `begin()`/`commit()`" hold for behavior-initiated work too.

```ts
type ActionTransition<Part extends object> = Readonly<{
  prepare(tag: number, argument: unknown, draft: Draft<Part>): {} | null;
  effect(
    tag: number, argument: unknown, current: Readonly<Frame<Part>>, prepared: {},
  ): void;
  rollback?(tag: number, prepared: {}): void;
}>;
```

`Prepared` is opaque to the kernel, which threads it. The behavior narrows it by
tag: the spatial tag stages the sentinel `true`, the collection tag stages a
`PreparedCollection`.

**Actions stage; they do not publish.** An earlier draft had
`action.prepare(COLLECTION)` write `rt.snapshot` and dirty feature geometry
*before* returning its discard signal (review 4, §4). That contradicted D-3
outright — `Prepared` exists precisely so a discarded transition need never have
touched the private runtime — and it was not merely an external-effect nicety: a
reentrant `cancel()` or `destroy()` can invalidate the preparation after the
private runtime has already been replaced, and a later queued action then
observes a replacement belonging to a transaction that was discarded.

```ts
type PreparedCollection = Readonly<{
  snapshot: CollectionSnapshot;
  rebased: Insertion | null;
  /** Non-null ends the operation — dispatched by `effect`, after publication. */
  cancelReason: unknown;
  /** False at IDLE and from RELEASING on: the frame snapshot is not rebound. */
  bindsFrame: boolean;
}>;
```

`prepare` computes against the replacement and writes only the draft; `effect`
publishes `rt.snapshot`, updates `rt.view.snapshot`, invalidates geometry, and
**then** dispatches the cancellation if one was staged.

### An invalidating collection replacement must not be lost

The collection action is the one action that **never discards**. An earlier
draft had the invalid paths call `host.cancel(reason)` and return `null` — which
skips `effect` entirely, so the cancellation landed but **the consumer's
collection update was thrown away** (review 5, §2). `rt.snapshot` and
`rt.view.snapshot` kept the old collection, and after retirement the next press
started against stale items unless the consumer happened to repeat the update.

An invalid collection ends the **current drag**. It does not un-happen the
consumer's update. Staging `cancelReason` and dispatching it last from `effect`
keeps all three properties at once: the update is published, publication stays
post-commit, and FIFO still runs the cancel transition next.

An action that needs to end the operation *and* has nothing to publish may still
call `host.cancel(reason)` and return `null`. Cancellation precedence stays
entirely inside the kernel either way, and **`host.cancel` latches
synchronously** — see §[03](03-feature-composition.md) §`ACTIVATING` is handled,
not deferred, for why that matters when the caller is `onStart`.

Vertical sortable needs **two** tags: the coalesced spatial frame and the
collection replacement, so it declares `config.actionTags: 2`.

**The tag count is static spec data**, because otherwise there is nothing for
`arm()` to validate: `BehaviorSpec` listed no tags and `dispatch(tag, argument)`
accepts an arbitrary number (review 5, §13). `arm()` checks the declared count
once; `dispatch` bounds-checks each tag against it — one integer comparison,
because the kernel computes `BEHAVIOR_BASE + tag` and a negative or fractional
tag would otherwise alias a kernel action. An out-of-range tag is reported and
dropped, never enqueued.

**These tags cannot request a kernel lifecycle transition.** A behavior action
enters `ActionTransition` and nothing else — it cannot ask for admission,
activation or release. That is deliberate for pointer input, where the kernel
owns ingress, but it is a known pressure point: the shipped package implements
keyboard sorting as a complete one-slot operation with its own admission, and
the brief asks that a future keyboard feature not be made impossible
(`brief.md:727-741`). **The recorded position is that keyboard is expected to
revise the kernel contract**, not to be worked around with a third tag. No
generic behavior-to-kernel intent protocol is reserved now; the alternative — a
small typed lifecycle-intent vocabulary — waits for an executable keyboard
probe. Correspondingly, a third or fourth tag appearing is a *signal* worth
investigating (Q-4), not proof that the boundary is misplaced.

## Phases and legality

Kept verbatim (D-14):

```ts
const IDLE = 0;       // No operation. The only phase that admits input.
const PENDING = 1;    // Admitted; below the activation threshold.
const ACTIVATING = 2; // Activation committed; presentation/start effect in flight.
const ACTIVE = 3;     // Live, tracking input.
const RELEASING = 4;  // Input closed, geometry final, consumer resolving.
const SETTLING = 5;   // Outcome committed; awaiting the landing and readiness gates.
const REPORTING = 6;  // onError in flight.
const FINALIZING = 7; // Finalization in progress: measure, pin, release, report.
```

Two of these were named for a state they describe only *after* their effect
runs. `ACTIVATING` is committed **before** `activation.effect` inserts the
placeholder, and `FINALIZING` is committed **before** the join measures, destroys
the runner, pins and releases presentation. The names above describe the phase
from its commit, which is when it becomes observable.

`—` means ignored deterministically. Ignoring is never an error; a handler is
total.

| Action | IDLE | PENDING | ACTIVATING | ACTIVE | RELEASING | SETTLING | REPORTING | FINALIZING |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `ADMIT` | → PENDING | — | — | — | — | — | — | — |
| `MOVE` | — | commit sample; maybe activate | — | commit sample; `moved()` | — | — | — | — |
| `UP` | — | retire (below threshold) | — | → RELEASING | — | — | — | — |
| `CANCEL` | — | retire | abandon, no callbacks | → SETTLING (canceled) | → SETTLING (canceled) | — | — | — |
| `START_COMMITTED` | — | — | → ACTIVE | — | — | — | — | — |
| behavior tag 0 (spatial) | — | — | — | `action` envelope | — | — | — | — |
| behavior tag 1 (collection) | `action` envelope in every phase — the behavior decides per phase | | | | | | | |
| `RESOLUTION_SETTLED` | — | — | — | — | `settlement` → SETTLING | — | — | — |
| `READINESS_SETTLED` | — | — | — | — | — | release hold / replace settlement | — | — |
| `LANDING_SETTLED` | — | — | — | — | — | release hold | — | — |
| `FAILED` | — | ✔ | ✔ | ✔ | ✔ | ✔ | — | ✔ |
| `ERROR_REPORTED` | — | — | — | — | — | — | continue | — |
| `RETIRE` | — | — | — | — | — | — | — | → IDLE |

## Release ordering (D-6)

Two commits, in a fixed order the kernel owns:

```text
> UP  begin(); draft.phase = RELEASING; draft.pointerX/Y = release point
      commit()                                  ← commit 1: state matches reality
      lifetimes.motion.dispose()                ← capture released, listeners
                                                   removed, invalidation removed,
                                                   the behavior's frame task
                                                   cancelled
      begin(); spec.release.prepare(draft)      → insertion + proposal
                                                  + ResolutionCommand
      preparationValid(); commit()              ← commit 2
      spec.release.effect(current, command)     ← placeholder to the final gap,
                                                  AND the final lift render
      execute the command                       ← open resolution, or settle
                                                  immediately when `invoke` is null
                                                  (only on SEAM_COMMITTED)
```

**The final lift render is normative, not a trace embellishment.** `pointerup`
need not carry the same coordinates as the last processed `pointermove` — the
`UP` action commits the release point, and the proposal is computed from it. An
earlier draft showed the render only in the trace while the seam table and the
reference behavior moved the placeholder alone (review 6, §7), which would leave
the visual and the entire landing trajectory starting from a stale point while
the committed transaction describes a newer one. A compose or style failure here
is classified `FAILURE_RENDERER_WRITE`.

The one extra 15-field `Object.assign` per `pointerup` buys a general invariant:
**no kernel-ordered irreversible action occurs while the committed frame
describes a state that action has invalidated.** Committing `RELEASING` first
means a `release.prepare` that throws or reentrantly destroys never leaves a
committed `ACTIVE` operation with no ingress and no path forward. It cannot
return `null` — that is not expressible.

Release stability is tier **B**: the kernel closes motion between the two
commits, so nothing pending — a queued sample, a scheduled frame, an
invalidation — can alter the proposal, and the behavior has no opportunity to
sequence it wrongly.

## Queue semantics

Ported unchanged from the shipped package. Entirely kernel-private.

- **Two parallel arrays** (`actions: number[]`, `args: unknown[]`). An enqueue is
  two pushes with **no per-entry object allocation**; array capacity growth is
  amortized, so this is not literally allocation-free and is not claimed to be.
- **The drain handler and the panic callback are created once per controller.**
  The shipped `dispatch` allocates a fresh handler arrow and a fresh panic arrow
  on every *outer* dispatch (`packages/drag/src/sortable/runtime/actions.ts:151-174`).
  Since probe 2 ports the queue unchanged, this is called out as a required
  change rather than an inherited property: hoist both, or inline the drain loop.
- **FIFO.** Entries process in order; each retains its own argument.
- **Run-to-completion.** A nested `dispatch` during a drain appends and returns.
  The outermost frame owns the pass and reaches the appended entry in the same
  drain. Nested calls never interrupt an action midway.
- **Terminal latch.** `closed` is re-read every iteration, so a consumer calling
  `destroy()` from inside a callback stops the drain immediately.
- **Panic.** A throw escaping a handler is an invariant violation: clear the
  queue, tear down exactly once, then report the initiating error.
- **No internal steps are queued.** One pointer move is one action that
  validates, prepares, commits, renders and notifies — not six.
- **Behavior tags share the queue** and are offset from `BEHAVIOR_BASE` by the
  kernel, so a behavior declares `0` and `1` and never learns a kernel tag value.

Only two things coalesce: the behavior's rAF frame task and, inside it, the
single latest spatial attempt. Pointer input and collection replacement never
coalesce.

## Attempts and stale continuation rejection

| Attempt | Owner | Identity | Validated |
| --- | --- | --- | --- |
| Resolution | kernel | object | producer boundary + on `RESOLUTION_SETTLED` |
| Settlement (both gates) | kernel | object | producer boundary + on gate release |
| Spatial frame | behavior | monotonic `number` (D-11) | producer boundary + in `action.prepare` |

Identity is validated **twice** in every case: once before dispatching and again
when the queued action is applied. The two layers guard different windows — an
attempt slot may be reset at a different moment than the frame phase changes —
so both are required.

A resolution attempt still distinguishes `completed` from `settlement`:
`settlement` is the discriminated payload, cleared once consumed, so a fulfilled
`undefined` and a rejected `undefined` stay distinguishable; `completed` records
that the resolver produced a result at all. The abort guard keys off `completed`,
because keying it off the payload aborts a finished resolver's own signal.

## Failure classification

The behavior calls `host.fail(stage, error)` without an operation identity — the
kernel holds it. Stages reachable from vertical sortable, with recovery:

`ADMISSION` (none) · `ACTIVATION` (immediate) · `RENDERER_WRITE` (home) ·
`INSERTION` (home) · `PLACEHOLDER_MOVE` (home) · `INVALIDATION` (home) ·
`SCHEDULED_FRAME` (home) · `REORDER_RESOLUTION` (home) · `RELEASE` (home) ·
`LANDING_CREATE`, `LANDING_INTERRUPTED` (immediate) · `LANDING_TARGET`
(immediate; the pin is skipped but presentation is still released) ·
`PRESENTATION_READY` (immediate, settlement replaced) · `TERMINAL_CALLBACK`
(none, retire).

`stage` is typed as the closed `FailureStage` union of those constants, not a
bare `number`, so a participant cannot forge an invalid or kernel-private stage.

**`fail` is valid only inside a kernel-driven seam of the current operation.**
Because it targets "whichever operation the kernel currently holds", a late
asynchronous callback belonging to operation A could otherwise classify a
failure against operation B — which contradicts the double-validation rule the
rest of the model depends on. The kernel keeps a private `inSeam` latch that the
driver sets around every `prepare`/`effect` call; a `fail` outside one is
downgraded to a platform report and never classified. That makes the rule
tier **B** rather than discipline.

Two consequences for who gets what:

- **A feature's long-lived context carries `report(error)`, not `fail`.** A
  feature closure created at construction has no way to know which operation is
  live, so it must not be able to classify against one. Anything it throws
  synchronously inside a seam is caught and classified by the driver, at the
  stage that seam owns; anything it wants to surface asynchronously is a
  best-effort report.
- **Asynchronous work that legitimately needs to fail an operation receives an
  operation-scoped callback.** The landing runner's `fail(error)` argument is
  exactly this: it is minted per attempt and becomes inert once the attempt is
  retired.

Precedence, for one operation, highest first:

```text
DESTROY  >  CANCEL  >  FAILURE_CHECKPOINT
```

`onError` runs in `REPORTING`, exactly once per failure, and never replaces the
initiating error. A readiness rejection or timeout replaces the settlement,
keeps presentation owned, leaves `attempt.authoredReady` false, and reports
through `onError` **only** — no `onFinish` and no `onCancel` follow.
