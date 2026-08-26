/**
 * The consumer-facing fault vocabulary.
 *
 * Every fault the library surfaces reaches the consumer's `onError`, and
 * **which class arrives** says whether the operation was affected: a
 * `DraggableError` changed the terminal result, the phase sequence or the
 * settlement, and a `DraggableWarning` changed none of those.
 */
import type { FailureStage } from './failures.ts';

/**
 * A consequential fault: the operation's terminal result, phase sequence or
 * settlement is not what it would have been.
 *
 * `stage` is where the library was standing when the fault occurred, and is
 * `null` for one case only — the controller was destroyed, so there was no
 * operation to classify. The twelve stage constants are published beside this
 * class so the number can be named.
 *
 * The classifying error is carried on the native `cause`. `message` is that
 * error's own whenever there is one, so nothing it said is flattened away.
 */
export class DraggableError extends Error {
  readonly stage: FailureStage | null;

  constructor(stage: FailureStage | null, cause: unknown) {
    super(
      // Preserved rather than flattened: the classifying error is the only
      // thing that says *what* went wrong, and the stage says only where the
      // library was standing when it did.
      cause instanceof Error
        ? cause.message
        : stage === null
          ? 'drag: controller destroyed'
          : `drag: failure at stage ${stage}`,
      { cause },
    );
    this.name = 'DraggableError';
    this.stage = stage;
  }
}

/**
 * An advisory fault: it must be surfaced, and it did not replace the outcome.
 *
 * A failing disposer, a rollback that threw on its way out, a landing
 * measurement that could not be trusted. The operation terminated exactly as it
 * would have — same terminal result, same phase sequence, same settlement. What
 * was lost is trajectory, timing or a released resource, never an answer.
 *
 * **It does not extend {@link DraggableError}**, so a handler that tests
 * `err instanceof DraggableError` keeps meaning *my operation was affected*.
 * The two are siblings and share no base; the `onError` parameter is the union
 * of them.
 *
 * There is no discriminator, because by construction nothing follows from a
 * warning. The payload is `message`, which names the reason, and `cause`.
 */
export class DraggableWarning extends Error {
  constructor(message: string, cause?: unknown) {
    super(message, { cause });
    this.name = 'DraggableWarning';
  }
}

// The one channel, as seen by a module that does not own it (D-130).
// Kernel-internal, and threaded to the four sites that hold no controller
// reference: the lifetimes, the top-layer acquisition and both composition
// unwinds. A behavior reaches the consumer through its own callbacks slot.
export type Notify = (error: DraggableError | DraggableWarning) => void;
