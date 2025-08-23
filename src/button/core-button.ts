import RippleAnimationController from '../core/animations/ripple.ts';
import SpringAnimationController from '../core/animations/spring.ts';
import CoreElement, { use } from '../core/elements/core.ts';
import elevationStyles from '../core/elevation/elevation.scss' with { type: 'css' };
import defaultDisabledStyles from './default/disabled.scss' with { type: 'css' };
import defaultButtonStyles from './default/main.scss' with { type: 'css' };

export type ButtonFlavor =
  | 'outlined'
  | 'filled-tonal'
  | 'elevated'
  | 'text'
  | 'tonal';
export type ButtonSize = 'xsmall' | 'small' | 'medium' | 'large' | 'xlarge';

/**
 * @attr {string} flavor
 * @attr {boolean|undefined} disabled
 */
export default class CoreButton extends CoreElement {
  constructor(
    template: HTMLTemplateElement,
    role: ARIAMixin['role'],
    styles: CSSStyleSheet[],
    init?: Partial<ShadowRootInit>,
  ) {
    super(
      template,
      { role },
      [defaultButtonStyles, elevationStyles, ...styles, defaultDisabledStyles],
      init,
    );
    this.tabIndex = 0;
    use(this, SpringAnimationController);
    use(this, RippleAnimationController);
  }
}
