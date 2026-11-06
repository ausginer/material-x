/**
 * The kernel executor: admission → activation → move → release → teardown.
 *
 * Two objects, split by lifetime:
 * - {@link Kernel} is the façade a behavior holds as {@link BehaviorContext}.
 *   It exists from the first statement of `draggable()`. It owns the realm, the
 *   root, the `ExecutionLoop`, the listener signal and one nullable reference
 *   to the armed controller.
 * - `ArmedController` exists only after construction has composed both frames.
 *   It holds every handler, the controller-scope context as `readonly` fields,
 *   and the current-operation slots.
 *
 * Neither object exposes a container. The kernel holds one `spec` reference to
 * the behavior. The behavior holds the façade, and no façade member drives a
 * transition.
 */
import {
  ACTIVATE,
  BEHAVIOR_BASE,
  CANCEL,
  ERROR_REPORTED,
  FAILED,
  MOVE,
  OPEN_RESOLUTION,
  RELEASE,
  RESOLUTION_SETTLED,
  RETIRE,
  START_COMMITTED,
  UP,
} from './actions.ts';
import {
  BehaviorRunner,
  runActivationTransition,
  runReleaseTransition,
  TRANSITION_COMMITTED,
  type Transition,
} from './behavior-runner.ts';
import { DraggableError, DraggableWarning, type Notify } from './errors.ts';
import { ExecutionLoop } from './execution.ts';
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
  type ActivationScope,
  type AdmissionSubject,
  type BehaviorContext,
  type BehaviorFactory,
  type BehaviorSpec,
  type ResolutionCommand,
  SETTLED_CANCELED,
  SETTLED_FAILED,
  SETTLED_FULFILLED,
  SETTLED_REJECTED,
  SETTLED_SKIPPED,
  type SettlementInput,
} from './spec.ts';
import { FrameTransaction } from './transaction.ts';
import type { OffsetBox } from './types.ts';
import { createWarnOnThrow, type WarnOnThrow } from './warn-on-throw.ts';

/**
 * The fields the kernel reads from a queued pointer event, and the one method
 * it calls on that event.
 *
 * The queue holds the native event by reference under this narrow contract. The
 * kernel does not retain the event after the drain, so one pointer sample
 * allocates no wrapper.
 *
 * `preventDefault` sits beside the three scalars because the pointer path
 * prevents the default at the activation threshold crossing, and the kernel
 * decides the crossing from this sample. The drain is synchronous inside the
 * native listener, so the call is still in time. A sample that never crosses
 * the threshold never uses it.
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
 * `completed` and `settlement` are separate fields. `settlement` is the
 * discriminated payload and is cleared once consumed, so a fulfilled
 * `undefined` and a rejected `undefined` stay distinguishable. `completed`
 * records only that the resolver produced a result. The guarded abort reads
 * `completed`, because reading the payload would abort a finished resolver's
 * own signal.
 *
 * `discard` reports the rejection when its queued entry never applies:
 * destruction discarded the entry, or a cancel retired the attempt ahead of it.
 * `discard` exists only on a rejection that was the attempt's first completion,
 * so a settlement with no fault allocates nothing for it and reports nothing.
 */
type ResolutionAttempt = {
  completed: boolean;
  settlement: SettlementInput | null;
  discard?(): void;
};

/**
 * One settlement, from its transition to `#finalizeSettlement`: the input it
 * settles with, the operation's lifetimes its effect closes, and the one
 * measurement it takes.
 *
 * This record is the settlement transition's capability. `BehaviorRunner`
 * passes it to both phases, so the input reaches `prepare` and the lifetimes
 * reach `effect` without a slot on the controller. It travels as an argument
 * and not on the transactional frame, because nothing outside the settlement
 * helpers reads it, it is unobservable, and it lives only for the synchronous
 * span of the unit that built it. There is one object per settlement, never one
 * per pointer sample.
 */
type SettlementAttempt = {
  readonly input: SettlementInput;
  readonly lifetimes: OperationLifetimes;
  /**
   * Where the drop ends, as a delta from the origin. `#measureTarget` writes it
   * once.
   *
   * `null` on `targetX` means that no target was measured, and
   * `#startLandingAnimation` then starts nothing. The two coordinates are
   * written and read together, so the sentinel needs no third slot. Test it
   * with `=== null`: `0` is an ordinary coordinate.
   */
  targetX: number | null;
  targetY: number;
};

/**
 * Everything one operation owns, from admission to retirement.
 *
 * `#createOperation` fills every ordinary field in one literal, and those
 * fields are never assigned again. So retirement drops the record and does not
 * have to remember which slots to clear, and a field added here is cleared with
 * no further code. `cancelRequest` and `failureRegistered` are the exceptions.
 * `cancelRequest` is the registered cancel: the first registration per
 * operation wins, and the `CANCEL` entry consumes it. `failureRegistered`
 * records that a failure checkpoint was queued, and only the round-trip's entry
 * reads it.
 *
 * The record is kernel-local and resolved once per unit. It appears in no queue
 * argument and no captured callback. {@link OperationIdentity} travels instead.
 * Every unit entry authorises work by comparing that one-field object against
 * the frame's identity, so stale work never has to hold this record. The entry
 * that validated the identity reads the record from the controller's slot and
 * passes it to every helper below it as a parameter.
 */
type OperationRecord = {
  readonly visual: HTMLElement;
  /**
   * The geometry source. It is read before `acquireLift` and is never
   * transactional. The measured landing target stays on the settlement attempt
   * and off the frame for the same reason: the kernel's published slice stays
   * the phase, the identity and the pointer scalars.
   */
  readonly box: HTMLElement;
  /**
   * The element the operation is about. Only `acquireLift` reads it, because
   * `acquireLift` needs the space above it.
   */
  readonly item: HTMLElement;
  /**
   * Non-nullable. So the lifetimes must exist before the record does, and
   * `if (operation)` alone decides whether there is anything to dispose.
   */
  readonly lifetimes: OperationLifetimes;
  cancelRequest: { reason: unknown; origin: CancelOrigin } | null;
  /**
   * Set when `#failOperation` queues a checkpoint and never cleared: that
   * `FAILED` decides the operation, and the flag retires with the record. A
   * demoted failure writes nothing.
   */
  failureRegistered: boolean;
};

/**
 * What the successful activation transaction adds, as a record of its own.
 *
 * This is a second lifetime and not three fields left null until activation.
 * Activation runs in a later transaction than admission and may fail with the
 * operation still alive. Folding these fields into `OperationRecord` would mean
 * a record built partially in one function and completed in another. As
 * separate records, each one is complete where it is constructed.
 *
 * The only invariant is complete or absent. Presence means that the activation
 * transaction acquired these resources. It does not mean that the operation
 * reached a lifecycle state. `#acquireActivation` can throw after this record
 * is assigned, and `activation.effect` runs later still and may fail in its
 * turn. So a live operation can hold a complete record whose effect never ran,
 * and hold it until retirement.
 *
 * The slot is nullable and not discriminated, and it is never a second
 * lifecycle authority: `phase` on the frame is the sole lifecycle discriminant,
 * and it is the one published to behaviors. Read this record for what
 * activation acquired, never for where the operation is.
 *
 * Both names use `Record` because `Activation` is the behavior's activation
 * payload, the type parameter this kernel is generic in.
 */
type ActivationRecord = Readonly<{
  /** The visual's viewport rect at grab. The basis every clamp is relative to. */
  originRect: DOMRectReadOnly;
  lift: VisualLiftSession;
  /**
   * The inverse of the linear part the visual inherited at grab: four numbers or
   * `null`, read once at activation. The landing animation runs on the visual
   * after it is back in flow, and this converts its delta to local units.
   *
   * The item's space is not retained. A translate applies in the space of the
   * element it is written on, and the landing animation's element is the visual.
   */
  visualSpace: InheritedSpace;
}>;

/**
 * The queued classified failure. One object and one closure per failure,
 * because this is not a hot path.
 */
type FailureCheckpoint = Readonly<{
  stage: FailureStage;
  error: unknown;
  operation: OperationIdentity;
  /**
   * Whether a cancel for the operation was registered and unapplied when the
   * checkpoint was registered. Intake captures this value, so the checkpoint's
   * application decides supersession from the record and not from a request
   * read inside the unit that raised it.
   */
  superseded: boolean;
  /**
   * Reports the fault if destruction discards this entry. Destruction stops the
   * checkpoint from deciding the operation, and the fault is still delivered.
   * The `ExecutionLoop` calls this method, by tag, and nothing else does.
   */
  discard(): void;
}>;

/**
 * The attempt lifetime, as a record.
 *
 * Two correlated slots, created per round-trip and cleared together. They are
 * grouped because a class has one flat namespace for instance state: on `this`,
 * a slot that lives for one settlement and a slot that lives for the controller
 * look identical. The record keeps that difference visible, and a field list
 * could not.
 */
type AttemptSlots = {
  /**
   * The command the release unit staged, held from that unit to the
   * `OPEN_RESOLUTION` entry that consumes it. It is cleared with the other
   * slots, so an operation that retires before the entry runs leaves nothing a
   * later operation can read.
   */
  command: ResolutionCommand | null;
  resolution: ResolutionAttempt | null;
};

/**
 * Reads `then` exactly once and returns the callable, or `null`.
 *
 * The resolution round-trip may answer with any `PromiseLike`, not only a
 * native `Promise`, so `then` may be an accessor: one that throws, or one that
 * answers differently on a second read. Reading it twice (once to classify,
 * once to subscribe) would let a value be classified as thenable and then
 * subscribed to as something else. A throw is for the caller to classify as a
 * semantic failure. It is not a kernel invariant violation and must never reach
 * the panic path.
 *
 * This function has one caller, and that is why a single read is sufficient:
 * the resolution round-trip is the only place that accepts a consumer-supplied
 * value as a thenable, so this is the only `then` the kernel ever reads. Every
 * other continuation the kernel awaits is a promise it allocated itself.
 *
 * This is a module function and not a member because it reads no kernel state.
 * Binding it to an instance would suggest that it does.
 */
const thenOf = (value: unknown): PromiseLike<unknown>['then'] | null => {
  // Detached on purpose and read exactly once, for the reason above. The only
  // call supplies `this` again: `then.call(value, …)`.
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const then = (value as PromiseLike<unknown> | null | undefined)?.then;

  return typeof then === 'function' ? then : null;
};

/**
 * Returns one frame to its defaults.
 *
 * One `warnOnThrow` call wraps both resets, and the kernel resets its own slice
 * first. The behavior then resets its part. `resetFramePart` is behavior code
 * that the API permits to throw. An unwrapped throw on the first frame would
 * skip the reset of the second frame and the listener abort, so destruction
 * would not finish. The kernel's own reset cannot throw, so having it inside
 * the same `warnOnThrow` loses nothing.
 *
 * This is a module function with the guard and the behavior as parameters,
 * because its two callers sit on opposite sides of publication: the armed
 * controller's retirement, and the rollback of failed construction, which
 * resets frames composed by a behavior that may never have been armed.
 */
function resetFrame<Part extends object, Activation extends {}>(
  warnOnThrow: WarnOnThrow,
  behavior: BehaviorSpec<Part, Activation>,
  target: Frame<Part>,
): void {
  warnOnThrow(() => {
    frame(target);
    behavior.resetFramePart(target);
  });
}

