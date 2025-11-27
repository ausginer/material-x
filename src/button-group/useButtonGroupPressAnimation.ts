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

class ButtonGroupPressAnimation implements ReactiveController {
  #elements: readonly HTMLElement[] = [];
  #pointerdown: HTMLElementEventListener<'pointerdown'> = () => {};

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
    });
  }

  connected() {
    const self = this;

    self.#pointerdown = ({ target }) => {
      self.#elements.forEach((element) => {
        [
          '--_interaction-direction-leading',
          '--_interaction-direction-trailing',
        ].forEach((prop) => {
          element.attributeStyleMap.delete(prop);
        });
      });
      (
        (target as HTMLElement).previousElementSibling as HTMLElement | null
      )?.attributeStyleMap.set('--_interaction-direction-trailing', -1);
      (
        (target as HTMLElement).nextElementSibling as HTMLElement | null
      )?.attributeStyleMap.set('--_interaction-direction-leading', -1);
    };
  }
}

export function useButtonGroupPressAnimation(host: ReactiveElement): void {
  use(host, new ButtonGroupPressAnimation(host));
}
