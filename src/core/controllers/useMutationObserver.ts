import type { ReactiveController } from '../elements/reactive-controller.ts';
import { use, type ReactiveElement } from '../elements/reactive-element.ts';

class MutationObserverController implements ReactiveController {
  readonly #observe: () => void;
  readonly #observer: MutationObserver;

  constructor(
    host: ReactiveElement,
    options: MutationObserverInit,
    callback: MutationCallback,
  ) {
    this.#observer = new MutationObserver(callback);
    this.#observe = () => this.#observer.observe(host, options);
  }

  connected() {
    this.#observe();
  }

  disconnected(): void {
    this.#observer.disconnect();
  }
}

export function useMutationObserver(
  host: ReactiveElement,
  options: MutationObserverInit,
  callback: MutationCallback,
): void {
  use(host, new MutationObserverController(host, options, callback));
}
