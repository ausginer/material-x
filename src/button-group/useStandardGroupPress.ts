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

const LEADING_PROP = '--_interaction-direction-leading';
const TRAILING_PROP = '--_interaction-direction-trailing';

class StandardGroupPressController implements ReactiveController {
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

    self.#pointerdown = (event) => {
      const target = getTarget(event);

      if (target) {
        applyToSiblings(
          target,
          (sibling) => {
            if (sibling) {
              target.style.setProperty(LEADING_PROP, '1');
              sibling.style.setProperty(TRAILING_PROP, '-1');
            }
          },
          (sibling) => {
            if (sibling) {
              target.style.setProperty(TRAILING_PROP, '1');
              sibling.style.setProperty(LEADING_PROP, '-1');
            }
          },
        );
      }
    };

    self.#pointerup = () => {
      self.#elements.forEach((element) => {
        [LEADING_PROP, TRAILING_PROP].forEach((prop) => {
          element.style.removeProperty(prop);
        });
      });
    };
  }
}

export function useStandardGroupPress(host: ReactiveElement): void {
  use(host, new StandardGroupPressController(host));
}
