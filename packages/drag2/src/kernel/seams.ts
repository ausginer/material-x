/**
 * The transactional seam driver (contract 02 §The tri-phase transition).
 *
 * Every substantial action is three stages — **prepare** (validation, pure
 * calculation, DOM reads, local acquisition), **commit** (short, effectively
 * non-throwing), **post-commit effects** (DOM writes, lifetime closes,
 * continuations, callbacks). The order is the shape of the contract rather
 * than a rule the behavior obeys: the kernel drives all three stages and the
 * behavior supplies two pure-ish callbacks (D-3).
 *
 * There is one core routine, and **no seam is only the core** — the discard
 * policy and the failure policy differ per seam, and pretending otherwise hid
 * four real gaps (F-19, F-27).
 */
import { DraggableWarning, type Notify } from './errors.ts';
import type { FailureStage } from './failures.ts';
import type { Draft, Frame } from './frames.ts';

/**
 * A seam that stages nothing uses `Prepared = true` and returns the literal.
 *
 * `extends {}` excludes `null` and `undefined` while still admitting the `true`
 * sentinel, an element, or any object — which keeps `Prepared | null`
 * unambiguous as the discard signal without leaving it to prose.
 */
export type Transition<
  Part extends object,
  Prepared extends {} = true,
  Capability = void,
> = Readonly<{
  /**
   * Returns the staged value, or `null` to discard. Must not touch `current`,
   * must not perform DOM writes, and must keep every acquisition local —
   * everything it acquires travels out through `Prepared`.
   */
  prepare(draft: Draft<Part>, capability: Capability): Prepared | null;

  /**
   * Post-commit effects, for an already-published transition. A throw here
   * becomes a classified failure **from the committed state**; the transition
   * is not reverted.
   */
  effect(
    current: Readonly<Frame<Part>>,
    prepared: Prepared,
    capability: Capability,
  ): void;

  /**
   * Called instead of `effect` when the kernel discards a successful `prepare`
   * because a reentrant `cancel()` or `destroy()` invalidated it. Releases
   * whatever `prepare` staged. Publishes nothing, reports nothing.
   */
  rollback?(prepared: Prepared): void;
}>;

/**
 * Behavior action tags get the same envelope, which is what makes "the behavior
 * never calls `begin()`/`commit()`" hold for behavior-initiated work too.
 *
 * `Prepared` is opaque to the kernel, which threads it; the behavior narrows it
 * by tag.
 */
export type ActionTransition<Part extends object> = Readonly<{
  prepare(tag: number, argument: unknown, draft: Draft<Part>): {} | null;
  effect(
    tag: number,
    argument: unknown,
    current: Readonly<Frame<Part>>,
    prepared: {},
  ): void;
  rollback?(tag: number, prepared: {}): void;
}>;

/** `prepare` returned `null` — nothing happened. */
export const SEAM_DISCARDED = 0;
/** A reentrant cancel/destroy invalidated an otherwise good prepare. */
export const SEAM_INVALIDATED = 1;
/** Classified; nothing committed. */
export const SEAM_PREPARE_FAILED = 2;
/** Committed, effect returned normally. */
export const SEAM_COMMITTED = 3;
/** Classified, from the committed state. */
export const SEAM_EFFECT_FAILED = 4;

/**
 * What one seam run did, named once so every caller branches on the same
 * vocabulary.
 *
 * There are no predicate helpers over this union; call sites name the outcomes
 * they mean (D-128).
 *
 * **A classified failure must also stop incompatible continuation**, and
 * `runSeam` is where that is enforced:
 * because the failure checkpoint is *queued* (D-23). Between the throw and the
 * checkpoint there is a window in which the driver would otherwise still be
 * doing success work — so `SEAM_PREPARE_FAILED` returns before `commit()`, and
 * `SEAM_EFFECT_FAILED` returns before anything is staged.
 */
export type SeamOutcome =
  | typeof SEAM_DISCARDED
  | typeof SEAM_INVALIDATED
  | typeof SEAM_PREPARE_FAILED
  | typeof SEAM_COMMITTED
  | typeof SEAM_EFFECT_FAILED;

/**
 * The kernel-private state the driver operates on. Supplied by `createKernel`,
 * which owns the frame pair, the operation identity and the queue.
 *
 * The frames are read through accessors because the kernel *swaps* the two
 * references at commit, so no stable reference can be captured here.
 */
