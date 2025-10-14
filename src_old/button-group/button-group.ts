import sizeStyles from '../button/size/main.scss' with { type: 'css' };
import CoreElement from '../core/elements/core.ts';
import { define, template } from '../utils.ts';
import defaultStyles from './default/main.scss' with { type: 'css' };

const TEMPLATE = template`<slot></slot>`;

/**
 * @attr {string} size
 */
export default class ButtonGroup extends CoreElement {
  constructor() {
    super(TEMPLATE, { role: 'group' }, [sizeStyles, defaultStyles]);
  }
}

define('mx-button-group', ButtonGroup);

declare global {
  interface HTMLElementTagNameMap {
    'mx-button-group': ButtonGroup;
  }
}
