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

/** One coalesced animation-frame callback. */
export class FrameTask {
  readonly #window: Window;
  /** The one function every schedule passes to `requestAnimationFrame`. */
  readonly #fire;
  #handle = 0;

  constructor(window: Window, run: () => void) {
    this.#window = window;
    this.#fire = (): void => {
      this.#handle = 0;
      run();
    };
  }

  schedule(): void {
    if (this.#handle === 0) {
      this.#handle = this.#window.requestAnimationFrame(this.#fire);
    }
  }

  cancel(): void {
    if (this.#handle !== 0) {
      this.#window.cancelAnimationFrame(this.#handle);
      this.#handle = 0;
    }
  }
}
