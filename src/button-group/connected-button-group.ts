/* eslint-disable @typescript-eslint/no-unsafe-type-assertion */
import sizeStyles from '../button/styles/size/main.css.ts?type=css' with { type: 'css' };
import type { ButtonSize } from '../button/useButtonCore.ts';
import { useCore } from '../core/controllers/useCore.ts';
import { useSlot } from '../core/controllers/useSlot.ts';
import { define, ReactiveElement } from '../core/elements/reactive-element.ts';
import { applyToSiblings } from '../core/utils/DOM.ts';
import connectedStyles from './styles/connected.css.ts?type=css' with { type: 'css' };
import { TEMPLATE } from './templates.ts';

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
