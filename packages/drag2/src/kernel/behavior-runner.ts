/**
 * Runs behavior code in transitions and callbacks.
 *
 * Every substantial action has three steps: prepare (validation, pure
 * calculation, DOM reads, local acquisition), commit (short, effectively
 * non-throwing), and post-commit effects (DOM writes, lifetime closes,
 * continuations, callbacks). The contract's shape enforces this order, and the
 * behavior does not need to follow it as a rule: the kernel drives all three
 * steps and the behavior supplies two mostly pure callbacks.
 *
 * `BehaviorRunner.runTransition` runs those steps. The discard policy and the
 * failure policy differ per transition, so each caller applies its own to the
 * outcome.
 */
import { DraggableWarning, type Notify } from './errors.ts';
import type { FailureStage } from './failures.ts';
import type { Draft, Frame } from './frames.ts';
import type { Phase } from './phases.ts';
import type { FrameTransaction } from './transaction.ts';

/**
 * A transition that stages nothing uses `Prepared = true` and returns the
 * literal.
 *
 * `extends {}` excludes `null` and `undefined` while still admitting the `true`
 * sentinel, an element, or any object. So the type keeps `Prepared | null`
 * unambiguous as the discard signal.
 */
export type Transition<
  Part extends object,
  Prepared extends {} = true,
  Capability = void,
> = Readonly<{
  /**
   * Returns the staged value, or `null` to discard. Must not touch `current`,
   * must not perform DOM writes, and must keep every acquisition local:
   * everything it acquires travels out through `Prepared`.
   */
  prepare(draft: Draft<Part>, capability: Capability): Prepared | null;

  /**
   * Post-commit effects, for an already-published transition. A throw here
   * becomes a classified failure from the committed state. The transition is
   * not reverted.
   */
  effect(
    current: Readonly<Frame<Part>>,
    prepared: Prepared,
    capability: Capability,
  ): void;
}>;

/**
 * Behavior action tags use the same structure, so "the behavior never calls
 * `begin()`/`commit()`" also holds for behavior-initiated work.
 *
 * `Prepared` is opaque to the kernel, which only passes it along. The behavior
 * narrows it by tag.
 */
export type ActionTransition<Part extends object> = Readonly<{
  prepare(tag: number, argument: unknown, draft: Draft<Part>): {} | null;
  effect(
    tag: number,
    argument: unknown,
    current: Readonly<Frame<Part>>,
    prepared: {},
  ): void;
}>;

/** `prepare` returned `null`, and nothing happened. */
export const TRANSITION_DISCARDED = 0;
/** Classified; nothing committed. */
export const TRANSITION_PREPARE_FAILED = 1;
/** Committed, effect returned normally. */
export const TRANSITION_COMMITTED = 2;
/** Classified, from the committed state. */
export const TRANSITION_EFFECT_FAILED = 3;

/**
 * What one transition run did, named once so every caller branches on the same
 * vocabulary.
 *
 * There are no predicate helpers over this union. Call sites name the outcomes
 * they mean.
 *
 * A classified failure must also stop incompatible continuation. The runner
 * enforces this, because the failure checkpoint is queued. Between the throw
 * and the checkpoint, the runner would otherwise still be doing success work.
 * So `TRANSITION_PREPARE_FAILED` returns before `commit()`, and
 * `TRANSITION_EFFECT_FAILED` returns before anything is staged.
 */
export type TransitionOutcome =
  | typeof TRANSITION_DISCARDED
  | typeof TRANSITION_PREPARE_FAILED
  | typeof TRANSITION_COMMITTED
  | typeof TRANSITION_EFFECT_FAILED;

/**
 * No phase is open. `FailureStage` starts at 1, so `0` and `-1` are free to
 * carry the two readings a stage alone cannot.
 */
const NO_STAGE = 0;

/**
 * The stage of a phase whose failures are reported and never classified.
 *
 * There is one sentinel because there is one report channel.
 *
 * The landing measurement opens under this stage. It runs when the operation is
 * already committed, so classifying there would settle a drop that really
 * happened. The sentinel applies to the whole phase, so an explicit
 * `kernel.fail` inside the phase behaves exactly like a throw inside it.
 */
const UNCLASSIFIED = -1;

/** What an open phase classifies against. */
type PhaseStage = FailureStage | typeof UNCLASSIFIED;

/**
 * A phase that threw or recorded a failure, as a value.
 *
 * A private symbol, so it is distinguishable from every legal `Prepared`,
 * `null` and callback value without constraining what a transition may stage.
 */
