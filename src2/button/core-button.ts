import RippleAnimationController from '../core/animations/ripple.ts';
import CoreElement, { use } from '../core/elements/core-element.ts';
import elevationStyles from '../core/elevation/elevation.scss' with { type: 'css' };
import defaultDisabledStyles from './default/disabled.scss' with { type: 'css' };
import defaultButtonStyles from './default/main.scss' with { type: 'css' };
import shapeStyles from './shape/main.scss' with { type: 'css' };

export type ButtonColor = 'outlined' | 'elevated' | 'text' | 'tonal';
export type ButtonSize = 'xsmall' | 'small' | 'medium' | 'large' | 'xlarge';
export type ButtonShape = 'round' | 'square';

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
      [
        defaultButtonStyles,
        elevationStyles,
        shapeStyles,
        ...styles,
        defaultDisabledStyles,
      ],
      init,
    );
    this.tabIndex = 0;
    use(this, new RippleAnimationController(this));
  }
}
