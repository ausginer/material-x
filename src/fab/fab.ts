import RippleAnimationController from '../core/animations/ripple.ts';
import CoreElement, { use } from '../core/elements/core.ts';
import elevationStyles from '../core/elevation/elevation.scss' with { type: 'css' };
import { usePressAnimation } from '../core/utils/button.ts';
import { define, template } from '../utils.ts';
import colorStyles from './color/main.scss' with { type: 'css' };
import mainStyles from './default/main.scss' with { type: 'css' };
import extendedStyles from './extended/main.scss' with { type: 'css' };
import sizeStyles from './size/main.scss' with { type: 'css' };
import tonalStyles from './tonal/main.scss' with { type: 'css' };

export type FABSize = 'medium' | 'large';
export type FABColor = 'primary' | 'secondary';

const TEMPLATE = template`<slot></slot>`;

/**
 * @attr {string} size
 * @attr {string} color
 * @attr {boolean|undefined} extended
 * @attr {boolean|undefined} tonal
 * @attr {boolean|undefined} disabled
 */
export default class FAB extends CoreElement {
  constructor() {
    super(TEMPLATE, { role: 'button' }, [
      elevationStyles,
      mainStyles,
      colorStyles,
      sizeStyles,
      tonalStyles,
      extendedStyles,
    ]);
    usePressAnimation(this);
    use(this, new RippleAnimationController(this));
  }
}

define('mx-fab', FAB);

declare global {
  interface HTMLElementTagNameMap {
    'mx-fab': FAB;
  }
}
