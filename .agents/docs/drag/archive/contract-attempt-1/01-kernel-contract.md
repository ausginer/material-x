# 1. Kernel contract

The kernel is an **execution foundation**: it owns the parts of a drag that are
hard to get right and identical for every behavior — ingress, ordering,
reentrancy, identity, cancellation precedence, transactional publication,
resource lifetimes and terminal teardown.

It owns no sortable concept. It has never heard of vertical geometry,
placeholders, item collections, reorder proposals or layout animation.

## `draggable()`

```ts
type DraggableBehavior<Controller> = (kernel: Kernel) => Controller;

function draggable<Controller>(
  root: HTMLElement,
  behavior: DraggableBehavior<Controller>,
): Controller {
  return behavior(createKernel(root));
}
```

`draggable()` does exactly two things: it creates one kernel bound to one
ingress root, and it hands that kernel to the behavior, which returns the
controller. It contains no policy and no branching. (C-1)

`root` is the element the kernel attaches its `pointerdown` listener to. The
kernel guards that listener (`closed`, one-operation-at-a-time, primary press)
and then asks the behavior whether the press is admissible.

Usage:

```ts
const controller = draggable(
  list,
  sortable(items, vertical(), placeholder({ className: 'ghost' }), callbacks({ onReorder })),
);
```

## `Kernel`

The kernel handed to a behavior is a **construction-time** object. It exposes
the shared runtime, the install seam, dispatch, and the base controller methods.
Nothing on it is looked up per pointer move.

```ts
type Kernel = Readonly<{
  /** The one authoritative runtime object. The behavior extends it in place. */
  runtime: KernelRuntime;

  /** The owning document/window. Every DOM access goes through it. */
  realm: DOMRealm;

  /** The ingress boundary passed to `draggable()`. */
  root: HTMLElement;

  /**
   * Hands the kernel the behavior's direct operations. Called exactly once,
   * during behavior construction, before any input can be admitted.
   */
  install<Frame extends KernelStateFrame>(spec: KernelSpec<Frame>): void;

  /** Appends one action. Kernel and behavior tags share the queue. */
  dispatch(action: number, argument: unknown): void;

  /** Base controller methods the behavior spreads into its own controller. */
  cancel(reason?: unknown): void;
  destroy(): void;

  /** Opens the reusable draft over the committed frame. */
  begin(): KernelStateFrame;
  /** Publishes the draft by swapping the two frame references. Cannot throw. */
  commit(): void;

  /** Whether an in-flight preparation for `operation` may still publish. */
  preparationValid(operation: OperationIdentity): boolean;
  /** Whether `operation` is still the committed operation. */
  isCurrent(operation: OperationIdentity | null): boolean;

  /** Classified failure. Always queued, never thrown at the producer. */
  fail(operation: OperationIdentity | null, cause: FailureCause, error: unknown): void;

  /** Opens consumer resolution for the committed proposal. */
  resolve(resolver: ResolutionInvoker): void;
}>;
```

`begin()` and `commit()` are typed against the kernel frame; the behavior
re-declares them at its own frame type through the runtime projection described
in [artifact 4](04-runtime-ownership.md). There is no runtime cost — they are the
same two functions over the same two references.

## `KernelSpec` — the behavior's direct operations

This is the whole behavior→kernel surface. The kernel calls these directly. It
never emits an event, never receives an effect description, and never routes a
result message back.

