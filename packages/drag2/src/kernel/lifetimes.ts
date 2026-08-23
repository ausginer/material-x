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
 * lift stays pinned through landing and the authored-presentation gate, and is
 * released immediately before the terminal callback.
 *
 * Every close is latched, so teardown paths may run unconditionally and in any
 * order.
 */
import { report } from './reporter.ts';

/**
 * Releases one acquisition. Every disposer in this package is idempotent: a
 * second call is a no-op, never an error, so teardown paths may run
 * unconditionally.
 */
export type Disposer = () => void;

/**
 * What the behavior receives at activation: the physical `Lifetime` with
 * `dispose` and `finalized` absent (contract D-21).
 *
 * A type-level projection costs nothing — the kernel passes the identical
 * object under the narrower type — and it turns I-11 from "the behavior should
 * not close motion" into "it cannot".
 *
 * **Declared as the base, with `Lifetime` extending it** (D-68). It read
 * `Pick<Lifetime, …>`, which was the same type and the wrong direction once
 * this became public: the projection's closure then named the full `Lifetime`,
 * so publishing the scope dragged the member the projection exists to remove
 * into the kernel entry's documented closure. Deriving the other way publishes
 * exactly what D-21 says a behavior gets, and keeps one declaration of every
 * member.
 */
export type LifetimeScope = Readonly<{
  signal: AbortSignal;
  use(disposer: Disposer): void;
  useWhile(guard: () => boolean, disposer: Disposer): void;
}>;

// ~~`finalized: boolean`~~ **removed 2026-08-22.** A getter on an object built
// three times per operation, with no reader anywhere in `src/` — the internal
// code reads the closure variable this accessor wrapped, not the accessor. A
// dead member of a live object is the one kind a bundler cannot shake.
export type Lifetime = LifetimeScope &
  Readonly<{
    dispose(): void;
  }>;

export function createLifetime(): Lifetime {
  const disposers: Disposer[] = [];
  const controller = new AbortController();
  let finalized = false;

  return {
    signal: controller.signal,

    use(disposer: Disposer): void {
      // Registration after closure is always a bug, but the resource it names
      // is real: dropping it leaks, and registering it silently guarantees it
      // never runs. So run it now and report (contract 02 §Registration after
      // closure).
      if (finalized) {
        report(new Error('drag: lifetime/use-after-dispose'));

        try {
          disposer();
        } catch (error) {
          report(error);
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

      // Best-effort LIFO: one failing disposer must not prevent the rest
      // (I-19).
      for (let i = disposers.length - 1; i >= 0; i -= 1) {
        try {
          disposers[i]!();
        } catch (error) {
          report(error);
        }
      }

      disposers.length = 0;
    },
  };
}

/**
 * Five conceptual resource scopes, **three** physical objects (contract 01
 * §Lifetimes). Controller ingress is the controller's own `AbortController`;
 * async attempts are records, not lifetimes.
 */
export type OperationLifetimes = Readonly<{
  motion: Lifetime;
  cancellation: Lifetime;
  presentation: Lifetime;
  /** Disposes all three, LIFO, best-effort. */
  dispose: Disposer;
}>;

export function createOperationLifetimes(): OperationLifetimes {
  const motion = createLifetime();
  const cancellation = createLifetime();
  const presentation = createLifetime();

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
