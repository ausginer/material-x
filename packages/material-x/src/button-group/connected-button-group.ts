import { useRovingTabindex } from '@ydinjs/core/controllers/useRovingTabindex.js';
import { useSlot } from '@ydinjs/core/controllers/useSlot.js';
import {
  ControlledElement,
  type ControlledElementConstructor,
} from '@ydinjs/core/element.js';
import type { Checkable } from '@ydinjs/core/traits/checkable.js';
import { compose, type Composed } from '@ydinjs/core/traits/composition.js';
import type { ButtonLike } from '../button/ButtonCore.ts';
import buttonGroupTemplate from './button-group.tpl.html' with { type: 'html' };
import {
  type ButtonGroupCoreTraits,
  useButtonGroupCore,
  type ButtonGroupCoreCSSProperties,
  type ButtonGroupCoreEvents,
  type ButtonGroupCoreProps,
} from './ButtonGroupCore.ts';
import connectedStyles from './styles/connected/main.css.ts' with { type: 'css' };

export type ConnectedButtonGroupProperties = ButtonGroupCoreProps;
export type ConnectedButtonGroupEvents = ButtonGroupCoreEvents;
export type ConnectedButtonGroupCSSProperties = ButtonGroupCoreCSSProperties;

const ConnectedButtonGroupConstructor: Composed<
  ControlledElementConstructor,
  ButtonGroupCoreTraits
> = compose(ControlledElement);

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
 * @cssprop --md-button-group-inner-corner-size - Overrides the inner corner
 * radius of a button at rest. A selected or pressed button keeps its own
 * corners.
 */
export default class ConnectedButtonGroup extends ConnectedButtonGroupConstructor {
  constructor() {
    super();
    useButtonGroupCore(this, buttonGroupTemplate, { role: 'group' }, [
      connectedStyles,
    ]);

    useRovingTabindex(this);

    useSlot(this, 'slot', (slot) => {
      // The slot's elements, without the text and comment nodes between them.
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion
      const elements = slot.assignedElements() as Array<
        ButtonLike & Checkable & ControlledElement
      >;

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

customElements.define('mx-connected-button-group', ConnectedButtonGroup);

declare global {
  interface HTMLElementTagNameMap {
    'mx-connected-button-group': ConnectedButtonGroup;
  }
}