```ts
type KernelSpec<Frame extends KernelStateFrame> = Readonly<{
  /* ---- frame ---- */

  /** Both frames come from here, so they share one shape and one hidden class. */
  createFrame(): Frame;
  /** Clears every reference-bearing field, preserving the fixed shape. */
  resetFrame(frame: Frame): void;

  /* ---- admission ---- */

  /** Activation travel in viewport pixels. Kernel owns the distance test. (C-13) */
  threshold: number;

  /** Which lift strategy the kernel acquires at activation. */
  liftMode: LiftMode;

  /** Bound on the authored-presentation gate, in ms. Default 500. (C-11) */
  readinessTimeout: number;

  /**
   * Called synchronously inside the native `pointerdown` dispatch, after the
   * kernel's own guards pass, with the draft already open. The behavior resolves
   * its subject and writes its `PENDING` fields; returning `false` abandons the
   * transition and leaves the controller idle.
   *
   * `composedPath()` and `preventDefault()` are valid only here, which is why
   * this seam runs in the listener rather than from the queue.
   */
  admit(event: PointerEvent, next: Frame): boolean;

  /* ---- activation ---- */

  /**
   * Acquire and publish behavior-owned temporary presentation, and write the
   * `ACTIVATING` draft. The kernel has already acquired the lift, the origin
   * rect and pointer capture, and has opened the transition.
   *
   * Returns `false` after reporting its own failure or after a reentrant cancel
   * invalidated preparation. Everything the behavior acquires stays local until
   * it returns `true`.
   */
  activate(): boolean;

  /** Notify the consumer that the operation started. Kernel owns the checkpoint. */
  notifyStart(): void;

  /* ---- active ---- */

  /**
   * The committed pointer sample changed. Write the DOM and schedule whatever
   * derived work the behavior coalesces. This is the hot path: it must not
   * allocate.
   */
  moved(): void;

  /* ---- release ---- */

  /**
   * Motion ingress is closed, the release point is committed and the phase is
   * `RELEASING`. Measure synchronously, commit exactly one proposal, then call
   * `kernel.resolve()`. Nothing queued before this point can still change the
   * result.
   */
  release(): void;

  /**
   * Turn a settled, explicit consumer resolution into the committed outcome.
   * The behavior writes its own `domain` field on the draft and returns the
   * kernel-visible classification.
   */
  classify(resolution: Resolution, next: Frame): Settlement;

  /* ---- settlement ---- */

  /**
   * Start the landing gate for `recovery`, or return `false` when there is
   * nothing to animate — in which case the kernel opens the gate immediately.
   */
  startLanding(recovery: SettlementRecovery): boolean;

  /** Terminal notification, after temporary presentation has been released. */
  notifyTerminal(): void;

  /* ---- teardown ---- */

  /** Release behavior-owned per-operation resources. Idempotent, best-effort. */
  retire(): void;

  /** Handle one behavior-owned action tag. Kernel tags never reach it. (C-2) */
  handleAction(action: number, argument: unknown): void;
}>;
```

Twelve operations and three configuration scalars. Each is justified by
something vertical sortable actually needs; none was added for a behavior that
does not exist. Artifact 9 records which of them a free-drag behavior would
strain.

## Phases

```ts
const IDLE = 0;       // No operation. The only phase that admits input.
const PENDING = 1;    // Admitted; below the activation threshold.
const ACTIVATING = 2; // Presentation acquired and committed; onStart in flight.
const ACTIVE = 3;     // Live, tracking input.
const RELEASING = 4;  // Input closed, geometry final, consumer resolving.
const SETTLING = 5;   // Outcome committed; awaiting the landing and readiness gates.
const REPORTING = 6;  // onError in flight.
const FINALIZING = 7; // Presentation released; terminal callback in flight.
```

Kept verbatim from the shipped machine (C-15). Only kernel lifecycle handlers
write `phase`. A behavior seam that wants a phase change asks for it by
returning, not by assigning.

## The action table

The kernel owns the tags and the switch. Behavior tags begin at
`BEHAVIOR_ACTION` and fall through to `spec.handleAction`. (C-2)

| Tag | Owner | Argument | Raised by |
| --- | --- | --- | --- |
| `ADMIT` | kernel | admitted-press record | `pointerdown` listener, after `spec.admit` |
| `MOVE` | kernel | native `PointerEvent` (by reference) | motion ingress |
| `UP` | kernel | native `PointerEvent` (by reference) | motion ingress |
| `CANCEL` | kernel | `CancelRequest` | `Escape`, `pointercancel`, `controller.cancel()` |
| `START_COMMITTED` | kernel | `OperationIdentity` | activation checkpoint |
| `RESOLUTION_SETTLED` | kernel | `ResolutionAttempt` | consumer resolver |
| `READINESS_SETTLED` | kernel | `ReadinessAttempt` | readiness watch |
| `LANDING_SETTLED` | kernel | `LandingAttempt` | landing runner |
| `FAILED` | kernel | `FailureRecord` | any classified failure |
| `ERROR_REPORTED` | kernel | `OperationIdentity` | `onError` checkpoint |
| `RETIRE` | kernel | `OperationIdentity` | terminal-callback checkpoint |
| `BEHAVIOR_ACTION + 0` | sortable | spatial attempt (`number`) | coalesced rAF task |
| `BEHAVIOR_ACTION + 1` | sortable | `CollectionSnapshot` | `controller.updateItems()` |

Vertical sortable needs **two** behavior tags. That number is the evidence the
kernel/behavior boundary sits in the right place; a behavior that needed ten
would mean the kernel had failed to own the skeleton.

### Queue semantics

Ported unchanged from `packages/drag`, because they are the guarantees the brief
requires and they are already proven:

- **Two parallel arrays** (`actions: number[]`, `args: unknown[]`). An enqueue is
  two pushes and no allocation.
- **FIFO.** Entries process in order; each retains its own argument.
- **Run-to-completion.** A nested `dispatch` during a drain appends and returns.
  The outermost frame owns the pass and reaches the appended entry in the same
  drain. Nested calls never interrupt an action midway.
