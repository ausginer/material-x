import type { EmptyObject } from 'type-fest';
import sizeStyles from '../button/styles/size/main.css.ts?type=css' with { type: 'css' };
import {
  useButtonAccessors,
  type ButtonColor,
  type ButtonLike,
  type ButtonShape,
  type ButtonSize,
  type ButtonCoreProperties,
} from '../button/useButtonCore.ts';
import { useCore } from '../core/controllers/useCore.ts';
import { useSlot } from '../core/controllers/useSlot.ts';
import { define, ReactiveElement } from '../core/elements/reactive-element.ts';
import connectedStyles from './styles/connected.css.ts?type=css' with { type: 'css' };
import { TEMPLATE } from './templates.ts';
import {
  useButtonGroupCore,
  type ButtonGroupLike,
} from './useButtonGroupCore.ts';

export type ConnectedButtonGroupProperties = ButtonCoreProperties;
export type ConnectedButtonGroupCSSProperties = EmptyObject;

/**
 * @attr {string} size
 */
export default class ConnectedButtonGroup
  extends ReactiveElement
  implements ButtonGroupLike
{
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

    useButtonGroupCore(this);

    useSlot<ButtonLike & ReactiveElement>(this, 'slot', (elements) => {
      elements.forEach((element) => {
        delete element.dataset['first'];
        delete element.dataset['last'];
      });

      if (elements[0]) {
        elements[0].dataset['first'] = '';
      }

      if (elements.at(-1)) {
        elements.at(-1)!.dataset['last'] = '';
      }
    });
  }
}

define('mx-connected-button-group', ConnectedButtonGroup);

declare global {
  interface HTMLElementTagNameMap {
    'mx-connected-button-group': ConnectedButtonGroup;
  }
}
