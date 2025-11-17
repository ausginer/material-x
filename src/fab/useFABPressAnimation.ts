import { createSpringAnimation } from '../core/animations/spring.ts';
import { useEvents } from '../core/controllers/events.ts';
import type { ReactiveController } from '../core/elements/reactive-controller.ts';
import {
  use,
  type ReactiveElement,
} from '../core/elements/reactive-element.ts';
import {
  readCSSVariables,
  transformNumericVariable,
} from '../core/utils/readCSSVariables.ts';
import type { FABToggleEvent } from './fab.ts';

class FABPressAnimation implements ReactiveController {
  readonly #host: ReactiveElement;
  #animation?: Animation;

  constructor(host: ReactiveElement) {
    this.#host = host;

    const self = this;

    useEvents(host, {
      fabopen(_: FABToggleEvent): void {
        if (self.#animation) {
          self.#animation.playbackRate = 1;
          self.#animation.play();
        }
      },
      fabclosed(_: FABToggleEvent): void {
        if (self.#animation) {
          self.#animation.playbackRate = -1;
          self.#animation.play();
        }
      },
    });
  }

  connected() {
    const vars = readCSSVariables(
      this.#host,
      {
        damping: 'unfold-damping',
        stiffness: 'unfold-stiffness',
        duration: 'unfold-duration',
      },
      transformNumericVariable,
    );

    this.#animation = createSpringAnimation(this.#host, 'unfold-factor', vars);
  }
}

export function useFABPressAnimation(host: ReactiveElement): void {
  use(host, new FABPressAnimation(host));
}
