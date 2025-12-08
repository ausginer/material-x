/* eslint-disable @typescript-eslint/no-unsafe-type-assertion */
import sizeStyles from '../button/styles/size/main.css.ts?type=css' with { type: 'css' };
import {
  useButtonAccessors,
  type ButtonColor,
  type ButtonShape,
  type ButtonSize,
  type CoreButtonProperties,
} from '../button/useButtonCore.ts';
import { useCore } from '../core/controllers/useCore.ts';
import { useEvents } from '../core/controllers/useEvents.ts';
import { useSlot } from '../core/controllers/useSlot.ts';
import { define, ReactiveElement } from '../core/elements/reactive-element.ts';
import { applyToSiblings } from '../core/utils/DOM.ts';
import standardStyles from './styles/standard.css.ts?type=css' with { type: 'css' };
import { TEMPLATE } from './templates.ts';
import { getTarget } from './utils.ts';

export type ButtonGroupProperties = CoreButtonProperties;

const LEADING_PROP = '--_interaction-direction-leading';
const TRAILING_PROP = '--_interaction-direction-trailing';

/**
 * @attr {string} size
 */
export default class ButtonGroup extends ReactiveElement {
  static {
    useButtonAccessors(this);
  }

  declare color: ButtonColor | null;
  declare size: ButtonSize | null;
  declare shape: ButtonShape | null;
  declare disabled: boolean;

  constructor() {
    super();
    useCore(this, TEMPLATE, { role: 'group' }, [sizeStyles, standardStyles]);

    let elements: readonly HTMLElement[] = [];

    useSlot(this, 'slot', (newElements) => {
      elements = newElements as readonly HTMLElement[];
    });

    const pointerup = () => {
      elements.forEach((element) => {
        [LEADING_PROP, TRAILING_PROP].forEach((prop) =>
          element.style.removeProperty(prop),
        );
      });
    };

    useEvents(this, {
      pointerdown(event) {
        const target = getTarget(event);

        if (target) {
          applyToSiblings(
            target,
            (sibling) => {
              sibling.style.setProperty(TRAILING_PROP, '-1');
            },
            (sibling) => {
              sibling.style.setProperty(LEADING_PROP, '-1');
            },
            true,
          );
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
