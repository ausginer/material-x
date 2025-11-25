import { createSpringAnimation } from '../core/animations/spring.ts';
import {
  useEvents,
  type HTMLElementEventListener,
} from '../core/controllers/useEvents.ts';
import type { ReactiveController } from '../core/elements/reactive-controller.ts';
import { use } from '../core/elements/reactive-element.ts';
import { updatePlaybackRate } from '../core/utils/animation.ts';
import {
  readCSSVariables,
  transformNumericVariable,
} from '../core/utils/readCSSVariables.ts';
import type FAB from './fab.ts';

class FABPressAnimation implements ReactiveController {
  readonly #host: FAB;
  #fabtoggle: HTMLElementEventListener<'fabtoggle'> = () => {};

  constructor(host: FAB) {
    this.#host = host;

    useEvents(host, {
      fabtoggle: (event) => this.#fabtoggle(event),
    });
  }

  connected() {
    const self = this;

    const vars = readCSSVariables(
      self.#host,
      {
        damping: '_unfold-damping',
        stiffness: '_unfold-stiffness',
        duration: '_unfold-duration',
      },
      transformNumericVariable,
    );

    const animation = createSpringAnimation(self.#host, '_unfold-factor', vars);

    this.#fabtoggle = () => {
      updatePlaybackRate(animation, self.#defaultPlaybackRate, () =>
        animation.play(),
      );
    };

    updatePlaybackRate(animation, self.#defaultPlaybackRate, () =>
      animation.finish(),
    );
  }

  get #defaultPlaybackRate(): number {
    return this.#host.extended === 'open' ? 1 : -1;
  }
}

export function useFABPressAnimation(host: FAB): void {
  use(host, new FABPressAnimation(host));
}