- **Terminal latch.** `closed` is re-read every iteration, so a consumer calling
  `destroy()` from inside a callback stops the drain immediately.
- **Panic.** A throw escaping a handler is an invariant violation: clear the
  queue, tear the controller down exactly once, then report the initiating error.
- **No internal steps are queued.** One pointer move is one action that
  validates, prepares, commits, renders and notifies — not six.

Only two things coalesce: the behavior's rAF frame task and, inside it, the
single latest spatial attempt. Pointer input and collection replacement never
coalesce.

## Transaction primitives

```ts
type KernelStateFrame = {
  phase: number;
  operation: OperationIdentity | null;
  item: HTMLElement | null;
  visual: HTMLElement | null;
  pointerId: number;
  originX: number;
  originY: number;
  pointerX: number;
  pointerY: number;
  outcome: number;
  recovery: number;
  landingDone: boolean;
  readyDone: boolean;
};
```

`current` is committed truth. `draft` is a reusable candidate. A transition is
`Object.assign(draft, current)` → mutate → swap references. No transition
allocates a state object.

**The shallow-copy contract holds.** Every frame field must be a scalar, an
immutable value, or replace-on-write. Collections, caches, disposer stacks and
attempt records live on the runtime container, outside the frames. Both frames
are built by one factory so they share a key set and a hidden class; no
phase-specific property is ever added dynamically.

**Every substantial action is three stages** — prepare (validation, pure
calculation, DOM reads, *local* acquisition), commit (short, effectively
non-throwing: publish leases then swap), post-commit effects (DOM writes,
lifetime closes, continuations, callbacks). Preparation must not mutate
`current`. Ownership transfers only at the commit point; a partial acquisition
rolls back locally in reverse order and publishes nothing.

## Resource lifetimes

Five, in release order. The kernel owns all five.

| # | Lifetime | Contents | Closed at |
| --- | --- | --- | --- |
| 1 | Controller ingress | `pointerdown` on `root` | `destroy()` / panic |
| 2a | Motion ingress | pointer move/up/cancel, pointer capture, scroll + resize invalidation, the behavior's frame task | **release** |
| 2b | Cancellation & resolution | `Escape` listener, `cancel()` admissibility, the guarded abort for the current resolution attempt | resolver settles, or settlement entry |
| 3 | Temporary presentation | lift, style snapshot, behavior-registered presentation disposers (the placeholder) | finalization, after both gates |
| 4 | Async attempts | resolution, readiness, landing, spatial | per-attempt retirement |

**2a and 2b must stay separate.** Release closes motion so nothing can move the
geometry the proposal was resolved from, while cancellation stays armed so a
consumer can still abandon an unresolved drop. Sharing one signal would abort
the resolver's signal the instant `onReorder` opened.

A `Lifetime` is an `AbortSignal`, a disposer stack and a latched `dispose()`.
`use(disposer)` registers unconditionally; `useWhile(guard, disposer)` registers
a disposal that runs only if the guard still holds. Disposal aborts the signal,
then unwinds LIFO and best-effort — one disposer throwing is reported and does
not stop the rest. `dispose()` is latched, so teardown paths run unconditionally
and in any order.

There is one release shape in the package: `Disposer = () => void`. A pointer
capture, a style snapshot, a top-layer entry and a readiness watch all hand back
the same type.

## Async attempt identity

An attempt is a plain record on the runtime, compared by identity — object
identity for resolution/readiness/landing, a monotonic `number` for the
coalesced spatial attempt (C-8).

Identity is validated **twice**: once at the producer boundary before
dispatching, and again when the queued action is applied. The two layers guard
different windows — an attempt slot may be reset at a different moment than the
frame phase changes — so both are required.

A resolution attempt distinguishes `completed` from `settlement`:

- `settlement` is the discriminated payload, **cleared once consumed**, so a
  fulfilled `undefined` and a rejected `undefined` stay distinguishable;
- `completed` records that the resolver produced a result at all.

The abort guard keys off `completed`. Keying it off the payload would abort a
finished resolver's own signal.

## What the kernel guarantees

A behavior author receives, without writing any of it:

- native input admitted into a controlled boundary;
- FIFO run-to-completion dispatch and defined reentrant behavior;
- one active operation per controller and phase legality;
- operation identity and stale-continuation rejection;
- cancellation precedence and a first-valid-cancel-wins latch;
- destruction as a synchronous terminal barrier;
- transactional state publication with local rollback;
- three named resource-lifetime stages;
- attempt identity, retirement and double validation;
- the two settlement gates and the readiness timeout policy;
- panic teardown;
- `cancel()` and `destroy()`.
