import type { EmptyObject } from 'type-fest';
import { useRovingTabindex } from 'ydin/controllers/useRovingTabindex.js';
import { useSlot } from 'ydin/controllers/useSlot.js';
import { define, type ControlledElement } from 'ydin/element.js';
import type { Checkable } from 'ydin/traits/checkable.js';
import { impl, type TraitedConstructor } from 'ydin/traits/traits.js';
import {
  Valuable,
  VALUABLE_ATTRS,
  type ValuableProps,
} from 'ydin/traits/valuable.js';
import type { ButtonCoreProps, ButtonLike } from '../button/ButtonCore.ts';
import {
  CONNECTED_GROUP_CTX,
  useButtonGroupProvider,
} from './button-group-context.ts';
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

const ConnectedButtonGroupCore: TraitedConstructor<
  ButtonGroupCore,
  typeof ButtonGroupCore,
  [typeof Valuable]
> = impl(ButtonGroupCore, [Valuable]);

const CONNECTED_BUTTON_ATTR_NAMES = Object.keys(VALUABLE_ATTRS);

/**
 * @tag mx-connected-button-group
 *
 * @summary Connected button groups arrange checkable buttons as a segmented
 * control.
 *
 * @attr {"outlined"|"elevated"|"text"|"tonal"} color - Shared color variant
 * for child buttons.
 * @attr {"xsmall"|"medium"|"large"|"xlarge"} size - Shared size for child
 * buttons.
 * @attr {"round"|"square"} shape - Shared shape for child buttons.
 * @attr {boolean} disabled - Group disabled state.
 * @attr {string} value - Selected group value.
 *
 * @slot - Checkable button elements.
 *
 * @cssprop --md-button-group-between-space - Overrides spacing between buttons.
 * @cssprop --md-button-group-interaction-width-multiplier - Overrides active
 * overlap width factor.
 * @cssprop --md-button-group-inner-corner-size - Overrides inner corner radius.
 */
export default class ConnectedButtonGroup extends ConnectedButtonGroupCore {
  constructor() {
    super();
    useButtonGroupCore(this, buttonGroupTemplate, { role: 'group' }, [
      connectedStyles,
    ]);

    useRovingTabindex(this);

    useButtonGroupProvider(
      this,
      CONNECTED_GROUP_CTX,
      CONNECTED_BUTTON_ATTR_NAMES,
    );

    useSlot<ButtonLike & Checkable & ControlledElement>(
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
