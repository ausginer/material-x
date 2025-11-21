import type { ReactiveController } from '../elements/reactive-controller.ts';
import { use, type ReactiveElement } from '../elements/reactive-element.ts';

export type ConnectedSetupCallback = () => void;

class ConnectedController implements ReactiveController {
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
  use(element, new ConnectedController(callbacks));
}
