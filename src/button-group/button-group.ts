import sizeStyles from '../button/styles/size/main.css.ts?type=css' with { type: 'css' };
import type { ButtonSize } from '../button/useButtonCore.ts';
import { useCore } from '../core/controllers/useCore.ts';
import { ReactiveElement, define } from '../core/elements/reactive-element.ts';
import standardStyles from './styles/standard.css.ts?type=css' with { type: 'css' };
import { TEMPLATE } from './templates.ts';
import { useStandardGroupPress } from './useStandardGroupPress.ts';

export type ButtonGroupAttributes = Readonly<{
  size?: Exclude<ButtonSize, 'small'>;
}>;

/**
 * @attr {string} size
 */
export default class ButtonGroup extends ReactiveElement {
  constructor() {
    super();
    useCore(this, TEMPLATE, { role: 'group' }, [sizeStyles, standardStyles]);
    useStandardGroupPress(this);
  }
}

define('mx-button-group', ButtonGroup);

declare global {
  interface HTMLElementTagNameMap {
    'mx-button-group': ButtonGroup;
  }
}
