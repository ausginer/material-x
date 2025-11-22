import {
  useEvents,
  type HTMLElementEventListener,
} from '../core/controllers/useEvents.ts';
import type { ReactiveController } from '../core/elements/reactive-controller.ts';
import { use } from '../core/elements/reactive-element.ts';
import type SwitchButton from './switch-button.ts';
import { createButtonPressAnimation } from './useButtonPressAnimation.ts';

export class SwitchButtonCheckEvent extends Event {
  declare target: SwitchButton;
}

class SwitchButtonSpringAnimationController implements ReactiveController {
  readonly #host: SwitchButton;
  #hasInteractionStarted = false;
  #wasChecked: boolean;
  #pointerdown: HTMLElementEventListener<'pointerdown'> = () => {};
  #pointerup: HTMLElementEventListener<'pointerup'> = () => {};
  #pointercancel: HTMLElementEventListener<'pointercancel'> = () => {};
  #releaseDebounceTimeout?: NodeJS.Timeout | string | number | undefined;

  constructor(host: SwitchButton) {
    const self = this;
    this.#host = host;
    this.#wasChecked = host.checked;

    useEvents(host, {
      pointerdown: (event) => self.#pointerdown(event),
      pointerup: (event) => self.#pointerup(event),
      pointercancel: (event) => self.#pointercancel(event),
    });
  }

  connected() {
    const self = this;
    const animation = createButtonPressAnimation(self.#host);

    self.#pointerdown = () => {
      self.#hasInteractionStarted = true;
      self.#wasChecked = self.#host.checked;
      animation.updatePlaybackRate(self.#defaultPlaybackRate);
      animation.play();
    };

    self.#pointerup = self.#pointercancel = () => {
      clearTimeout(self.#releaseDebounceTimeout);

      // Since users usually update controlled componens on `click` event, we
      // have to wait until `click` event is fired; only then we can decide if
      // we should rewind the animation.
      self.#releaseDebounceTimeout = setTimeout(() => {
        self.#hasInteractionStarted = false;

        if (self.#host.checked === self.#wasChecked) {
          // Only rewind when the release matches the state we started with.
          animation.updatePlaybackRate(-self.#defaultPlaybackRate);
          animation.play();
        }
      }, 1);
    };

    const settle = () => {
      if (!self.#hasInteractionStarted) {
        animation.updatePlaybackRate(-self.#defaultPlaybackRate);
        animation.finish();
      }
    };

    settle();
  }

  get #defaultPlaybackRate(): number {
    return this.#host.checked ? -1 : 1;
  }
}

export function useSwitchButtonPressAnimation(host: SwitchButton): void {
  use(host, new SwitchButtonSpringAnimationController(host));
}
