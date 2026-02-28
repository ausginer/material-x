import type { EmptyObject } from 'type-fest';
import type { ButtonCoreProps, ButtonLike } from '../button/ButtonCore.ts';
import { useEvents } from '../core/controllers/useEvents.ts';
import { useSlot } from '../core/controllers/useSlot.ts';
import {
  define,
  type ReactiveElement,
} from '../core/elements/reactive-element.ts';
import buttonGroupTemplate from './button-group.tpl.html' with { type: 'html' };
import {
  ButtonGroupCore,
  useButtonGroupCore,
  type ButtonGroupSharedCSSProperties,
} from './ButtonGroupCore.ts';
import standardStyles from './styles/standard/main.css.ts' with { type: 'css' };
import { getTarget } from './utils.ts';

export type ButtonGroupProperties = ButtonCoreProps;
export type ButtonGroupEvents = EmptyObject;
export type ButtonGroupCSSProperties = ButtonGroupSharedCSSProperties;

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
