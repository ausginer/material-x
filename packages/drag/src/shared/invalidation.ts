/** Calls `onInvalidate` on scroll, nested scrollers included, and on resize. */
export function listenForInvalidation(
  window: Window,
  signal: AbortSignal,
  onInvalidate: () => void,
): void {
  window.addEventListener('scroll', onInvalidate, {
    signal,
    capture: true,
    passive: true,
  });
  window.addEventListener('resize', onInvalidate, { signal, passive: true });
}

export interface FrameTask {
  schedule(): void;
  cancel(): void;
}

/** One coalesced animation-frame callback. */
export function createFrameTask(window: Window, run: () => void): FrameTask {
  let handle = 0;
  const fire = (): void => {
    handle = 0;
    run();
  };

  return {
    schedule() {
      if (handle === 0) {
        handle = window.requestAnimationFrame(fire);
      }
    },
    cancel() {
      if (handle !== 0) {
        window.cancelAnimationFrame(handle);
        handle = 0;
      }
    },
  };
}
