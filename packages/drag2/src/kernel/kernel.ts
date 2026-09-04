/**
 * The kernel executor: admission → activation → move → release → teardown.
 *
 * Every field below is `#private`. There is no exported container and nothing a
 * behavior can read that the kernel did not deliberately grant it. What the
 * kernel holds of the behavior is **one `spec` reference**; what the behavior
 * holds is this kernel under {@link BehaviorContext}, whose seven members
 * include none that drives a transition.
 */
import {
  ACTIVATE,
  BEHAVIOR_BASE,
  CANCEL,
  ERROR_REPORTED,
  FAILED,
  MOVE,
  RELEASE,
  RESOLUTION_SETTLED,
  RETIRE,
  START_COMMITTED,
  UP,
} from './actions.ts';
import { DraggableError, DraggableWarning, type Notify } from './errors.ts';
import { ExecutionBracket } from './execution.ts';
import {
  AT_CONSUMER,
  AT_PROPOSAL,
  CANCEL_ABORTED,
  CANCEL_INTERRUPTED,
  CANCEL_SUPPLIED,
  type CancelOrigin,
  type CancelStage,
  FAILURE_ACTIVATION,
  FAILURE_ADMISSION,
  FAILURE_ACTION_PREPARE,
  FAILURE_ACTION_EFFECT,
  FAILURE_RELEASE,
  FAILURE_RENDERER_WRITE,
  FAILURE_RESOLUTION,
  FAILURE_TERMINAL_CALLBACK,
  type FailureStage,
} from './failures.ts';
import { frame, type Frame, type OperationIdentity } from './frames.ts';
import {
  createOperationLifetimes,
  type OperationLifetimes,
} from './lifetimes.ts';
import {
  ACTIVATING,
  ACTIVE,
  FINALIZING,
  IDLE,
  PENDING,
  RELEASING,
  REPORTING,
  SETTLING,
  type Phase,
} from './phases.ts';
import {
  acquirePointerCapture,
  armCancelInput,
  armPointerInput,
  isPrimaryPress,
} from './pointer.ts';
import {
  acquireLift,
  type InheritedSpace,
  type VisualLiftSession,
} from './presentation.ts';
import {
  CLICK,
  LOST_POINTER_CAPTURE,
  POINTER_CANCEL,
  POINTER_DOWN,
  POINTER_MOVE,
  POINTER_UP,
} from './protocol.ts';
import { createRealm, type DOMRealm } from './realm.ts';
import {
  SeamDriver,
  runActivationSeam,
  runReleaseSeam,
  SEAM_COMMITTED,
  type SeamContext,
  type SeamOutcome,
  type Transition,
} from './seams.ts';
import {
  type ActivationScope,
  type AdmissionSubject,
  type BehaviorContext,
  type BehaviorSpec,
  type ResolutionCommand,
  SETTLED_CANCELED,
  SETTLED_FAILED,
  SETTLED_FULFILLED,
  SETTLED_REJECTED,
  SETTLED_SKIPPED,
  type SettlementInput,
} from './spec.ts';
import type { OffsetBox } from './types.ts';
import { createUnwind } from './unwind.ts';

/**
 * What the kernel reads off a queued pointer event — and the one thing it calls
 * on it.
 *
 * The native event is queued **by reference** under this narrow contract and is
 * not retained past the drain, so one pointer sample allocates no wrapper.
 *
 * `preventDefault` sits beside the three scalars because the pointer path
 * prevents at the activation threshold crossing, and the crossing is decided
 * here, from the sample. The drain is synchronous inside the native listener,
 * so the call is still in time; a sample that never crosses never uses it.
 */
export type PointerCoordinates = Readonly<{
  pointerId: number;
  clientX: number;
  clientY: number;
  preventDefault(): void;
}>;

/**
 * The consumer round-trip, as a kernel-private record.
 *
 * `completed` and `settlement` are deliberately separate: `settlement` is the
 * discriminated payload and is cleared once consumed, so a fulfilled
 * `undefined` and a rejected `undefined` stay distinguishable, while
 * `completed` records only that the resolver produced a result at all. The
 * guarded abort keys off `completed`, because keying it off the payload would
 * abort a finished resolver's own signal.
 */
type ResolutionAttempt = {
  completed: boolean;
  settlement: SettlementInput | null;
};

/**
 * The open settlement's identity, and the one measurement it took.
 *
 * It lives here rather than on the transactional frame because nothing outside
 * {@link Kernel}'s settlement helpers reads it, it is unobservable, and
 * it is per-settlement rather than per-operation. **Holding it is what makes
 * staleness answerable by identity**: everything between the measurement and
 * the join runs behavior code, and a settlement that has been replaced in the
 * meantime is a different object rather than a different flag.
 */
type SettlementAttempt = {
  /**
   * **The one authoritative landing target, measured once.** The serial
   * authored commit guarantees the authored DOM is final before this is taken,
   * so there is no interval in which a target is provisional. This pair is
   * where the drop ends, and the tail is the inverse of the delta between it
   * and where the visual was.
   *
   * **`null` on the X carries the absence.** A skipped measurement is what
   * tells the join to release without a tail, and the two coordinates are
   * written and read as one act — so the sentinel sits on the first of them
   * rather than in a third slot. It is `=== null` and never truthiness: `0` is
   * an ordinary abscissa.
   */
  targetX: number | null;
  targetY: number;
};

/**
 * Everything one operation owns, from admission to retirement.
 *
 * **Complete at construction.** Every ordinary field is filled in the literal
 * `mintOperation` builds and is never assigned again, so retirement drops the
 * record rather than remembering which slots to clear — a field added here is
 * cleared by construction. `cancelRequest` is the single exception and it is a
 * latch: the first valid cancel per operation wins, and it may not outlive the
 * operation it latched.
 *
 * **Kernel-local.** It appears in no signature, no queue argument and no
 * captured callback. {@link OperationIdentity} travels instead, and every
 * guard authorises work by comparing that one-field object against the frame's
 * — so stale work never has to hold this.
 */
type OperationRecord = {
  readonly visual: HTMLElement;
  /**
   * The geometry source. Read before `acquireLift`, never transactional — the
   * same argument that keeps the measured landing target on the settlement
   * attempt rather than on the frame, so the kernel's published slice stays
   * seven fields.
   */
  readonly box: HTMLElement;
  /**
   * The element the operation is about. Read only by `acquireLift`, which
   * needs the space above it.
   */
  readonly item: HTMLElement;
  /**
   * Non-nullable, which fixes the construction order — the lifetimes exist
   * before the record does — and makes `if (operation)` the whole test for
   * whether there is anything to dispose.
   */
  readonly lifetimes: OperationLifetimes;
  cancelRequest: { reason: unknown; origin: CancelOrigin } | null;
};

/**
 * What the successful activation transaction adds, as a record of its own.
 *
 * **A second lifetime, not three fields left null until activation.**
 * Activation runs in a later transaction than admission and may fail with the
 * operation still alive, so folding these in would mean a record built partial
 * in one function and completed in another. Apart, each record is complete
 * where it is constructed.
 *
 * **Complete-or-absent, and that is the whole of the invariant.** Presence
 * means the activation transaction acquired these resources — not that the
 * operation reached a lifecycle state. `acquireActivation` can throw after
 * this record is assigned, and `activation.effect` runs later still and may
 * fail in its turn, so a live operation can hold a complete record whose
 * effect never ran, and hold it until retirement.
 *
 * Nullable rather than discriminated, and never a second lifecycle authority:
 * `phase` on the frame is the sole lifecycle discriminant and it is the one
 * published to behaviors. Read this record for what activation acquired,
 * never for where the operation is.
 *
 * **`Record` in both names** because `Activation` is the behavior's activation
 * payload, the type parameter this kernel is generic in.
 */
type ActivationRecord = Readonly<{
  /** The visual's viewport rect at grab. The basis every clamp is relative to. */
  originRect: DOMRectReadOnly;
  lift: VisualLiftSession;
  /**
   * The inverse of the linear part the visual inherited at grab, **retained
   * for the join**. The tail is written on the visual after it is back in
   * flow, so the delta it travels is a local one and this is what maps it:
   * four numbers or `null`, read once at activation and never re-read.
   *
   * The item's space is deliberately not retained. Which element a translate
   * is written on decides which space it is spent in, and the tail's element
   * is the visual.
   */
  visualSpace: InheritedSpace;
}>;

/** The queued classified failure. One object per failure — not a hot path. */
type FailureCheckpoint = Readonly<{
  stage: FailureStage;
  error: unknown;
  operation: OperationIdentity;
}>;

/**
 * **The attempt lifetime, as a record.**
 *
 * Three correlated slots, minted per round-trip and cleared together. They are
 * grouped because a class has one flat namespace for instance state: on `this`
 * a slot that lives for one settlement and a slot that lives for the
 * controller read identically, and the record is what keeps the difference
 * legible where a field list could not.
 */
type AttemptSlots = {
  resolution: ResolutionAttempt | null;
  settlement: SettlementAttempt | null;
  /** The input the open settlement seam is driving. Seams are non-reentrant. */
  settlementInput: SettlementInput | null;
};

/** No phase stamp is pending. Phases are non-negative. */
const NO_STAMP = -1;

/**
 * The armed-stamp slot's type. The sentinel is outside the union deliberately —
 * it is the *absence* of a phase, not a ninth one — and the `!== NO_STAMP` test
 * already at the one write site is what narrows it away.
 */
type ArmedStamp = Phase | typeof NO_STAMP;

/**
 * Reads `then` **exactly once** and hands back the callable, or `null`.
 *
 * The resolution round-trip may answer with any `PromiseLike`, not only a
 * native `Promise`, so `then` may be an accessor — one that throws, or one that
 * answers differently on a second read. Reading it twice (once to classify,
 * once to subscribe) would let a value be classified as thenable and then
 * subscribed to as something else. A throw is the *caller's* to classify as a
 * semantic failure; it is not a kernel invariant violation and must never reach
 * the panic path.
 *
 * **One caller**, and the property is what makes the single read sufficient:
 * the resolution round-trip is the only place a consumer-supplied value is
 * accepted as a thenable, so this is the only `then` the kernel ever reads.
 * Every other continuation the kernel awaits is a promise it allocated itself.
 *
 * A module function rather than a member: it reads no kernel state, so binding
 * it to an instance would say it did.
 */
const thenOf = (value: unknown): PromiseLike<unknown>['then'] | null => {
  // Detached deliberately, and read exactly once for the reason above. The
  // receiver is re-supplied at the only call: `then.call(value, …)`.
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const then = (value as PromiseLike<unknown> | null | undefined)?.then;

  return typeof then === 'function' ? then : null;
};

/**
 * **The kernel controller.** It owns the frame pair, ingress, the action queue,
 * the seam driver, the operation and activation records, the attempt slots,
 * teardown and the destroy promise.
 *
 * **A behavior receives this object under {@link BehaviorContext}**, which is
 * the whole of what the tier is granted: `arm` is on the class and off the
 * interface, so a behavior reaches it only by deliberately leaving the type it
 * was handed. That is a contract term rather than a runtime property, and it
 * is stated the way the neighbouring one is — *no input can be admitted before
 * `install()` returns* is unenforceable too, and is written down rather than
 * guarded.
 *
 * Only `draggable()` holds it wide, and it calls `arm()` exactly once.
 */
