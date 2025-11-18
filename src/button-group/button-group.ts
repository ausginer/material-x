import sizeStyles from '../button/size/main.css.ts?type=css' with { type: 'css' };
import { useCore } from '../core/controllers/useCore.ts';
import {
  ReactiveElement,
  define,
  html,
} from '../core/elements/reactive-element.ts';
import defaultStyles from './default/main.css.ts?type=css' with { type: 'css' };

const TEMPLATE = html`<slot></slot>`;

/**
 * @attr {string} size
 */
export default class ButtonGroup extends ReactiveElement {
  constructor() {
    super();
    useCore(this, TEMPLATE, { role: 'group' }, [sizeStyles, defaultStyles]);
  }
}

define('mx-button-group', ButtonGroup);

declare global {
  interface HTMLElementTagNameMap {
    'mx-button-group': ButtonGroup;
  }
}
