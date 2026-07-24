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
import { createResourceScope, type ResourceScope } from './resource-scope.ts';

export type OperationLifetimes = Readonly<{
  /** Aborts when motion ingress closes. Carries pointer and invalidation listeners. */
  motionSignal: AbortSignal;
  /** Aborts when cancellation closes. Carries the Escape listener. */
  cancelSignal: AbortSignal;
  motion: ResourceScope;
  cancellation: ResourceScope;
  presentation: ResourceScope;
  /** Closes motion ingress. Idempotent. */
  closeMotion(): void;
  /** Closes cancellation, and motion first if it is still open. Idempotent. */
  closeCancellation(): void;
  /** Releases temporary presentation. Idempotent. */
  releasePresentation(): void;
  /** Whether motion ingress is already closed. */
  motionClosed(): boolean;
  /** Closes every stage, in order. Idempotent. */
  destroy(): void;
}>;

export function createOperationLifetimes(
  report: (error: unknown) => void,
): OperationLifetimes {
  const motionController = new AbortController();
  const cancelController = new AbortController();
  const motion = createResourceScope(report);
  const cancellation = createResourceScope(report);
  const presentation = createResourceScope(report);
  let motionDone = false;
  let cancellationDone = false;
  let presentationDone = false;

  const closeMotion = (): void => {
    if (motionDone) {
      return;
    }

    motionDone = true;
    motionController.abort();
    motion.dispose();
  };

  const closeCancellation = (): void => {
    closeMotion();

    if (cancellationDone) {
      return;
    }

    cancellationDone = true;
    cancelController.abort();
    cancellation.dispose();
  };

  const releasePresentation = (): void => {
    if (presentationDone) {
      return;
    }

    presentationDone = true;
    presentation.dispose();
  };

  return {
    motionSignal: motionController.signal,
    cancelSignal: cancelController.signal,
    motion,
    cancellation,
    presentation,
    closeMotion,
    closeCancellation,
    releasePresentation,
    motionClosed: () => motionDone,

    destroy() {
      closeCancellation();
      releasePresentation();
    },
  };
}