/**
 * The diagnostic refusal and terminus, written once. The armed controller's
 * route and every channel {@link Kernel.channel} creates deliver through this
 * function, and no other code writes either one:
 *
 * 1. Refuse after application. A channel outlives the unit that created it. A
 *    composition's `report`, captured by an installer and called after
 *    destruction has been applied, would otherwise call `onError` after
 *    application, which the floor forbids outright. The refusal reads the
 *    applied lifecycle only, so its answer is constant across every unit: a
 *    request registered in the unit cannot change it.
 * 2. Pass the finished error to the sink, which forwards it to `onError` and
 *    does nothing else.
 * 3. Discard whatever the sink throws. This is the terminus. A throw from the
 *    sink is never notified again, and this single discard alone keeps the
 *    route from recursing. It also lets every `warnOnThrow` site stay total
 *    without knowing anything about reporting: the catch of that site calls a
 *    route, and a route cannot throw.
 *
 * Panic's report is the one exception, and it does not pass through here.
 *
 * `this` is the `ExecutionLoop`, and the `receiver` parameter is the `this` for
 * `deliver`. So a channel is one bound function with no context of its own, and
 * the armed controller's route reaches its spec with no per-controller wrapper.
 */
function deliverUnlessApplied(
  this: ExecutionLoop,
  receiver: unknown,
  deliver: Notify,
  error: DraggableError | DraggableWarning,
): void {
  if (this.closed) {
    return;
  }

  try {
    deliver.call(receiver, error);
  } catch {
    // The terminus. Reporting a reporting failure is the one recursion this
    // model must make impossible. Making it impossible is stronger than being
    // careful.
  }
}

/**
 * The armed controller's sink: the spec's `reportError`, read and called with
 * its `this` at each delivery, and only after the refusal has let it through.
 * The spec contract does not say that this method may be called detached or
 * read once.
 */
function reportToSpec(
  this: Readonly<Pick<BehaviorSpec<never, never>, 'reportError'>>,
  error: DraggableError | DraggableWarning,
): void {
  this.reportError(error);
}

/**
 * The armed controller. It owns the frame pair, the `BehaviorRunner`, the
 * operation and activation records, the attempt slots, the landing animation,
 * the click suppressor and steps 3–6 of teardown, and it runs every handler.
 *
 * Construction's unit creates it complete, and it is never reassigned. The
 * spec, the frame pair, the runner, the `ExecutionLoop`, the listener signal,
 * the transition adapters and the controller's route are `readonly` fields
 * filled before any handler can run, so no reader tests whether they are there.
 * Construction publishes the controller to the {@link Kernel} façade only once
 * it exists. So "a behavior is armed" and "the runner is assigned" are one
 * fact.
 *
 * The current-operation slots are read in three places only: at a unit's entry,
 * which resolves the operation and activation records once and passes them down
 * as parameters; at request intake; and by the statements that publish or
 * retire them. No unit reads a request after its entry: the lifecycle request,
 * a cancel request and a registered failure are read by the runner, at unit
 * entries and at intake, and nowhere below.
 *
 * Kernel-internal. No behavior or consumer ever holds it. The façade forwards
 * the members a behavior may call, and the four `ExecutionLoop` callbacks and
 * the report a discarded fault entry carries reach the rest.
 */
class ArmedController<Part extends object, Activation extends {}> {
  /** The owning document/window. Every DOM access goes through it. */
  readonly #realm: DOMRealm;

  /** The root element, where listeners bind, passed to `draggable()`. */
  readonly #root: HTMLElement;

  /**
   * The façade's `ExecutionLoop`: the lifecycle request, the queue and
   * teardown. Held for `dispatch`, the native event refusal and the closed
   * reading.
   */
  readonly #loop: ExecutionLoop;

  /**
   * The façade's listener signal. Every listener the controller binds for its
   * own life is bound under it, so the façade's abort at step 7 releases them.
   */
  readonly #listenerSignal: AbortSignal;

  readonly #spec: BehaviorSpec<Part, Activation>;

  /** The frame pair and the protocol over it, composed by construction. */
  readonly #frames: FrameTransaction<Part>;

  /** The phase machine over that pair, held for the controller's life. */
  readonly #runner: BehaviorRunner<Part>;
  #nextOperationId = 0;

  /* ---- per-operation state, two records dropped whole at retirement ---- */
  #operation: OperationRecord | null = null;
  #activation: ActivationRecord | null = null;