const FAILED = Symbol();

/**
 * The phase machine behind one controller's calls into behavior code.
 *
 * It enforces exactly one open phase at a time across calls. This is an
 * invariant over the whole object and not a property of any field: the open
 * stage, the recorded failure, the unclassified reason, the staged value and
 * the re-entry flag are one state, reset together as each phase opens.
 *
 * Every field is private, and nothing outside reads or writes one. The public
 * surface is the run operations, the staged-value consumer, `requestFailure`
 * and the diagnostic predicate `isRunningBehavior`.
 */
export class BehaviorRunner<Part extends object> {
  /** The pair every transition publishes and reads. */
  readonly #frames: FrameTransaction<Part>;

  /** Queues a classified failure against the operation the kernel holds. */
  readonly #fail: (stage: FailureStage, error: unknown) => void;

  /**
   * The armed controller's route to the spec's `reportError`, which applies the
   * kernel's one diagnostic refusal. No checkpoint is queued, no recovery is
   * selected, and the operation's own outcome is untouched. So everything the
   * runner sends here is a {@link DraggableWarning}.
   */
  readonly #notify: Notify;

  /**
   * The stage the open phase classifies against, or `NO_STAGE` between phases.
   * This is one field and not a set of booleans. Whether behavior code is
   * running, which operation stage owns its failures, and whether they are
   * classified at all are three readings of the same fact. Splitting them lets
   * them drift apart.
   */
  #runningStage: PhaseStage | typeof NO_STAGE = NO_STAGE;

  /**
   * Set by `requestFailure`, cleared as each phase opens. A recorded failure
   * is indistinguishable from a throw at the runner boundary. Enqueuing a
   * checkpoint is not enough on its own, because the checkpoint is queued, and
   * this flag closes the window before it applies.
   */
  #failureRequested = false;

  /**
   * The message an `UNCLASSIFIED` phase reports under. Set as that phase opens
   * and read only while it is open. `#failureRequested` has the same lifetime
   * for the same reason: the runner runs exactly one phase at a time.
   *
   * This is a string and not a `FailureStage`: the warning names its reason in
   * its message, so the runner carries the reason and not a classification it
   * is about to refuse to apply.
   */
  #warningMessage = '';

  /**
   * The staged value of the last committed transition. Owned here and not
   * passed in, so no call path can skip the reset. If it were passed in, a
   * `runTransition` given no slot would leave the previous transition's value
   * readable.
   */
  #staged: unknown = null;

  /**
   * Set when behavior code is re-entered. The refusal is this flag and not a
   * bare `throw`, because the nested call raises from inside the outer
   * transition's `prepare` or `effect`. The outer `catch` would otherwise
   * classify an invariant break as an ordinary behavior failure and swallow it.
   *
   * This flag decides the outcome, and the thrown value does not. So this is a
   * flag and not an error code. The runner never reads the raised value, so
   * behavior code that catches the refusal has caught nothing it can act on,
   * and ends the same way as code that let it pass.
   */
  #reentry = false;

  /**
   * All of them are controller-invariant and held for its life, so no call into
   * behavior code allocates to reach one.
   */
  constructor(
    frames: FrameTransaction<Part>,
    fail: (stage: FailureStage, error: unknown) => void,
    notify: Notify,
  ) {
    this.#frames = frames;
    this.#fail = fail;
    this.#notify = notify;
  }

