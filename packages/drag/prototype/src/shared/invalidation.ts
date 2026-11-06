/** Scroll and resize during a drag, and one coalesced frame task. */

/** Calls `onInvalidate` on scroll, nested scrollers included, and on resize. */
export function listenForInvalidation(
  view: Window,
  signal: AbortSignal,
  onInvalidate: () => void,
): void {
  view.addEventListener('scroll', onInvalidate, {
    signal,
    capture: true,
    passive: true,
  });
  view.addEventListener('resize', onInvalidate, { signal, passive: true });
}

export type FrameTask = Readonly<{
  schedule(): void;
  cancel(): void;
}>;

export function createFrameTask(view: Window, run: () => void): FrameTask {
  let handle = 0;
  const fire = (): void => {
    handle = 0;
    run();
  };

  return {
    schedule() {
      if (handle === 0) {
        handle = view.requestAnimationFrame(fire);
      }
    },
    cancel() {
      if (handle !== 0) {
        view.cancelAnimationFrame(handle);
        handle = 0;
      }
    },
  };
}
