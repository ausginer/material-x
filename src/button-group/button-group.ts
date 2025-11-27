import sizeStyles from '../button/styles/size/main.css.ts?type=css' with { type: 'css' };
import type { ButtonSize } from '../button/useButtonCore.ts';
import { useCore } from '../core/controllers/useCore.ts';
import {
  ReactiveElement,
  define,
  html,
} from '../core/elements/reactive-element.ts';
import defaultStyles from './styles/default/main.css.ts?type=css' with { type: 'css' };
import { useButtonGroupPressAnimation } from './useButtonGroupPressAnimation.ts';

export type ButtonGroupType = 'connected';

export type ButtonGroupAttributes = Readonly<{
  size?: Exclude<ButtonSize, 'small'>;
  type?: ButtonGroupType;
}>;

const TEMPLATE = html`<slot></slot>`;

/**
 * @attr {string} size
 */
export default class ButtonGroup extends ReactiveElement {
  constructor() {
    super();
    useCore(this, TEMPLATE, { role: 'group' }, [sizeStyles, defaultStyles]);
    useButtonGroupPressAnimation(this);
  }
}

define('mx-button-group', ButtonGroup);

declare global {
  interface HTMLElementTagNameMap {
    'mx-button-group': ButtonGroup;
  }
}
