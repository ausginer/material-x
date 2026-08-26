/**
 * Active-layout invalidation and coalesced frame work.
 *
 * {@link Invalidator} owns active-gesture scroll and resize listeners and
 * disposes them with the gesture signal. It does not know whether invalidation
 * means re-clamping a free drag or remeasuring sortable items; the feature
 * decides the response.
 *
 * {@link FrameTask} owns one coalesced animation-frame task, keeping rAF ids,
 * exception forwarding, and release flushing outside spatial algorithms.
 */
import type { DOMRealm } from './realm.ts';

const SCROLL = 'scroll';
const RESIZE = 'resize';

/** Attaches scroll/resize listeners that call `onInvalidate` until aborted. */
export type Invalidator = (
  signal: AbortSignal,
  onInvalidate: () => void,
) => void;

export function createInvalidator(realm: DOMRealm): Invalidator {
  return (signal, onInvalidate) => {
    // Capture scroll so nested scrollers also invalidate.
    realm.window.addEventListener(SCROLL, onInvalidate, {
      signal,
      capture: true,
      passive: true,
    });
    realm.window.addEventListener(RESIZE, onInvalidate, {
      signal,
      passive: true,
    });
  };
}

/** One coalesced animation-frame task carrying the latest scheduled value. */
export type FrameTask<T> = Readonly<{
  /** Schedules `run` with the latest value on the next frame (coalesced). */
  schedule(value: T): void;
  // Nothing on this task runs pending work synchronously: a scheduled value is
  // either taken by the frame or dropped by `cancel`, and no composition has a
  // production caller for a third option. Like `Lifetime.finalized`, such a
  // member would sit on a live object, where nothing can shake an uncalled one
  // loose.
  /** Cancels any pending scheduled work without running it. */
  cancel(): void;
}>;

export function createFrameTask<T>(
  realm: DOMRealm,
  run: (value: T) => void,
): FrameTask<T> {
  let handle = 0;
  // The latest scheduled value is held directly with a presence flag, so
  // `schedule` — called per pointer move — allocates no wrapper object.
  let hasPending = false;
  let pending: T | undefined;

  const runNow = (): void => {
    handle = 0;

    if (hasPending) {
      hasPending = false;
      const value = pending as T;
      // Drop the reference so a stale value cannot outlive the frame.
      pending = undefined;
      run(value);
    }
  };

  return {
    schedule(value) {
      pending = value;
      hasPending = true;

      if (handle === 0) {
        handle = realm.window.requestAnimationFrame(runNow);
      }
    },

    cancel() {
      if (handle !== 0) {
        realm.window.cancelAnimationFrame(handle);
        handle = 0;
      }

      hasPending = false;
      pending = undefined;
    },
  };
}
