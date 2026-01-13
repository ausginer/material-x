import type { EmptyObject } from 'type-fest';
import {
  createButtonAccessors,
  type ButtonColor,
  type ButtonCoreProperties,
  type ButtonLike,
  type ButtonShape,
  type ButtonSize,
} from '../button/useButtonCore.ts';
import { useSlot } from '../core/controllers/useSlot.ts';
import { define, ReactiveElement } from '../core/elements/reactive-element.ts';
import buttonGroupTemplate from './button-group.tpl.html' with { type: 'html' };
import connectedStyles from './styles/connected/main.ctr.css' with { type: 'css' };
import connectedTokens from './styles/connected/main.tokens.css.ts' with { type: 'css' };
import {
  useButtonGroupCore,
  type ButtonGroupLike,
} from './useButtonGroupCore.ts';

export type ConnectedButtonGroupProperties = ButtonCoreProperties;
export type ConnectedButtonGroupEvents = EmptyObject;
export type ConnectedButtonGroupCSSProperties = EmptyObject;

/**
 * @attr {string} size
 */
export default class ConnectedButtonGroup
  extends ReactiveElement
  implements ButtonGroupLike
{
  static {
    createButtonAccessors(this);
  }

  declare color: ButtonColor | null;
  declare size: ButtonSize | null;
  declare shape: ButtonShape | null;
  declare disabled: boolean;

  constructor() {
    super();
    useButtonGroupCore(this, buttonGroupTemplate, { role: 'group' }, [
      connectedStyles,
      connectedTokens,
    ]);

    useSlot<ButtonLike & ReactiveElement>(this, 'slot', (_, elements) => {
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