export type SeamContext<Part extends object> = Readonly<{
  /** `Object.assign(draft, current)`. */
  begin(): void;
  /** Swap the two frame references. */
  commit(): void;
  /** False once a reentrant cancel or destroy invalidated the preparation. */
  preparationValid(): boolean;
  readCurrent(): Readonly<Frame<Part>>;
  readDraft(): Draft<Part>;
  /** Queue a classified failure against the operation the kernel holds. */
  fail(stage: FailureStage, error: unknown): void;
  /**
   * The controller's one channel (D-130). No checkpoint is queued, no recovery
   * is selected, and the operation's own outcome is untouched — which is what
   * makes everything the driver sends here a {@link DraggableWarning}.
   */
  notify: Notify;
}>;

export type SeamDriver<Part extends object> = Readonly<{
  /**
   * The shared core: begin → prepare → revalidate → rollback-or-commit →
   * effect. Returns the outcome; the caller applies its own seam's
   * continuation policy.
   *
   * A committed transition leaves its `Prepared` value in the driver's staging
   * slot, for the two seams whose staged value the *kernel* needs after the
   * seam returns — the release seam's `ResolutionCommand`, the settlement
   * seam's gate plan. Read it with {@link SeamDriver.consumeStaged}.
   *
   * `effectStage` defaults to `stage` and exists for the one seam whose two
   * phases fail at different stages: a behavior action resolves an insertion in
   * `prepare` and moves the placeholder in `effect`, and contract 02 classifies
   * a throw in each at its own stage. An explicit `host.fail` narrows further
   * from the inside; this is only the default a raw throw lands on.
   */
  runCore<Prepared extends {}, Capability>(
    transition: Transition<Part, Prepared, Capability>,
    capability: Capability,
    stage: FailureStage,
    effectStage?: FailureStage,
  ): SeamOutcome;

  /**
   * Takes the staged value of the last committed transition, clearing the slot.
   *
   * **Consume-and-clear, and cleared again as every seam opens.** Both halves
   * are load-bearing: a staged value must never outlive the one transition that
   * produced it. Without the clear-on-read, a seam that commits without staging
   * anything would let a caller read the *previous* seam's command; without the
   * clear-on-open, so would a seam that discarded or failed. Either would
   * execute a resolution belonging to a transaction that is over.
   *
   * Returns `null` when the last seam staged nothing, discarded, was
   * invalidated, failed, or committed an effect that then abandoned the
   * operation.
   *
   * **Every seam either consumes its staged value or drops it.** The two seam
   * policies below drop it for their callers; the seams the kernel drives
   * directly drop it themselves. A value left behind is reported (D-108).
   */
  consumeStaged(): unknown;

  /**
   * A non-transactional seam returning nothing — `moved`, `finalized`. Returns
   * `false` when it threw or latched a failure.
   *
   * This exists so those seams behave **identically** whether the behavior
   * throws or calls `host.fail`. Without it a `moved` throw escaped the handler
   * and became a *panic* that destroyed the controller, contradicting the
   * existence of `FAILURE_RENDERER_WRITE` (F-40).
   */
  runLeaf(run: () => void, stage: FailureStage): boolean;

  /**
   * A non-transactional seam returning a value — `anchorTarget`. Returns
   * `undefined` when it threw or latched a failure, which is why `Value` is
   * constrained to exclude `undefined`.
   */
  runLeafValue<Value extends {}>(
    run: () => Value,
    stage: FailureStage,
  ): Value | undefined;

  /**
   * {@link SeamDriver.runLeafValue} on the **unclassified track**: the seam
   * still runs inside a phase — re-entry refused, `host.fail` latched, one
   * report per phase — but a failure reaches the consumer as a warning instead
   * of settling the operation (D-49).
   *
   * One caller: the arm-time landing measurement. A target that cannot be
   * produced and one that cannot be trusted are the same fault, and neither is
   * a reason to tell a consumer whose reorder succeeded that it did not.
   *
   * There is no stage argument: an unclassified failure names no stage, only a
   * `reason` the report carries.
   */
  runUnclassifiedValue<Value extends {}>(
    run: () => Value,
    reason: string,
  ): Value | undefined;

  /**
   * `host.fail`. Valid **only inside a kernel-driven seam of the current
   * operation**: a call outside one is reported as a warning instead, because
   * a late continuation from operation A could otherwise classify a failure
   * against operation B (F-23).
   */
  requestFailure(stage: FailureStage, error: unknown): void;

  /** Whether a seam phase is currently open. Diagnostics and tests. */
  isInSeam(): boolean;
}>;

