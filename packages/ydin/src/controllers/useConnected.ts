import { use, type ControlledElement } from '../controlled-element.ts';

export type ConnectedSetupCallback = () => void;

export function useConnected(
  element: ControlledElement,
  callback: ConnectedSetupCallback,
): void {
  use(element, { connected: callback });
}
