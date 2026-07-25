/**
 * The three releasable stages of one admitted operation.
 *
 * Motion ingress dies first, at release: pointer move/up/cancel, pointer
 * capture, scroll and resize invalidation, and any coalesced frame work. Nothing
 * that arrives afterwards can move the geometry the release was resolved from.
 *
 * Cancellation outlives it. `Escape` and `controller.cancel()` stay valid while
 * a consumer resolver is in flight, and the resolver's dedicated `AbortSignal`
 * is aborted from this stage — which is why it cannot share a lifetime with
 * motion, and why the resolver owns its own controller while this stage owns
 * only the guarded registration that aborts it.
 *
 * Presentation outlives both: the lift stays pinned through landing and the
 * authored-presentation barrier, and is released immediately before the terminal
 * callback.
 *
 * Every close is latched, so teardown paths may run unconditionally and in any
 * order.
 */

/**
 * Releases one acquisition. Every disposer in this package is idempotent: a
 * second call is a no-op, never an error, so teardown paths may run
 * unconditionally.
 *
 * This is the package's single release shape. Anything acquired — a pointer
 * capture, an inline-style snapshot, a top-layer entry, a readiness watch —
 * hands back one of these rather than its own one-method handle type.
 */
export type Disposer = () => void;

export type Lifetime = Readonly<{
  signal: AbortSignal;
  finalized: boolean;
  use(disposer: Disposer): void;
  useWhile(guard: () => boolean, disposer: Disposer): void;
  dispose(): void;
}>;

export function createLifetime(report: (error: unknown) => void): Lifetime {
  const disposers: Disposer[] = [];
  const controller = new AbortController();
  let finalized = false;

  return {
    signal: controller.signal,

    get finalized(): boolean {
      return finalized;
    },

    use(disposer: Disposer): void {
      disposers.push(disposer);
    },

    useWhile(guard: () => boolean, disposer: Disposer): void {
      disposers.push(() => {
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

      for (let i = disposers.length - 1; i >= 0; i--) {
        try {
          disposers[i]!();
        } catch (error) {
          report(error);
        }
      }
    },
  };
}

export type OperationLifetimes = Readonly<{
  motion: Lifetime;
  cancellation: Lifetime;
  presentation: Lifetime;
  dispose: Disposer;
}>;

export function createOperationLifetimes(
  report: (error: unknown) => void,
): OperationLifetimes {
  const motion = createLifetime(report);
  const cancellation = createLifetime(report);
  const presentation = createLifetime(report);

  return {
    motion,
    cancellation,
    presentation,
    dispose() {
      motion.dispose();
      cancellation.dispose();
      presentation.dispose();
    },
  };
}