export class Kernel<
  Part extends object,
  Activation extends {} = true,
> implements BehaviorContext {
  /** The owning document/window. Every DOM access goes through it. */
  readonly realm: DOMRealm;

  /** The ingress boundary passed to `draggable()`. */
  readonly root: HTMLElement;

  /* ---- the execution bracket ---- */

  /**
   * The terminal latch, the queue and its semantics, and deferred teardown, in
   * the one entity that states their invariants. `#private`, so the kernel's
   * public surface is unchanged by holding it.
   *
   * Its four callbacks are the only edges back into the kernel, and each is
   * allocated once per controller: the per-action and per-sample paths through
   * the bracket allocate nothing.
   */
  readonly #bracket = new ExecutionBracket(
    (action, argument) => {
      this.#handle(action, argument);
    },
    (error) => {
      this.#panic(error);
    },
    () => {
      this.#runPhysicalTeardown();
    },
    () => {
      this.#begin();
    },
  );

  readonly #ingress = new AbortController();

  #spec: BehaviorSpec<Part, Activation> | null = null;
  #current!: Frame<Part>;
  #draft!: Frame<Part>;
  #nextOperationId = 0;

  /* ---- per-operation state, two records dropped whole at retirement ---- */
  #operation: OperationRecord | null = null;
  #activation: ActivationRecord | null = null;

  /**
   * **The attempt lifetime, named rather than spread across three fields.**
   *
   * `this` is one flat namespace, so a slot that lives for one round-trip and
   * a slot that lives for the controller read identically once both are on it.
   * These three do not: they are minted per attempt, correlated, and cleared
   * together, and the record is what says so where a field list could not.
   */
  readonly #attempts: AttemptSlots = {
    resolution: null,
    settlement: null,
    settlementInput: null,
  };

  /**
   * The operation the open transaction belongs to, captured at `begin()`.
   * `preparationValid()` compares against it rather than against a mutable
   * "current operation" field, so a reentrant retirement between `begin` and
   * `commit` is visible as an identity change.
   */
  #pinned: OperationIdentity | null = null;

  /* ---- the one channel ---- */

  /**
   * **Every fault the library surfaces leaves through here.** One function,
   * three jobs, and nothing else:
   *
   * 1. **Refuse after logical closure.** Consumer code inside `onError` may
   * call `destroy()`, and a resolver that destroys and *then* throws would
   * otherwise have its own destruction reported back to it through a declared
   * slot — a callback after `destroy()` returned, which the floor forbids
   * outright. **The refusal lives here alone**: open-coded pre-guards at the
   * admission catch, the quality report and the landing join would be three
   * copies of it to keep in step.
   * 2. **Hand the finished error to the behavior**, which forwards it to
   * `onError` and does nothing else. Before `arm()` there is no behavior and
   * nothing is delivered — which is correct rather than a gap, since a consumer
   * with no controller has no handler either.
   * 3. **Discard whatever that throws.** *This is the terminus.* A throw from
   * the channel is never re-notified, and that single discard is the whole of
   * what makes the channel non-recursive. It is also what lets the fourteen
   * `unwind` sites stay total without knowing anything about reporting: their
   * catch calls this, and this cannot throw.
   *
   * `afterClose` is `panic`'s named exception and has exactly one caller. It is
   * a parameter rather than a second function so that the refusal and the
   * exception to it are read together.
   *
   * **The stage is deliberately absent.** Three sites reach this holding a real
   * `FailureStage` and discard it — the demoted checkpoint, `failOperation`'s
   * five-guard demotion, and a {@link Kernel.fail} outside a seam. In each the stage
   * describes a classification the kernel has just decided **not** to apply, so
   * carrying it into a warning would publish a claim about the operation that
   * the code refused to make.
   */
  #notify(error: DraggableError | DraggableWarning, afterClose = false): void {
    if (this.#bracket.closed && !afterClose) {
      return;
    }

    try {
      this.#spec?.reportError(error);
    } catch {
      // The terminus. Reporting a reporting failure is the one recursion this
      // model has to be incapable of, and being incapable is stronger than
      // being careful.
    }
  }

  /**
   * The channel as a value, for the two collaborators that take one.
   *
   * **Wrapped, not detached**: both keep it for the controller's life and call
   * it with no receiver of their own, so a bare prototype read would arrive
   * without one. One closure per kernel, shared, rather than one per call.
   */
  readonly #report: Notify = (error): void => {
    this.#notify(error);
  };

  /**
   * The unwind guard, over this controller's channel.
   *
   * One closure per kernel rather than a free function: the fourteen call sites
   * read `unwind(fn)` either way, and threading the channel's identity through
   * each of them would put reporting at every site that merely wants the next
   * statement to run.
   */
  readonly #unwind = createUnwind(this.#report);

  /**
   * True while a checkpoint's report transition is running — including its
   * `prepare`, which is *before* `REPORTING` is committed and therefore before
   * the phase alone can say so.
   */
  #reporting = false;

  /**
   * The phase the kernel stamps onto the draft between `prepare` and `commit`.
   *
   * Two seams change phase as part of their transaction — activation to
   * `ACTIVATING`, settlement to `SETTLING` — and the write is the *kernel's*,
   * made after `preparationValid()` and before the swap. The behavior cannot
   * make it: it sees `Draft<Part>`, where the kernel slice is `readonly`. A
   * private slot consumed by `commit()` keeps that ordering without widening
   * the seam driver's signature with a kernel concern.
   *
   * The slot is **armed before the seam and owned by the transaction**, which
   * is what stops a stamp outliving the transition that armed it. A discarded
   * or failed seam never reaches `commit()`, so its stamp is still set when it
   * returns; without the handover below, the next transaction to commit — an
   * admission, a pointer sample — would silently take that phase. Hence both
   * halves: {@link begin} takes the armed value and clears it, so every
   * transaction starts with exactly the stamp armed for it and no other, and
   * {@link commit} consumes it.
   */
  #armedStamp: ArmedStamp = NO_STAMP;
  #stamp: ArmedStamp = NO_STAMP;

  /** The behavior action being run. Safe as a slot: seams are non-reentrant. */
  #actionTag = 0;
  #actionArgument: unknown = null;

  constructor(root: HTMLElement) {
    this.root = root;
    this.realm = createRealm(root);
  }

  #begin(): void {
    // Reset before every transaction, armed or not.
    this.#stamp = this.#armedStamp;
    this.#armedStamp = NO_STAMP;
    this.#pinned = this.#current.operation;
    // The shallow copy that opens the transaction. Every frame field is a
    // scalar, immutable or replace-on-write precisely so this is enough.
    Object.assign(this.#draft, this.#current);
  }

  #commit(): void {
    if (this.#stamp !== NO_STAMP) {
      this.#draft.phase = this.#stamp;
      this.#stamp = NO_STAMP; // consume-and-clear
    }

    const previous = this.#current;

    this.#current = this.#draft;
    this.#draft = previous;
  }

  /**
   * Runs a seam whose commit changes phase.
   *
   * The arming is cleared in a `finally` as well, for the one window `begin()`
   * cannot cover: a seam that throws *before* opening its transaction — today
   * only the driver's re-entry refusal — would otherwise leave the stamp armed
   * for whatever begins next.
   */
  #runStamped(phase: Phase, run: () => void): void {
    this.#armedStamp = phase;

    try {
      run();
    } finally {
      this.#armedStamp = NO_STAMP;
    }
  }

  /**
   * False once a reentrant `cancel()` or `destroy()` invalidated the open
   * preparation. The cancel latch counts: a cancellation raised from inside a
   * `prepare` has already decided the operation, so publishing the preparation
   * would commit state the very next action abandons.
   */
  #preparationValid(): boolean {
    // `queue.closed` alone: a separate `destroyRequested` flag is a second name
    // for it — set on the statement after it and never cleared either — so the
    // extra conjunct is unconditionally true beside it.
    return (
      !this.#bracket.closed &&
      !this.#operation?.cancelRequest &&
      this.#current.operation === this.#pinned
    );
  }

  // -------------------------------------------------------------------------
  // Teardown
  // -------------------------------------------------------------------------

  /**
   * Step 3 of teardown: the kernel's own attempt records.
   *
   * A late resolution is inert after this: it validates against the slot it was
   * minted for, which is now empty.
   *
   * **The landing tail is not one of these.** It is controller-scoped and
   * outlives the operation deliberately — an interpolation that holds nothing
   * has no reason to end when the operation does.
   */
  #retireAttempts(): void {
    this.#attempts.resolution = null;
    this.#attempts.settlementInput = null;
    this.#attempts.settlement = null;
  }

  #scrub(target: Frame<Part>): void {
    const active = this.#spec;

    if (!active) {
      return;
    }

    // **Wrapped as one unit, and the kernel's own half goes first.** The kernel
    // returns its slice to its defaults and the behavior returns its part;
    // `resetFramePart` is behavior code the API permits to throw, and an
    // unwrapped throw on the first frame would skip the second scrub *and* the
    // ingress abort, making `destroy()` non-terminal. The kernel's own reset
    // cannot throw, so it is inside the same `unwind` with nothing to lose by
    // it.
    this.#unwind(() => {
      frame(target);
      active.resetFramePart(target);
    });
  }

  /**
   * The seven-step teardown, minus steps 1, 2 and 7 — which is exactly
   * operation retirement.
   *
   * `operation` narrows the retirement to one operation; `null` means "whatever
   * the kernel currently holds", used by paths that retire before the operation
   * was ever committed.
   */
  #retireOperation(identity: OperationIdentity | null): void {
    if (!this.#spec) {
      return;
    }

    if (identity && this.#current.operation !== identity) {
      return; // a stale retirement for an operation that is already gone
    }

    // 3. kernel attempts.
    this.#retireAttempts();

    // 4. behavior references.
    this.#unwind(this.#spec.retire);

    // 5. presentation → motion → cancellation, LIFO, best-effort. Releases
    //    pointer capture, removes the placeholder and restores inline styles.
    if (this.#operation) {
      this.#unwind(this.#operation.lifetimes.dispose);
    }

    // 6. both frames, each reset individually wrapped.
    this.#scrub(this.#current);
    this.#scrub(this.#draft);

    // **Last, and for a proof reason rather than a runtime one.** The two
    // halves are not the same claim.
    //
    // *Observable*: the records must survive steps 4 and 5. Behavior and
    // consumer code runs inside `spec.retire` and inside the disposal, and
    // `current.operation` still names the operation throughout, so every
    // guard those callbacks reach still authorises work. A drop above step 4
    // leaves such a guard reading a null record; a drop between 4 and 5 skips
    // disposal outright, because `if (operation)` is the whole test for
    // whether there is anything to dispose.
    //
    // *Structural*: past step 5 there is nothing left to observe. `scrub`
    // nulls the frame's identity before it runs anything, and the two calls
    // in between — `unwind`, which calls nothing ahead of its callback, and
    // `frame`, an `Object.assign` over a plain literal — cannot reenter. The
    // records are dropped here anyway so that
    // `current.operation !== null` ⟹ `operation !== null` holds directly
    // from statement order at every program point, which is the unchecked
    // premise of every `operation!` in this file. That is a proof and
    // maintenance property, not a window a guard could catch.
    this.#operation = null;
    this.#activation = null;
    this.#pinned = null;
  }

  /**
   * The landing tail: an additive contribution to the released visual's
   * `translate`, decaying to zero. `null` when nothing is in flight.
   *
   * **Controller-scoped, like the click suppressor, and for the same kind of
   * reason.** The tail exists *after* the operation it belongs to has ended, so
   * an operation-scoped slot would be cleared before the only thing that ever
   * reads it.
   *
   * **One slot, not a set.** Two tails can coexist in principle — drop one
   * item, drag and drop a second, and the first may still be gliding — and
   * keeping both would cost a keyed map and a removal path to preserve an
   * animation on an item the user has demonstrably stopped caring about.
   *
   * A finished animation is left in the slot rather than cleared through a
   * subscription: cancelling one is a no-op, and one retained {@link Animation}
   * on a live element is cheaper than a promise per landing.
   */
  #tail: Animation | null = null;

  /**
   * Ends the tail, if one is in flight.
   *
   * **Cancel, not finish.** The contribution decays to zero, so cancelling it
   * lands the visual exactly where flow puts it — there is no position to
   * settle and nothing to restore.
   *
   * `cancel` is a method on an object reachable from a consumer-owned element,
   * so it is unwound rather than trusted: this runs inside activation and
   * inside teardown, and both have a load-bearing next statement.
   */
  #cancelTail(): void {
    const running = this.#tail;

    if (running) {
      this.#tail = null;
      this.#unwind(() => {
        running.cancel();
      });
    }
  }

  /**
   * Steps 3–7 of teardown, invoked by the bracket once it has released its own
   * storage in step 2.
   *
   * Totality is a property of the sequence *wherever it runs*, not of the stack
   * that requested closure: each attempt cleanup is individually wrapped in
   * step 3, each frame reset in step 6, and ingress abort is in a `finally` at
   * step 7, so no behavior callback can stop a later step at the boundary any
   * more than it could on the closing stack.
   */
  #runPhysicalTeardown(): void {
    try {
      // 3–6.
      if (this.#spec) {
        this.#retireAttempts();
        this.#unwind(this.#spec.retire);

        if (this.#operation) {
          this.#unwind(this.#operation.lifetimes.dispose);
        }

        this.#scrub(this.#current);
        this.#scrub(this.#draft);
      }

      // Last, for both reasons `retireOperation` states: the records have to
      // outlive steps 4 and 5, and dropping them after the scrubs rather than
      // before is what keeps the frame-identity implication true by order.
      this.#operation = null;
      this.#activation = null;
      this.#pinned = null;
    } finally {
      // 7. unconditional: no earlier step can prevent ingress from being
      //    released, and none may leave a tail interpolating on an element the
      //    controller has stopped owning. Both are controller-scoped, and the
      //    click suppressor is disarmed by the abort's own signal.
      this.#cancelTail();
      this.#ingress.abort();
    }
  }

  /**
   * Step 1 of teardown: the latch, which the bracket sets on the closing
   * statement itself. Steps 3–7 come back through the teardown callback, either
   * immediately or at the outermost transaction boundary.
   *
   * This call does not promise that physical release completes before it
   * returns — only that the latch is set, and the resource release may be one
   * transaction late.
   */
  destroy(): Promise<void> {
    return this.#bracket.close();
  }

  /**
   * A throw escaping a handler is an invariant violation: close, **then**
   * report the initiating error, **then** tear down.
   *
   * **Delivering that report after logical closure is non-soliciting**, which
   * is the property that admits it: a terminal diagnostic *tells* the consumer
   * something and asks nothing of them. It discharges an obligation that
   * predates the close rather than one the close created — the fault escaped
   * `handle`, so it is the *reason* for the closure and not its product, and
   * there is no other route left to account for it; nothing the kernel does
   * next is conditioned on the call; it publishes no lifecycle or domain event
   * and ignores its return; and it is wrapped. Which sites share that property
   * is not this comment's to count — that list is maintained where the
   * exception is stated, and `notify` refuses every site that fails it.
   *
   * Reporting first and destroying second would run consumer code on a
   * controller whose invariants are *already known to be broken*, with the
   * added hazard that the consumer may start work the next statement tears
   * down. Closing first is the more predictable of the two.
   *
   * **Panic is consequential and carries no stage.** It destroys the whole
   * controller rather than one operation, so it is a `DraggableError`; and
   * `FailureStage` classifies faults *within* an operation, so there is nothing
   * to classify. The stage is `null`, which means *the controller is destroyed*
   * and means nothing else. A catch-all value standing in for the one the type
   * cannot hold would cost the distinction that matters here — a panicked
   * controller and a failed `requestAnimationFrame` would become
   * indistinguishable to a consumer.
   */
  #panic(error: unknown): void {
    void this.destroy();
    this.#notify(new DraggableError(null, error), true);
  }

  /**
   * Latched cancellation. The first valid cancel per operation wins, and an
   * idle cancel is a no-op that leaves no latch. The latch is what makes a
   * cancellation raised from inside a seam invalidate that preparation
   * synchronously, which matters most when the caller is `onStart`.
   */
  #cancelWith(reason: unknown, origin: CancelOrigin): void {
    if (
      this.#bracket.closed ||
      !this.#current.operation ||
      this.#operation!.cancelRequest
    ) {
      return;
    }

    this.#operation!.cancelRequest = { reason, origin };
    this.#bracket.dispatch(CANCEL, this.#current.operation);
  }

  /**
   * The kernel's own cancel, and the only one a consumer or a behavior can
   * reach. Everything arriving here is `CANCEL_SUPPLIED`: a behavior's
   * controller publishes a closure over this call, so the kernel has no basis
   * to tell the two callers apart — and a supplied value is what both of them
   * are.
   */
  cancel(reason?: unknown): void {
    this.#cancelWith(reason, CANCEL_SUPPLIED);
  }

  /**
   * Queues a classified failure against the operation the kernel currently
   * holds. A failure with no live operation — and a failure of the report
   * itself — has no checkpoint to run and degrades to a platform report.
   */
  #failOperation(stage: FailureStage, error: unknown): void {
    const identity = this.#current.operation;

    // A checkpoint queued while a report is in flight could only be dropped by
    // `handleFailed`'s own `REPORTING` guard, which would swallow the error
    // outright. `onError` runs exactly once per failure and never replaces the
    // initiating error, so the second one takes the non-consequential channel
    // instead of a second turn at deciding the operation. It is not a panic: a
    // behavior that fails to map or surface a failure is not an invariant
    // break, and the operation still retires.
    //
    // `reporting` spans the whole report transition. The phase test is
    // unreachable today — `REPORTING` is entered and left inside one drain, so
    // nothing asynchronous can observe it — and is kept only so that making
    // `ERROR_REPORTED` asynchronous later cannot silently reopen the swallow.
    //
    // A held cancel latch outranks the checkpoint outright, under the
    // precedence `DESTROY > CANCEL > FAILURE_CHECKPOINT`. The latch is set
    // synchronously and consumed by `handleCancel` before the cancellation
    // settlement opens, so "still held" means the queued `CANCEL` has not run
    // yet and the operation's terminal channel is already decided as
    // *canceled*. Without this, a seam that cancels and then throws — `moved()`
    // calling `controller.cancel()` and failing on the same sample — queues
    // `CANCEL` then `FAILED`; the cancellation finalizes and queues `RETIRE`,
    // and the checkpoint still runs ahead of it at `FINALIZING`, so the
    // consumer gets both `onCancel` and `onError` for one operation.
    if (
      this.#bracket.closed ||
      !identity ||
      this.#operation!.cancelRequest ||
      this.#reporting ||
      this.#current.phase === REPORTING
    ) {
      // **Demoted rather than dropped.** The `return` is what decides: the
      // terminal is already owned by whatever is in flight, so this
      // classification is refused and the fault travels without one. The
      // `stage` in hand is discarded for exactly that reason.
      this.#notify(
        new DraggableWarning('drag: failure/not-classified', { cause: error }),
      );
      return;
    }

    // Dispatched, not merely enqueued. A failure raised inside a seam appends
    // to the drain that is already running, but one raised from an *async*
    // continuation is the outermost frame, and nothing else would ever drain
    // it.
    this.#bracket.dispatch(FAILED, {
      stage,
      error,
      operation: identity,
    } satisfies FailureCheckpoint);
  }

  /**
   * **Wrapped, not detached.** The driver holds this record for the
   * controller's life and calls each member with no receiver of its own, so a
   * bare prototype read would arrive without one. The closures are what carry
   * it, and the lint gate is what would have caught the bare reads.
   */
  readonly #context: SeamContext<Part> = {
    begin: () => {
      this.#begin();
    },
    commit: () => {
      this.#commit();
    },
    preparationValid: () => this.#preparationValid(),
    readCurrent: () => this.#current,
    readDraft: () => this.#draft,
    fail: (stage, error) => {
      this.#failOperation(stage, error);
    },
    /**
     * **The driver reports without classifying.** Not `failOperation`, which
     * would settle a drop whose reorder already happened; and there is no
     * second destination to choose between — a separate platform reporter would
     * receive a consumer's own destructive rerender — which is what lets the
     * `QUALITY` and `BEST_EFFORT` tiers collapse into one sentinel.
     *
     * There is no lifetime guard at this site, and adding one here is wrong:
     * the guard belongs in `notify`, where every route shares it. A quality
     * fault's producer is consumer-reaching — a `home` resolver, a landing
     * policy — and is equally free to destroy before it throws.
     */
    notify: (error) => {
      this.#notify(error);
    },
  };

  readonly #driver = new SeamDriver<Part>(this.#context);

  /**
   * Drops whatever a seam staged, for the seams the kernel drives directly.
   *
   * Both the settlement and the failure report stage a sentinel that the
   * seam's `effect` consumes and nothing reads afterwards. Leaving
   * them in the driver's slot would let the *next* seam to commit without
   * staging anything hand a caller a plan belonging to a transaction that is
   * over — which is the whole reason the slot is consume-and-clear.
   */
  #dropStaged(): void {
    this.#driver.consumeStaged();
  }

  // -------------------------------------------------------------------------
  // Admission — native dispatch, not queued
  // -------------------------------------------------------------------------

  #onPointer(event: PointerEvent): void {
    // The producer-side half of the double validation; the handler checks the
    // pointer identity again against the committed frame.
    if (event.pointerId !== this.#current.pointerId) {
      return;
    }

    switch (event.type) {
      case POINTER_MOVE:
        this.#bracket.dispatch(MOVE, event);
        break;
      case POINTER_UP:
        this.#bracket.dispatch(UP, event);
        break;
      // **Two DOM spellings of one fact** — the pointer stream ended without a
      // drop — so they share an arm rather than being told apart. The platform
      // detail is what the kernel exists to absorb, and the consumer is handed
      // the fact instead.
      case POINTER_CANCEL:
      case LOST_POINTER_CAPTURE:
        this.#cancelWith(undefined, CANCEL_INTERRUPTED);
        break;
      default:
        break;
    }
  }

  /**
   * The two input handlers as values, bound once per kernel rather than once
   * per operation. **Wrapped, not detached**: `armPointerInput` and
   * `armCancelInput` install them as listeners, which call with the event
   * target as the receiver.
   */
  readonly #pointerHandler = (event: PointerEvent): void => {
    this.#onPointer(event);
  };

  readonly #escapeHandler = (): void => {
    this.#onEscape();
  };

  #onEscape(): void {
    this.#cancelWith(undefined, CANCEL_ABORTED);
  }

  /**
   * Runs one admission member and returns the subject it admitted, or `null`.
   *
   * Shared by both ingresses, because a second input mode is a second
   * *ingress*, not a second protocol: the throw policy, the `preventDefault()`
   * ownership and the post-callback revalidation are one rule each, in one
   * place.
   *
   * **`preventDefault()` is the kernel's.** The behavior answers feasibility
   * with its return value; the ingress owner performs the browser effect. A
   * behavior *can* still prevent the default itself, because it holds the
   * event, and nothing here refuses that.
   *
   * **`prevents` is where the two ingresses stop being the same.** The
   * ownership is the same on both and the *timing* is not: the pointer path
   * prevents at the threshold crossing instead, because `pointerdown` cannot
   * know intent. The command path prevents here, and that is sound rather than
   * an exception — a `keydown` default cannot be prevented after its listener
   * has returned, there is no threshold on that path to relocate to, and a
   * command's admission *is* the intent question, so a non-null return already
   * means the key was meant for the drag.
   */
  #runAdmission(
    event: Event,
    admit: (event: never, draft: Frame<Part>) => AdmissionSubject | null,
    prevents: boolean,
  ): AdmissionSubject | null {
    let admitted: AdmissionSubject | null;

    try {
      admitted = admit(event as never, this.#draft);
    } catch (error) {
      // Identity was never minted, so there is no operation for a checkpoint to
      // settle and no `REPORTING` phase to enter. The controller stays idle and
      // usable, and the behavior surfaces the diagnostic.
      //
      // **Consequential.** The consumer's drag will not start and no `onEnd`
      // will follow, which is a changed terminal result by any reading — so
      // this is a `DraggableError`, built here from the stage the kernel owns.
      //
      // Neither a resolver that closed the controller on its way out nor a
      // throwing `onError` is handled here. **Both readings live in `notify`**,
      // which refuses after logical closure and swallows a throwing handler for
      // every route rather than for this one.
      this.#notify(new DraggableError(FAILURE_ADMISSION, error));

      return null;
    }

    if (!admitted) {
      // Declining is total: no operation, no phase change, and the default is
      // **not** prevented — which is what lets an arrow key on an edge item
      // keep its native meaning.
      return null;
    }

    if (prevents) {
      event.preventDefault();
    }

    // Post-callback revalidation. An admission member runs consumer-supplied
    // handle and visual resolvers during native dispatch, and a resolver can
    // close over the already-returned controller and synchronously destroy it.
    // Without this recheck a terminal controller publishes a new operation.
    return this.#bracket.closed || this.#current.operation ? null : admitted;
  }

  /**
   * Mints identity, arms this operation's input, and commits `PENDING`.
   *
   * `pointerId === -1` is the **pointerless** discriminant, not a sentinel: it
   * selects which listeners are armed, and the kernel's own geometry never
   * reads the pointer fields, which stay at their admission values on that
   * path.
   */
  #mintOperation(
    subject: AdmissionSubject,
    pointerId: number,
    x: number,
    y: number,
  ): boolean {
    const identity: OperationIdentity = { id: (this.#nextOperationId += 1) };

    try {
      // Discriminated by `'visual' in subject` rather than `instanceof`:
      // `instanceof` is realm-sensitive, and `DOMRealm` exists precisely
      // because an element may come from another document. A bare element is
      // the spelling of all three coinciding.
      const parts = 'visual' in subject;

      // **One literal, and the record is complete when it exists.** The
      // lifetimes are constructed inside it rather than assigned afterwards,
      // which is what makes the field non-nullable.
      this.#operation = {
        visual: parts ? subject.visual : subject,
        box: parts ? subject.box : subject,
        item: parts ? subject.item : subject,
        lifetimes: createOperationLifetimes(this.#report),
        cancelRequest: null,
      };

      if (pointerId !== -1) {
        armPointerInput(
          this.realm,
          this.#operation.lifetimes.motion.signal,
          this.#pointerHandler,
        );
      }

      armCancelInput(
        this.realm,
        this.#operation.lifetimes.cancellation.signal,
        this.#escapeHandler,
      );
    } catch (error) {
      // Nothing is committed yet, so this retires an operation the frames never
      // saw: it disposes whatever was armed and drops the references.
      //
      // **This site is not forced onto a second channel.** It reads like the
      // one place a platform report is unavoidable — the identity is a local
      // never published to the frames, so `failOperation` would degrade anyway
      // — but the channel is operation-independent, so that reason does not
      // hold: a warning needs no operation and no stage, and `return false`
      // refuses admission, so the outcome is the same either way.
      this.#retireOperation(null);
      this.#notify(
        new DraggableWarning('drag: operation/arming-failed', { cause: error }),
      );
      return false;
    }

    this.#draft.phase = PENDING;
    this.#draft.operation = identity;
    this.#draft.pointerId = pointerId;
    this.#draft.originX = x;
    this.#draft.originY = y;
    this.#draft.pointerX = x;
    this.#draft.pointerY = y;
    this.#commit();
    return true;
  }

  #admitPress(event: PointerEvent): void {
    // `false`: the pointer path prevents at the threshold crossing.
    const admitted = this.#runAdmission(event, this.#spec!.admit, false);

    if (admitted) {
      this.#mintOperation(
        admitted,
        event.pointerId,
        event.clientX,
        event.clientY,
      );
    }
  }

  /**
   * The discrete admission. Identical to the pointer path up to two
   * differences: the operation is pointerless, and `ACTIVATE` is **queued**
   * rather than reached inline from a threshold crossing.
   *
   * The pointer scalars stay at zero and nothing reads them: `originRect` is
   * measured from the visual and is pointer-independent already.
   */
  #admitCommand(event: Event): void {
    const admitted = this.#runAdmission(
      event,
      this.#spec!.command!.admit,
      true,
    );

    if (admitted && this.#mintOperation(admitted, -1, 0, 0)) {
      this.#bracket.dispatch(ACTIVATE, this.#current.operation);
    }
  }

  /**
   * The kernel's half of the ingress boundary, shared by **both** listeners.
   *
   * **The operation guard is a precondition of the call, and it is the only
   * check that may stand here.** The re-entry refusal is the bracket's, and it
   * has to be, because everything below it is already too late: a handle or
   * visual resolver runs inside an admission member, and a resolver that
   * dispatches a second ingress event re-enters this function synchronously
   * with the outer transaction half-written — while `current.operation` is
   * still `null`, because the outer admission has not committed, so the
   * ordinary guard waves it straight through.
   *
   * The nested pass would then `begin()` (rebuilding the draft the outer member
   * was handed by reference), run the member a second time, mint an identity,
   * arm ingress, and commit its own origin. Control returns to the outer
   * member, which finishes writing *its* item and visual into the object that
   * is now `current` — publishing an operation with one press's coordinates and
   * the other's behavior state. So `begin` is handed to the bracket and runs
   * only on a pass the bracket did not refuse; nothing consumer-reachable sits
   * between the guard here and the guards there.
   *
   * The bracket's latch is **one across both listeners**, which is what makes a
   * `pointerdown` dispatched from inside `command.admit`, and a `keydown`
   * dispatched from inside `admit`, refused by the same rule.
   */
  #openIngress(admit: () => void): void {
    if (this.#current.operation) {
      return;
    }

    this.#bracket.runIngress(admit);
  }

  /**
   * Disarms the one-shot `click` suppressor, or `null` when none is armed.
   *
   * **Controller-scoped, not operation-scoped, and that is the load-bearing
   * part.** The `click` arrives *after* the operation ends — that is what makes
   * it trailing — so a listener on the motion or presentation lifetime would be
   * disposed before the event it exists to catch. Binding it to ingress is the
   * only lifetime that outlives the operation and still dies with the
   * controller.
   */
  #disarmClick: (() => void) | null = null;

  /**
   * Arms it, at the threshold crossing, for the reason `click` survives at all:
   * only `pointerdown` was ever prevented, `click` is generated from the
   * un-prevented `pointerup`, and so a drop that lands on an `<a href>`
   * navigates.
   *
   * **Only after activation.** A press that never became a drag must keep its
   * click, and a pointerless operation is never armed at all, because a command
   * produces no `click`.
   */
  #armClickSuppressor(): void {
    this.#disarmClick?.();

    const aborter = new AbortController();
    const disarm = (): void => {
      if (this.#disarmClick === disarm) {
        this.#disarmClick = null;
      }

      aborter.abort();
    };

    this.#disarmClick = disarm;

    this.realm.document.addEventListener(
      CLICK,
      (event) => {
        disarm();
        event.preventDefault();
        event.stopPropagation();
      },
      {
        capture: true,
        once: true,
        // Composed with the ingress signal rather than aborted by hand in
        // teardown: "disarmed by teardown" then holds structurally, and the
        // step-7 abort needs no clause about a listener it does not know.
        signal: AbortSignal.any([aborter.signal, this.#ingress.signal]),
      },
    );
  }

  #onPointerDown(event: PointerEvent): void {
    // **The second of the three disarm conditions**, and it runs before the
    // primary-press test rather than inside it: a one-shot that never fired
    // must not survive to eat an unrelated click, and a press that begins a
    // *new* interaction is as good a signal that the old one is over as the
    // click itself — whichever button it used.
    this.#disarmClick?.();

    // The primary-press test is the pointer ingress's own and stays outside the
    // shared boundary: a secondary button must not open a transaction at all.
    if (isPrimaryPress(event)) {
      this.#openIngress(() => {
        this.#admitPress(event);
      });
    }
  }

  /**
   * The two ingress listeners as values, bound once per kernel. **Wrapped, not
   * detached**: a listener is called with the event target as its receiver.
   *
   * **Stable identities, and the discrete one has to be.** `addEventListener`
   * de-duplicates on (type, callback, capture), which is what lets a repeated
   * entry in `command.types` be a no-op rather than a refusal — a closure
   * minted per entry would bind twice.
   */
  readonly #pointerDownHandler = (event: PointerEvent): void => {
    this.#onPointerDown(event);
  };

  readonly #commandHandler = (event: Event): void => {
    this.#onCommand(event);
  };

  #onCommand(event: Event): void {
    this.#openIngress(() => {
      this.#admitCommand(event);
    });
  }

  // -------------------------------------------------------------------------
  // Activation
  // -------------------------------------------------------------------------

  readonly #activationPolicy = {
    // A discard retires: there is no such thing as a committed operation with
    // no presentation. A *failure* does not — the queued checkpoint owns it,
    // and retiring here would make that entry stale.
    retire: (): void => {
      this.#retireOperation(null);
    },
    committed: (): void => {
      // `activation.effect` invokes the consumer's `onStart` last, and that
      // callback may cancel or destroy.
      if (this.#preparationValid()) {
        this.#bracket.dispatch(START_COMMITTED, this.#current.operation);
      }
    },
  };

  /**
   * Acquires everything the activation seam needs before it opens: the origin
   * rect, the lift, and pointer capture on `root`.
   *
   * Capture is validated rather than assumed — `admit` may return any element
   * and a consumer resolver can detach things — and a capture failure is
   * `FAILURE_ACTIVATION` rather than a silently degraded drag.
   */
  #acquireActivation(): ActivationScope | null {
    const live = this.#operation!;

    try {
      // **Before the origin measurement, and that ordering is the reason it is
      // here rather than at admission.** Measuring a visual mid-tail is right —
      // the drag should start from where the element *looks* — but a running
      // animation outranks inline styles in the cascade, so the lift's own
      // writes would compose with a contribution that is still decaying.
      //
      // A press that never crosses the threshold keeps whatever is in flight,
      // which is why this is not at `pointerdown`.
      this.#cancelTail();

      const rect = live.visual.getBoundingClientRect();
      // **Window 1 of 2, and its position in this function is the whole
      // point.** It has to be read *before* `acquireLift`, because that is the
      // line the visual leaves flow on — everything the footprint rule needs
      // sits on opposite sides of it. One statement later and both windows
      // would see the collapsed layout and the difference would be zero.
      //
      // Offset box, not a bounding rect: by window 2 the visual carries a
      // transform, which moves a rect's top by the full travel and leaves its
      // height alone. See `OffsetBox`.
      const boxPre: OffsetBox = {
        width: live.box.offsetWidth,
        height: live.box.offsetHeight,
      };
      // **One acquisition, three products.** Both inherited spaces are read
      // before this call mutates anything, from computed style alone; no
      // behavior may take a later read for either.
      const { session, visualSpace, itemSpace } = acquireLift(
        live.visual,
        live.item,
        this.#spec!.config.liftMode,
        rect,
        this.realm,
        this.#unwind,
      );

      this.#activation = { originRect: rect, lift: session, visualSpace };
      live.lifetimes.presentation.use(session.dispose);

      // Neither step runs for a pointerless operation: there is no pointer to
      // capture, so the connectivity precondition capture needs has nothing to
      // guard either. `originRect` above is measured from the *visual* and was
      // already pointer-independent.
      if (this.#current.pointerId !== -1) {
        if (!this.root.isConnected) {
          throw new Error('drag: activation/root-disconnected');
        }

        live.lifetimes.motion.use(
          acquirePointerCapture(this.root, this.#current.pointerId),
        );
      }

      return {
        visual: live.visual,
        // Read back from the record the join reads it from, so the scope and
        // the landing measurement can never disagree about the grab basis.
        originRect: this.#activation.originRect,
        // The kernel's own admission-time state, not a behavior-authored draft
        // field read back.
        box: live.box,
        boxPre,
        // Read back from the record the join reads it from, for the same
        // reason `originRect` is: the tail is spent in this space and must not
        // be able to disagree with what the behavior was handed.
        visualSpace: this.#activation.visualSpace,
        itemSpace,
        lift: session,
        motion: live.lifetimes.motion,
        presentation: live.lifetimes.presentation,
      };
    } catch (error) {
      this.#failOperation(FAILURE_ACTIVATION, error);
      return null;
    }
  }

  #activate(): void {
    const scope = this.#acquireActivation();

    if (!scope) {
      return;
    }

    this.#runStamped(ACTIVATING, () => {
      runActivationSeam(
        this.#driver,
        this.#spec!.activation,
        scope,
        FAILURE_ACTIVATION,
        this.#activationPolicy,
      );
    });
  }

  // -------------------------------------------------------------------------
  // Seam adapters, built once per controller
  // -------------------------------------------------------------------------

  /**
   * Release cannot discard: `prepare` returns a command, and motion is already
   * closed, so "changed my mind" has no meaning.
   *
   * **A release that cannot build one throws**, like every other seam. There is
   * no second return arm and no adapter between the two: the phase is already
   * open at `FAILURE_RELEASE`, so `runPhase` catches the throw, calls
   * `context.fail` with that stage and returns `SEAM_PREPARE_FAILED`. A
   * behavior wanting a *different* stage still has `fail`, which latches and
   * is on `BehaviorContext`.
   */
  readonly #releaseTransition: Transition<Part, ResolutionCommand> = {
    prepare: (target) => this.#spec!.release.prepare(target),
    effect: (committed, prepared) => {
      this.#spec!.release.effect(committed, prepared);
    },
  };

  readonly #actionTransition: Transition<Part, {}> = {
    prepare: (target) =>
      this.#spec!.action.prepare(this.#actionTag, this.#actionArgument, target),
    effect: (committed, prepared) => {
      this.#spec!.action.effect(
        this.#actionTag,
        this.#actionArgument,
        committed,
        prepared,
      );
    },
    rollback: (prepared) => {
      this.#spec!.action.rollback?.(this.#actionTag, prepared);
    },
  };

  /**
   * The settlement seam.
   *
   * The input travels in a slot rather than as an argument, because only
   * `prepare` takes it and the seam's envelope hands the same capability to
   * both phases — and this seam has none. A `prepare` that finds no coherent
   * settlement
   * **throws** and is classified at the seam's own `FAILURE_RESOLUTION` — a
   * fulfilled value that is not an explicit resolution is that failure, and
   * acceptance is never inferred.
   */
  // `Prepared` is the `true` sentinel `Transition` defaults to: settlement
  // stages nothing, and since the gate went it carries no capability either.
  readonly #settlementTransition: Transition<Part> = {
    prepare: (target) =>
      this.#spec!.settlement.prepare(target, this.#attempts.settlementInput!),
    effect: (committed, prepared) => {
      // Between the commit and the behavior's effect: the operation is decided,
      // so nothing may still cancel it. Motion is closed here too rather than
      // only at release, because a cancel at `ACTIVE` reaches settlement with
      // input still open. Both closes are latched, so a release that already
      // closed motion pays nothing.
      const owned = this.#operation!.lifetimes;

      owned.motion.dispose();
      owned.cancellation.dispose();
      this.#spec!.settlement.effect(committed, prepared);
    },
  };

  /**
   * Whether the attempt still owns a live operation in `SETTLING`. Checked
   * after `anchorTarget`, which is behavior code and may have destroyed the
   * controller.
   */
  #settlementLive(attempt: SettlementAttempt): boolean {
    return (
      this.#attempts.settlement === attempt &&
      !this.#bracket.closed &&
      !this.#operation?.cancelRequest &&
      this.#current.operation !== null &&
      this.#current.phase === SETTLING
    );
  }

  /**
   * The `FINALIZING` counterpart of `settlementLive`. The join calls into code
   * the kernel does not own — the presentation disposers, the behavior's tail
   * policy and the terminal callback — and any of it may destroy the controller
   * synchronously. Everything after such a call is checked against this,
   * because `destroy()` is a synchronous terminal barrier.
   */
  #joinLive(): boolean {
    return (
      !this.#bracket.closed &&
      this.#current.operation !== null &&
      this.#current.phase === FINALIZING
    );
  }

  /**
   * Takes the one authoritative landing measurement, and reports whether the
   * settlement survived it.
   *
   * **Called once per settlement.** The serial authored commit guarantees the
   * authored DOM is final here, so there is no interval in which a target is
   * provisional. A second, advisory call would read a stale target and the tail
   * would travel the inverse of a delta nothing else agrees with, which is this
   * bug class's signature: the landing opens with a jump and still ends
   * correctly, because the release is what puts the visual in its place.
   *
   * Called unconditionally, and it cannot be conditional: whether a tail
   * follows is the behavior's own policy, and that policy is asked with the
   * delta this measurement produces.
   *
   * **Unclassified, not classified.** Failing the settlement for a measurement
   * throw tells a consumer whose reorder is already committed and accepted that
   * it failed, over a fault that is entirely presentational. The measurement
   * includes the behavior's own trustworthiness precondition, which it checks
   * from the inside and reports through the same throw: a target that cannot be
   * produced and one that cannot be trusted are the same fault.
   *
   * No stage is attached, and none is needed: a dedicated landing-target stage
   * would exist only so a non-consequential fault could reach `onError` at all,
   * and a warning reaches it without one. The message carries what such a stage
   * would have said.
   */
  #measureTarget(attempt: SettlementAttempt): boolean {
    const anchor = this.#driver.runUnclassifiedValue(
      () => this.#spec!.anchorTarget(this.#current),
      'drag: landing/target-unavailable',
    );

    // `anchorTarget` is behavior code and may have destroyed the controller. A
    // destroyed controller must not go on to join a settlement, so this is
    // checked before the skip branch as well as after a successful reading.
    if (!this.#settlementLive(attempt)) {
      return false;
    }

    if (anchor === undefined) {
      // **Skipped, not faked.** `onError` has already been delivered by the
      // driver. `targetX` stays null, which is what tells the join to release
      // without installing a tail. The settlement is **not** failed and the
      // domain result stands — the DOM commit already happened and the reorder
      // is real — so the operation joins immediately and terminates normally.
      //
      // A jump cut is honest. The alternative is worse: a detached placeholder
      // reads `0×0` at the viewport origin, so "landing from the unrepaired
      // position" is a confident twelve-frame animation to `(0,0)` followed by
      // a teleport back.
      return true;
    }

    const origin = this.#activation!.originRect;

    // Converted to an **origin-relative delta**, the space `compose` and
    // `lift.write` consume. `anchorTarget` produces a viewport point and the
    // kernel converts once, here. **The borrow ends here.** Both fields of
    // `anchor` are read on this line and the object is never referenced again:
    // a behavior is free to return one reusable buffer per controller, and both
    // first-party ones do.
    attempt.targetX = anchor.x - origin.x;
    attempt.targetY = anchor.y - origin.y;
    return true;
  }

  /**
   * Starts the landing tail on the **released** visual: the residual
   * displacement, decaying to zero.
   *
   * **It claims nothing, which is the whole of why it may outlive the
   * operation.** The animation has no fill, so it writes no inline style and is
   * invisible to a consumer reading or setting one; it reverts by itself, so
   * there is no cleanup obligation to place anywhere; one call cancels it to a
   * settled state; and it dies with the element, so removal, reparenting and
   * replacement need no handling.
   *
   * **The individual `translate` property, added rather than assigned.**
   * `transform` would be wrong twice over: it *replaces* an authored
   * `rotate(4deg)` for the duration, and it overrides a consumer's own running
   * transform animation. Additive `transform` is wrong too — additive transform
   * lists concatenate, so the offset would land inside the element's own
   * `scale()` and move it by a multiple of a delta measured in viewport space.
   * `translate` applies *before* `transform` in the used-value chain
   * (`translate → rotate → scale → transform`), so the offset sits outside the
   * element's own transform and needs no correction; it is also
   * origin-independent, where an inverse `transform` would have to correct for
   * whatever `transform-origin` the visual was restored to.
   *
   * **The one expression that changes units.** The endpoints are viewport
   * deltas and a `translate` is a local quantity, so the vector is projected
   * through the inverse of the space above the visual — captured at activation,
   * which is the ancestry the released element returns to. It is deliberately
   * not the session's own projection: that one is `null` for both lifted modes,
   * correctly, because a `fixed` element's local space is viewport space, while
   * the released element is in flow in every mode.
   *
   * Visual continuity is best-effort and resource safety is not: an ancestry
   * change during the tail sends it along the wrong path, and it still ends at
   * a zero contribution, so the element lands exactly where flow puts it.
   */
  #startTail(
    fromX: number,
    fromY: number,
    targetX: number | null,
    targetY: number,
  ): void {
    // The presentation disposers ran between the release and here, and they
    // are consumer-reachable, so the controller may already be closed — in
    // which case nothing further is asked of the behavior and nothing is
    // written.
    if (targetX === null || !this.#joinLive()) {
      return; // no measurement, or no controller left to interpolate for
    }

    const dx = fromX - targetX;
    const dy = fromY - targetY;

    if (dx === 0 && dy === 0) {
      return; // the visual is already where the drop decided
    }

    // Behavior code, and its own policy: it decides whether this drop has a
    // journey worth interpolating and how long that takes. Unwound rather than
    // classified, because a tail is presentation and a presentational fault may
    // not reach a consumer whose drop has already been decided and reported.
    const timing = this.#unwind(() =>
      this.#spec!.landingTail?.(this.#current, fromX, fromY, targetX, targetY),
    );

    // The policy is consumer-authored through `landing()` and may have
    // destroyed the controller, and a destroyed controller writes nothing.
    if (!timing || !this.#joinLive()) {
      return;
    }

    const space = this.#activation!.visualSpace;
    const element = this.#operation!.visual;

    // `animate` is itself overridable on a consumer-owned element, and the
    // duration domain is the platform's — a `NaN` or a negative is refused
    // here, as a warning that changed nothing.
    this.#tail =
      this.#unwind(() =>
        element.animate(
          [
            {
              translate: space
                ? `${space.a * dx + space.c * dy}px ${
                    space.b * dx + space.d * dy
                  }px`
                : `${dx}px ${dy}px`,
            },
            { translate: '0 0' },
          ],
          {
            duration: timing.duration,
            easing: timing.easing,
            composite: 'add',
          },
        ),
      ) ?? null;
  }

  /**
   * Release presentation completely, then hand the rest to the tail.
   *
   * **The position is already decided and the join writes nothing.** Where the
   * drop ends is `attempt.targetX`/`.targetY`, measured once before the join;
   * the visual reaches it by being **released into it**, in flow, and the tail
   * carries the residual displacement to zero. A write here could only restate
   * the position the release is about to produce, on an element whose inline
   * `transform` the very next statement restores.
   *
   * **Ordering is normative and it is what makes the tail sound.** The release
   * gives the visual's inline styles, its place in flow and the behavior's own
   * presentation back to the consumer; only then does anything interpolate. So
   * the terminal callback runs in a world the library holds no claim on.
   *
   * The release is in a `finally`: the join calls into code the kernel does not
   * own, and none of it may strand the placeholder or the inline styles.
   */
  #joinSettlement(attempt: SettlementAttempt): void {
    const owned = this.#operation!.lifetimes;
    const session = this.#activation!.lift;

    this.#begin();
    this.#draft.phase = FINALIZING;
    this.#commit();

    let fromX = 0;
    let fromY = 0;

    try {
      // **The entry revalidation, written out because nothing else performs
      // it.** With the measurement already taken there is no consumer call here
      // to revalidate as a side effect — and the code between it and here is
      // consumer-reachable, because `anchorTarget` runs on the way. Without
      // this check a destroy raised from it would still reach the terminal
      // callback.
      if (!this.#joinLive()) {
        return;
      }

      // `rendered` is where the visual is — the delta the drag last wrote,
      // which is what the tail has to start from, and which is not the
      // pointer's for any behavior that constrains, clamps, snaps or drives its
      // visual, nor for a pointerless operation. Nothing here overwrites it, so
      // the read is free of ordering constraints.
      ({ x: fromX, y: fromY } = session.rendered);
    } finally {
      // Unconditional. Nothing above it can throw today — the guard and the
      // sample are both kernel-private reads — but the rule is the sequence's
      // own rather than an artifact of what happens to be fallible: no failure
      // between `FINALIZING` and here may leave the placeholder inserted or the
      // inline styles overwritten.
      owned.presentation.dispose();
    }

    // **After the release and before the terminal.** After, because a tail
    // installed while the visual is still lifted would interpolate a fixed,
    // top-layer element and would then have to be released by something;
    // before, because the consumer's terminal callback may remove the very
    // element this is about, and an animation started onto a removed node is a
    // no-op rather than a fault.
    this.#startTail(fromX, fromY, attempt.targetX, attempt.targetY);

    // The release and the tail policy are both foreign code, and `destroy()` is
    // a synchronous terminal barrier: a controller closed by either owes no
    // terminal callback.
    if (!this.#joinLive()) {
      return;
    }

    this.#driver.runLeaf(() => {
      this.#spec!.finalized(this.#current);
    }, FAILURE_TERMINAL_CALLBACK);
    // Queued unconditionally, and this entry is what retires: a
    // terminal-callback failure queues its checkpoint ahead of this one, but
    // the checkpoint only delivers `onError` — the terminal it then owes is
    // dispatched from inside it and so lands *behind* this entry. The
    // retirement therefore always intervenes, and it is that second terminal
    // which arrives stale. Exactly one `onEnd` on this path is that ordering.
    this.#bracket.dispatch(RETIRE, this.#current.operation);
  }

  /**
   * Drives one settlement: prepare → stamp `SETTLING` → commit → measure →
   * join.
   *
   * **One synchronous sequence, and nothing suspends it.** Settlement holds no
   * gate, so the only thing between the seam and the terminal is the behavior's
   * own measurement.
   */
  #openSettlement(input: SettlementInput): void {
    // However the round-trip ended, it is over; a later completion for it is
    // inert at both validation points.
    this.#attempts.resolution = null;
    this.#attempts.settlementInput = input;

    const attempt: SettlementAttempt = { targetX: null, targetY: 0 };
    let outcome: SeamOutcome | undefined;

    this.#attempts.settlement = attempt;

    this.#runStamped(SETTLING, () => {
      outcome = this.#driver.runCore(
        this.#settlementTransition,
        undefined,
        FAILURE_RESOLUTION,
      );
    });

    this.#dropStaged();
    this.#attempts.settlementInput = null;

    // A settlement that never committed does not land: the queued checkpoint
    // decides what the operation ends as, and measuring for a join that will
    // never happen would call behavior code for nothing.
    if (outcome === SEAM_COMMITTED && this.#measureTarget(attempt)) {
      this.#joinSettlement(attempt);
    }
  }

  /**
   * The producer-side half of the double validation. The queued action
   * revalidates when it is applied, because the attempt slot and the committed
   * phase change at different moments.
   */
  #settleResolution(attempt: ResolutionAttempt, input: SettlementInput): void {
    if (
      attempt.completed ||
      this.#attempts.resolution !== attempt ||
      this.#bracket.closed
    ) {
      return;
    }

    attempt.completed = true;
    attempt.settlement = input;
    this.#bracket.dispatch(RESOLUTION_SETTLED, attempt);
  }

  /**
   * The consumer round-trip, executed by the kernel after `release.effect`
   * returned normally.
   *
   * A thenable is asynchronous and anything else is immediately settled. The
   * kernel never names a resolution type, an accept or a reject: it hands the
   * value to `settlement.prepare` with a status and lets the behavior classify.
   */
  #openResolution(command: ResolutionCommand): void {
    const attempt: ResolutionAttempt = {
      completed: false,
      settlement: null,
    };
    const { invoke } = command;

    this.#attempts.resolution = attempt;

    if (!invoke) {
      // A proven semantic no-op — no round-trip, no abort guard, no thenable.
      this.#settleResolution(attempt, { type: SETTLED_SKIPPED });
      return;
    }

    const aborter = new AbortController();

    // Keyed off `completed`, not off the payload: keying it off the payload
    // would abort a finished resolver's own signal.
    this.#operation!.lifetimes.cancellation.useWhile(
      () => !attempt.completed,
      () => {
        aborter.abort();
      },
    );

    let value: unknown;

    try {
      value = invoke(aborter.signal);
    } catch (error) {
      this.#settleResolution(attempt, { type: SETTLED_REJECTED, error });
      return;
    }

    // Reading `then` and subscribing are inside one `try`, because both are
    // consumer code on an arbitrary thenable. A throw from either is the
    // resolution rejecting. `settleResolution` latches, so a thenable that
    // resolves synchronously and *then* throws keeps its first completion.
    try {
      const then = thenOf(value);

      if (then) {
        then.call(
          value as PromiseLike<unknown>,
          (settled: unknown) => {
            this.#settleResolution(attempt, {
              type: SETTLED_FULFILLED,
              value: settled,
            });
          },
          (error: unknown) => {
            this.#settleResolution(attempt, { type: SETTLED_REJECTED, error });
          },
        );
        return;
      }
    } catch (error) {
      this.#settleResolution(attempt, { type: SETTLED_REJECTED, error });
      return;
    }

    this.#settleResolution(attempt, { type: SETTLED_FULFILLED, value });
  }

  // -------------------------------------------------------------------------
  // Handlers. Every one is total: an action it does not recognise in the
  // current phase is ignored, never thrown on.
  // -------------------------------------------------------------------------

  /**
   * The active-movement leaf, hoisted to **one** controller-stable closure.
   *
   * **Wrapped, not detached**: the seam calls it with no receiver of its own,
   * so a bare prototype read would arrive without one. A field rather than an
   * arrow at the call site because inlining allocates a fresh closure on every
   * active pointer sample — the one path whose allocations count — and the
   * emitted bundle keeps the arrow rather than folding it away. Reading the
   * swappable `current` frame and `activation` record at call time is what
   * makes hoisting sound: neither is captured by value.
   */
  readonly #movedLeaf = (): void => {
    this.#runMoved();
  };

  #runMoved(): void {
    this.#spec!.moved(this.#current, this.#activation!.lift);
  }

  #handleMove(sample: PointerCoordinates): void {
    const { phase } = this.#current;

    if (phase !== PENDING && phase !== ACTIVE) {
      return;
    }

    if (sample.pointerId !== this.#current.pointerId) {
      return;
    }

    this.#begin();
    this.#draft.pointerX = sample.clientX;
    this.#draft.pointerY = sample.clientY;
    this.#commit();

    if (phase === ACTIVE) {
      this.#driver.runLeaf(this.#movedLeaf, FAILURE_RENDERER_WRITE);
      return;
    }

    const { threshold } = this.#spec!.config;
    const dx = this.#current.pointerX - this.#current.originX;
    const dy = this.#current.pointerY - this.#current.originY;

    if (dx * dx + dy * dy >= threshold * threshold) {
      // **The pointer path's `preventDefault()`.** What it prevents is *this*
      // `pointermove` — selection extension, and the native drag-and-drop start
      // where a browser fires one — not the `pointerdown`, which has already
      // been dispatched un-prevented and whose focus and caret are real and are
      // supposed to be. Preventing at admission would spend a press on a drag
      // that has not happened yet and, in most presses, never will.
      //
      // It is **not** a scroll policy. `preventDefault()` on `pointerdown` was
      // never a reliable scroll suppressor; scroll suppression is
      // `touch-action` and is the consumer's, set on the draggable region.
      sample.preventDefault();

      // A selection may already have started, and prevention cannot undo it —
      // the event that began it has returned. Clearing is the only instrument
      // left, and what is cleared is the half-made selection the press made on
      // its way to becoming a drag.
      this.realm.window.getSelection()?.removeAllRanges();
      this.#armClickSuppressor();
      this.#activate();
    }
  }

  /**
   * The release, from `ACTIVE`, in the fixed two-commit order the kernel owns.
   * `sample` is `null` for a pointerless release: there is nothing to commit,
   * and the pointer fields stay as admission left them.
   */
  #closeOperation(sample: PointerCoordinates | null): void {
    // Commit 1: the committed frame matches what is about to be true, so a
    // `release.prepare` that throws or reentrantly destroys never leaves a
    // committed `ACTIVE` operation with no ingress and no path forward.
    this.#begin();
    this.#draft.phase = RELEASING;

    if (sample) {
      this.#draft.pointerX = sample.clientX;
      this.#draft.pointerY = sample.clientY;
    }

    this.#commit();

    // Motion closes *between* the two commits: capture released, listeners and
    // invalidation removed, the behavior's frame task cancelled. Nothing
    // pending can alter the proposal from here.
    this.#operation!.lifetimes.motion.dispose();

    runReleaseSeam(
      this.#driver,
      this.#releaseTransition,
      FAILURE_RELEASE,
      // Wrapped, not detached: the seam calls it with no receiver.
      (command) => {
        this.#openResolution(command);
      },
    );
  }

  #handleUp(sample: PointerCoordinates): void {
    const { phase } = this.#current;

    if (sample.pointerId !== this.#current.pointerId) {
      return;
    }

    if (phase === PENDING) {
      this.#retireOperation(this.#current.operation);
      return;
    }

    if (phase !== ACTIVE) {
      return;
    }

    this.#closeOperation(sample);
  }

  /**
   * The pointerless release, which enters the **same** transition `UP` enters
   * at `ACTIVE`. Unreachable for a pointer operation and unreachable from a
   * behavior: {@link BehaviorContext} still has no lifecycle entry.
   */
  #handleRelease(identity: OperationIdentity): void {
    if (
      this.#current.operation !== identity ||
      this.#current.phase !== ACTIVE
    ) {
      return;
    }

    this.#closeOperation(null);
  }

  /**
   * The pointerless activation, which enters the **same** seam the threshold
   * crossing enters inline from `MOVE`.
   */
  #handleActivate(identity: OperationIdentity): void {
    if (
      this.#current.operation !== identity ||
      this.#current.phase !== PENDING
    ) {
      return;
    }

    this.#activate();
  }

  /**
   * A cancellation at `ACTIVE` or `RELEASING` enters the settlement seam, which
   * is the only hook that can produce the canceled domain result `onCancel`
   * requires: `recovery` and `domain` are fields of the behavior's frame part,
   * which the kernel cannot name or write.
   */
  #settleCancellation(
    request: { reason: unknown; origin: CancelOrigin },
    stage: CancelStage,
  ): void {
    this.#openSettlement({
      type: SETTLED_CANCELED,
      reason: request.reason,
      origin: request.origin,
      stage,
    });
  }

  #handleResolutionSettled(attempt: ResolutionAttempt): void {
    // The applied half of the double validation. The slot check alone covers
    // every path that exists today, because everything that decides the
    // operation also clears the slot; the phase check is the second layer the
    // contract requires, guarding the window where the two disagree.
    if (
      this.#attempts.resolution !== attempt ||
      this.#current.phase !== RELEASING
    ) {
      return; // a late completion for an operation that is already decided
    }

    const input = attempt.settlement;

    if (!input) {
      return;
    }

    // Consumed once and the payload cleared, so it can never be applied twice.
    attempt.settlement = null;
    this.#openSettlement(input);
  }

  #handleCancel(identity: OperationIdentity): void {
    if (this.#current.operation !== identity) {
      return;
    }

    const live = this.#operation!;
    const request = live.cancelRequest;

    // Consumed before anything else runs: the latch invalidates every
    // preparation while it is held, including the settlement transition this
    // cancellation is about to open.
    live.cancelRequest = null;

    if (!request) {
      return;
    }

    switch (this.#current.phase) {
      case PENDING:
        // Abandoned before there was anything to tell the consumer about:
        // `admit` is not a start notification, and no presentation exists.
        this.#retireOperation(identity);
        break;
      case ACTIVATING:
      case ACTIVE:
      case RELEASING:
        // `ACTIVATING` settles like `ACTIVE`, and the reason is that the phase
        // is committed **before** `activation.effect` runs: by the time a
        // cancellation is applied here the placeholder is in the DOM, the lift
        // is acquired and the behavior has already delivered its start
        // notification. Retiring instead would leave a consumer that was told a
        // drag began with no terminal callback at all — and there is nothing
        // atomic left to protect, because settling un-commits nothing.
        //
        // The stage is `AT_PROPOSAL` ("abandoned before the consumer round-trip
        // opened") and the behavior's own result carries a null proposal, which
        // is the case its domain type already names.
        this.#settleCancellation(
          request,
          this.#current.phase === RELEASING ? AT_CONSUMER : AT_PROPOSAL,
        );
        break;
      // **Written out rather than left to a bare `default`.** The handler is
      // total either way — a phase it does not recognise is ignored, never
      // thrown on — but with a closed union the compiler can say *which* phases
      // that covers, so the four are named. `IDLE` has no operation; the three
      // terminal phases have a settlement already deciding the outcome, and a
      // cancel arriving there is late by definition.
      case IDLE:
      case SETTLING:
      case REPORTING:
      case FINALIZING:
        break;

      // no default
    }
  }

  #handleStartCommitted(identity: OperationIdentity): void {
    if (
      this.#current.phase !== ACTIVATING ||
      this.#current.operation !== identity
    ) {
      return;
    }

    // The latch outranks the checkpoint: an operation cancelled during
    // `ACTIVATING` must never reach `ACTIVE`. FIFO alone does not give this —
    // an action whose *effect* cancels (a collection replacement that
    // invalidates the gap, dispatched from `onStart`) queues its `CANCEL`
    // behind this checkpoint, so without the check the operation would activate
    // for exactly one drain and the cancellation would be reported at the wrong
    // stage. Leaving the phase untouched is enough: the queued `CANCEL` finds
    // `ACTIVATING` and settles it.
    if (this.#operation!.cancelRequest) {
      return;
    }

    this.#begin();
    this.#draft.phase = ACTIVE;
    this.#commit();

    // **A command is one slot.** A pointerless operation has no other producer
    // of a release — no `pointerup` will ever arrive — so the kernel is the
    // producer, once, here. Queued rather than run inline so the consumer's
    // `onStart` and anything it dispatched drain first, exactly as they would
    // before a press's own release.
    if (this.#current.pointerId === -1) {
      this.#bracket.dispatch(RELEASE, this.#current.operation);
    }
  }

  #handleFailed(checkpoint: FailureCheckpoint): void {
    const { phase } = this.#current;

    // The applied half of the precedence check, and not redundant with the one
    // in `failOperation`: `fail()` classifies **immediately**, inside the
    // open phase, so a seam that fails and *then* cancels queues
    // `[FAILED, CANCEL]` — the latch does not exist yet when the checkpoint is
    // queued, only when it is applied. Dropping it here leaves the phase
    // untouched, so the `CANCEL` behind it still finds a live `ACTIVE`
    // operation and produces the single terminal callback the consumer gets.
    // The error is not lost; it arrives as a warning, because the `return` here
    // is what decides and the cancel owns the terminal. `checkpoint.stage` is
    // discarded with the classification it names.
    if (
      this.#operation?.cancelRequest &&
      this.#current.operation === checkpoint.operation
    ) {
      this.#notify(
        new DraggableWarning('drag: failure/superseded-by-cancel', {
          cause: checkpoint.error,
        }),
      );
      return;
    }

    if (
      this.#current.operation !== checkpoint.operation ||
      phase === IDLE ||
      phase === REPORTING
    ) {
      // **The one place an error can vanish outright, and here it does not.**
      // Stale, or a second checkpoint for a report already in flight — either
      // way this checkpoint loses its classification, and under two channels
      // there is nowhere for what it carries to go. Under one there is: the
      // consequence it claims is refused, and the fault is not.
      //
      // A warning rather than an error, and for the same reason as every other
      // demotion here: the `return` is what decides. A stale checkpoint names
      // an operation that is already over, and a second one arrives while the
      // first is being reported — in both cases the terminal is owned and the
      // outcome is not this fault's to change.
      this.#notify(
        new DraggableWarning('drag: failure/checkpoint-stale', {
          cause: checkpoint.error,
        }),
      );
      return;
    }

    // The settlement is **replaced**: whatever the previous attempt measured
    // is over, and nothing of it may reach the join.
    this.#retireAttempts();

    this.#attempts.settlementInput = {
      type: SETTLED_FAILED,
      stage: checkpoint.stage,
      error: checkpoint.error,
      // **Built here, by the kernel, and here is the only place one is built
      // for an operation.** The behavior maps `stage` to a recovery, which is
      // its own, and forwards this untouched. **There is no stage → code
      // mapping for a behavior to re-own**: the error carries the same `stage`
      // this input does, so the two fields agree by construction rather than by
      // a derivation the kernel would have to keep.
      //
      // **A behavior raises a cause; the kernel mints the error.** The stage is
      // not final at the raise site — a stale checkpoint is demoted to a
      // `DraggableWarning` above, and a held cancel latch outranks the
      // checkpoint outright — so an error minted at the failing branch would
      // already be the wrong object in both cases and would have to be
      // unwrapped and rebuilt. One mint site is what makes *the stage on the
      // error is the stage the kernel decided* true by construction rather than
      // by every behavior agreeing.
      report: new DraggableError(checkpoint.stage, checkpoint.error),
    };

    // **The settlement is replaced, and this one never lands.** The report
    // runs through the same seam and stops there: nothing measures and nothing
    // joins, and the terminal is published from `ERROR_REPORTED` instead.
    this.#attempts.settlement = { targetX: null, targetY: 0 };

    // The same seam as an ordinary settlement, because the behavior owns the
    // terminal classification either way — but stamped `REPORTING`, not
    // `SETTLING`: `onError` runs in its own phase, exactly once per failure.
    // The input carries the stage, which is what lets the behavior distinguish
    // the recoveries the stage table separates (`TERMINAL_CALLBACK` is "none",
    // the rest immediate).
    //
    // A throw or a rejection inside this seam cannot become another checkpoint:
    // `failOperation` sees the latch and reports instead. The seam still
    // *classifies* — the latched failure is what stops the continuation below —
    // but the error takes the non-consequential channel, because a queued
    // checkpoint would be dropped by the guard above and lost.
    this.#reporting = true;

    try {
      this.#runStamped(REPORTING, () => {
        this.#driver.runCore(
          this.#settlementTransition,
          undefined,
          checkpoint.stage,
        );
      });
    } finally {
      this.#dropStaged();
      this.#reporting = false;
      this.#attempts.settlementInput = null;
    }

    if (this.#current.phase === REPORTING) {
      // The **whole checkpoint**, not just its operation: the terminal this
      // path now owes is skipped for exactly one stage, and the reader of that
      // rule needs the stage to apply it.
      this.#bracket.dispatch(ERROR_REPORTED, checkpoint);
      return;
    }

    // The report transition never published — a rejection from `prepare`, or a
    // reentrant destroy. Nothing will drive `ERROR_REPORTED`, and the operation
    // may not stay live.
    this.#retireOperation(checkpoint.operation);
  }

  /**
   * `onError` is done. **The operation still owes a terminal**, and this is
   * where the failure path pays it.
   *
   * Skipping the terminal callback after a consequential failure would rest on
   * the committed frame still saying `OUTCOME_ACCEPTED`, so that publishing
   * announces a successful drop the checkpoint is about to report as failed.
   * The opposite holds: when the failure arrives after the authored commit the
   * drop *is* accepted, and announcing it is the one fact the consumer must
   * have. `onEnd` reports what happened to the **data**; `onError` is the
   * verdict on the operation.
   *
   * The behavior decides what to publish and whether to publish at all — the
   * frame's own result, `canceled` where it holds none, and nothing for an
   * operation whose `onStart` never ran. The kernel only calls.
   *
   * **Presentation is released first**, so the callback sees the same world it
   * sees on the success path: the join releases in its `finally` and then calls
   * `finalized`, and a consumer must not have to know which route its drag took
   * to know whether the placeholder is still in the list.
   *
   * **Exactly one `onEnd` per operation rests on two things here, and only one
   * of them is a test in this function.**
   *
   * The one written here is the stage exclusion: `FAILURE_TERMINAL_CALLBACK` means
   * `finalized` already ran and threw, so calling it again would deliver a
   * second `onEnd` for one operation and, since it would throw again, do so
   * forever. The behavior's settlement `prepare` makes the same exclusion from
   * the other side, where it declines to rewrite an outcome that has already
   * been reported.
   *
   * **The other is the queue order, and it covers what the stage cannot.** A
   * behavior calling `fail` from inside `finalized` classifies with a
   * stage of its own — a phase is open there, so the classification takes the
   * caller's — and a checkpoint raised inside the terminal callback therefore
   * need not carry `FAILURE_TERMINAL_CALLBACK` at all. What refuses that one is
   * the guard below: the checkpoint is queued ahead of the join's retirement
   * and the `ERROR_REPORTED` it goes on to dispatch is appended behind it, so
   * the operation is already retired and the phase no longer says `REPORTING`.
   * **A change that makes `ERROR_REPORTED` asynchronous is changing that**, not
   * only when this runs.
   */
  #handleErrorReported(checkpoint: FailureCheckpoint): void {
    const { operation: identity, stage } = checkpoint;

    if (
      this.#current.phase !== REPORTING ||
      this.#current.operation !== identity
    ) {
      return;
    }

    if (stage !== FAILURE_TERMINAL_CALLBACK && this.#operation) {
      this.#unwind(this.#operation.lifetimes.presentation.dispose);

      // **The second route into `onEnd`, and it owes its own reading.** The
      // obligation is per route into a slot, never per slot: one delivery
      // statement with two callers is two sites, and the join's guard says
      // nothing about this one.
      // The disposers above are consumer-reachable — `#startTail` says so for
      // the join's copy of the same call — and `finalized`'s whole body is the
      // consumer's terminal slot, which correctly reads no latch of its own
      // because the reading is the caller's. The entry check fourteen lines up
      // established the phase and the identity, and neither can change under a
      // disposer: a nested dispatch inside a running drain appends and returns,
      // and nothing reachable from one retires an operation. **The latch is the
      // one conjunct a consumer-reachable step can flip**, so the latch is the
      // whole reading.
      //
      // **Bare, and not a `#reportLive()` beside `#joinLive()`.** A named
      // predicate of that shape reads as slot-wide coverage, which is exactly
      // how the route this line repairs came to be counted as guarded; and
      // `#joinLive()` itself is not available here — its `FINALIZING` conjunct
      // is false on this route by construction, so reusing it would skip the
      // terminal for *every* classified failure, retracting the rule that a
      // consequential failure of a started operation still publishes one end.
      if (!this.#bracket.closed) {
        // A throw here reaches `failOperation`, which sees `REPORTING` and
        // takes the non-consequential channel — so a terminal that fails on the
        // failure path is reported without queueing a second checkpoint for an
        // operation that is one statement from retirement.
        this.#driver.runLeaf(() => {
          this.#spec!.finalized(this.#current);
        }, FAILURE_TERMINAL_CALLBACK);
      }
    }

    // **Unconditional, and deliberately outside the guard above.** A closed
    // controller still owes the kernel's own retirement; physical teardown
    // defers to the transaction boundary rather than being cancelled by
    // the close, so skipping the terminal must not skip this.
    this.#retireOperation(identity);
  }

  #handleBehaviorAction(tag: number, argument: unknown): void {
    this.#actionTag = tag;
    this.#actionArgument = argument;

    try {
      // Two stages, because the seam's phases fail differently: resolving an
      // insertion and moving the placeholder are not the same failure. An
      // explicit `fail` narrows further from the inside.
      this.#driver.runCore(
        this.#actionTransition,
        undefined,
        FAILURE_ACTION_PREPARE,
        FAILURE_ACTION_EFFECT,
      );
    } finally {
      this.#dropStaged();
      // Drop the retained argument: it may be a DOM element or a consumer
      // value, and nothing may keep it alive past its action.
      this.#actionArgument = null;
    }
  }

  /** The queue's one drain step, dispatching a kernel or behavior action. */
  #handle(action: number, argument: unknown): void {
    if (action >= BEHAVIOR_BASE) {
      this.#handleBehaviorAction(action - BEHAVIOR_BASE, argument);
      return;
    }

    switch (action) {
      case MOVE:
        this.#handleMove(argument as PointerCoordinates);
        break;
      case UP:
        this.#handleUp(argument as PointerCoordinates);
        break;
      case ACTIVATE:
        this.#handleActivate(argument as OperationIdentity);
        break;
      case RELEASE:
        this.#handleRelease(argument as OperationIdentity);
        break;
      case CANCEL:
        this.#handleCancel(argument as OperationIdentity);
        break;
      case START_COMMITTED:
        this.#handleStartCommitted(argument as OperationIdentity);
        break;
      case RESOLUTION_SETTLED:
        this.#handleResolutionSettled(argument as ResolutionAttempt);
        break;
      case FAILED:
        this.#handleFailed(argument as FailureCheckpoint);
        break;
      case ERROR_REPORTED:
        this.#handleErrorReported(argument as FailureCheckpoint);
        break;
      case RETIRE:
        this.#retireOperation(argument as OperationIdentity);
        break;
      default:
        // Total: an unrecognised tag is ignored, never thrown on.
        break;
    }
  }

  // -------------------------------------------------------------------------
  // The behavior-facing surface, and arming
  // -------------------------------------------------------------------------

  /**
   * The latch itself, read live — a captured boolean would be a copy of a
   * liveness answer, which is the failure mode the whole invariant is about.
   */
  get closed(): boolean {
    return this.#bracket.closed;
  }

  dispatch(tag: number, argument: unknown): void {
    if (this.#bracket.closed) {
      return;
    }

    if (
      !this.#spec ||
      !Number.isInteger(tag) ||
      tag < 0 ||
      tag >= this.#spec.config.actionTags
    ) {
      // Reported and dropped, never enqueued: the kernel computes
      // `BEHAVIOR_BASE + tag`, so a negative or fractional tag would alias a
      // kernel action.
      this.#notify(
        new DraggableWarning(`drag: dispatch/tag-out-of-range ${String(tag)}`),
      );
      return;
    }

    this.#bracket.dispatch(BEHAVIOR_BASE + tag, argument);
  }

  fail(stage: FailureStage, error: unknown): void {
    this.#driver.requestFailure(stage, error);
  }

  /**
   * Composes both frames and attaches ingress. **Unwinds on any failure**:
   * `spec.retire()` best-effort, scrub whichever frame exists, abort ingress,
   * rethrow. A controller is never returned half-armed.
   */
  arm(next: BehaviorSpec<Part, Activation>): void {
    this.#spec = next;

    // How many frames physically exist, which is what the unwind scrubs.
    let composed = 0;

    try {
      if (
        !Number.isInteger(next.config.actionTags) ||
        next.config.actionTags < 0
      ) {
        throw new TypeError('drag: spec/action-tags-invalid');
      }

      // Static spec data, validated once, exactly as `actionTags` is. **One
      // check, and it is the only one here the library owns.** The
      // `pointerdown` collision is refused rather than tolerated: two
      // listeners for one type would run two admission members for one event,
      // and the second would find the first's operation already committed —
      // silently, and only sometimes. That corrupted operation is the
      // kernel's own state, which is what makes this the library's invariant
      // to hold rather than the author's.
      //
      // **Four checks that look like they belong in this loop do not, and the
      // last two are why the rule is worth restating.**
      // `typeof type !== 'string'` re-states what `readonly string[]` already
      // guarantees. A duplicate entry needs no refusal, because the platform
      // ignores it: `addEventListener` dedups on (type, callback, capture)
      // and all three are identical for every entry here, so a second binding
      // is already a no-op — and `indexOf` inside the loop would make
      // refusing it quadratic. The array-shape pair is verified by
      // construction rather than argued: an **empty array** binds no discrete
      // listener, which is the state a behavior omitting `command` entirely
      // already reaches, so refusing it would refuse a supported
      // configuration under a different spelling; an **empty-string entry**
      // binds an ordinary, distinct listener for a type nothing dispatches,
      // leaving the author's discrete ingress inert while the kernel's is
      // untouched. Both would cost the author their own feature and cost the
      // library nothing, and the library declines that trade however plainly
      // the value looks like a mistake.
      if (next.command !== undefined) {
        for (const type of next.command.types) {
          if (type === POINTER_DOWN) {
            throw new TypeError('drag: spec/command-type-pointerdown');
          }
        }
      }

      // The same code path twice, so both frames get one hidden class. The
      // part factory is not proven deterministic, so the two results are not
      // assumed identical — they are simply both composed, and `composed`
      // records how many exist for the unwind below.
      this.#current = Object.assign(frame(), next.createFramePart());
      composed = 1;
      this.#draft = Object.assign(frame(), next.createFramePart());
      composed = 2;

      this.root.addEventListener(POINTER_DOWN, this.#pointerDownHandler, {
        signal: this.#ingress.signal,
      });

      // Inside the **same** ingress abort that owns `pointerdown`, so
      // `destroy()` releases every listener including the discrete ones, and
      // a behavior with no `command` member binds nothing at all.
      if (next.command !== undefined) {
        for (const type of next.command.types) {
          this.root.addEventListener(type, this.#commandHandler, {
            signal: this.#ingress.signal,
          });
        }
      }
    } catch (error) {
      this.#unwind(next.retire);

      // Totality applies to the unwind too: a reset that throws here must not
      // replace the original arm failure or skip the ingress cleanup. Scrub
      // **whichever frame exists** — a second factory that throws leaves a
      // constructed frame the failure path is still responsible for, and a
      // part that already holds a DOM reference would otherwise be retained
      // by the controller for good.
      if (composed > 0) {
        this.#scrub(this.#current);
      }

      if (composed > 1) {
        this.#scrub(this.#draft);
      }

      this.#ingress.abort();
      this.#spec = null;
      throw error;
    }
  }
}
