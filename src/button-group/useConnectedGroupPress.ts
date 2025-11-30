/* eslint-disable @typescript-eslint/no-unsafe-type-assertion */
import {
  useEvents,
  type HTMLElementEventListener,
} from '../core/controllers/useEvents.ts';
import { useSlot } from '../core/controllers/useSlot.ts';
import type { ReactiveController } from '../core/elements/reactive-controller.ts';
import {
  use,
  type ReactiveElement,
} from '../core/elements/reactive-element.ts';
import { applyToSiblings, getTarget } from './utils.ts';

const LEADING_PROP = '--_default-state-leading';
const TRAILING_PROP = '--_default-state-trailing';

function apply(element: HTMLElement, value: string | null) {
  applyToSiblings(
    element,
    () => element.style.setProperty(LEADING_PROP, value),
    () => element.style.setProperty(TRAILING_PROP, value),
  );
}

class ConnectedGroupPressController implements ReactiveController {
  #elements: readonly HTMLElement[] = [];
  #pointerdown: HTMLElementEventListener<'pointerdown'> = () => {};
  #pointerup: HTMLElementEventListener<'pointerup'> = () => {};

  constructor(host: ReactiveElement) {
    const self = this;

    useSlot(host, 'slot', (elements) => {
      self.#elements = elements as readonly HTMLElement[];
    });
    useEvents(host, {
      pointerdown: (event) => void self.#pointerdown(event),
      pointerup: (event) => void self.#pointerup(event),
      pointercancel: (event) => void self.#pointerup(event),
    });
  }

  connected() {
    const self = this;
    self.#reset();

    self.#pointerdown = (event) => {
      const target = getTarget(event);
      if (target) {
        apply(target, null);
      }
    };

    self.#pointerup = () => {
      self.#reset();
    };
  }

  #reset() {
    this.#elements.forEach((element) => apply(element, null));
  }
}

export function useConnectedGroupPress(host: ReactiveElement): void {
  use(host, new ConnectedGroupPressController(host));
}
