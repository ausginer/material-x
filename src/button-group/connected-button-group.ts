/* eslint-disable @typescript-eslint/no-unsafe-type-assertion */
import sizeStyles from '../button/styles/size/main.css.ts?type=css' with { type: 'css' };
import {
  useButtonAccessors,
  type ButtonColor,
  type ButtonShape,
  type ButtonSize,
} from '../button/useButtonCore.ts';
import { useCore } from '../core/controllers/useCore.ts';
import { useSlot } from '../core/controllers/useSlot.ts';
import { define, ReactiveElement } from '../core/elements/reactive-element.ts';
import { applyToSiblings } from '../core/utils/DOM.ts';
import connectedStyles from './styles/connected.css.ts?type=css' with { type: 'css' };
import { TEMPLATE } from './templates.ts';

export type ButtonGroupAttributes = Readonly<{
  color?: ButtonColor;
  shape?: ButtonShape;
  size?: ButtonSize;
  disabled?: boolean;
}>;

/**
 * @attr {string} size
 */
export default class ConnectedButtonGroup extends ReactiveElement {
  static {
    useButtonAccessors(this);
  }

  declare color: ButtonColor | null;
  declare size: ButtonSize | null;
  declare shape: ButtonShape | null;
  declare disabled: boolean;

  constructor() {
    super();
    useCore(this, TEMPLATE, { role: 'group' }, [sizeStyles, connectedStyles]);
    useSlot(this, 'slot', (elements) => {
      elements.forEach((element) => {
        applyToSiblings(
          element as HTMLElement,
          (sibling) => {
            if (!sibling) {
              (element as HTMLElement).dataset['first'] = '';
            }
          },
          (sibling) => {
            if (!sibling) {
              (element as HTMLElement).dataset['last'] = '';
            }
          },
        );
      });
    });
  }
}

define('mx-connected-button-group', ConnectedButtonGroup);

declare global {
  interface HTMLElementTagNameMap {
    'mx-connected-button-group': ConnectedButtonGroup;
  }
}
