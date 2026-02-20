import { use, type ReactiveElement } from '../elements/reactive-element.ts';

export type HTMLElementEventListener<N extends keyof HTMLElementEventMap> = (
  event: HTMLElementEventMap[N],
) => void | Promise<void>;

export type HTMLElementEventListenerMap = Readonly<{
  [N in keyof HTMLElementEventMap]?: HTMLElementEventListener<N>;
}>;

export function useEvents(
  host: ReactiveElement,
  listeners: HTMLElementEventListenerMap,
  target: HTMLElement = host,
): void {
  const controller = new AbortController();

  use(host, {
    connected() {
      for (const [name, listener] of Object.entries(listeners)) {
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion
        target.addEventListener(name, listener as EventListener, {
          signal: controller.signal,
        });
      }
    },
    disconnected() {
      controller.abort();
    },
  });
}