  /**
   * Runs one frame transaction: begin → prepare → commit → effect. Returns the
   * outcome; the caller applies its own transition's continuation policy.
   *
   * A successful preparation commits. Nothing between `prepare` and the commit
   * reads a request: a cancel or destroy raised inside the transition is
   * registered and applied at a unit boundary, after this one, so it cannot
   * invalidate the preparation the running unit computed.
   *
   * A committed transition leaves its `Prepared` value in the staging slot. The
   * kernel reads one such value after the transition returns: the release
   * transition's `ResolutionCommand`. Read it with
   * {@link BehaviorRunner.consumeStaged}.
   *
   * `effectStage` is the stage of a throw from `effect`. A behavior action
   * needs it: it resolves an insertion in `prepare` and moves the placeholder
   * in `effect`, and a throw in each is classified at its own stage. An
   * explicit `kernel.fail` can name a narrower stage.
   */
  runTransition<Prepared extends {}, Capability>(
    transition: Transition<Part, Prepared, Capability>,
    capability: Capability,
    stage: FailureStage,
    phase: Phase | null = null,
    effectStage: FailureStage = stage,
  ): TransitionOutcome {
    // `#callAndHandleFailure` also refuses, but too late for this method: a
    // transaction mutates kernel state before its first phase opens, and
    // `begin()` would rebuild the draft the outer transition is still building.
    this.#refuseReentry();

    if (this.#staged !== null) {
      // The clear below makes this harmless, and the report makes it visible. A
      // staged value here means the previous transition neither consumed nor
      // dropped it, which is the one way a command can outlive its transaction.
      this.#notify(new DraggableWarning('drag: seam/staged-unconsumed'));
    }

    this.#staged = null;
    this.#frames.begin();

    const prepared = this.#callAndHandleFailure(stage, () =>
      transition.prepare(this.#frames.draft, capability),
    );

    if (prepared === FAILED) {
      return TRANSITION_PREPARE_FAILED;
    }

    if (prepared === null) {
      return TRANSITION_DISCARDED; // the draft is abandoned
    }

    this.#frames.commit(phase);

    const effected = this.#callAndHandleFailure(effectStage, () =>
      transition.effect(this.#frames.current, prepared, capability),
    );

    if (effected === FAILED) {
      return TRANSITION_EFFECT_FAILED;
    }

    // Stage after the effect, so anything the effect triggers, such as a queued
    // action or a consumer callback, cannot observe or clear this value.
    //
    // Unconditional: a request the effect raised is applied after this unit.
    // The release transition's caller queues the round-trip as its own unit.
    // That unit's entry declines on a registered cancel, and applying a destroy
    // at this unit's boundary discards the unit.
    this.#staged = prepared;
    return TRANSITION_COMMITTED;
  }

  /**
   * Runs one behavior callback without a frame transaction, such as `moved` or
   * `finalized`. A throw is classified at `stage`. Returns `false` when the
   * callback threw or recorded a failure.
   *
   * These callbacks behave identically whether the behavior throws or calls
   * `kernel.fail`. Without this method, a `moved` throw would escape the
   * handler and become a panic that destroys the controller, instead of
   * reporting `FAILURE_RENDERER_WRITE`.
   *
   * `run` receives `argument`, so a caller on a per-sample path can keep one
   * function for the controller's life and pass it what its unit resolved,
   * without a closure per call.
   */
  runCallback<Argument>(
    run: (argument: Argument) => void,
    stage: FailureStage,
    argument?: Argument,
  ): boolean {
    return this.#callAndHandleFailure(stage, run, argument) !== FAILED;
  }

  /**
   * A behavior callback that returns a value: `anchorTarget`. Returns
   * `undefined` when it threw or recorded a failure, so `Value` is constrained
   * to exclude `undefined`.
   */
  runCallbackForValue<Value extends {}>(
    run: () => Value,
    stage: FailureStage,
  ): Value | undefined {
    const value = this.#callAndHandleFailure(stage, run);

    return value === FAILED ? undefined : value;
  }

  /**
   * Runs one behavior callback for its value, like {@link
   * BehaviorRunner.runCallbackForValue}, but a failure reaches the consumer as
   * a warning instead of settling the operation. The callback still runs inside
   * a phase: re-entry refused, `kernel.fail` recorded, one report per phase.
   *
   * The caller is the arm-time landing measurement.
   *
   * There is no stage argument: an unclassified failure names no stage, only a
   * `reason` the report carries.
   */
  runCallbackWarningOnFailure<Value extends {}>(
    run: () => Value,
    reason: string,
  ): Value | undefined {
    this.#warningMessage = reason;

    const value = this.#callAndHandleFailure(UNCLASSIFIED, run);

    return value === FAILED ? undefined : value;
  }

  /**
   * Takes the staged value of the last committed transition, clearing the slot.
   *
   * The slot is cleared on read, and cleared again as every transition opens.
   * Both clears are required: a staged value must never outlive the one
   * transition that produced it. Without the clear on read, a transition that
   * commits without staging anything would let a caller read the previous
   * transition's command. Without the clear on open, so would a transition that
   * discarded or failed. Either would execute a resolution that belongs to a
   * transaction that is over.
   *
   * Returns `null` when the last transition staged nothing, discarded or
   * failed.
   *
   * Every transition either consumes its staged value or drops it. {@link
   * runActivationTransition} and {@link runReleaseTransition} drop it for their
   * callers. The transitions the kernel drives directly drop it themselves. A
   * value left behind is reported.
   */
  consumeStaged(): unknown {
    const value = this.#staged;

    this.#staged = null;
    return value;
  }

