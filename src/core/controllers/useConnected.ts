import { use, type ReactiveElement } from '../elements/reactive-element.ts';

export type ConnectedSetupCallback = () => void;

export function useConnected(
  element: ReactiveElement,
  callback: ConnectedSetupCallback,
): void {
  use(element, { connected: callback });
}
