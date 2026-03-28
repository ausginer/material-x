import { use, type ControlledElement } from '../element.ts';

/**
 * Handles a DOM event from an `HTMLElement`.
 *
 * @typeParam N - Event name from `HTMLElementEventMap`.
 */
export type HTMLElementEventListener<N extends keyof HTMLElementEventMap> = (
  event: HTMLElementEventMap[N],
) => void | Promise<void>;

/**
 * Partial mapping of `HTMLElement` event names to listeners.
 */
export type HTMLElementEventListenerMap = Readonly<{
  [N in keyof HTMLElementEventMap]?: HTMLElementEventListener<N>;
}>;

/**
 * Registers DOM event listeners that are active only while the host is
 * connected.
 *
 * @remarks Listeners are attached on connect and removed on disconnect through
 * an internal `AbortController`.
 *
 * @param host - Host element controlling the listener lifecycle.
 * @param listeners - Event listeners keyed by DOM event name.
 * @param target - Element that should receive the listeners. Defaults to the
 *   host itself.
 */
export function useEvents(
  host: ControlledElement,
  listeners: HTMLElementEventListenerMap,
  target: HTMLElement = host,
): void {
  let controller = new AbortController();

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
      controller = new AbortController();
    },
  });
}
