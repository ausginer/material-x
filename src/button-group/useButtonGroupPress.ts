/* eslint-disable @typescript-eslint/no-unsafe-type-assertion */
import { isButtonLike } from '../button/useButtonCore.ts';
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

const LEADING_PROP = '--_interaction-direction-leading';
const TRAILING_PROP = '--_interaction-direction-trailing';

class ButtonGroupPressController implements ReactiveController {
  #elements: readonly HTMLElement[] = [];
  #pointerdown: HTMLElementEventListener<'pointerdown'> = () => {};
  #pointerup: HTMLElementEventListener<'pointerup'> = () => {};

  constructor(host: ReactiveElement) {
    const self = this;

    useSlot(host, 'slot', (elements) => {
      if (import.meta.env.DEV) {
        if (elements.some((element) => !isButtonLike(element))) {
          throw new TypeError(
            'mx-button-group allows only mx-button-like elements',
          );
        }
      }

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

    self.#pointerdown = ({ target }) => {
      (
        (target as HTMLElement).previousElementSibling as HTMLElement | null
      )?.style.setProperty(TRAILING_PROP, '-1');
      (
        (target as HTMLElement).nextElementSibling as HTMLElement | null
      )?.style.setProperty(LEADING_PROP, '-1');
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

export function useButtonGroupPress(host: ReactiveElement): void {
  use(host, new ButtonGroupPressController(host));
}
