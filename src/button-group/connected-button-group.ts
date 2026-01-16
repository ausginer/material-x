import type { EmptyObject } from 'type-fest';
import {
  ButtonLike,
  type ButtonCoreProperties,
} from '../button/useButtonCore.ts';
import { useRovingTabindex } from '../core/controllers/useRovingTabindex.ts';
import { useSlot } from '../core/controllers/useSlot.ts';
import { define, ReactiveElement } from '../core/elements/reactive-element.ts';
import { Disableable } from '../core/traits/disabled.ts';
import buttonGroupTemplate from './button-group.tpl.html' with { type: 'html' };
import connectedStyles from './styles/connected/main.ctr.css' with { type: 'css' };
import connectedTokens from './styles/connected/main.tokens.css.ts' with { type: 'css' };
import { ButtonGroupCore, useButtonGroupCore } from './useButtonGroupCore.ts';

export type ConnectedButtonGroupProperties = ButtonCoreProperties;
export type ConnectedButtonGroupEvents = EmptyObject;
export type ConnectedButtonGroupCSSProperties = EmptyObject;

const KEY_PREV = ['ArrowLeft', 'ArrowUp'] as const;
const KEY_NEXT = ['ArrowRight', 'ArrowDown'] as const;

/**
 * @attr {string} size
 */
export default class ConnectedButtonGroup extends ButtonGroupCore {
  constructor() {
    super();
    useButtonGroupCore(this, buttonGroupTemplate, { role: 'group' }, [
      connectedStyles,
      connectedTokens,
    ]);

    const roving = useRovingTabindex<
      ButtonLike & Disableable & ReactiveElement
    >(this, {
      isItem: (node): node is ButtonLike & Disableable & ReactiveElement =>
        node instanceof ButtonLike &&
        node instanceof Disableable &&
        node instanceof ReactiveElement,
      isItemDisabled: (element) => element.disabled ?? false,
      getAction: (event) => {
        if (event.altKey || event.ctrlKey || event.metaKey) {
          return null;
        }

        const { key } = event;

        if (key === 'Home') {
          return 'first';
        }

        if (key === 'End') {
          return 'last';
        }

        const isRtl = getComputedStyle(this).direction === 'rtl';

        if (
          (KEY_PREV.includes(key) && !isRtl) ||
          (KEY_NEXT.includes(key) && isRtl)
        ) {
          return 'prev';
        }

        if (
          (KEY_NEXT.includes(key) && !isRtl) ||
          (KEY_PREV.includes(key) && isRtl)
        ) {
          return 'next';
        }

        return null;
      },
    });

    useSlot<ButtonLike & ReactiveElement>(this, 'slot', (_, newElements) => {
      newElements.forEach((element) => {
        delete element.dataset['first'];
        delete element.dataset['last'];
      });

      if (newElements[0]) {
        newElements[0].dataset['first'] = '';
      }

      if (newElements.at(-1)) {
        newElements.at(-1)!.dataset['last'] = '';
      }

      roving.items = newElements;
    });
  }
}

define('mx-connected-button-group', ConnectedButtonGroup);

declare global {
  interface HTMLElementTagNameMap {
    'mx-connected-button-group': ConnectedButtonGroup;
  }
}
