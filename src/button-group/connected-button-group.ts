import type { EmptyObject } from 'type-fest';
import type { ButtonCoreProperties, ButtonLike } from '../button/ButtonCore.ts';
// import { useRovingTabindex } from '../core/controllers/useRovingTabindex2.ts';
import { useSlot } from '../core/controllers/useSlot.ts';
import {
  impl,
  type AppliedTraits,
  type ConstructorWithTraits,
} from '../core/elements/impl.ts';
import {
  define,
  type ReactiveElement,
} from '../core/elements/reactive-element.ts';
import type { Checkable } from '../core/traits/checkable.ts';
import { Valuable, type ValuableProps } from '../core/traits/valuable.ts';
import buttonGroupTemplate from './button-group.tpl.html' with { type: 'html' };
import { ButtonGroupCore, useButtonGroupCore } from './ButtonGroupCore.ts';
import connectedStyles from './styles/connected/main.ctr.css' with { type: 'css' };
import connectedTokens from './styles/connected/main.tokens.css.ts' with { type: 'css' };

export type ConnectedButtonGroupProperties = ButtonCoreProperties &
  ValuableProps;
export type ConnectedButtonGroupEvents = EmptyObject;
export type ConnectedButtonGroupCSSProperties = EmptyObject;

// const KEY_PREV = ['ArrowLeft', 'ArrowUp'] as const;
// const KEY_NEXT = ['ArrowRight', 'ArrowDown'] as const;

const ConnectedButtonGroupCore: ConstructorWithTraits<
  ReactiveElement,
  [...AppliedTraits<typeof ButtonGroupCore>, typeof Valuable]
> = impl(ButtonGroupCore, [Valuable]);

/**
 * @attr {string} size
 */
export default class ConnectedButtonGroup extends ConnectedButtonGroupCore {
  constructor() {
    super();
    useButtonGroupCore(this, buttonGroupTemplate, { role: 'group' }, [
      connectedStyles,
      connectedTokens,
    ]);

    // const roving = useRovingTabindex<
    //   ButtonLike & Disableable & ReactiveElement
    // >(this, {
    //   isItem: (node): node is ButtonLike & ReactiveElement =>
    //     node instanceof ButtonLike && node instanceof ReactiveElement,
    //   isItemDisabled: (element) => element.disabled ?? false,
    //   getAction: (event) => {
    //     if (event.altKey || event.ctrlKey || event.metaKey) {
    //       return null;
    //     }

    //     const { key } = event;

    //     if (key === 'Home') {
    //       return 'first';
    //     }

    //     if (key === 'End') {
    //       return 'last';
    //     }

    //     const isRtl = getComputedStyle(this).direction === 'rtl';

    //     if (
    //       (KEY_PREV.includes(key) && !isRtl) ||
    //       (KEY_NEXT.includes(key) && isRtl)
    //     ) {
    //       return 'prev';
    //     }

    //     if (
    //       (KEY_NEXT.includes(key) && !isRtl) ||
    //       (KEY_PREV.includes(key) && isRtl)
    //     ) {
    //       return 'next';
    //     }

    //     return null;
    //   },
    // });

    // useRovingTabindex(this);

    useSlot<ButtonLike & Checkable & ReactiveElement>(
      this,
      'slot',
      (_, newElements) => {
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
      },
    );
  }
}

define('mx-connected-button-group', ConnectedButtonGroup);

declare global {
  interface HTMLElementTagNameMap {
    'mx-connected-button-group': ConnectedButtonGroup;
  }
}