/**
 * No phase is open. `FailureStage` starts at 1, so `0` and `-1` are free to
 * carry the two readings a stage alone cannot.
 */
const NO_STAGE = 0;

/**
 * The stage of a phase whose failures are **reported, never classified**.
 *
 * One sentinel, because there is one report channel (D-130).
 *
 * Two phases open under it, and their reasons are worth keeping distinct even
 * though their handling is now identical. `rollback` runs when the operation is
 * already invalid, so classifying there would open a transition against an
 * operation the kernel has just decided to abandon. The arm-time landing
 * measurement runs when the operation is already **committed**, so classifying
 * there would settle a drop that really happened (D-49). Applying the sentinel
 * to the whole phase is what makes an explicit `host.fail` inside either behave
 * exactly like a throw inside it.
 */
const UNCLASSIFIED = -1;

/** What an open phase classifies against. */
type PhaseStage = FailureStage | typeof UNCLASSIFIED;

/**
 * A phase that threw or latched a failure, as a value.
 *
 * A private symbol, so it is distinguishable from every legal `Prepared`,
 * `null` and leaf value without constraining what a seam may stage.
 */
const FAILED = Symbol();

export function createSeamDriver<Part extends object>(
  context: SeamContext<Part>,
): SeamDriver<Part> {
  /**
   * The stage the open phase classifies against, or `NO_STAGE` between phases.
   * One variable rather than a set of booleans: *whether* behavior code is
   * running, *which* operation stage owns its failures, and *whether* they are
   * classified at all are three readings of the same fact, and splitting them
   * let them drift apart.
   */
  let openStage: PhaseStage | typeof NO_STAGE = NO_STAGE;
  /**
   * Set by `requestFailure`, cleared as each phase opens. **A latched failure
   * is indistinguishable from a throw at the driver boundary** — which is the
   * whole point: enqueuing a checkpoint is not enough on its own, because the
   * checkpoint is queued and the window before it applies is exactly what the
   * latch closes (D-28, F-34).
   */
  let failureRequested = false;
  /**
   * The message an `UNCLASSIFIED` phase reports under. Set as that phase opens
   * and read only while it is open, which is the same lifetime
   * `failureRequested` has and for the same reason: the driver runs exactly one
   * phase at a time (`refuseReentry`).
   *
   * A string where this was a `FailureStage` (D-130): the warning names its
   * reason in its message, so the driver carries the reason rather than a
   * classification it is about to refuse to apply.
   */
  let unclassifiedReason = 'drag: seam/rollback-failed';
  /**
   * The staged value of the last committed transition. Owned by the driver
   * rather than passed in, so no call path can skip the reset: passed in, a
   * `runCore` handed no slot would leave the previous seam's value readable.
   */
  let staged: unknown = null;
  /**
   * Set when a seam is re-entered, and the reason the refusal is a latch rather
   * than a bare `throw`: the nested call raises from inside the outer seam's
   * `prepare` or `effect`, so the outer `catch` would otherwise classify an
   * invariant break as an ordinary behavior failure and swallow it. The latch
   * also survives behavior code that catches the error itself.
   */
  let reentry: Error | null = null;

  /**
   * Refuses to open anything while a phase is already open, **before the caller
   * mutates a byte**.
   *
   * Strictly non-reentrant. Nothing in the kernel runs behavior code from
   * inside other behavior code — the queue is run-to-completion, so a nested
   * `dispatch` from a callback appends and returns, and the appended action
   * opens its phase only after this one has finished. An open phase is exactly
   * the right sentinel: it is open only while behavior code is executing, which
   * is the only place a nested call could originate.
   *
   * A violation is an invariant break, not a recoverable condition: a nested
   * `begin()`/`commit()` would rebuild the draft underneath the outer seam and
   * publish its half-built frame. So the refusal **latches** rather than merely
   * throwing — the nested call raises from inside the outer phase, whose
   * `catch` would otherwise classify an invariant break as an ordinary behavior
   * failure and swallow it. `runPhase` rethrows the latch past every
   * classification on the way out to reach the queue's panic path, which is
   * also what makes behavior code that catches its own refusal panic anyway.
   */
  const refuseReentry = (): void => {
    if (openStage !== NO_STAGE) {
      reentry = new Error('drag: seam/re-entered');
      throw reentry;
    }
  };

  /**
   * One behavior callback, start to finish — **the only place this module runs
   * foreign code**, and therefore the one boundary the re-entry guard has to
   * cover. Refuses a nested phase, opens the phase, runs `run`, closes it,
   * panics on a latched re-entry, and reduces a throw or a latched `host.fail`
   * to {@link FAILED}. Returns whatever `run` returned otherwise.
   *
   * The order is the contract, and having it in one place is why it holds for
   * every seam: **refuse, then close, then panic, then classify**. The panic
   * has to escape past the classification, so it cannot live inside the `catch`
   * that classifies — a `throw` there would be caught by that very handler.
   * Hence the caught error is carried out as a value and re-examined below.
   */
  const runPhase = <Value>(
    stage: PhaseStage,
    run: () => Value,
  ): Value | typeof FAILED => {
    refuseReentry();
    failureRequested = false;
    openStage = stage;

    let value: Value | typeof FAILED;
    let raised: unknown;

    try {
      value = run();
    } catch (error) {
      value = FAILED;
      raised = error;
    }

    openStage = NO_STAGE;

    if (reentry) {
      // Cleared on the way out: exactly one `runCore` on the stack got past the
      // guard, and it is the one that unlatches.
      const panic = reentry;

      reentry = null;
      throw panic;
    }

    if (value === FAILED) {
      // **One phase, one classification**, and the two arms below are the two
      // ways a phase can produce a fault the kernel refuses to classify: the
      // phase was never classified at all, or it was already classified once.
      // Classifying a second time for a single phase would let the later error
      // decide the operation's outcome. Nothing is lost either way — since
      // D-130 both arms reach the same consumer the classified one does.
      if (stage === UNCLASSIFIED) {
        // `unclassifiedReason` rather than the sentinel, because the sentinel
        // says how the failure travels and never what it was — the reason the
        // consumer reads is the one the caller named.
        context.notify(
          new DraggableWarning(unclassifiedReason, { cause: raised }),
        );
      } else if (failureRequested) {
        // **One phase, one report.** A phase that called `host.fail` and then
        // threw is already classified against its own error; the throw travels
        // as a warning, which is what keeps it from deciding the outcome.
        context.notify(
          new DraggableWarning('drag: seam/failed-then-threw', {
            cause: raised,
          }),
        );
      } else {
        context.fail(stage, raised);
      }

      return FAILED;
    }

    return failureRequested ? FAILED : value;
  };

  return {
    runCore(transition, capability, stage, effectStage = stage) {
      // Not the same call as the one inside `runPhase`, and not redundant with
      // it: a transaction mutates kernel state *before* its first phase opens,
      // and `begin()` would rebuild the draft the outer seam is still building.
      // The refusal has to land before that, not one line later.
      refuseReentry();

      if (staged !== null) {
        // The clear below already makes this harmless; the report is what stops
        // it from being *invisible*. A staged value still sitting here means the
        // previous seam neither consumed nor dropped it, which is the one way a
        // command can outlive its transaction.
        context.notify(new DraggableWarning('drag: seam/staged-unconsumed'));
      }

      staged = null;
      context.begin();

      const prepared = runPhase(stage, () =>
        transition.prepare(context.readDraft(), capability),
      );

      if (prepared === FAILED) {
        return SEAM_PREPARE_FAILED; // nothing staged escaped
      }

      if (prepared === null) {
        return SEAM_DISCARDED; // the draft is abandoned
      }

      if (!context.preparationValid()) {
        unclassifiedReason = 'drag: seam/rollback-failed';
        runPhase(UNCLASSIFIED, () => transition.rollback?.(prepared));
        return SEAM_INVALIDATED;
      }

      context.commit();

      const effected = runPhase(effectStage, () =>
        transition.effect(context.readCurrent(), prepared, capability),
      );

      if (effected === FAILED) {
        return SEAM_EFFECT_FAILED; // classified, from the committed state
      }

      // Staged **after** the effect, deliberately. Anything the effect triggers
      // — a queued action, a consumer callback — therefore cannot observe or
      // clear this transition's staged value, and the assignment lands last
      // regardless of what ran in between.
      //
      // Which is exactly why it is conditional. Staging last means staging
      // *after* an effect that reentrantly destroyed the controller or
      // abandoned the operation, and the caller would then execute a command
      // belonging to a transaction that no longer has anything to execute
      // against — the release seam invoking the consumer's resolver for an
      // operation `destroy()` already retired. A preparation that is no longer
      // valid stages nothing, and the caller reads `null`.
      staged = context.preparationValid() ? prepared : null;
      return SEAM_COMMITTED;
    },

    runLeaf(run, stage) {
      return runPhase(stage, run) !== FAILED;
    },

    runLeafValue(run, stage) {
      const value = runPhase(stage, run);

      return value === FAILED ? undefined : value;
    },

    runUnclassifiedValue(run, reason) {
      unclassifiedReason = reason;

      const value = runPhase(UNCLASSIFIED, run);

      return value === FAILED ? undefined : value;
    },

    consumeStaged() {
      const value = staged;

      staged = null;
      return value;
    },

    requestFailure(stage, error) {
      // **A latched failure and a throw are the same event on this path too**
      // (D-49: "or `anchorTarget` throws or latches"). The flag is what makes
      // `runPhase` return `FAILED` for a phase that latched without throwing,
      // so the caller sees no target either way.
      if (openStage === UNCLASSIFIED) {
        failureRequested = true;
        context.notify(
          new DraggableWarning(unclassifiedReason, { cause: error }),
        );
        return;
      }

      if (openStage === NO_STAGE) {
        // **One warning, not two reports** (D-130 §2.2). A caught error and a
        // library-authored companion naming why the classification was denied
        // are one fault said twice: the message names the reason and `cause`
        // carries the caller's error, which is what a discriminating code
        // would otherwise be for.
        //
        // The caller's `stage` is deliberately discarded. It describes a
        // classification the kernel has just refused to apply, and carrying it
        // into the warning would publish a claim about the operation that this
        // branch exists to *not* make.
        context.notify(
          new DraggableWarning('drag: seam/fail-outside-seam', {
            cause: error,
          }),
        );

        return;
      }

      // The stage is the caller's, not the open phase's: a leaf narrows its own
      // stage from the inside (`moved` renders and schedules in one callback).
      failureRequested = true;
      context.fail(stage, error);
    },

    isInSeam: () => openStage !== NO_STAGE,
  };
}

