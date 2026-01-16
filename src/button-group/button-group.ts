import type { EmptyObject } from 'type-fest';
import type {
  ButtonCoreProperties,
  ButtonLike,
} from '../button/useButtonCore.ts';
import { useEvents } from '../core/controllers/useEvents.ts';
import { useSlot } from '../core/controllers/useSlot.ts';
import {
  define,
  type ReactiveElement,
} from '../core/elements/reactive-element.ts';
import buttonGroupTemplate from './button-group.tpl.html' with { type: 'html' };
import standardStyles from './styles/standard/main.ctr.css' with { type: 'css' };
import standardTokens from './styles/standard/main.tokens.css.ts' with { type: 'css' };
import { ButtonGroupCore, useButtonGroupCore } from './useButtonGroupCore.ts';
import { getTarget } from './utils.ts';

export type ButtonGroupProperties = ButtonCoreProperties;
export type ButtonGroupEvents = EmptyObject;
export type ButtonGroupCSSProperties = EmptyObject;

const LEADING_PROP = '--_interaction-direction-leading';
const TRAILING_PROP = '--_interaction-direction-trailing';

/**
 * @attr {string} size
 */
export default class ButtonGroup extends ButtonGroupCore {
  constructor() {
    super();
    useButtonGroupCore(this, buttonGroupTemplate, { role: 'group' }, [
      standardStyles,
      standardTokens,
    ]);

    let elements: ReadonlyArray<ButtonLike & ReactiveElement> = [];

    useSlot<ButtonLike & ReactiveElement>(this, 'slot', (_, newElements) => {
      elements = newElements;
    });

    const pointerup = () => {
      elements.forEach((element) => {
        [LEADING_PROP, TRAILING_PROP].forEach((prop) =>
          element.style.removeProperty(prop),
        );
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