  /**
   * `kernel.fail`. Valid only inside a kernel-driven call into behavior code of
   * the current operation. A call outside one is reported as a warning instead,
   * because a late continuation from operation A could otherwise classify a
   * failure against operation B.
   */
  requestFailure(stage: FailureStage, error: unknown): void {
    // A recorded failure and a throw are the same event on this path too. The
    // flag makes `#callAndHandleFailure` return `FAILED` for a phase that
    // recorded a failure without throwing, so the caller sees no target either
    // way.
    if (this.#runningStage === UNCLASSIFIED) {
      this.#failureRequested = true;
      this.#notify(
        new DraggableWarning(this.#warningMessage, { cause: error }),
      );
      return;
    }

    if (this.#runningStage === NO_STAGE) {
      // Send one warning, not two reports. A caught error and a
      // library-authored companion that names why the classification was denied
      // would report one fault twice. The message names the reason and `cause`
      // carries the caller's error, so no discriminating code is needed.
      //
      // The caller's `stage` is discarded. It describes a classification the
      // kernel has just refused to apply. Carrying it into the warning would
      // publish a statement about the operation that this branch exists to
      // avoid.
      this.#notify(
        new DraggableWarning('drag: seam/fail-outside-seam', {
          cause: error,
        }),
      );

      return;
    }

    // The stage is the caller's, not the open phase's: a callback narrows its
    // own stage from the inside (`moved` renders and schedules in one
    // callback).
    this.#failureRequested = true;
    this.#fail(stage, error);
  }

  /** Whether a phase is currently open. Diagnostics and tests. */
  isRunningBehavior(): boolean {
    return this.#runningStage !== NO_STAGE;
  }

  /**
   * Refuses to open anything while a phase is already open, before the caller
   * mutates anything.
   *
   * Strictly non-reentrant. Nothing in the kernel runs behavior code from
   * inside other behavior code. The drain of `ExecutionLoop` is
   * run-to-completion, so a nested `dispatch` from a callback appends and
   * returns, and the appended action opens its phase only after this one has
   * finished.
   *
   * `#runningStage` covers the time when code the kernel does not own is
   * running, and this guard is for that boundary. It is set as a phase opens
   * and cleared before `#callAndHandleFailure` classifies, so a phase opened
   * from the classification path would not be refused. Read the sentinel as
   * "behavior code is on the stack", which is where a nested call can
   * originate. It is not a general nesting interlock.
   *
   * Consumer code still runs after the clear, and the queue covers it. The
   * notify channel reaches the consumer's `onError`, and a `dispatch` from
   * there appends because the drain of `ExecutionLoop` returns while a pass is
   * already running. The fail channel's enqueuing covers only the
   * classification this module performs, which is the smaller part.
   *
   * A violation is an invariant break and not a recoverable condition. In that
   * break, the kernel reports a lifecycle as performed when it did not perform
   * it. The frames swap an even number of times. So when nested from `prepare`,
   * neither transaction lands and `current` is untouched. When nested from
   * `effect`, the inner transaction's frame replaces the outer's committed
   * frame, while the staged command run against it is the outer's. Both
   * transitions then return `TRANSITION_COMMITTED`, and neither path produces a
   * diagnostic. This is the worst form a broken invariant can take: the code
   * succeeds and does the wrong thing. A nested `begin()` does not publish a
   * half-built frame, because the swaps cancel, so that is not the reason to
   * refuse.
   *
   * So the refusal sets a flag and does not only throw, for the reason
   * `#reentry` states. `#callAndHandleFailure` rethrows past every
   * classification on the way out to reach the panic path of `ExecutionLoop`.
   * So behavior code that catches its own refusal still panics.
   */
  #refuseReentry(): void {
    if (this.#runningStage !== NO_STAGE) {
      this.#reentry = true;
      // Throw `null`. Do not use an `Error`: it carries a message, and a
      // message here would be an identity for a condition no consumer can
      // reach. Use `null` in particular because the value lands on
      // `DraggableError.cause`, where a consumer's ordinary handling reads it.
      // A symbol there throws on interpolation, and there is no cause on this
      // path.
      // oxlint-disable-next-line typescript/only-throw-error
      throw null;
    }
  }

  /**
   * Runs one behavior callback in its own phase and handles its failure. This
   * is the only place this module runs behavior code, so it is the one boundary
   * the re-entry guard has to cover. Returns what `run` returned, or {@link
   * FAILED} after a throw or a recorded `kernel.fail`.
   *
   * This order is the contract for every call: refuse a nested phase, close the
   * phase, panic on a recorded re-entry, then classify. The panic has to escape
   * past the classification, so it cannot be inside the `catch` that
   * classifies: that handler would catch a `throw` there. So the caught error
   * is carried out as a value and examined below.
   */
  #callAndHandleFailure<Value, Argument>(
    stage: PhaseStage,
    run: (argument: Argument) => Value,
    argument?: Argument,
  ): Value | typeof FAILED {
    this.#refuseReentry();
    this.#failureRequested = false;
    this.#runningStage = stage;

    let value: Value | typeof FAILED;
    let raised: unknown;

    try {
      value = run(argument as Argument);
    } catch (error) {
      value = FAILED;
      raised = error;
    }

    this.#runningStage = NO_STAGE;

    if (this.#reentry) {
      // Cleared on the way out: exactly one `runTransition` on the stack got
      // past the guard, and it is the one that clears the flag. The raised
      // value is not read (see `#reentry`).
      this.#reentry = false;
      // oxlint-disable-next-line typescript/only-throw-error
      throw null;
    }

    if (value === FAILED) {
      // One phase, one classification. The first two arms below are the ways a
      // phase can produce a fault the kernel refuses to classify: the phase is
      // never classified, or it is already classified. A second classification
      // would let the later error decide the operation's outcome. Both arms
      // reach the same consumer the classified one does.
      if (stage === UNCLASSIFIED) {
        // The sentinel says how the failure travels, not what it was, so the
        // warning carries the reason the caller named.
        this.#notify(
          new DraggableWarning(this.#warningMessage, { cause: raised }),
        );
      } else if (this.#failureRequested) {
        // A phase that called `kernel.fail` and then threw is already
        // classified against its own error. The throw travels as a warning, so
        // it cannot decide the outcome.
        this.#notify(
          new DraggableWarning('drag: seam/failed-then-threw', {
            cause: raised,
          }),
        );
      } else {
        this.#fail(stage, raised);
      }

      return FAILED;
    }

    return this.#failureRequested ? FAILED : value;
  }
}

