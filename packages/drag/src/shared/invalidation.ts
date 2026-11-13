/** Calls `listener` on scroll, nested scrollers included, and on resize. */
export function listenForInvalidation(
  window: Window,
  signal: AbortSignal,
  listener: EventListenerOrEventListenerObject,
): void {
  window.addEventListener('scroll', listener, {
    signal,
    capture: true,
    passive: true,
  });
  window.addEventListener('resize', listener, { signal, passive: true });
}

export interface FrameTask {
  _schedule(): void;
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
    _schedule() {
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
