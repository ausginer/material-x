import { use, type ControlledElement } from '../element.ts';

/**
 * Registers a `ResizeObserver` whose lifecycle follows the host connection
 * state.
 *
 * @remarks Observation starts when the host connects and is disconnected when
 * the host disconnects. When no targets are provided, the host itself is
 * observed. The provided `options` are forwarded to each `observer.observe(...)`
 * call.
 *
 * @param host - Host element controlling the observer lifecycle.
 * @param callback - Resize observer callback.
 * @param options - Options forwarded to each `observer.observe(...)` call.
 * @param targets - Elements to observe. Defaults to `[host]`.
 * @returns The created `ResizeObserver` instance.
 */
export function useResizeObserver(
  host: ControlledElement,
  callback: ResizeObserverCallback,
  options: ResizeObserverOptions,
  targets: readonly HTMLElement[] = [host],
): ResizeObserver {
  const observer = new ResizeObserver(callback);

  use(host, {
    connected() {
      for (const target of targets) {
        observer.observe(target, options);
      }
    },
    disconnected() {
      observer.disconnect();
    },
  });

  return observer;
}
