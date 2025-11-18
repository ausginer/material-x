import { useEvents } from '../core/controllers/useEvents.ts';
import type { ReactiveController } from '../core/elements/reactive-controller.ts';
import { use } from '../core/elements/reactive-element.ts';
import type SwitchButton from './switch-button.ts';
import { createButtonPressAnimation } from './useButtonPressAnimation.ts';

export class SwitchButtonCheckEvent extends Event {
  declare target: SwitchButton;
}

class SwitchButtonSpringAnimationController implements ReactiveController {
  readonly #host: SwitchButton;
  #animation?: Animation;
  #hasInteractionStarted = false;
  #wasChecked: boolean;

  constructor(host: SwitchButton) {
    this.#host = host;

    const self = this;
    useEvents(host, {
      pointerdown() {
        if (self.#animation) {
          self.#hasInteractionStarted = true;
          self.#wasChecked = self.#host.checked;
          self.#animation.playbackRate = self.#defaultPlaybackRate;
          self.#animation.play();
        }
      },
      pointerup() {
        self.#release();
      },
      pointercancel() {
        self.#release();
      },
    });

    this.#wasChecked = host.checked;
    host.addEventListener('input', () => {
      if (!this.#hasInteractionStarted) {
        this.#settle();
      }
    });
  }

  connected() {
    this.#animation = createButtonPressAnimation(this.#host);
    this.#settle();
  }

  get #defaultPlaybackRate(): number {
    return this.#host.checked ? -1 : 1;
  }

  #settle() {
    const animation = this.#animation;

    if (animation) {
      if (animation && !this.#hasInteractionStarted) {
        animation.playbackRate = -this.#defaultPlaybackRate;
        animation.finish();
      }
    }
  }

  #release() {
    const animation = this.#animation;

    if (animation) {
      this.#hasInteractionStarted = false;

      if (this.#host.checked === this.#wasChecked) {
        // Only rewind when the release matches the state we started with.
        animation.playbackRate = -this.#defaultPlaybackRate;
        animation.play();
      }
    }
  }
}

export function useSwitchButtonPressAnimation(host: SwitchButton): void {
  use(host, new SwitchButtonSpringAnimationController(host));
}
