/**
 * The consumer-facing fault vocabulary.
 *
 * Every fault the library surfaces reaches the consumer's `onError`, and the
 * class that arrives says whether the operation was affected. A
 * `DraggableError` changed the terminal result, the phase sequence or the
 * settlement. A `DraggableWarning` changed none of those.
 */
import type { FailureStage } from './failures.ts';

/**
 * A consequential fault: the operation's terminal result, phase sequence or
 * settlement is not what it would have been.
 *
 * `stage` says where the library was when the fault occurred. It is `null` in
 * one case only: the controller was destroyed, so there was no operation to
 * classify. The twelve stage constants are published beside this class so that
 * the number can be named.
 *
 * The native `cause` carries the classifying error. `message` is that error's
 * own message whenever there is one, so nothing it said is lost.
 *
 * `stage` is the complete classification. `message` and `cause` are
 * diagnostics: nothing may branch on either, and both may change in a patch
 * release. Where the library caught something (a callback of yours, a
 * third-party capability, the platform), `cause` is that value unchanged and
 * `message` is its message. Where the library detected a condition and caught
 * nothing, `message` is a `drag: <area>/<condition>` identity that names the
 * condition, so that a production bug report says which invariant broke. That
 * identity is not a second classification and is not part of the API.
 *
 * The two classes differ here, and the difference is the reason for this rule:
 * a {@link DraggableWarning} has no `stage`, so its `message` is the payload.
 *
 * `name` is inherited from `Error`, so a logged fault starts with
 * `Error: drag: …` and not `DraggableError: …`. Only `instanceof` identifies
 * the class. A `name` of its own would be a second, weaker discriminator,
 * because a string can be copied and a prototype cannot. That line still has
 * what a bug report needs: the `message` described above is the cause's message
 * or the identity.
 */
export class DraggableError extends Error {
  readonly stage: FailureStage | null;

  constructor(stage: FailureStage | null, cause: unknown) {
    super(
      // Keep the classifying error's message. Only that error says what went
      // wrong; the stage says only where the library was when it happened.
      cause instanceof Error
        ? cause.message
        : stage === null
          ? 'drag: controller destroyed'
          : `drag: failure at stage ${stage}`,
      { cause },
    );
    this.stage = stage;
  }
}

/**
 * An advisory fault: it must be surfaced, and it did not replace the outcome.
 *
 * Examples are a failing disposer, a rollback that threw on its way out, a
 * landing measurement that could not be trusted, and an interpolation the
 * platform refused. The operation terminated exactly as it would have
 * otherwise, with the same terminal result, phase sequence and settlement. What
 * was lost is trajectory, timing or a released resource, never a result.
 *
 * It does not extend {@link DraggableError}, so a handler that tests
 * `err instanceof DraggableError` keeps meaning "my operation was affected".
 * The two are siblings and share no base; the `onError` parameter is their
 * union.
 *
 * There is no discriminator, because nothing follows from a warning. The
 * payload is `message`, which names the reason, and `cause`. Supply `cause` the
 * native way, `new DraggableWarning(reason, { cause })`, because this class
 * declares no constructor: `Error`'s constructor does everything required.
 * `name` is inherited from `Error` for the reason {@link DraggableError} gives.
 */
export class DraggableWarning extends Error {}

// A channel, as seen by a module that does not own it. Kernel-internal, and
// passed to the four sites that hold no controller reference: the lifetimes,
// the top-layer acquisition and both composition rollbacks. A behavior reaches
// the consumer through its own callbacks slot.
export type Notify = (error: DraggableError | DraggableWarning) => void;
