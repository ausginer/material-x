import { use, type ControlledElement } from '../element.ts';

/**
 * Handles a DOM event from an `HTMLElement`.
 *
 * @typeParam N - Event name from `HTMLElementEventMap`.
 */
export type ControlledElementEventListener<
  N extends keyof HTMLElementEventMap,
> = (event: HTMLElementEventMap[N]) => void | Promise<void>;

/**
 * `addEventListener` options callers may set. `signal` is owned by
 * {@link useEvents} and cannot be overridden.
 */
export type ListenerOptions = Omit<AddEventListenerOptions, 'signal'>;

/**
 * A listener, optionally paired with `addEventListener` options.
 *
 * @typeParam N - Event name from `HTMLElementEventMap`.
 */
export type ControlledElementEventEntry<N extends keyof HTMLElementEventMap> =
  | ControlledElementEventListener<N>
  | readonly [ControlledElementEventListener<N>, ListenerOptions];

/**
 * Partial mapping of `HTMLElement` event names to listeners.
 */
export type ControlledElementEventListenerMap = Readonly<{
  [N in keyof HTMLElementEventMap]?: ControlledElementEventEntry<N>;
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
  listeners: ControlledElementEventListenerMap,
  target: HTMLElement = host,
): void {
  let controller = new AbortController();

  use(host, {
    connected() {
      for (const [name, entry] of Object.entries(listeners)) {
        const [listener, options] = Array.isArray(entry) ? entry : [entry];
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion
        target.addEventListener(name, listener as EventListener, {
          ...options,
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
