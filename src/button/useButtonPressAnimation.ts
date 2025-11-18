import { createSpringAnimation } from '../core/animations/spring.ts';
import { useEvents } from '../core/controllers/useEvents.ts';
import type { ReactiveController } from '../core/elements/reactive-controller.ts';
import {
  use,
  type ReactiveElement,
} from '../core/elements/reactive-element.ts';
import {
  readCSSVariables,
  transformNumericVariable,
} from '../core/utils/readCSSVariables.ts';

export function createButtonPressAnimation(host: HTMLElement): Animation {
  const vars = readCSSVariables(
    host,
    {
      damping: 'press-damping',
      stiffness: 'press-stiffness',
      duration: 'press-duration',
    },
    transformNumericVariable,
  );

  return createSpringAnimation(host, 'press-factor', vars);
}

class ButtonPressAnimation implements ReactiveController {
  readonly #host: ReactiveElement;
  #animation?: Animation;

  constructor(host: ReactiveElement) {
    this.#host = host;

    const self = this;
    useEvents(host, {
      pointerdown() {
        if (self.#animation) {
          self.#animation.playbackRate = 1;
          self.#animation.play();
        }
      },
      pointerup() {
        if (self.#animation) {
          self.#animation.playbackRate = -1;
          self.#animation.play();
        }
      },
    });
  }

  connected() {
    this.#animation = createButtonPressAnimation(this.#host);
  }
}

export function useButtonPressAnimation(host: ReactiveElement): void {
  use(host, new ButtonPressAnimation(host));
}
