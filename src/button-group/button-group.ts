import sizeStyles from '../button/size/main.css.ts?type=css' with { type: 'css' };
import {
  CoreElement,
  define,
  template,
} from '../core/elements/core-element.ts';
import defaultStyles from './default/main.css.ts?type=css' with { type: 'css' };

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
