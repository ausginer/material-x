import { createSpringAnimation } from '../core/animations/spring.ts';
import {
  useEvents,
  type HTMLElementEventListener,
} from '../core/controllers/useEvents.ts';
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
      damping: '_press-damping',
      stiffness: '_press-stiffness',
      duration: '_press-duration',
    },
    transformNumericVariable,
  );

  return createSpringAnimation(host, '_press-factor', vars);
}

class ButtonPressAnimation implements ReactiveController {
  readonly #host: ReactiveElement;
  #pointerdown: HTMLElementEventListener<'pointerdown'> = () => {};
  #pointerup: HTMLElementEventListener<'pointerdown'> = () => {};
  #pointercancel: HTMLElementEventListener<'pointercancel'> = () => {};

  constructor(host: ReactiveElement) {
    this.#host = host;
    useEvents(host, {
      pointerdown: (event) => this.#pointerdown(event),
      pointerup: (event) => this.#pointerup(event),
    });
  }

  connected() {
    const self = this;
    const animation = createButtonPressAnimation(self.#host);
    self.#pointerdown = () => {
      animation.updatePlaybackRate(1);
      animation.play();
    };
    self.#pointerup = self.#pointercancel = () => {
      animation.updatePlaybackRate(-1);
      animation.play();
    };
  }
}

export function useButtonPressAnimation(host: ReactiveElement): void {
  use(host, new ButtonPressAnimation(host));
}