/**
 * The activation seam's policy (contract 02 §The core returns an outcome).
 *
 * A discard **retires the operation** — the kernel releases capture, disposes
 * the lift and returns to `IDLE`; there is no such thing as a pending operation
 * with no presentation. A *failure* does **not** retire: the operation stays
 * live for its queued checkpoint, because retiring would make that entry stale
 * and `onError` might never fire (F-27).
 *
 * On a committed activation the kernel re-checks `preparationValid()` before
 * dispatching `START_COMMITTED`, since `activation.effect` invokes `onStart`
 * last and that callback may cancel or destroy.
 */
export function runActivationSeam<
  Part extends object,
  Prepared extends {},
  Capability,
>(
  driver: SeamDriver<Part>,
  transition: Transition<Part, Prepared, Capability>,
  capability: Capability,
  stage: FailureStage,
  policy: Readonly<{ retire(): void; committed(): void }>,
): SeamOutcome {
  const outcome = driver.runCore(transition, capability, stage);

  // Dropped **before** the policy runs, so nothing this seam triggers can read
  // the placeholder it staged. Activation's staged value is consumed by its own
  // `effect` and has no reader afterwards — whatever it is: since D-34 the
  // behavior chooses the staged type, and the kernel's handling is unchanged
  // because it never did anything but hand the value back and drop it.
  driver.consumeStaged();

  if (outcome === SEAM_DISCARDED || outcome === SEAM_INVALIDATED) {
    policy.retire();
  } else if (outcome === SEAM_COMMITTED) {
    policy.committed();
  }

  return outcome;
}

/**
 * The release seam's policy.
 *
 * Release **cannot discard** — `prepare` returns a command or a rejection, and
 * motion is already closed, so "changed my mind" has no meaning. The staged
 * command is executed **only** on a committed transition: running it
 * unconditionally let the consumer receive `onReorder` for a release whose
 * presentation effect had thrown, racing the failure through the same queue
 * (F-27).
 */
export function runReleaseSeam<Part extends object, Prepared extends {}>(
  driver: SeamDriver<Part>,
  transition: Transition<Part, Prepared>,
  stage: FailureStage,
  execute: (prepared: Prepared) => void,
): SeamOutcome {
  const outcome = driver.runCore(transition, undefined, stage);
  // Taken unconditionally: on any other outcome this clears whatever an earlier
  // seam left, and `execute` never sees it.
  const command = driver.consumeStaged();

  // `null` on a committed seam means the effect abandoned the operation — a
  // reentrant `destroy()`. The command has nothing left to run against, and
  // executing it would open the consumer round-trip for a retired operation.
  if (outcome === SEAM_COMMITTED && command !== null) {
    execute(command as Prepared);
  }

  return outcome;
}
