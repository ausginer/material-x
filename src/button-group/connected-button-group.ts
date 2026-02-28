import type { EmptyObject } from 'type-fest';
import type { ButtonCoreProps, ButtonLike } from '../button/ButtonCore.ts';
import { useRovingTabindex } from '../core/controllers/useRovingTabindex.ts';
import { useSlot } from '../core/controllers/useSlot.ts';
import {
  define,
  type ReactiveElement,
} from '../core/elements/reactive-element.ts';
import { impl, type ConstructorWithTraits } from '../core/elements/traits.ts';
import type { Checkable } from '../core/traits/checkable.ts';
import { Valuable, type ValuableProps } from '../core/traits/valuable.ts';
import buttonGroupTemplate from './button-group.tpl.html' with { type: 'html' };
import {
  ButtonGroupCore,
  useButtonGroupCore,
  type ButtonGroupSharedCSSProperties,
} from './ButtonGroupCore.ts';
import connectedStyles from './styles/connected/main.css.ts' with { type: 'css' };

export type ConnectedButtonGroupProperties = ButtonCoreProps & ValuableProps;
export type ConnectedButtonGroupEvents = EmptyObject;
export type ConnectedButtonGroupCSSProperties = ButtonGroupSharedCSSProperties;

const ConnectedButtonGroupCore: ConstructorWithTraits<
  InstanceType<typeof ButtonGroupCore>,
  [typeof Valuable]
> = impl(ButtonGroupCore, [Valuable]);

/**
 * @attr {string} size
 */
export default class ConnectedButtonGroup extends ConnectedButtonGroupCore {
  constructor() {
    super();
    useButtonGroupCore(this, buttonGroupTemplate, { role: 'group' }, [
      connectedStyles,
    ]);

    useRovingTabindex(this);

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