  readonly #attempts: AttemptSlots = {
    command: null,
    resolution: null,
  };

  /* ---- the controller's route ---- */

  /**
   * Every fault the kernel surfaces leaves through here. This is the kernel's
   * own route to the spec's `reportError`, not a channel created through
   * {@link Kernel.channel}. It applies the refusal and terminus that
   * {@link deliverUnlessApplied} states, so it refuses after application and
   * absorbs a throw from the behavior. Its collaborators take it as a value:
   * the runner, every operation's lifetimes, this controller's `warnOnThrow`,
   * and the rollback of construction when construction fails after publishing
   * this controller.
   *
   * This route takes no stage, on purpose. The sites that reach it holding a
   * real `FailureStage` discard that stage: the demoted checkpoints, the
   * demotion in `#failOperation`, and a {@link Kernel.fail} outside a call into
   * behavior code. In each site, the stage describes a classification the
   * kernel has just decided not to apply. Carrying it into a warning would
   * publish a statement about the operation that the code refused to make.
   */
  readonly report: Notify;

  /**
   * `warnOnThrow`, over this controller's route.
   *
   * One closure per kernel and not a free function: every call site reads
   * `warnOnThrow(fn)` either way, and passing the route's identity through each
   * of them would put reporting at every site that only wants the next
   * statement to run.
   */
  readonly #warnOnThrow: WarnOnThrow;

  /**
   * True while a checkpoint's report transition is running, including its
   * `prepare`. That `prepare` runs before `REPORTING` is committed, so the
   * phase alone cannot show it yet.
   */
  #reporting = false;

  /**
   * The behavior action being run. A slot is safe: transitions are
   * non-reentrant.
   */
  #actionTag = 0;
  #actionArgument: unknown = null;

  /**
   * Called once, by construction, with both frames composed. Nothing here runs
   * code the kernel does not own or can throw, so the controller exists
   * complete or not at all.
   */
  constructor(
    realm: DOMRealm,
    root: HTMLElement,
    loop: ExecutionLoop,
    listenerSignal: AbortSignal,
    spec: BehaviorSpec<Part, Activation>,
    current: Frame<Part>,
    draft: Frame<Part>,
  ) {
    // The route reads the controller's fields and not the parameters. The
    // runner's callback below already puts `this` in this constructor's
    // context, so the route adds one closure and no context of its own.
    this.report = (error): void => {
      deliverUnlessApplied.call(this.#loop, this.#spec, reportToSpec, error);
    };
    this.#warnOnThrow = createWarnOnThrow(this.report);
    this.#realm = realm;
    this.#root = root;
    this.#loop = loop;
    this.#listenerSignal = listenerSignal;
    this.#spec = spec;
    this.#frames = new FrameTransaction(current, draft);
    this.#runner = new BehaviorRunner<Part>(
      this.#frames,
      (stage, error) => {
        this.#failOperation(stage, error);
      },
      // The runner reports without classifying. It does not use
      // `#failOperation`, which would settle a drop whose reorder already
      // happened. There is also no second destination to choose: a separate
      // platform reporter would receive a consumer's own destructive rerender.
      // So the `QUALITY` and `BEST_EFFORT` tiers collapse into one sentinel.
      //
      // Do not add a lifetime guard at this site. The guard belongs in the
      // shared refusal, where every route has it. A quality fault's producer
      // reaches consumer code (a `home` resolver, a landing policy), and it can
      // also request destruction before it throws.
      this.report,
    );
  }

  // -------------------------------------------------------------------------
  // Teardown
  // -------------------------------------------------------------------------

  /**
   * Step 3 of teardown: the kernel's own attempt records.
   *
   * A late resolution has no effect after this: it validates against the slot
   * it was created for, which is now empty.
   */
  #retireAttempts(): void {
    this.#attempts.command = null;
    this.#attempts.resolution = null;
  }

  /**
   * The reset retirement applies to both frames.
   *
   * One closure per controller and not one per retirement. It is a value and
   * not a method because the frame pair applies it to its two frames. The
   * committed frame is written in place here, and no reader of that frame can
   * do this write.
   */
  readonly #clearFrame = (target: Frame<Part>): void => {
    resetFrame(this.#warnOnThrow, this.#spec, target);
  };

  /**
   * Steps 3–6 of teardown, written once. Operation retirement and physical
   * teardown share them and differ only in what surrounds them.
   */
  #disposeOperationState(): void {
    // 3. kernel attempts.
    this.#retireAttempts();

    // 4. behavior references.
    this.#warnOnThrow(this.#spec.retire);

    // 5. presentation → motion → cancellation, LIFO, best-effort. Releases
    //    pointer capture, removes the placeholder and restores inline styles.
    if (this.#operation) {
      this.#warnOnThrow(this.#operation.lifetimes.dispose);
    }

    // 6. both frames, each reset individually wrapped.
    this.#frames.retire(this.#clearFrame);

    // Drop the records last. The reason is a proof and not a runtime effect.
    // The two parts below make different statements.
    //
    // Observable: the records must survive steps 4 and 5. Behavior and consumer
    // code runs inside `spec.retire` and inside the disposal, and
    // `current.operation` still names the operation throughout, so every guard
    // those callbacks reach still authorises work. A drop above step 4 leaves
    // such a guard reading a null record. A drop between steps 4 and 5 skips
    // disposal, because `if (operation)` alone decides whether there is
    // anything to dispose.
    //
    // Structural: after step 5 nothing is left to observe. `resetFrame` nulls
    // the frame's identity before it runs anything, and the two calls ahead of
    // that cannot re-enter: `warnOnThrow` calls nothing ahead of its callback,
    // and `frame` is an `Object.assign` over a plain literal. The records are
    // dropped here anyway so that `current.operation !== null` ⟹
    // `operation !== null` holds directly from statement order at every program
    // point. That implication is the unchecked premise of every `operation!` in
    // this file. This is a proof and maintenance property, not a window a guard
    // could catch.
    this.#operation = null;
    this.#activation = null;
  }

  /**
   * Operation retirement: the seven-step teardown minus steps 1, 2 and 7.
   *
   * `identity` is always the operation the caller resolved. A retirement whose
   * operation is no longer the committed one is a no-op.
   */
  #retireOperation(identity: OperationIdentity): void {
    if (this.#frames.current.operation !== identity) {
      return;
    }

    this.#disposeOperationState();
  }

  /**
   * The landing animation: an additive contribution to the `translate` of the
   * visual after presentation is disposed. The contribution decays to zero.
   * `null` means that no animation is in flight.
   *
   * This slot is controller-scoped, like the click suppressor. The animation
   * continues after its operation ends, so an operation-scoped slot would be
   * cleared before `#cancelLandingAnimation` reads it.
   *
   * One slot is enough. `#acquireActivation` empties this slot before every
   * activation and cancels what it held, on whichever element that animation
   * runs. `#startLandingAnimation` runs at most once per activated operation,
   * so it always finds the slot empty.
   *
   * Only activation and step 7 of physical teardown cancel the animation.
   * Operation retirement and a press that does not activate leave it running.
   *
   * A finished animation is left in the slot and not cleared through a
   * subscription: cancelling one is a no-op, and one retained {@link Animation}
   * on a live element is cheaper than a promise per landing.
   */
  #landingAnimation: Animation | null = null;

  /**
   * Use `cancel()`, not `finish()`. The contribution decays to zero, so
   * cancelling it leaves the visual exactly where flow puts it, with nothing to
   * restore.
   *
   * `cancel` is a method on an object reachable from a consumer-owned element,
   * so the call goes through `#warnOnThrow`. This method runs inside activation
   * and inside teardown, and the next statement in both must run.
   */
  #cancelLandingAnimation(): void {
    const running = this.#landingAnimation;

    if (running) {
      this.#landingAnimation = null;
      this.#warnOnThrow(() => {
        running.cancel();
      });
    }
  }

  /**
   * This controller's part of physical teardown: steps 3–6, then the landing
   * animation at step 7. The façade's teardown callback calls this, and it
   * aborts the listeners in its own `finally` after this returns or throws.
   *
   * Totality is a property of the sequence wherever it runs, not of the stack
   * that requested closure: each attempt cleanup is individually wrapped in
   * step 3, each frame reset in step 6, and step 7 is in a `finally`. So no
   * behavior callback can stop a later step at the boundary any more than it
   * could on the closing stack.
   */
  teardown(): void {
    try {
      this.#disposeOperationState();
    } finally {
      // 7, this controller's part: no earlier step may leave a landing
      // animation running on an element the controller no longer owns.
      this.#cancelLandingAnimation();
    }
  }

  /**
   * A throw that escapes a handler is an invariant violation: close, then
   * report the initiating error, then tear down.
   *
   * Delivering that report after logical closure is allowed because it solicits
   * nothing: a terminal diagnostic tells the consumer something and asks
   * nothing of them. The report fulfils a duty that existed before the close
   * and that the close did not create. The fault escaped `handle`, so it is the
   * reason for the closure and not its product, and no other route is left to
   * account for it. Nothing the kernel does next depends on the call. The call
   * publishes no lifecycle or domain event, its return value is ignored, and it
   * is wrapped. This comment does not count which sites share that property:
   * that list is maintained where the exception is stated, and the shared
   * refusal drops every site that lacks it.
   *
   * Reporting first and destroying second would run consumer code on a
   * controller whose invariants are already known to be broken. The consumer
   * could also start work that the next statement tears down. Closing first is
   * the more predictable of the two.
   *
   * Panic is consequential and carries no stage. It destroys the whole
   * controller and not one operation, so it is a `DraggableError`.
   * `FailureStage` classifies faults within an operation, so there is nothing
   * to classify. The stage is `null`, which means that the controller is
   * destroyed and means nothing else. A catch-all value standing in for the one
   * the type cannot hold would lose the distinction that matters here: a
   * consumer could not tell a panicked controller from a failed
   * `requestAnimationFrame`.
   *
   * A checkpoint that a panic discards stays silent, because of the route the
   * throw takes. The throw leaves the drain, so the walk that reports a
   * discarded fault never reaches the entries behind it. This one report is all
   * that a panic delivers.
   */
  panic(error: unknown): void {
    // The one diagnostic delivered after application: the diagnosis. The
    // `ExecutionLoop` closed before calling this and tears down after it
    // returns, so the shared refusal would drop the report. So the report goes
    // to the spec's sink directly, behind its own terminus.
    try {
      this.#spec.reportError(new DraggableError(null, error));
    } catch {
      // The terminus, as in the shared route.
    }
  }

  /**
   * Registers a cancellation against the operation committed at intake, and
   * queues the `CANCEL` entry that applies it.
   *
   * It registers only in a cancellable phase: `PENDING`, `ACTIVATING`, `ACTIVE`
   * or `RELEASING`. From `SETTLING` on, the operation is decided, so a cancel
   * would have nothing to apply to, and an operation that never consumes it
   * would only hold it. The call is a no-op in those phases, with no operation,
   * on a duplicate, and after destruction has been applied. The first
   * registration wins, with its reason and origin.
   *
   * Registration changes nothing the running unit uses. The request is read at
   * unit entries (`CANCEL`, `ACTIVATE`, `MOVE` at `PENDING`, `START_COMMITTED`,
   * `OPEN_RESOLUTION` and `FAILED`) and at failure intake, and never below a
   * unit entry.
   *
   * This method is request intake, so it is one of the places that read the
   * operation slot.
   */
  #cancelWith(reason: unknown, origin: CancelOrigin): void {
    const { phase } = this.#frames.current;

    if (
      this.#loop.closed ||
      phase < PENDING ||
      phase > RELEASING ||
      this.#operation!.cancelRequest
    ) {
      return;
    }

    this.#operation!.cancelRequest = { reason, origin };
    this.#loop.dispatch(CANCEL, this.#frames.current.operation);
  }

  /**
   * The supplied cancel the façade forwards; see
   * {@link Kernel.requestCancel}.
   */
  requestCancel(reason?: unknown): void {
    this.#cancelWith(reason, CANCEL_SUPPLIED);
  }

  /**
   * Queues a classified failure against the operation the kernel currently
   * holds. A failure with no live operation, and a failure of the report
   * itself, has no checkpoint to run and degrades to a warning through the
   * controller's route.
   */
  #failOperation(stage: FailureStage, error: unknown): void {
    const identity = this.#frames.current.operation;

    // A checkpoint queued while a report is in flight could only be dropped by
    // the `REPORTING` guard in `#handleFailed`, which would lose the error.
    // `onError` runs exactly once per failure and never replaces the initiating
    // error, so the second failure takes the non-consequential channel and does
    // not get a second turn at deciding the operation. It is not a panic: a
    // behavior that fails to map or surface a failure does not break an
    // invariant, and the operation still retires.
    //
    // `#reporting` spans the whole report transition. The phase test is
    // unreachable today: `REPORTING` is entered and left inside one drain, so
    // nothing asynchronous can observe it. The test stays only so that making
    // `ERROR_REPORTED` asynchronous later cannot silently let the error be lost
    // again.
    //
    // These are context checks, not request reads. A held cancel does not
    // demote here: the checkpoint is queued and registered, and its application
    // decides whether the cancel supersedes it, from what intake records below.
    if (
      this.#loop.closed ||
      !identity ||
      this.#reporting ||
      this.#frames.current.phase === REPORTING
    ) {
      // Demoted, not dropped. The `return` decides: whatever is in flight
      // already owns the terminal, so the kernel refuses this classification
      // and the fault travels without one. The `stage` parameter is discarded
      // for that reason.
      this.report(
        new DraggableWarning('drag: failure/not-classified', { cause: error }),
      );
      return;
    }

    const live = this.#operation!;

    // Registration, not application. It changes nothing a running unit uses.
    // The held command, the attempts and the phase belong to `FAILED`.
    live.failureRegistered = true;

    // Dispatched, not only enqueued. A failure raised inside behavior code
    // appends to the drain that is already running, but one raised from an
    // asynchronous continuation is the outermost stack frame, and nothing else
    // would ever drain it.
    //
    // Supersession is captured here and decided at application. A cancel
    // registered and unapplied now outranks this checkpoint under
    // `DESTROY > CANCEL > FAILURE_CHECKPOINT`, and the record carries that to
    // the `FAILED` entry, which may also find a cancel registered since.
    this.#loop.dispatch(FAILED, {
      stage,
      error,
      operation: identity,
      superseded: live.cancelRequest !== null,
      discard: (): void => {
        this.report(
          new DraggableWarning('drag: failure/superseded-by-destruction', {
            cause: error,
          }),
        );
      },
    } satisfies FailureCheckpoint);
  }

  /**
   * Drops whatever a transition staged, for the transitions the kernel runs
   * directly.
   *
   * The settlement and the failure report both stage a sentinel that the
   * transition's `effect` consumes and nothing reads afterwards. Leaving them
   * in the runner's slot would let the next transition that commits without
   * staging anything give a caller a plan belonging to a transaction that is
   * over. That is why the slot is consume-and-clear.
   */
  #dropStaged(): void {
    this.#runner.consumeStaged();
  }

  // -------------------------------------------------------------------------
  // Admission — native dispatch, not queued
  // -------------------------------------------------------------------------

  #onPointer(event: PointerEvent): void {
    // The producer-side half of the double validation; the handler checks the
    // pointer identity again against the committed frame.
    if (event.pointerId !== this.#frames.current.pointerId) {
      return;
    }

    switch (event.type) {
      case POINTER_MOVE:
        this.#loop.dispatch(MOVE, event);
        break;
      case POINTER_UP:
        this.#loop.dispatch(UP, event);
        break;
      // Two DOM spellings of one fact: the pointer stream ended without a drop.
      // They share a case and are not told apart. The kernel exists to absorb
      // the platform detail, and the consumer receives the fact instead.
      case POINTER_CANCEL:
      case LOST_POINTER_CAPTURE:
        this.#cancelWith(undefined, CANCEL_INTERRUPTED);
        break;
      default:
        break;
    }
  }

  /**
   * The two input handlers as values, bound once per kernel and not once per
   * operation. They are arrow wrappers and not detached methods:
   * `armPointerInput` and `armCancelInput` install them as listeners, and a
   * listener is called with the event target as `this`.
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
   * The pointer path and the command path share it, because a second input mode
   * adds a second kind of native event and not a second protocol: the throw
   * policy and the `preventDefault()` ownership are one rule each, in one
   * place.
   *
   * The kernel owns `preventDefault()`. The behavior answers feasibility with
   * its return value, and the kernel, which owns the listener, performs the
   * browser effect. A behavior can still prevent the default itself, because it
   * holds the event, and nothing here refuses that.
   *
   * `prevents` is where the two paths differ. The ownership is the same on both
   * and the timing is not. The pointer path prevents at the threshold crossing
   * instead, because `pointerdown` cannot know intent. The command path
   * prevents here, and that is correct and not an exception: a `keydown`
   * default cannot be prevented after its listener has returned, that path has
   * no threshold to move the call to, and a command's admission answers the
   * intent question, so a non-null return already means the key was meant for
   * the drag.
   */
  #runAdmission(
    event: Event,
    admit: (event: never, draft: Frame<Part>) => AdmissionSubject | null,
    prevents: boolean,
  ): AdmissionSubject | null {
    let admitted: AdmissionSubject | null;

    try {
      admitted = admit(event as never, this.#frames.draft);
    } catch (error) {
      // No identity was created, so there is no operation for a checkpoint to
      // settle and no `REPORTING` phase to enter. The controller stays idle and
      // usable, and the behavior surfaces the diagnostic.
      //
      // This report is consequential. The consumer's drag will not start and no
      // `onEnd` will follow, which changes the terminal result by any reading.
      // So it is a `DraggableError`, built here from the stage the kernel owns.
      //
      // This site handles neither a destruction the resolver requested nor a
      // throwing `onError`. Both belong to the controller's route,
      // {@link deliverUnlessApplied}, which refuses only after application and
      // absorbs a throwing sink for every route, not only this one.
      this.report(new DraggableError(FAILURE_ADMISSION, error));

      return null;
    }

    if (!admitted) {
      // Declining is total: no operation, no phase change, and the default is
      // not prevented. So an arrow key on an edge item keeps its native
      // meaning.
      return null;
    }

    if (prevents) {
      event.preventDefault();
    }

    // Published unconditionally. An admission member runs consumer-supplied
    // handle and visual resolvers, and a resolver that requests destruction or
    // a cancel has registered a request: destruction is applied when this pass
    // ends and tears the operation down, and a cancel finds no committed
    // operation to register against. Nothing a resolver can call publishes an
    // operation, because the `ExecutionLoop` refuses a nested pass.
    return admitted;
  }

  /**
   * Creates the identity, arms this operation's input, and commits `PENDING`.
   *
   * `pointerId === -1` marks a pointerless operation. It is a discriminant and
   * not a sentinel: it selects which listeners are armed. The kernel's own
   * geometry never reads the pointer fields, which stay at their admission
   * values on that path.
   *
   * The record is a local until it is published, and it is published in the
   * same statement run as the frame commit. A failure while creating the
   * operation therefore owns the only reference to what it armed: it disposes
   * that and touches no frame and no controller slot.
   */
  #createOperation(
    subject: AdmissionSubject,
    pointerId: number,
    x: number,
    y: number,
  ): boolean {
    const identity: OperationIdentity = { id: (this.#nextOperationId += 1) };
    // Discriminated by `'visual' in subject` and not `instanceof`: `instanceof`
    // is realm-sensitive, and `DOMRealm` exists because an element may come
    // from another document. A bare element means that all three coincide.
    const parts = 'visual' in subject;

    // One literal, so the record is complete when it exists. The lifetimes are
    // constructed inside it and not assigned afterwards, so the field can be
    // non-nullable.
    const live: OperationRecord = {
      visual: parts ? subject.visual : subject,
      box: parts ? subject.box : subject,
      item: parts ? subject.item : subject,
      lifetimes: createOperationLifetimes(this.report),
      cancelRequest: null,
      failureRegistered: false,
    };

    try {
      if (pointerId !== -1) {
        armPointerInput(
          this.#realm,
          live.lifetimes.motion.signal,
          this.#pointerHandler,
        );
      }

      armCancelInput(
        this.#realm,
        live.lifetimes.cancellation.signal,
        this.#escapeHandler,
      );
    } catch (error) {
      // Nothing is published yet: the frames never saw this operation and the
      // controller holds no reference to it. So disposing what was armed is all
      // of its retirement.
      //
      // This site does not need a second channel. It looks like the one place
      // that requires a platform report, because the identity is a local never
      // published to the frames, so `#failOperation` would degrade anyway. But
      // the route is operation-independent, so that reason does not hold: a
      // warning needs no operation and no stage, and `return false` refuses
      // admission, so the outcome is the same either way.
      this.#warnOnThrow(live.lifetimes.dispose);
      this.report(
        new DraggableWarning('drag: operation/arming-failed', { cause: error }),
      );
      return false;
    }

    this.#operation = live;
    this.#frames.draft.operation = identity;
    this.#frames.draft.pointerId = pointerId;
    this.#frames.draft.originX = x;
    this.#frames.draft.originY = y;
    this.#frames.draft.pointerX = x;
    this.#frames.draft.pointerY = y;
    this.#frames.commit(PENDING);
    return true;
  }

  #admitPress(event: PointerEvent): void {
    // `false`: the pointer path prevents at the threshold crossing.
    const admitted = this.#runAdmission(event, this.#spec.admit, false);

    if (admitted) {
      this.#createOperation(
        admitted,
        event.pointerId,
        event.clientX,
        event.clientY,
      );
    }
  }

  /**
   * The discrete admission. It is identical to the pointer path except for two
   * differences: the operation is pointerless, and `ACTIVATE` is queued and not
   * reached inline from a threshold crossing.
   *
   * The pointer scalars stay at zero and nothing reads them: `originRect` is
   * measured from the visual and already does not depend on the pointer.
   */
  #admitCommand(event: Event): void {
    const admitted = this.#runAdmission(event, this.#spec.command!.admit, true);

    if (admitted && this.#createOperation(admitted, -1, 0, 0)) {
      this.#loop.dispatch(ACTIVATE, this.#frames.current.operation);
    }
  }

  /**
   * The kernel's part of native event handling, shared by both listeners.
   *
   * The operation guard is a precondition of the call, and it is the only check
   * that may stand here. The re-entry refusal belongs to the `ExecutionLoop`,
   * and it must, because everything below it is already too late. A handle or
   * visual resolver runs inside an admission member. A resolver that dispatches
   * a second native event re-enters this function synchronously with the outer
   * transaction partly written. `current.operation` is still `null` at that
   * point, because the outer admission has not committed, so the ordinary guard
   * lets the nested event through.
   *
   * The nested pass would then `begin()` (rebuilding the draft the outer member
   * received by reference), run the member a second time, create an identity,
   * arm input, and commit its own origin. Control returns to the outer member,
   * which finishes writing its item and visual into the object that is now
   * `current`. That publishes an operation with one press's coordinates and the
   * other's behavior state. So `begin` is passed to the `ExecutionLoop` and
   * runs only on a pass the loop did not refuse. No code a consumer can reach
   * sits between the guard here and the guards in the loop.
   *
   * The loop's flag is one across both listeners. So the same rule refuses a
   * `pointerdown` dispatched from inside `command.admit` and a `keydown`
   * dispatched from inside `admit`.
   */
  #admitIfNoOperation(admit: () => void): void {
    if (this.#frames.current.operation) {
      return;
    }

    this.#loop.runNativeEvent(admit);
  }

  /**
   * Disarms the one-shot `click` suppressor, or `null` when none is armed.
   *
   * This slot must be controller-scoped and not operation-scoped. The `click`
   * arrives after the operation ends, so a listener on the motion or
   * presentation lifetime would be disposed before the event it exists to
   * catch. The listener signal is the only lifetime that outlives the operation
   * and still ends with the controller.
   */
  #disarmClick: (() => void) | null = null;

  /**
   * Arms the suppressor at the threshold crossing. `click` survives for this
   * reason: only `pointerdown` was ever prevented, `click` is generated from
   * the un-prevented `pointerup`, and so a drop that lands on an `<a href>`
   * navigates.
   *
   * Only after activation. A press that never became a drag must keep its
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

    this.#realm.document.addEventListener(
      CLICK,
      (event) => {
        disarm();
        event.preventDefault();
        event.stopPropagation();
      },
      {
        capture: true,
        once: true,
        // Composed with the listener signal and not aborted by hand in
        // teardown: "disarmed by teardown" then holds with no extra code, and
        // the step-7 abort needs no clause about a listener it does not know.
        signal: AbortSignal.any([aborter.signal, this.#listenerSignal]),
      },
    );
  }

  #onPointerDown(event: PointerEvent): void {
    // The disarm also stays behind the `ExecutionLoop`'s refusal. A press
    // dispatched from inside a running unit is refused before it touches any
    // state, and the suppressor slot is state.
    if (!this.#loop.idle) {
      return;
    }

    // A new press disarms the suppressor, and this runs before the
    // primary-press test and not inside it. A one-shot that never fired must
    // not survive to catch an unrelated click. A press that begins a new
    // interaction signals that the old one is over as well as the click itself
    // does, whichever button it used.
    this.#disarmClick?.();

    // The primary-press test belongs to the pointer path and stays outside the
    // shared `#admitIfNoOperation`: a secondary button must not open a
    // transaction at all.
    if (isPrimaryPress(event)) {
      this.#admitIfNoOperation(() => {
        this.#admitPress(event);
      });
    }
  }

  /**
   * The two root listeners as values, bound once per kernel. They are arrow
   * wrappers and not detached methods: a listener is called with the event
   * target as `this`.
   *
   * Their identities are stable, and the command handler's identity must be.
   * `addEventListener` de-duplicates on (type, callback, capture), so a
   * repeated entry in `command.types` is a no-op and not a refusal. A closure
   * created per entry would bind twice.
   */
  readonly #pointerDownHandler = (event: PointerEvent): void => {
    this.#onPointerDown(event);
  };

  readonly #commandHandler = (event: Event): void => {
    this.#onCommand(event);
  };

  #onCommand(event: Event): void {
    this.#admitIfNoOperation(() => {
      this.#admitCommand(event);
    });
  }

  // -------------------------------------------------------------------------
  // Activation
  // -------------------------------------------------------------------------

  readonly #activationPolicy = {
    // A discard retires: there is no committed operation with no presentation.
    // A failure does not retire: the queued checkpoint owns it, and retiring
    // here would make that entry stale. The committed frame still names the
    // operation being activated, because the transition did not commit.
    retire: (): void => {
      this.#retireOperation(this.#frames.current.operation!);
    },
    // Queued unconditionally. `activation.effect` calls the consumer's
    // `onStart` last, and a cancel or destroy it raises is applied at a
    // boundary: destruction discards this entry, and the entry itself reads a
    // held cancel.
    committed: (): void => {
      this.#loop.dispatch(START_COMMITTED, this.#frames.current.operation);
    },
  };

  /**
   * Acquires everything the activation transition needs before it opens: the
   * origin rect, the lift, and pointer capture on `root`.
   *
   * Capture is validated and not assumed, because `admit` may return any
   * element and a consumer resolver can detach things. A capture failure is
   * `FAILURE_ACTIVATION`, not a silently degraded drag.
   *
   * Publishes the activation record, and reads it back from the local it was
   * built in and not from the slot.
   */
  #acquireActivation(live: OperationRecord): ActivationScope | null {
    try {
      // Cancel before the origin measurement. That ordering is why this call is
      // here and not at admission. Measuring a visual during its landing
      // animation is right, because the drag should start from where the
      // element looks. But a running animation outranks inline styles in the
      // cascade, so the lift's own writes would compose with a contribution
      // that is still decaying.
      //
      // A press that never crosses the threshold keeps whatever is in flight,
      // which is why this is not at `pointerdown`.
      this.#cancelLandingAnimation();

      const rect = live.visual.getBoundingClientRect();
      // Window 1 of 2. Read it here, before `acquireLift`, because the visual
      // leaves flow on that line, and everything the footprint rule needs sits
      // on opposite sides of it. One statement later, both windows would see
      // the collapsed layout and the difference would be zero.
      //
      // Use an offset box and not a bounding rect: by window 2 the visual
      // carries a transform, which moves a rect's top by the full travel and
      // leaves its height alone. See `OffsetBox`.
      const boxPre: OffsetBox = {
        width: live.box.offsetWidth,
        height: live.box.offsetHeight,
      };
      // One acquisition, three products. `acquireLift` reads both inherited
      // spaces before it mutates anything, from computed style alone. No
      // behavior may take a later read for either.
      const { session, visualSpace, itemSpace } = acquireLift(
        live.visual,
        live.item,
        this.#spec.config.liftMode,
        rect,
        this.#realm,
        this.#warnOnThrow,
      );

      const activation: ActivationRecord = {
        originRect: rect,
        lift: session,
        visualSpace,
      };

      this.#activation = activation;
      live.lifetimes.presentation.use(session.dispose);

      // Neither step runs for a pointerless operation: there is no pointer to
      // capture, so the connectivity precondition of capture has nothing to
      // guard either. `originRect` above is measured from the visual and
      // already does not depend on the pointer.
      if (this.#frames.current.pointerId !== -1) {
        if (!this.#root.isConnected) {
          throw new Error('drag: activation/root-disconnected');
        }

        live.lifetimes.motion.use(
          acquirePointerCapture(this.#root, this.#frames.current.pointerId),
        );
      }

      return {
        visual: live.visual,
        // Read back from the record that `#measureTarget` reads, so the scope
        // and the landing measurement can never disagree about the grab basis.
        originRect: activation.originRect,
        // The kernel's own admission-time state, not a behavior-authored draft
        // field read back.
        box: live.box,
        boxPre,
        // Read back from the same record: the landing animation applies in this
        // space, and it must match what the behavior receives.
        visualSpace: activation.visualSpace,
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

  #activate(live: OperationRecord): void {
    const scope = this.#acquireActivation(live);

    if (!scope) {
      return;
    }

    runActivationTransition(
      this.#runner,
      this.#spec.activation,
      scope,
      FAILURE_ACTIVATION,
      ACTIVATING,
      this.#activationPolicy,
    );
  }

  // -------------------------------------------------------------------------
  // Transition adapters, built once per controller
  // -------------------------------------------------------------------------

  /**
   * Release cannot discard: `prepare` returns a command and motion is already
   * closed, so "changed my mind" has no meaning.
   *
   * A release that cannot build a command throws, like every other transition.
   * There is no second return branch and no adapter between the two: the phase
   * is already open at `FAILURE_RELEASE`, so `#callAndHandleFailure` catches
   * the throw, calls `context.fail` with that stage and returns
   * `TRANSITION_PREPARE_FAILED`. A behavior that wants a different stage still
   * has `fail`, which records the failure and is on `BehaviorContext`.
   */
  readonly #releaseTransition: Transition<Part, ResolutionCommand> = {
    prepare: (target) => this.#spec.release.prepare(target),
    effect: (committed, prepared) => {
      this.#spec.release.effect(committed, prepared);
    },
  };

  readonly #actionTransition: Transition<Part, {}> = {
    prepare: (target) =>
      this.#spec.action.prepare(this.#actionTag, this.#actionArgument, target),
    effect: (committed, prepared) => {
      this.#spec.action.effect(
        this.#actionTag,
        this.#actionArgument,
        committed,
        prepared,
      );
    },
  };

  /**
   * The settlement transition.
   *
   * The settlement travels as the transition's capability, which the runner
   * passes to both phases: `prepare` takes its input and `effect` takes its
   * operation's lifetimes. A `prepare` that finds no coherent settlement throws
   * and is classified at this transition's own `FAILURE_RESOLUTION`. A
   * fulfilled value that is not an explicit resolution is that failure, and
   * acceptance is never inferred.
   */
  // `Prepared` is the `true` sentinel `Transition` defaults to: settlement
  // stages nothing.
  readonly #settlementTransition: Transition<Part, true, SettlementAttempt> = {
    prepare: (target, attempt) =>
      this.#spec.settlement.prepare(target, attempt.input),
    effect: (committed, prepared, attempt) => {
      // Between the commit and the behavior's effect: the operation is decided,
      // so nothing may still cancel it. Motion is closed here too and not only
      // at release, because a cancel at `ACTIVE` reaches settlement with input
      // still open. Each close takes effect once, so a release that already
      // closed motion pays nothing.
      const owned = attempt.lifetimes;

      owned.motion.dispose();
      owned.cancellation.dispose();
      this.#spec.settlement.effect(committed, prepared);
    },
  };

  /**
   * Writes the landing target into the attempt.
   *
   * This method runs once per committed settlement. The serial authored commit
   * guarantees that the authored DOM is final here. A second, advisory call
   * would read a stale target, and the landing animation would travel the
   * inverse of a delta nothing else agrees with. The symptom is a landing that
   * opens with a jump and still ends correctly, because disposing presentation
   * puts the visual in place.
   *
   * The call does not depend on whether an animation follows: `landingTail`
   * decides that, and it receives the delta this measurement produces.
   *
   * A measurement throw is not classified. Failing the settlement for it would
   * tell a consumer whose reorder is already committed and accepted that it
   * failed, over a presentational fault. The behavior's own check that the
   * target can be trusted reports through the same throw: a target that cannot
   * be produced and one that cannot be trusted are the same fault.
   *
   * A warning reaches `onError` without a stage, so this fault has no
   * landing-target stage.
   */
  #measureTarget(
    activation: ActivationRecord,
    attempt: SettlementAttempt,
  ): void {
    // `anchorTarget` is behavior code, and a cancel or destroy it raises is a
    // request: the settlement this unit opened completes, and the request is
    // applied after it.
    const anchor = this.#runner.runCallbackWarningOnFailure(
      () => this.#spec.anchorTarget(this.#frames.current),
      'drag: landing/target-unavailable',
    );

    if (anchor === undefined) {
      // The runner has already delivered `onError`. `targetX` stays `null`, so
      // no landing animation starts. The settlement does not fail and the
      // domain result stands, because the reorder already happened in the DOM.
      //
      // Do not fall back to the unrepaired position: a detached placeholder
      // reads `0×0` at the viewport origin, so the animation would travel to
      // `(0,0)` and the visual would then jump back.
      return;
    }

    const origin = activation.originRect;

    // `anchorTarget` produces a viewport point, and `compose` and `lift.write`
    // consume an origin-relative delta, so the kernel converts once, here.
    // `anchor` is never referenced after these two lines: a behavior may return
    // one reusable buffer per controller, and the first-party ones do.
    attempt.targetX = anchor.x - origin.x;
    attempt.targetY = anchor.y - origin.y;
  }

  /**
   * Starts the optional landing animation, which reduces the residual
   * displacement to zero. Call this after presentation is disposed.
   *
   * The animation may outlive the operation because it owns nothing:
   * - It has no fill, so it writes no inline style and is invisible to a
   *   consumer reading or setting one.
   * - It reverts by itself, so no code has to clean it up.
   * - One call cancels it to a settled state.
   * - It ends with the element, so removal, reparenting and replacement need no
   *   handling.
   *
   * The animation adds to the individual `translate` property. Do not use
   * `transform`:
   * - A non-additive `transform` animation replaces an authored `rotate(4deg)`
   *   for the duration, and it overrides a consumer's own running transform
   *   animation.
   * - Additive transform lists concatenate, so the offset would sit inside the
   *   element's own `scale()` and move it by a multiple of a viewport delta.
   * - An inverse `transform` would have to correct for the `transform-origin`
   *   the visual was restored to.
   *
   * `translate` applies before `transform`
   * (`translate → rotate → scale → transform`), so the offset stays outside the
   * element's own transform and needs no correction.
   *
   * The endpoints are viewport deltas and a `translate` is a local quantity, so
   * the vector is projected through `space`. `space` is captured at activation
   * because the element returns to that ancestry when presentation is disposed.
   * Do not use the session's own projection. It is `null` for both lifted
   * modes, because a `fixed` element's local space is viewport space, while the
   * element after disposal is in flow in every mode.
   *
   * If the ancestry changes during the animation, the element takes the wrong
   * path. The contribution still ends at zero, so the element ends exactly
   * where flow puts it.
   */
  #startLandingAnimation(
    element: HTMLElement,
    space: InheritedSpace,
    fromX: number,
    fromY: number,
    targetX: number | null,
    targetY: number,
  ): void {
    if (targetX === null) {
      return;
    }

    const dx = fromX - targetX;
    const dy = fromY - targetY;

    if (dx === 0 && dy === 0) {
      return;
    }

    // Behavior code. It runs under `warnOnThrow` and is not classified, because
    // a landing animation is presentation, and a presentational fault may not
    // reach a consumer whose drop has already been decided and reported.
    const timing = this.#warnOnThrow(() =>
      this.#spec.landingTail?.(
        this.#frames.current,
        fromX,
        fromY,
        targetX,
        targetY,
      ),
    );

    if (!timing) {
      return;
    }

    // `animate` is itself overridable on a consumer-owned element, and the
    // duration domain is the platform's — a `NaN` or a negative is refused
    // here, as a warning that changed nothing.
    this.#landingAnimation =
      this.#warnOnThrow(() => {
        // The record comes from behavior code, and the `animate` lookup is the
        // next code the kernel does not own to run, so the fields are copied
        // first.
        const { duration, easing } = timing;

        return element.animate(
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
          { duration, easing, composite: 'add' },
        );
      }) ?? null;
  }

  /**
   * Disposes presentation completely, then starts the landing animation.
   *
   * This method writes no position. The visual returns to flow at
   * `attempt.targetX`/`.targetY` when presentation is disposed, and the landing
   * animation reduces the residual displacement to zero. A write here could
   * only restate that position, on an element whose inline `transform` the
   * disposal restores.
   *
   * The order is required, and the landing animation is correct only in this
   * order. Disposal gives the visual's inline styles, its place in flow and the
   * behavior's own presentation back to the consumer. Only then does anything
   * interpolate. So the library owns nothing when the terminal callback runs.
   *
   * Disposal is in a `finally`: this method calls into code the kernel does not
   * own, and none of that code may leave the placeholder inserted or the inline
   * styles overwritten.
   */
  #finalizeSettlement(
    live: OperationRecord,
    activation: ActivationRecord,
    attempt: SettlementAttempt,
  ): void {
    const owned = live.lifetimes;
    const session = activation.lift;

    this.#frames.begin();
    this.#frames.commit(FINALIZING);

    let fromX = 0;
    let fromY = 0;

    try {
      // `rendered` is the delta the drag last wrote, and the landing animation
      // starts from it. The pointer delta differs for any behavior that
      // constrains, clamps, snaps or drives its visual, and for a pointerless
      // operation. Nothing here overwrites it, so the read has no ordering
      // constraint.
      ({ x: fromX, y: fromY } = session.rendered);
    } finally {
      // Unconditional. No failure between `FINALIZING` and here may leave the
      // placeholder inserted or the inline styles overwritten.
      owned.presentation.dispose();
    }

    // Start the animation after disposal and before the terminal callback.
    //
    // After disposal: a landing animation started while the visual is still
    // lifted would interpolate a fixed, top-layer element, and later code would
    // then have to cancel it.
    //
    // Before the terminal callback: that callback may remove this element, and
    // an animation started on a removed node is a no-op and not a fault.
    this.#startLandingAnimation(
      live.visual,
      activation.visualSpace,
      fromX,
      fromY,
      attempt.targetX,
      attempt.targetY,
    );

    // Disposal and the `landingTail` policy both run code the kernel does not
    // own, and a request from either is applied after this unit. The terminal
    // callback belongs to this settlement, and it runs.
    this.#runner.runCallback(() => {
      this.#spec.finalized(this.#frames.current);
    }, FAILURE_TERMINAL_CALLBACK);
    // Queued unconditionally, and this entry performs the retirement. A
    // terminal-callback failure queues its checkpoint ahead of this entry, but
    // the checkpoint only delivers `onError`. The checkpoint dispatches its own
    // terminal from inside it, so that terminal lands behind this entry. The
    // retirement therefore always comes first, and that second terminal arrives
    // stale. This ordering gives exactly one `onEnd` on this path.
    this.#loop.dispatch(RETIRE, this.#frames.current.operation);
  }

  /**
   * Runs one settlement: prepare → commit `SETTLING` → measure → finalize.
   *
   * One synchronous sequence, and nothing suspends it. Settlement holds no
   * gate, so the only thing between the transition and the terminal is the
   * behavior's own measurement.
   *
   * `live` and `activation` are the records the calling unit resolved at its
   * entry. Settlement is reached only from `ACTIVATING` onwards, so both exist.
   */
  #openSettlement(
    live: OperationRecord,
    activation: ActivationRecord,
    input: SettlementInput,
  ): void {
    // However the round-trip ended, it is over. A later completion for it has
    // no effect at either validation point.
    this.#attempts.resolution = null;

    const attempt: SettlementAttempt = {
      input,
      lifetimes: live.lifetimes,
      targetX: null,
      targetY: 0,
    };

    const outcome = this.#runner.runTransition(
      this.#settlementTransition,
      attempt,
      FAILURE_RESOLUTION,
      SETTLING,
    );

    this.#dropStaged();

    // A settlement that never committed does not land: the queued checkpoint
    // decides what the operation ends as, and measuring for a finalization that
    // will never happen would call behavior code for nothing.
    if (outcome === TRANSITION_COMMITTED) {
      this.#measureTarget(activation, attempt);
      this.#finalizeSettlement(live, activation, attempt);
    }
  }

  /**
   * The producer-side half of the double validation. The queued action
   * validates again when it is applied, because the attempt slot and the
   * committed phase change at different moments.
   *
   * Only the attempt identity is checked. Applied destruction retires the
   * attempt slot, so a late settlement after it finds no slot. One inside a
   * unit that requested destruction is queued, and application discards it. A
   * rejection that never applies has no checkpoint, so it carries its own
   * report, built only if it is the first completion: the first completion is
   * the only one the operation could have seen.
   *
   * The report's code is read when it is delivered. An attempt still current
   * means no handler ran, so destruction discarded the entry. A retired attempt
   * means a cancel applied ahead of it and decided the operation, and a
   * destruction requested after that discarded nothing that would otherwise
   * have reported.
   */
  #settleResolution(attempt: ResolutionAttempt, input: SettlementInput): void {
    if (attempt.completed || this.#attempts.resolution !== attempt) {
      return;
    }

    attempt.completed = true;
    attempt.settlement = input;

    if (input.type === SETTLED_REJECTED) {
      attempt.discard = (): void => {
        this.report(
          new DraggableWarning(
            this.#attempts.resolution === attempt
              ? 'drag: failure/superseded-by-destruction'
              : 'drag: failure/superseded-by-cancel',
            { cause: input.error },
          ),
        );
      };
    }

    this.#loop.dispatch(RESOLUTION_SETTLED, attempt);
  }

  /**
   * The consumer round-trip, opened by its own unit after the release unit
   * committed and `release.effect` returned normally.
   *
   * A thenable is asynchronous and anything else settles immediately. The
   * kernel never names a resolution type, an accept or a reject: it passes the
   * value to `settlement.prepare` with a status and lets the behavior classify.
   */
  #openResolution(live: OperationRecord, command: ResolutionCommand): void {
    const attempt: ResolutionAttempt = {
      completed: false,
      settlement: null,
    };
    const { invoke } = command;

    this.#attempts.resolution = attempt;

    if (!invoke) {
      // A proven semantic no-op: no round-trip, no abort guard, no thenable.
      this.#settleResolution(attempt, { type: SETTLED_SKIPPED });
      return;
    }

    const aborter = new AbortController();

    // Reads `completed` and not the payload: reading the payload would abort a
    // finished resolver's own signal.
    live.lifetimes.cancellation.use(() => {
      if (!attempt.completed) {
        aborter.abort();
      }
    });

    let value: unknown;

    try {
      value = invoke(aborter.signal);
    } catch (error) {
      this.#settleResolution(attempt, { type: SETTLED_REJECTED, error });
      return;
    }

    // Reading `then` and subscribing are inside one `try`, because both run
    // consumer code on an arbitrary thenable. A throw from either means that
    // the resolution rejected. `#settleResolution` records only the first
    // completion, so a thenable that resolves synchronously and then throws
    // keeps that completion.
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
   * One closure per controller. A closure written inline at the call site would
   * be allocated on every active pointer sample, the one path whose allocations
   * count, and the emitted bundle would keep that allocation.
   *
   * The runner calls it without `this`, so the field is an arrow function and
   * not a prototype method. It holds no per-operation value: the lift arrives
   * as the argument, and the `current` frame is read when it runs.
   */
  readonly #callMoved = (lift: VisualLiftSession): void => {
    this.#spec.moved(this.#frames.current, lift);
  };

  #handleMove(sample: PointerCoordinates): void {
    const { phase } = this.#frames.current;

    if (phase !== PENDING && phase !== ACTIVE) {
      return;
    }

    if (sample.pointerId !== this.#frames.current.pointerId) {
      return;
    }

    // The entry that may cross into activation declines while a cancel is
    // held, read here and never below, so the queued `CANCEL` retires the
    // operation silently. `ACTIVE`'s per-sample path reads nothing more.
    if (phase === PENDING && this.#operation!.cancelRequest) {
      return;
    }

    this.#frames.begin();
    this.#frames.draft.pointerX = sample.clientX;
    this.#frames.draft.pointerY = sample.clientY;
    this.#frames.commit(null);

    if (phase === ACTIVE) {
      this.#runner.runCallback(
        this.#callMoved,
        FAILURE_RENDERER_WRITE,
        this.#activation!.lift,
      );
      return;
    }

    const { threshold } = this.#spec.config;
    const dx = this.#frames.current.pointerX - this.#frames.current.originX;
    const dy = this.#frames.current.pointerY - this.#frames.current.originY;

    if (dx * dx + dy * dy >= threshold * threshold) {
      // The pointer path's `preventDefault()`. It prevents the default of this
      // `pointermove`: selection extension, and the native drag-and-drop start
      // where a browser fires one. It does not prevent the `pointerdown`, which
      // has already been dispatched un-prevented and whose focus and caret are
      // real and are supposed to be. Preventing at admission would spend a
      // press on a drag that has not happened yet and, in most presses, never
      // will.
      //
      // This is not a scroll policy. `preventDefault()` on `pointerdown` was
      // never a reliable scroll suppressor. Scroll suppression is
      // `touch-action`, which belongs to the consumer and is set on the
      // draggable region.
      sample.preventDefault();

      // A selection may already have started, and prevention cannot undo it
      // because the event that began it has returned. Clearing is the only
      // remaining tool, and it clears the partial selection the press made on
      // its way to becoming a drag.
      this.#realm.window.getSelection()?.removeAllRanges();
      this.#armClickSuppressor();
      this.#activate(this.#operation!);
    }
  }

  /**
   * The release, from `ACTIVE`, in the fixed two-commit order the kernel owns.
   * `sample` is `null` for a pointerless release: there is nothing to commit,
   * and the pointer fields stay as admission left them.
   */
  #closeOperation(
    live: OperationRecord,
    sample: PointerCoordinates | null,
  ): void {
    // Commit 1: the committed frame matches what is about to be true, so a
    // `release.prepare` that throws never leaves a committed `ACTIVE` operation
    // with no input listeners and no path forward.
    this.#frames.begin();

    if (sample) {
      this.#frames.draft.pointerX = sample.clientX;
      this.#frames.draft.pointerY = sample.clientY;
    }

    this.#frames.commit(RELEASING);

    // Motion closes between the two commits: capture released, listeners and
    // invalidation removed, the behavior's frame task cancelled. Nothing
    // pending can alter the proposal from here.
    live.lifetimes.motion.dispose();

    runReleaseTransition(
      this.#runner,
      this.#releaseTransition,
      FAILURE_RELEASE,
      // The round-trip is not opened here. The command is held and its own unit
      // queued, including the `invoke: null` command. So a destruction
      // requested in this unit is applied at its boundary and discards the
      // entry, and whatever the release effect dispatched applies first.
      (command) => {
        this.#attempts.command = command;
        this.#loop.dispatch(OPEN_RESOLUTION, this.#frames.current.operation);
      },
    );
  }

  /**
   * The round-trip's own unit. It opens only for the operation that queued it,
   * still `RELEASING`, with no round-trip opened for it and neither a cancel
   * nor a failure checkpoint registered for it. The unit's entry reads all of
   * these.
   *
   * "No round-trip opened" means that the command is still held, because
   * opening consumes it. The cancel and failure checks make the round-trip
   * guarantee hold for a request registered by an entry queued ahead of this
   * one, such as an action the release effect dispatched: FIFO alone would run
   * this entry first. Declining leaves the operation `RELEASING` for the
   * registered `CANCEL` or `FAILED`, which settles it at `AT_PROPOSAL`.
   * Destruction needs no check: it is applied ahead of this entry and discards
   * it.
   */
  #handleOpenResolution(identity: OperationIdentity): void {
    const { command } = this.#attempts;

    if (
      !command ||
      this.#frames.current.operation !== identity ||
      this.#frames.current.phase !== RELEASING
    ) {
      return;
    }

    const live = this.#operation!;

    if (live.cancelRequest || live.failureRegistered) {
      return;
    }

    this.#attempts.command = null;
    this.#openResolution(live, command);
  }

  #handleUp(sample: PointerCoordinates): void {
    const { phase } = this.#frames.current;

    if (sample.pointerId !== this.#frames.current.pointerId) {
      return;
    }

    if (phase === PENDING) {
      this.#retireOperation(this.#frames.current.operation!);
      return;
    }

    if (phase !== ACTIVE) {
      return;
    }

    this.#closeOperation(this.#operation!, sample);
  }

  /**
   * The pointerless release, which enters the same transition `UP` enters at
   * `ACTIVE`. It is unreachable for a pointer operation and unreachable from a
   * behavior: {@link BehaviorContext} has no member that releases.
   */
  #handleRelease(identity: OperationIdentity): void {
    if (
      this.#frames.current.operation !== identity ||
      this.#frames.current.phase !== ACTIVE
    ) {
      return;
    }

    this.#closeOperation(this.#operation!, null);
  }

  /**
   * The pointerless activation, which enters the same transition the threshold
   * crossing enters inline from `MOVE`. It declines at its entry on the same
   * held cancel: one registered by an entry queued ahead of this one, such as
   * the collection work a command's admission queued. An operation cancelled
   * before it started needs no start notification, and the queued `CANCEL`
   * retires it.
   */
  #handleActivate(identity: OperationIdentity): void {
    if (
      this.#frames.current.operation !== identity ||
      this.#frames.current.phase !== PENDING ||
      this.#operation!.cancelRequest
    ) {
      return;
    }

    this.#activate(this.#operation!);
  }

  /**
   * A cancellation at `ACTIVE` or `RELEASING` enters the settlement transition,
   * the only hook that can produce the canceled domain result `onCancel`
   * requires: `recovery` and `domain` are fields of the behavior's frame part,
   * which the kernel cannot name or write.
   */
  #settleCancellation(
    live: OperationRecord,
    activation: ActivationRecord,
    request: { reason: unknown; origin: CancelOrigin },
    stage: CancelStage,
  ): void {
    this.#openSettlement(live, activation, {
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
      this.#frames.current.phase !== RELEASING
    ) {
      // A late completion for an operation that is already decided. A rejection
      // that was the first completion while the attempt was current must still
      // report its fault: it queued behind the cancel that decided the
      // operation, and this entry is its one route to `onError`.
      attempt.discard?.();
      return;
    }

    const input = attempt.settlement;

    if (!input) {
      return;
    }

    // Consumed once and the payload cleared, so it can never be applied twice.
    // A current attempt means a current `RELEASING` operation, so both records
    // exist.
    attempt.settlement = null;
    this.#openSettlement(this.#operation!, this.#activation!, input);
  }

  #handleCancel(identity: OperationIdentity): void {
    if (this.#frames.current.operation !== identity) {
      return;
    }

    const live = this.#operation!;
    const request = live.cancelRequest;

    // Consumed at the entry, whatever the phase: applied below, or lapsed. A
    // failure registered from here on belongs to the cancellation and is
    // reported, not superseded.
    live.cancelRequest = null;

    if (!request) {
      return;
    }

    switch (this.#frames.current.phase) {
      case PENDING:
        // Abandoned before there was anything to tell the consumer about:
        // `admit` is not a start notification, and no presentation exists.
        this.#retireOperation(identity);
        break;
      case ACTIVATING:
      case ACTIVE:
      case RELEASING:
        // `ACTIVATING` settles like `ACTIVE` because the phase is committed
        // before `activation.effect` runs. When a cancellation is applied here,
        // the placeholder is in the DOM, the lift is acquired and the behavior
        // has already delivered its start notification. Retiring instead would
        // leave a consumer that was told a drag began with no terminal callback
        // at all. There is also nothing atomic left to protect, because
        // settling un-commits nothing.
        //
        // That statement does not hold on one class of two-fault paths, and
        // this case reads the phase alone. Consumer code reached from the
        // activation unit registers a cancellation, and the effect then fails
        // before the start notification. The cancel supersedes the failure, and
        // this case settles a drag whose start was never notified. This gap is
        // known and open.
        //
        // The stage depends on whether the round-trip opened, not on the phase.
        // `RELEASING` spans whole units before `OPEN_RESOLUTION` runs, and a
        // cancel applied in them never reached the consumer's resolver, so it
        // is `AT_PROPOSAL` like every earlier phase. Only the round-trip's own
        // unit sets the attempt slot, and every settlement clears it, so it is
        // present here exactly when `invoke` was reached. The `invoke: null`
        // command sets it too, and no cancel can apply in that window: its
        // settled entry is queued inside the same unit, ahead of any `CANCEL`
        // registered after the unit's entry.
        this.#settleCancellation(
          live,
          this.#activation!,
          request,
          this.#attempts.resolution ? AT_CONSUMER : AT_PROPOSAL,
        );
        break;
      // Written out and not left to a bare `default`. The handler is total
      // either way: it ignores a phase it does not recognise and never throws
      // on it. With a closed union, the compiler can say which phases that
      // covers, so the rest are named. `IDLE` has no operation. The terminal
      // phases have a settlement already deciding the outcome, and a cancel
      // arriving there is late.
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
      this.#frames.current.phase !== ACTIVATING ||
      this.#frames.current.operation !== identity
    ) {
      return;
    }

    // A held cancel outranks the commit: an operation cancelled during
    // `ACTIVATING` must never reach `ACTIVE`. FIFO alone does not give this. An
    // action whose effect cancels (a collection replacement that invalidates
    // the gap, dispatched from `onStart`) queues its `CANCEL` behind this
    // checkpoint. Without this check, the operation would activate for exactly
    // one drain and the cancellation would be reported at the wrong stage.
    // Leaving the phase untouched is enough: the queued `CANCEL` finds
    // `ACTIVATING` and settles it.
    if (this.#operation!.cancelRequest) {
      return;
    }

    this.#frames.begin();
    this.#frames.commit(ACTIVE);

    // A command is one slot. A pointerless operation has no other producer of a
    // release (no `pointerup` will ever arrive), so the kernel is the producer,
    // once, here. It is queued and not run inline, so the consumer's `onStart`
    // and anything it dispatched drain first, as they would before a press's
    // own release.
    if (this.#frames.current.pointerId === -1) {
      this.#loop.dispatch(RELEASE, this.#frames.current.operation);
    }
  }

  #handleFailed(checkpoint: FailureCheckpoint): void {
    const { phase } = this.#frames.current;

    // Supersession, decided at application under
    // `DESTROY > CANCEL > FAILURE_CHECKPOINT`, from two readings. Both are made
    // here and neither inside the unit that raised the failure.
    //
    // - The record. Intake captured whether a cancel was registered and
    //   unapplied. Behavior code that cancels and then fails queues
    //   `[CANCEL, FAILED]`. The cancellation settles and queues `RETIRE`.
    //   Without the record, the checkpoint would run ahead of `RETIRE` at
    //   `FINALIZING`, and the consumer would get both terminals for one
    //   operation.
    // - A cancel still held at this entry. Behavior code that fails and then
    //   cancels queues `[FAILED, CANCEL]`, and so does a cancel registered by a
    //   unit between the failure's unit and this one. Dropping the checkpoint
    //   leaves the phase untouched, so the `CANCEL` behind it still finds a
    //   cancellable operation and produces the single terminal.
    //
    // The error is not lost. It arrives as a warning, because the `return` here
    // decides and the cancel owns the terminal. `checkpoint.stage` is discarded
    // with the classification it names.
    if (
      checkpoint.superseded ||
      (this.#frames.current.operation === checkpoint.operation &&
        this.#operation!.cancelRequest)
    ) {
      this.report(
        new DraggableWarning('drag: failure/superseded-by-cancel', {
          cause: checkpoint.error,
        }),
      );
      return;
    }

    if (
      this.#frames.current.operation !== checkpoint.operation ||
      phase === IDLE ||
      phase === REPORTING
    ) {
      // An error could vanish here, and it does not. This checkpoint is stale,
      // or it is a second checkpoint for a report already in flight. Either way
      // it loses its classification. The kernel refuses the consequence the
      // checkpoint asks for, and it still reports the fault.
      //
      // A warning and not an error, for the same reason as every other demotion
      // here: the `return` decides. A stale checkpoint names an operation that
      // is already over, and a second one arrives while the first is being
      // reported. In both cases the terminal is owned, and this fault cannot
      // change the outcome.
      this.report(
        new DraggableWarning('drag: failure/checkpoint-stale', {
          cause: checkpoint.error,
        }),
      );
      return;
    }

    const { lifetimes } = this.#operation!;

    // The open round-trip is abandoned: a resolution that settles after this
    // validates against an empty slot, and the input the transition below uses
    // is this failure's and not whatever preceded it.
    this.#retireAttempts();

    const input: SettlementInput = {
      type: SETTLED_FAILED,
      stage: checkpoint.stage,
      error: checkpoint.error,
      // Built here, by the kernel, and this is the only place one is built for
      // an operation. The behavior maps `stage` to a recovery, which it owns,
      // and forwards this value untouched. A behavior has no stage-to-code
      // mapping to own again: the error carries the same `stage` as this input,
      // so the two fields agree without a derivation the kernel would have to
      // keep.
      //
      // A behavior raises a cause, and the kernel creates the error. The stage
      // is not final at the raise site: a stale checkpoint is demoted to a
      // `DraggableWarning` above, and a held cancel outranks the checkpoint
      // outright. So an error created at the failing branch would already be
      // the wrong object in both cases and would have to be unwrapped and
      // rebuilt. With one creation site, the stage on the error is the stage
      // the kernel decided, with no need for every behavior to agree.
      report: new DraggableError(checkpoint.stage, checkpoint.error),
    };
    // This report never lands, so the measurement fields stay unwritten. The
    // record exists only to carry the input and the lifetimes as the
    // transition's capability.
    const attempt: SettlementAttempt = {
      input,
      lifetimes,
      targetX: null,
      targetY: 0,
    };

    // The same transition as an ordinary settlement, because the behavior owns
    // the terminal classification either way. But it commits `REPORTING` and
    // not `SETTLING`: `onError` runs in its own phase, exactly once per
    // failure. The input carries the stage, so the behavior can distinguish the
    // recoveries the stage table separates (`TERMINAL_CALLBACK` is "none", the
    // rest immediate). Nothing measures and nothing finalizes here, and the
    // terminal is published from `ERROR_REPORTED` below.
    //
    // A throw or a rejection inside this transition cannot become another
    // checkpoint: `#failOperation` sees `#reporting` and reports instead. The
    // transition still classifies, because the recorded failure stops the
    // continuation below. But the error takes the non-consequential channel,
    // because a queued checkpoint would be dropped by the guard above and lost.
    this.#reporting = true;

    try {
      this.#runner.runTransition(
        this.#settlementTransition,
        attempt,
        checkpoint.stage,
        REPORTING,
      );
    } finally {
      this.#dropStaged();
      this.#reporting = false;
    }

    if (this.#frames.current.phase === REPORTING) {
      // The whole checkpoint and not only its operation: the terminal this path
      // must still deliver is skipped for exactly one stage, and the reader of
      // that rule needs the stage to apply it.
      this.#loop.dispatch(ERROR_REPORTED, checkpoint);
      return;
    }

    // The report transition never published: `prepare` rejected. Nothing will
    // dispatch `ERROR_REPORTED`, and the operation may not stay live.
    this.#retireOperation(checkpoint.operation);
  }

  /**
   * `onError` is done. The operation still needs a terminal, and the failure
   * path delivers it here.
   *
   * Skipping the terminal callback after a consequential failure would rest on
   * the committed frame still saying `OUTCOME_ACCEPTED`, so that publishing
   * announces a successful drop the checkpoint is about to report as failed.
   * The opposite holds: when the failure arrives after the authored commit, the
   * drop is accepted, and announcing it is the one fact the consumer must have.
   * `onEnd` reports what happened to the data. `onError` is the verdict on the
   * operation.
   *
   * The behavior decides what to publish and whether to publish at all: the
   * frame's own result, `canceled` where the frame holds none, and nothing for
   * an operation whose `onStart` never ran. The kernel only calls.
   *
   * Presentation is disposed first, so the callback sees the same state as on
   * the success path: `#finalizeSettlement` disposes presentation in its
   * `finally` and then calls `finalized`. A consumer must not have to know
   * which route its drag took to know whether the placeholder is still in the
   * list.
   *
   * Exactly one `onEnd` per operation depends on two things here, and only one
   * of them is a test in this function.
   *
   * The test here is the stage exclusion: `FAILURE_TERMINAL_CALLBACK` means
   * that `finalized` already ran and threw. Calling it again would deliver a
   * second `onEnd` for one operation and, since it would throw again, do so
   * forever. The behavior's settlement `prepare` makes the same exclusion from
   * the other side, where it declines to rewrite an outcome that has already
   * been reported.
   *
   * The other is the queue order, which covers what the stage cannot. A
   * behavior calling `fail` from inside `finalized` classifies with a stage of
   * its own, because a phase is open there and the classification takes the
   * caller's stage. So a checkpoint raised inside the terminal callback need
   * not carry `FAILURE_TERMINAL_CALLBACK` at all. The guard below refuses that
   * checkpoint: it is queued ahead of the `RETIRE` from `#finalizeSettlement`,
   * and the `ERROR_REPORTED` it dispatches is appended behind that entry. So
   * the operation is already retired and the phase no longer says `REPORTING`.
   * A change that makes `ERROR_REPORTED` asynchronous changes this ordering
   * too, not only when this method runs.
   */
  #handleErrorReported(checkpoint: FailureCheckpoint): void {
    const { operation: identity, stage } = checkpoint;

    if (
      this.#frames.current.phase !== REPORTING ||
      this.#frames.current.operation !== identity
    ) {
      return;
    }

    if (stage !== FAILURE_TERMINAL_CALLBACK) {
      const { presentation } = this.#operation!.lifetimes;

      this.#warnOnThrow(() => {
        presentation.dispose();
      });

      // The second route into `onEnd`, and it reads nothing. The disposers
      // above can reach consumer code, and a request they raise is applied
      // after this unit, as in `#finalizeSettlement`. The entry check
      // established the phase and the identity, and neither can change under a
      // disposer: a nested dispatch inside a running drain appends and returns,
      // and nothing reachable from one retires an operation.
      //
      // A throw here reaches `#failOperation`, which sees `REPORTING` and takes
      // the non-consequential channel. So a terminal that fails on the failure
      // path is reported without queueing a second checkpoint for an operation
      // this entry retires.
      this.#runner.runCallback(() => {
        this.#spec.finalized(this.#frames.current);
      }, FAILURE_TERMINAL_CALLBACK);
    }

    this.#retireOperation(identity);
  }

  #handleBehaviorAction(tag: number, argument: unknown): void {
    this.#actionTag = tag;
    this.#actionArgument = argument;

    try {
      // Two stages, because the transition's phases fail differently: resolving
      // an insertion and moving the placeholder are not the same failure. An
      // explicit `fail` narrows further from the inside.
      this.#runner.runTransition(
        this.#actionTransition,
        undefined,
        FAILURE_ACTION_PREPARE,
        null,
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
  handle(action: number, argument: unknown): void {
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
      case OPEN_RESOLUTION:
        this.#handleOpenResolution(argument as OperationIdentity);
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
  // What the façade forwards, and listener attachment
  // -------------------------------------------------------------------------

  /**
   * Armed intake for a behavior action. The façade has already refused it if
   * destruction was applied.
   */
  dispatch(tag: number, argument: unknown): void {
    // Checked at armed intake and nowhere else. The bound is fixed for the
    // controller's life, so nothing checks it again when the entry is applied.
    if (
      !Number.isInteger(tag) ||
      tag < 0 ||
      tag >= this.#spec.config.actionTags
    ) {
      // Reported and dropped, never enqueued: the kernel computes
      // `BEHAVIOR_BASE + tag`, so a negative or fractional tag would alias a
      // kernel action.
      this.report(
        new DraggableWarning(`drag: dispatch/tag-out-of-range ${String(tag)}`),
      );
      return;
    }

    this.#loop.dispatch(BEHAVIOR_BASE + tag, argument);
  }

  fail(stage: FailureStage, error: unknown): void {
    this.#runner.requestFailure(stage, error);
  }

  /** The preparation for a native event pass the `ExecutionLoop` admitted. */
  beginPass(): void {
    this.#frames.begin();
  }

  /**
   * Binds the listeners on the root under the façade's signal: `pointerdown`,
   * and each of the spec's command types.
   *
   * The command listeners share the abort that owns `pointerdown`, so applied
   * destruction releases every listener, and a behavior with no `command`
   * member binds no command listener at all. A throw here is for construction
   * to roll back.
   */
  attach(): void {
    this.#root.addEventListener(POINTER_DOWN, this.#pointerDownHandler, {
      signal: this.#listenerSignal,
    });

    if (this.#spec.command !== undefined) {
      for (const type of this.#spec.command.types) {
        this.#root.addEventListener(type, this.#commandHandler, {
          signal: this.#listenerSignal,
        });
      }
    }
  }
}

