import type { ReactiveController } from '../elements/reactive-controller.ts';
import { use, type ReactiveElement } from '../elements/reactive-element.ts';

export type HTMLElementEventListener<N extends keyof HTMLElementEventMap> = (
  event: HTMLElementEventMap[N],
) => void | Promise<void>;

export type HTMLElementEventListenerMap = Readonly<{
  [N in keyof HTMLElementEventMap]?: HTMLElementEventListener<N>;
}>;

class EventController implements ReactiveController {
  readonly #host: HTMLElement;
  readonly #listeners: HTMLElementEventListenerMap;
  readonly #controller = new AbortController();

  constructor(host: HTMLElement, listeners: HTMLElementEventListenerMap) {
    this.#host = host;
    this.#listeners = listeners;
  }

  connected(): void {
    for (const [name, listener] of Object.entries(this.#listeners)) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
      this.#host.addEventListener(name, listener as EventListener, {
        signal: this.#controller.signal,
      });
    }
  }

  disconnected(): void {
    this.#controller.abort();
  }
}

export function useEvents(
  host: ReactiveElement,
  listeners: HTMLElementEventListenerMap,
): void {
  use(host, new EventController(host, listeners));
}
