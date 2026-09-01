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
 */
export type LifetimeScope = Readonly<{
  signal: AbortSignal;
  use(disposer: Disposer): void;
  useWhile(guard: () => boolean, disposer: Disposer): void;
}>;

export type Lifetime = LifetimeScope &
  Readonly<{
    dispose(): void;
  }>;

/**
 * **`notify` is threaded rather than reached.** A lifetime holds no controller
 * reference — it closes over its disposers and an `AbortController` and nothing
 * else — so the one place it could have found the channel is the argument list.
 * Three sites here report, and all three are warnings: the resource is released
 * either way, and what failed is the release rather than the operation.
 */
export function createLifetime(notify: Notify): Lifetime {
  const disposers: Disposer[] = [];
  const controller = new AbortController();
  let finalized = false;

  return {
    signal: controller.signal,

    use(disposer: Disposer): void {
      // Registration after closure is always a bug, but the resource it names
      // is real: dropping it leaks, and registering it silently guarantees it
      // never runs. So run it now and report.
      if (finalized) {
        notify(new DraggableWarning('drag: lifetime/use-after-dispose'));

        try {
          disposer();
        } catch (error) {
          notify(
            new DraggableWarning('drag: lifetime/late-disposer', {
              cause: error,
            }),
          );
        }

        return;
      }

      disposers.push(disposer);
    },

    useWhile(guard: () => boolean, disposer: Disposer): void {
      this.use(() => {
        if (guard()) {
          disposer();
        }
      });
    },

    dispose(): void {
      if (finalized) {
        return;
      }

      finalized = true;
      controller.abort();

      // Best-effort LIFO: one failing disposer must not prevent the rest.
      for (let i = disposers.length - 1; i >= 0; i -= 1) {
        try {
          disposers[i]!();
        } catch (error) {
          notify(
            new DraggableWarning('drag: lifetime/disposer-failed', {
              cause: error,
            }),
          );
        }
      }

      disposers.length = 0;
    },
  };
}

/**
 * Five conceptual resource scopes, **three** physical objects. Controller
 * ingress is the controller's own `AbortController`; async attempts are
 * records, not lifetimes.
 */
export type OperationLifetimes = Readonly<{
  motion: Lifetime;
  cancellation: Lifetime;
  presentation: Lifetime;
  /** Disposes all three, LIFO, best-effort. */
  dispose: Disposer;
}>;

export function createOperationLifetimes(notify: Notify): OperationLifetimes {
  const motion = createLifetime(notify);
  const cancellation = createLifetime(notify);
  const presentation = createLifetime(notify);

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
