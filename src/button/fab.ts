import { define, template } from '../utils.ts';
import CoreButton from './core-button.ts';
import fabStyles from './fab.scss' with { type: 'css' };

const TEMPLATE = template`<slot></slot>`;

/**
 * @attr {string} flavor
 * @attr {string} size
 * @attr {boolean|undefined} disabled
 */
export default class FAB extends CoreButton {
  constructor() {
    super(TEMPLATE, 'button', [fabStyles]);
  }
}

define('mx-fab', FAB);

declare global {
  interface HTMLElementTagNameMap {
    'mx-fab': FAB;
  }
}
