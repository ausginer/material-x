import { use, type ControlledElement } from '../element.ts';

/**
 * Runs when a host element connects to the document.
 */
export type ConnectedSetupCallback = () => void;

/**
 * Registers a `connected` lifecycle callback on a host element.
 *
 * @remarks This is a thin convenience helper over `use(host, { connected })`.
 *
 * @param element - Host element whose `connected` lifecycle should be observed.
 * @param callback - Callback invoked each time the host connects.
 */
export function useConnected(
  element: ControlledElement,
  callback: ConnectedSetupCallback,
): void {
  use(element, { connected: callback });
}
