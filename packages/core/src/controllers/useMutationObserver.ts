import { use, type ControlledElement } from '../element.ts';

/**
 * Registers a `MutationObserver` whose lifecycle follows the host connection
 * state.
 *
 * @remarks Observation starts when the host connects and is disconnected when
 * the host disconnects. The observed target defaults to the host itself.
 *
 * @param host - Host element controlling the observer lifecycle.
 * @param callback - Mutation observer callback.
 * @param options - Options forwarded to `observer.observe(...)`.
 * @param target - Node to observe. Defaults to the host itself.
 */
export function useMutationObserver(
  host: ControlledElement,
  callback: MutationCallback,
  options?: MutationObserverInit,
  target: HTMLElement = host,
): void {
  const observer = new MutationObserver(callback);

  use(host, {
    connected() {
      observer.observe(target, options);
    },
    disconnected() {
      observer.disconnect();
    },
  });
}
