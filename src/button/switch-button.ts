import SpringAnimationController from '../core/animations/spring.ts';
import { define, template, use } from '../core/elements/core-element.ts';
import CoreButton, { type ButtonColor } from './core-button.ts';
import switchDefaultStyles from './default/switch.css.ts?type=css' with { type: 'css' };
import mainElevatedStyles from './elevated/main.css.ts?type=css' with { type: 'css' };
import switchElevatedStyles from './elevated/switch.css.ts?type=css' with { type: 'css' };
import mainOutlinedStyles from './outlined/main.css.ts?type=css' with { type: 'css' };
import switchOutlinedStyles from './outlined/switch.css.ts?type=css' with { type: 'css' };
import mainSizeStyles from './size/main.css.ts?type=css' with { type: 'css' };
import switchSizeStyles from './size/switch.css.ts?type=css' with { type: 'css' };
import switchTonalStyles from './tonal/switch.css.ts?type=css' with { type: 'css' };

const TEMPLATE = template`<slot name="icon"></slot><slot></slot>`;

export type SwitchButtonColor = Exclude<ButtonColor, 'text'>;

/**
 * @attr {string} color
 * @attr {string} size
 * @attr {string} shape
 * @attr {boolean} disabled
 * @attr {boolean} checked
 */
export default class SwitchButton extends CoreButton {
  static readonly formAssociated = true;
  static readonly observedAttributes = ['checked', 'disabled'] as const;

  constructor() {
    super(TEMPLATE, 'switch', [
      mainElevatedStyles,
      mainOutlinedStyles,
      mainSizeStyles,
      switchDefaultStyles,
      switchElevatedStyles,
      switchOutlinedStyles,
      switchSizeStyles,
      switchTonalStyles,
    ]);

    let firstTime = true;

    use(
      this,
      new SpringAnimationController(
        this,
        {
          click(_, animation) {
            if (firstTime) {
              firstTime = false;
            } else {
              animation.reverse();
            }
            animation.play();
          },
        },
        {
          damping: 'press-damping',
          stiffness: 'press-stiffness',
          duration: 'press-duration',
          factor: 'press-factor',
        },
      ),
    );
  }
}

define('mx-switch-button', SwitchButton);

declare global {
  interface HTMLElementTagNameMap {
    'mx-switch-button': SwitchButton;
  }
}