/**
 * The activation transition's policy.
 *
 * A discard retires the operation: the kernel releases capture, disposes the
 * lift and returns to `IDLE`. There is no such thing as a pending operation
 * with no presentation. A failure does not retire. The operation stays live for
 * its queued checkpoint, because retiring would make that entry stale and
 * `onError` might never fire.
 *
 * A committed activation queues `START_COMMITTED` unconditionally. A cancel or
 * destroy `onStart` raised is applied at a boundary, and the entry reads the
 * held cancel.
 */
export function runActivationTransition<
  Part extends object,
  Prepared extends {},
  Capability,
>(
  runner: BehaviorRunner<Part>,
  transition: Transition<Part, Prepared, Capability>,
  capability: Capability,
  stage: FailureStage,
  phase: Phase,
  policy: Readonly<{ retire(): void; committed(): void }>,
): TransitionOutcome {
  const outcome = runner.runTransition(transition, capability, stage, phase);

  // Dropped before the policy runs, so nothing this transition triggers can
  // read the placeholder it staged. Activation's own `effect` consumes its
  // staged value, whatever it is, and it has no reader afterwards. The behavior
  // chooses the staged type, and the kernel only passes it back and drops it.
  runner.consumeStaged();

  if (outcome === TRANSITION_DISCARDED) {
    policy.retire();
  } else if (outcome === TRANSITION_COMMITTED) {
    policy.committed();
  }

  return outcome;
}

/**
 * The release transition's policy.
 *
 * Release cannot discard: `prepare` returns a command or a rejection, and
 * motion is already closed, so "changed my mind" has no meaning. The staged
 * command is passed on only for a committed transition. Passing it on
 * unconditionally would let the consumer receive `onReorder` for a release
 * whose presentation effect had thrown, racing the failure through the same
 * queue. The caller queues the round-trip and does not open it.
 */
export function runReleaseTransition<Part extends object, Prepared extends {}>(
  runner: BehaviorRunner<Part>,
  transition: Transition<Part, Prepared>,
  stage: FailureStage,
  committed: (prepared: Prepared) => void,
): TransitionOutcome {
  const outcome = runner.runTransition(transition, undefined, stage);
  // Taken unconditionally: on any other outcome this clears whatever an earlier
  // transition left, and `committed` never sees it.
  const command = runner.consumeStaged();

  if (outcome === TRANSITION_COMMITTED) {
    committed(command as Prepared);
  }

  return outcome;
}
