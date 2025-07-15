import CoreElement from '../core/elements/core.js';
import elevationCss from '../core/elevation/elevation.scss' with { type: 'css' };
import buttonCss from './button.scss' with { type: 'css' };

export type ButtonFlavor = 'outlined' | 'filled-tonal' | 'elevated' | 'text';
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
  ) {
    super(template, { role }, [buttonCss, elevationCss, ...styles]);
    this.tabIndex = 0;
  }
}
