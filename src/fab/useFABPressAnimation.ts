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
import type FAB from './fab.ts';

class FABPressAnimation implements ReactiveController {
  readonly #host: FAB;
  #animation?: Animation;

  constructor(host: FAB) {
    this.#host = host;

    const self = this;

    useEvents(host, {
      fabtoggle(): void {
        if (self.#animation) {
          self.#animation.playbackRate = self.#defaultPlaybackRate;
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
    this.#settle();
  }

  get #defaultPlaybackRate(): number {
    return this.#host.extended === 'open' ? 1 : -1;
  }

  #settle() {
    const animation = this.#animation;

    if (animation) {
      animation.playbackRate = this.#defaultPlaybackRate;
      animation.finish();
    }
  }
}

export function useFABPressAnimation(host: FAB): void {
  use(host, new FABPressAnimation(host));
}
