/**
 * Active-layout invalidation and coalesced frame work.
 *
 * {@link InvalidationSource} owns active-gesture scroll and resize listeners and
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

export type InvalidationSource = Readonly<{
  /** Attaches scroll/resize listeners that call `onInvalidate` until aborted. */
  arm(signal: AbortSignal, onInvalidate: () => void): void;
}>;

export function createInvalidationSource(realm: DOMRealm): InvalidationSource {
  return {
    arm(signal, onInvalidate) {
      const handler = (): void => {
        onInvalidate();
      };

      // Capture scroll so nested scrollers also invalidate.
      realm.window.addEventListener(SCROLL, handler, {
        signal,
        capture: true,
        passive: true,
      });
      realm.window.addEventListener(RESIZE, handler, {
        signal,
        passive: true,
      });
    },
  };
}

/** One coalesced animation-frame task carrying the latest scheduled value. */
export type FrameTask<T> = Readonly<{
  /** Schedules `run` with the latest value on the next frame (coalesced). */
  schedule(value: T): void;
  /** Runs any pending scheduled work synchronously now. */
  flush(): void;
  /** Cancels any pending scheduled work without running it. */
  cancel(): void;
}>;

export function createFrameTask<T>(
  realm: DOMRealm,
  run: (value: T) => void,
): FrameTask<T> {
  let handle = 0;
  let pending: { value: T } | null = null;

  const runNow = (): void => {
    handle = 0;
    const current = pending;
    pending = null;

    if (current) {
      run(current.value);
    }
  };

  return {
    schedule(value) {
      pending = { value };

      if (handle === 0) {
        handle = realm.window.requestAnimationFrame(runNow);
      }
    },

    flush() {
      if (handle !== 0) {
        realm.window.cancelAnimationFrame(handle);
        runNow();
      }
    },

    cancel() {
      if (handle !== 0) {
        realm.window.cancelAnimationFrame(handle);
        handle = 0;
      }

      pending = null;
    },
  };
}
