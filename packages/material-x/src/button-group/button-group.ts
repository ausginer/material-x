import { useEvents } from '@ydinjs/core/controllers/useEvents.js';
import { useSlot } from '@ydinjs/core/controllers/useSlot.js';
import {
  ControlledElement,
  define,
  type ControlledElementConstructor,
} from '@ydinjs/core/element.js';
import { impl, type TraitedConstructor } from '@ydinjs/core/traits/traits.js';
import type { ButtonLike } from '../button/ButtonCore.ts';
import buttonGroupTemplate from './button-group.tpl.html' with { type: 'html' };
import {
  BUTTON_GROUP_CORE_TRAITS,
  useButtonGroupCore,
  type ButtonGroupCoreCSSProperties,
  type ButtonGroupCoreEvents,
  type ButtonGroupCoreProps,
} from './ButtonGroupCore.ts';
import standardStyles from './styles/standard/main.css.ts' with { type: 'css' };
import { getTarget } from './utils.ts';

export type ButtonGroupProperties = ButtonGroupCoreProps;
export type ButtonGroupEvents = ButtonGroupCoreEvents;
export type ButtonGroupCSSProperties = ButtonGroupCoreCSSProperties;

const LEADING_PROP = '--_interaction-direction-leading';
const TRAILING_PROP = '--_interaction-direction-trailing';

const ButtonGroupConstructor: TraitedConstructor<
  ControlledElement,
  ControlledElementConstructor,
  typeof BUTTON_GROUP_CORE_TRAITS
> = impl(ControlledElement, BUTTON_GROUP_CORE_TRAITS);

/**
 * @tag mx-button-group
 *
 * @summary Button groups arrange buttons in a single row with shared visual
 * context.
 *
 * @attr {"outlined"|"elevated"|"text"|"tonal"} color - Shared color variant
 * for child buttons.
 * @attr {"xsmall"|"medium"|"large"|"xlarge"} size - Shared size for child
 * buttons.
 * @attr {"round"|"square"} shape - Shared shape for child buttons.
 * @attr {boolean} disabled - Group disabled state.
 *
 * @slot - Button elements.
 *
 * @cssprop --md-button-group-between-space - Overrides spacing between buttons.
 * @cssprop --md-button-group-interaction-width-multiplier - Overrides active
 * overlap width factor.
 * @cssprop --md-button-group-inner-corner-size - Overrides inner corner radius.
 */
export default class ButtonGroup extends ButtonGroupConstructor {
  constructor() {
    super();
    useButtonGroupCore(this, buttonGroupTemplate, { role: 'group' }, [
      standardStyles,
    ]);

    let elements: ReadonlyArray<ButtonLike & ControlledElement> = [];

    useSlot<ButtonLike & ControlledElement>(this, 'slot', (_, newElements) => {
      elements = newElements;
    });

    const pointerup = () => {
      elements.forEach((element) => {
        [LEADING_PROP, TRAILING_PROP].forEach((prop) => {
          element.style.removeProperty(prop);
        });
      });
    };

    useEvents(this, {
      pointerdown: (event) => {
        const target = getTarget(event);

        if (target) {
          const index = elements.indexOf(target);
          elements[index - 1]?.style.setProperty(LEADING_PROP, '-1');
          elements[index + 1]?.style.setProperty(TRAILING_PROP, '-1');
        }
      },
      pointerup,
      pointercancel: pointerup,
    });
  }
}

define('mx-button-group', ButtonGroup);

declare global {
  interface HTMLElementTagNameMap {
    'mx-button-group': ButtonGroup;
  }
}
