import RippleAnimationController from '../core/animations/ripple.ts';
import SpringAnimationController from '../core/animations/spring.ts';
import CoreElement, { use } from '../core/elements/core.ts';
import elevationStyles from '../core/elevation/elevation.scss' with { type: 'css' };
import { define, template } from '../utils.ts';
import mainStyles from './default/main.scss' with { type: 'css' };

export type FABSize = 'medium' | 'large';
export type FABColor = 'primary' | 'secondary';

const TEMPLATE = template`<slot></slot>`;

/**
 * @attr {string} size
 * @attr {string} color
 * @attr {boolean|undefined} tonal
 * @attr {boolean|undefined} disabled
 */
export default class FAB extends CoreElement {
  constructor() {
    super(TEMPLATE, { role: 'button' }, [elevationStyles, mainStyles]);
    use(
      this,
      new SpringAnimationController(this, ['pointerenter', 'pointerleave']),
    );
    use(this, new RippleAnimationController(this));
  }
}

define('mx-fab', FAB);

declare global {
  interface HTMLElementTagNameMap {
    'mx-fab': FAB;
  }
}
