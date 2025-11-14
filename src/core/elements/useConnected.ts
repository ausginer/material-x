import type { ReactiveController } from './reactive-controller.ts';
import { ReactiveElement, use } from './reactive-element.ts';

export type ConnectedSetupCallback = () => void;

class ConnectedSetup implements ReactiveController {
  readonly #callbacks: readonly ConnectedSetupCallback[];

  constructor(callbacks: readonly ConnectedSetupCallback[]) {
    this.#callbacks = callbacks;
  }

  connected(): void {
    this.#callbacks.forEach((cb) => cb());
  }
}

export function useConnected(
  element: ReactiveElement,
  ...callbacks: readonly ConnectedSetupCallback[]
): void {
  use(element, new ConnectedSetup(callbacks));
}