/**
 * The kernel façade. It owns the realm, the root, the `ExecutionLoop`, the
 * listener signal and one nullable reference to the armed controller. A
 * behavior holds this object.
 *
 * A behavior receives this object as {@link BehaviorContext}, and that
 * interface is everything the behavior is granted: `construct` is on the class
 * and not on the interface, so a behavior reaches it only by leaving, on
 * purpose, the type it received. This is a contract term and not a runtime
 * property, and it is written down and not guarded.
 *
 * No input is admitted before the factory returns. The factory returns
 * `{ spec, controller }`, then arming composes the frames and attaches
 * listeners, and native events are refused while construction runs. The order
 * holds this boundary, and no guard checks it.
 *
 * Before construction publishes the armed controller, the members behave as the
 * construction window requires: `dispatch` queues unchecked, `requestCancel` is
 * the idle no-op, `fail` is demoted with nowhere to report, `requestDestroy`
 * reads the `ExecutionLoop`, and a created channel delivers.
 *
 * Only `draggable()` holds the full class type, and it calls `construct()`
 * exactly once.
 */
export class Kernel<
  Part extends object,
  Activation extends {} = true,
> implements BehaviorContext {
  /** The owning document/window. Every DOM access goes through it. */
  readonly realm: DOMRealm;

  /** The root element, where listeners bind, passed to `draggable()`. */
  readonly root: HTMLElement;

  /**
   * The lifecycle request, the queue and its semantics, and teardown, in the
   * one entity that states their invariants. It is `#private`, so holding it
   * does not change the kernel's public surface.
   *
   * Its four callbacks and the report a discarded fault entry carries are the
   * only edges back into the kernel. Each callback is allocated once per
   * controller, and a report only on a failure path, so the per-action and
   * per-sample paths through the loop allocate nothing. `handle`, `panic` and
   * `beginPass` reach the armed controller, which exists whenever they run: the
   * loop drains and admits native events only after construction published it,
   * and a construction that fails clears the queue before anything is drained.
   */
  readonly #loop = new ExecutionLoop(
    (action, argument) => {
      this.#armed!.handle(action, argument);
    },
    (error) => {
      this.#armed!.panic(error);
    },
    () => {
      this.#teardown();
    },
    () => {
      this.#armed!.beginPass();
    },
  );

  readonly #listenerSignal = new AbortController();

  /**
   * The armed controller, published by construction once it exists complete,
   * and withdrawn only by construction's own rollback.
   */
  #armed: ArmedController<Part, Activation> | null = null;

  constructor(root: HTMLElement) {
    this.root = root;
    this.realm = createRealm(root);
  }

  /**
   * Creates a channel over `deliver`. The channel delivers until destruction is
   * applied, drops every call afterwards and absorbs a throw from `deliver`, by
   * the refusal and terminus {@link deliverUnlessApplied} states.
   *
   * It needs only the lifecycle, which this façade holds from its own
   * construction, so a channel created in the factory works before arming.
   */
  channel(deliver: Notify): Notify {
    return deliverUnlessApplied.bind(this.#loop, undefined, deliver);
  }

  /**
   * Requests destruction. The `ExecutionLoop` applies it at once when no unit
   * is running, and otherwise when the running unit ends. Step 1 of teardown,
   * the closed lifecycle, is set at application, and steps 3–7 come back
   * through the teardown callback in the same step.
   *
   * The promise settles after application, physical teardown included.
   */
  requestDestroy(): Promise<void> {
    return this.#loop.requestClose();
  }

  /**
   * The kernel's own cancel, and the only one a consumer or a behavior can
   * reach. Everything arriving here is `CANCEL_SUPPLIED`: a behavior's
   * controller publishes a closure over this call, so the kernel has no basis
   * to tell the two callers apart, and both of them supply a value.
   *
   * Before arming there is no operation to register against, so this is the
   * idle no-op.
   */
  requestCancel(reason?: unknown): void {
    this.#armed?.requestCancel(reason);
  }

  dispatch(tag: number, argument: unknown): void {
    if (this.#loop.closed) {
      return;
    }

    // During construction the count bounding the tag is in the spec the
    // factory has not returned yet, so the action is queued unchecked and
    // applied after publication.
    if (this.#armed) {
      this.#armed.dispatch(tag, argument);
    } else {
      this.#loop.dispatch(BEHAVIOR_BASE + tag, argument);
    }
  }

  /**
   * A call from the construction window (the factory body or a frame-part
   * factory) is outside every transition, so it takes the demotion this
   * member's own contract states. The demotion is silent there because the
   * report travels through the armed controller's route, which does not exist
   * yet.
   */
  fail(stage: FailureStage, error: unknown): void {
    this.#armed?.fail(stage, error);
  }

  /**
   * Physical teardown, steps 3–7: the armed controller's part, then the
   * listener abort. The `ExecutionLoop` calls this after it has released its
   * own storage in step 2.
   *
   * The abort is in a `finally`, so no step before it can prevent the listeners
   * from being released, and the abort's own signal disarms the click
   * suppressor. With no armed controller (a construction that rolled back
   * before publishing one) there is no operation and no frame, and the abort is
   * all that runs.
   */
  #teardown(): void {
    try {
      this.#armed?.teardown();
    } finally {
      this.#listenerSignal.abort();
    }
  }

  /**
   * Construction, as one unit: the behavior factory, the static validation,
   * both frame-part compositions, listener attachment and publication.
   *
   * A request made anywhere inside is applied when the unit ends, after
   * publication: a factory or frame-part factory that requests destruction
   * still sees both parts composed and listeners attached. Application then
   * retires the spec once, resets each frame once and aborts the listeners, all
   * before this returns. Attaching a listener and aborting it inside one
   * synchronous call is unobservable, since no event can arrive in between.
   * Because a native event pass is refused while a unit runs, code the kernel
   * does not own that is reached during attachment cannot admit an operation
   * here.
   */
  construct<Controller>(
    behavior: BehaviorFactory<Controller, Part, Activation>,
  ): Controller {
    return this.#loop.construct(() => {
      const { spec, controller } = behavior(this);

      this.#arm(spec);
      return controller;
    });
  }

  /**
   * Validates the spec, composes both frames, constructs and publishes the
   * armed controller, and attaches listeners.
   *
   * A failure rolls back and rethrows, whether it comes from the static
   * configuration validation, a frame part factory or listener attachment. A
   * controller is never returned half-armed, and never returned holding a
   * behavior that was never retired.
   */
  #arm(next: BehaviorSpec<Part, Activation>): void {
    // The frames the rollback is responsible for. They are locals because no
    // field read finds them. The second composition runs behavior code that may
    // throw, so one frame can exist while the other does not, and the rollback
    // exists for that state. A design that published the pair once would have
    // published nothing there, and a part already holding a DOM reference would
    // be retained by the controller for good.
    let current: Frame<Part> | null = null;
    let draft: Frame<Part> | null = null;
    let armed: ArmedController<Part, Activation> | null = null;

    try {
      if (
        !Number.isInteger(next.config.actionTags) ||
        next.config.actionTags < 0
      ) {
        throw new TypeError('drag: spec/action-tags-invalid');
      }

      // Static spec data, validated once, like `actionTags`. This is the only
      // check here that the library owns. The `pointerdown` collision is
      // refused and not tolerated: two listeners for one type would run two
      // admission members for one event, and the second would find the first's
      // operation already committed, silently and only sometimes. That
      // corrupted operation is the kernel's own state, so the library holds
      // this invariant and not the author.
      //
      // Four checks look like they belong in this loop and do not. The last two
      // show why the rule is worth restating:
      // - `typeof type !== 'string'` repeats what `readonly string[]` already
      //   guarantees.
      // - A duplicate entry needs no refusal, because the platform ignores it.
      //   `addEventListener` de-duplicates on (type, callback, capture), and
      //   all three are identical for every entry here, so a second binding is
      //   already a no-op. `indexOf` inside the loop would make refusing it
      //   quadratic.
      // - An empty array binds no discrete listener. A behavior omitting
      //   `command` entirely already reaches that state, so refusing it would
      //   refuse a supported configuration in a different form.
      // - An empty-string entry binds an ordinary, distinct listener for a type
      //   nothing dispatches. The author's discrete input then does nothing,
      //   and the kernel's input is untouched.
      //
      // Both of the last two would cost the author their own feature and cost
      // the library nothing. The library does not refuse them, however plainly
      // the value looks like a mistake.
      if (next.command !== undefined) {
        for (const type of next.command.types) {
          if (type === POINTER_DOWN) {
            throw new TypeError('drag: spec/command-type-pointerdown');
          }
        }
      }

      // The same code path twice, so both frames get one hidden class. The part
      // factory is not proven deterministic, so the two results are not assumed
      // identical. Both are simply composed.
      current = Object.assign(frame(), next.createFramePart());
      draft = Object.assign(frame(), next.createFramePart());

      // Constructed complete, then published, then attached. The armed
      // controller exists only with both frames, so every member a behavior
      // reaches through the façade finds a spec, a pair and a runner together.
      // Publication precedes attachment so that code the kernel does not own
      // reached while a listener is bound (`requestCancel()` or `fail()` from a
      // patched `addEventListener`) already meets the armed controller.
      armed = new ArmedController(
        this.realm,
        this.root,
        this.#loop,
        this.#listenerSignal.signal,
        next,
        current,
        draft,
      );
      this.#armed = armed;
      armed.attach();
    } catch (error) {
      this.#rollbackArm(next, current, draft, armed);
      throw error;
    }
  }

  /**
   * The rollback of `#arm()`, reached by every exit that leaves the controller
   * unarmed: a throw from validation, from a frame-part factory or from
   * listener attachment.
   *
   * Totality applies here too: a reset that throws must not replace the
   * initiating failure or skip the listener abort. Each reset covers whichever
   * frame exists: a second factory that throws leaves a constructed frame this
   * path must still handle, and one that never ran leaves nothing to pass to
   * `resetFramePart`.
   *
   * A failure inside the rollback reports through the armed controller's route
   * when one was published, and nowhere otherwise: before publication there is
   * no route to report through.
   */
  #rollbackArm(
    next: BehaviorSpec<Part, Activation>,
    current: Frame<Part> | null,
    draft: Frame<Part> | null,
    armed: ArmedController<Part, Activation> | null,
  ): void {
    const warnOnThrow = createWarnOnThrow((warning) => {
      armed?.report(warning);
    });

    warnOnThrow(next.retire);

    if (current) {
      resetFrame(warnOnThrow, next, current);
    }

    if (draft) {
      resetFrame(warnOnThrow, next, draft);
    }

    this.#listenerSignal.abort();
    this.#armed = null;
  }
}
