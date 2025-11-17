import { useEvents } from '../core/controllers/events.ts';
import type { ReactiveController } from '../core/elements/reactive-controller.ts';
import { ReactiveElement, use } from '../core/elements/reactive-element.ts';
import { createButtonPressAnimation } from './useButtonPressAnimation.ts';

class SwitchButtonSpringAnimationController implements ReactiveController {
  readonly #host: ReactiveElement;
  #animation?: Animation;
  #hasInteractionStarted = false;
  #isChecked = false;
  #wasChecked: boolean;

  constructor(host: ReactiveElement) {
    this.#host = host;

    const self = this;
    useEvents(host, {
      pointerdown() {
        if (self.#animation) {
          self.#hasInteractionStarted = true;
          self.#wasChecked = self.#isChecked;
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

    const isChecked = host.getAttribute('checked') != null;

    this.#wasChecked = isChecked;
    this.#isChecked = isChecked;
  }

  attrChanged(name: string, _: string | null, newValue: string | null) {
    if (name === 'checked') {
      this.#isChecked = newValue != null;

      if (!this.#hasInteractionStarted) {
        this.#settle();
      }
    }
  }

  connected() {
    this.#animation = createButtonPressAnimation(this.#host);
    this.#settle();
  }

  get #defaultPlaybackRate(): number {
    return this.#isChecked ? -1 : 1;
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

      if (this.#isChecked === this.#wasChecked) {
        // Only rewind when the release matches the state we started with.
        animation.playbackRate = -this.#defaultPlaybackRate;
        animation.play();
      }
    }
  }
}

export function useSwitchButtonPressAnimation(host: ReactiveElement): void {
  use(host, new SwitchButtonSpringAnimationController(host));
}
