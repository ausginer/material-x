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

/**
 * A LIFO stack of idempotent disposers. `use(disposer)` registers one successful
 * acquisition; `dispose()` runs every registered disposer once, in reverse
 * acquisition order, best-effort, so one failed restoration cannot suppress
 * later restorations. Failures are reported through the supplied reporter after
 * the whole stack has been drained.
 *
 * The scope owns no abort signal, phase, or feature policy.
 */

export type ResourceScope = Readonly<{
  /** Registers one successful acquisition's release. */
  use(disposer: Disposer): void;
  /**
   * Registers a disposer that runs only while `guard()` is still true. Used for
   * unresolved-only cleanup such as aborting a consumer resolution that has not
   * yet completed.
   */
  useWhile(guard: () => boolean, disposer: Disposer): void;
  /** Runs and clears every registered disposer in reverse order, best-effort. */
  dispose(): void;
}>;

export function createResourceScope(
  report: (error: unknown) => void,
): ResourceScope {
  const disposers: Disposer[] = [];

  return {
    use(disposer) {
      disposers.push(disposer);
    },

    useWhile(guard, disposer) {
      disposers.push(() => {
        if (guard()) {
          disposer();
        }
      });
    },

    dispose() {
      // Drain first so a re-entrant dispose (a disposer that triggers teardown)
      // cannot run the same disposer twice.
      const pending = disposers.splice(0, disposers.length);

      for (let i = pending.length - 1; i >= 0; i -= 1) {
        try {
          pending[i]!();
        } catch (error) {
          report(error);
        }
      }
    },
  };
}
