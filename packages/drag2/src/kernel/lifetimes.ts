/**
 * The three releasable stages of one admitted operation.
 *
 * Motion ingress dies first, at release: pointer move/up/cancel, pointer
 * capture, scroll and resize invalidation, and any coalesced frame work.
 * Nothing that arrives afterwards can move the geometry the release was
 * resolved from.
 *
 * Cancellation outlives it, because `Escape` and `controller.cancel()` stay
 * valid while a consumer resolver is in flight. Presentation outlives both: the
 * lift stays acquired until the join, and is released immediately before the
 * terminal callback.
 *
 * Every close is latched, so teardown paths may run unconditionally and in any
 * order.
 */
import { DraggableWarning, type Notify } from './errors.ts';

/**
 * Releases one acquisition. Every disposer in this package is idempotent: a
 * second call is a no-op, never an error, so teardown paths may run
 * unconditionally.
 */
export type Disposer = () => void;

/**
 * What a behavior receives at activation: a lifetime it may register work
 * against but cannot close. Closing is the kernel's, so a behavior can neither
 * end motion ingress early nor keep it open past release.
 *
 * `use` reads the scope it is called on, so call it as a method and do not
 * detach it.
 */
export interface LifetimeScope {
  readonly signal: AbortSignal;
  // Declared here rather than mapped over `Lifetime`: a mapped type hides the
  // method syntax, and with it the receiver requirement, from the lint gate.
  use(disposer: Disposer): void;
}

/**
 * One releasable stage: an `AbortSignal`, a disposer stack, and a latched
 * best-effort `dispose`.
 *
 * **`notify` is threaded rather than reached.** A lifetime holds no controller
 * reference — it owns its disposers and an `AbortController` and nothing else
 * — so the one place it could have found the channel is the argument list.
 * Three sites here report, and all three are warnings: the resource is released
 * either way, and what failed is the release rather than the operation.
 */
export class Lifetime implements LifetimeScope {
  readonly #controller = new AbortController();
  readonly #notify: Notify;
  readonly #disposers: Disposer[] = [];

  /**
   * Set by the first `dispose`, before anything else runs, so a disposer or
   * an abort listener that registers more work reaches the late-registration
   * branch rather than a stack nothing will drain again.
   */
  #finalized = false;

  constructor(notify: Notify) {
    this.#notify = notify;
  }

  get signal(): AbortSignal {
    return this.#controller.signal;
  }

  use(disposer: Disposer): void {
    // Registration after closure is always a bug, but the resource it names
    // is real: dropping it leaks, and registering it silently guarantees it
    // never runs. So run it now and report.
    if (this.#finalized) {
      this.#notify(new DraggableWarning('drag: lifetime/use-after-dispose'));

      try {
        disposer();
      } catch (error) {
        this.#notify(
          new DraggableWarning('drag: lifetime/late-disposer', {
            cause: error,
          }),
        );
      }

      return;
    }

    this.#disposers.push(disposer);
  }

  dispose(): void {
    if (this.#finalized) {
      return;
    }

    this.#finalized = true;
    this.#controller.abort();

    // Best-effort LIFO: one failing disposer must not prevent the rest.
    for (let i = this.#disposers.length - 1; i >= 0; i -= 1) {
      try {
        this.#disposers[i]!();
      } catch (error) {
        this.#notify(
          new DraggableWarning('drag: lifetime/disposer-failed', {
            cause: error,
          }),
        );
      }
    }

    this.#disposers.length = 0;
  }
}

/**
 * Five conceptual resource scopes, **three** physical objects. Controller
 * ingress is the controller's own `AbortController`; async attempts are
 * records, not lifetimes.
 *
 * A record rather than a class: it holds no state of its own, and its
 * `dispose` is passed bare to the unwind guard, so it must not need a receiver.
 */
export type OperationLifetimes = Readonly<{
  motion: Lifetime;
  cancellation: Lifetime;
  presentation: Lifetime;
  /** Disposes all three, LIFO, best-effort. */
  dispose: Disposer;
}>;

export function createOperationLifetimes(notify: Notify): OperationLifetimes {
  const motion = new Lifetime(notify);
  const cancellation = new Lifetime(notify);
  const presentation = new Lifetime(notify);

  return {
    motion,
    cancellation,
    presentation,
    dispose(): void {
      presentation.dispose();
      motion.dispose();
      cancellation.dispose();
    },
  };
}
