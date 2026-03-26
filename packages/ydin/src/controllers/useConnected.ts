import { use, type ControlledElement } from '../element.ts';

export type ConnectedSetupCallback = () => void;

export function useConnected(
  element: ControlledElement,
  callback: ConnectedSetupCallback,
): void {
  use(element, { connected: callback });
}
