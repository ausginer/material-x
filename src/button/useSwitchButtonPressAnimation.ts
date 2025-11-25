import {
  useEvents,
  type HTMLElementEventListener,
} from '../core/controllers/useEvents.ts';
import type { ReactiveController } from '../core/elements/reactive-controller.ts';
import {
  use,
  type ReactiveElement,
} from '../core/elements/reactive-element.ts';
import { updatePlaybackRate } from '../core/utils/animation.ts';
import type SwitchButton from './switch-button.ts';
import { createButtonPressAnimation } from './useButtonPressAnimation.ts';

export interface SwitchElement extends ReactiveElement {
  checked: boolean;
}

export class SwitchButtonCheckEvent extends Event {
  declare target: SwitchButton;
}

const CHANGE_EVENTS = ['input', 'change'] as const;

class SwitchButtonSpringAnimationController implements ReactiveController {
  readonly #host: SwitchElement;
  #wasChecked: boolean;
  #pointerdown: HTMLElementEventListener<'pointerdown'> = () => {};
  #pointerup: HTMLElementEventListener<'pointerup'> = () => {};

  constructor(host: SwitchElement) {
    const self = this;
    this.#host = host;
    this.#wasChecked = host.checked;

    useEvents(host, {
      pointerdown: (event) => self.#pointerdown(event),
      pointerup: (event) => self.#pointerup(event),
      pointercancel: (event) => self.#pointerup(event),
    });
  }

  connected() {
    const self = this;
    const animation = createButtonPressAnimation(self.#host);

    self.#pointerdown = () => {
      self.#wasChecked = self.#host.checked;
      updatePlaybackRate(animation, self.#defaultPlaybackRate, () => {
        CHANGE_EVENTS.forEach((name) =>
          self.#host.dispatchEvent(
            new Event(name, { bubbles: true, composed: true }),
          ),
        );
        animation.play();
      });
    };

    self.#pointerup = () => {
      if (self.#host.checked === self.#wasChecked) {
        // Only rewind when the release matches the state we started with.
        updatePlaybackRate(animation, -self.#defaultPlaybackRate, () =>
          animation.play(),
        );
      }
    };

    updatePlaybackRate(animation, -self.#defaultPlaybackRate, () =>
      animation.finish(),
    );
  }

  get #defaultPlaybackRate(): number {
    return this.#host.checked ? -1 : 1;
  }
}

export function useSwitchButtonPressAnimation(host: SwitchElement): void {
  use(host, new SwitchButtonSpringAnimationController(host));
}
