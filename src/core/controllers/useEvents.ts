import type { ReactiveController } from '../elements/reactive-controller.ts';
import { use, type ReactiveElement } from '../elements/reactive-element.ts';

export type HTMLElementEventListener<N extends keyof HTMLElementEventMap> = (
  event: HTMLElementEventMap[N],
) => void | Promise<void>;

export type HTMLElementEventListenerMap = Readonly<{
  [N in keyof HTMLElementEventMap]?: HTMLElementEventListener<N>;
}>;

class EventController implements ReactiveController {
  readonly #target: HTMLElement;
  readonly #listeners: HTMLElementEventListenerMap;
  readonly #controller = new AbortController();

  constructor(target: HTMLElement, listeners: HTMLElementEventListenerMap) {
    this.#target = target;
    this.#listeners = listeners;
  }

  connected(): void {
    for (const [name, listener] of Object.entries(this.#listeners)) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
      this.#target.addEventListener(name, listener as EventListener, {
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
  target: HTMLElement = host,
): void {
  use(host, new EventController(target, listeners));
}
