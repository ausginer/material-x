import sizeStyles from '../button/styles/size/main.css.ts?type=css' with { type: 'css' };
import type { ButtonSize } from '../button/useButtonCore.ts';
import { useCore } from '../core/controllers/useCore.ts';
import { define, ReactiveElement } from '../core/elements/reactive-element.ts';
import connectedStyles from './styles/connected.css.ts?type=css' with { type: 'css' };
import { TEMPLATE } from './templates.ts';
import { useConnectedGroupPress } from './useConnectedGroupPress.ts';

export type ConnectedButtonGroupAttributes = Readonly<{
  size?: Exclude<ButtonSize, 'small'>;
}>;

/**
 * @attr {string} size
 */
export default class ConnectedButtonGroup extends ReactiveElement {
  constructor() {
    super();
    useCore(this, TEMPLATE, { role: 'group' }, [sizeStyles, connectedStyles]);
    useConnectedGroupPress(this);
  }
}

define('mx-connected-button-group', ConnectedButtonGroup);

declare global {
  interface HTMLElementTagNameMap {
    'mx-connected-button-group': ConnectedButtonGroup;
  }
}
