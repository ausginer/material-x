import CoreElement from '../core/elements/core.ts';
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
    super(TEMPLATE, { role: 'button' }, [mainStyles]);
  }
}

define('mx-fab', FAB);

declare global {
  interface HTMLElementTagNameMap {
    'mx-fab': FAB;
  }
}
