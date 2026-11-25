import { Bool, Str } from '@ydinjs/core/attribute.js';
import {
  transfer,
  useAttributes,
} from '@ydinjs/core/controllers/useAttributes.js';
import { useEvents } from '@ydinjs/core/controllers/useEvents.js';
import {
  ControlledElement,
  internals,
  type ControlledElementConstructor,
} from '@ydinjs/core/element.js';
import {
  AnyElement,
  attributes,
  type Props,
} from '@ydinjs/core/traits/attribute-traits.js';
import {
  compose,
  trait,
  type Composed,
} from '@ydinjs/core/traits/composition.js';
import { DISABLEABLE_ATTRS } from '@ydinjs/core/traits/disableable.js';
import { toggleState } from '@ydinjs/core/utils/DOM.js';
import type { Simplify } from 'type-fest';
import '../button-group/connected-button-group.ts';
import { notify } from '../core/utils/events.ts';
import { useCore } from '../core/utils/useCore.ts';
import '../icon/icon.ts';
import './button.ts';
import {
  BUTTON_ATTRS,
  type ButtonCoreTraits,
  type ButtonCoreProps,
  type ButtonSharedCSSProperties,
} from './ButtonCore.ts';
import './icon-button.ts';
import splitButtonTemplate from './split-button.tpl.html' with { type: 'html' };
import splitButtonStyles from './styles/split/main.css.ts' with { type: 'css' };

@trait
@attributes({ open: Bool, secondarylabel: Str })
export class SplitButtonLike extends AnyElement {
  accessor open!: boolean;
  accessor secondarylabel!: string | null;
}

export type SplitButtonLikeProps = Props<typeof SplitButtonLike>;

export type SplitButtonProperties = Simplify<
  ButtonCoreProps & SplitButtonLikeProps
>;
export type SplitButtonEvents = Readonly<{
  secondaryaction: Event;
}>;

export type SplitButtonCSSProperties = ButtonSharedCSSProperties;

const SplitButtonConstructor: Composed<
  ControlledElementConstructor,
  [...ButtonCoreTraits, typeof SplitButtonLike]
> = compose(ControlledElement);

/**
 * @tag mx-split-button
 *
 * @summary Split buttons combine a primary action with a secondary toggle
 * action.
 *
 * @attr {"outlined"|"elevated"|"text"|"tonal"} color - Visual style variant.
 * Omit to use the default filled style.
 * @attr {"xsmall"|"medium"|"large"|"xlarge"} size - Button size. Omit to use
 * the default (small) size.
 * @attr {"round"|"square"} shape - Button shape. Omit to use round corners.
 * @attr {boolean} disabled - Disables both actions.
 * @attr {boolean} open - Marks the trailing toggle as opened, and is its
 * expanded state.
 * @attr {string} secondarylabel - Accessible name of the trailing button.
 * Required.
 *
 * @slot - Primary action label/content.
 * @slot icon - Primary action leading icon content.
 *
 * @csspart impl - Internal button-group wrapper.
 * @csspart group - Internal button-group wrapper.
 * @csspart leading - Leading action button host.
 * @csspart trailing - Trailing toggle button host.
 * @csspart leading-impl - Re-exported leading internal control part.
 * @csspart trailing-impl - Re-exported trailing internal control part.
 *
 * @cssprop --md-button-container-height - Overrides button height.
 * @cssprop --md-button-leading-space - Overrides start padding.
 * @cssprop --md-button-trailing-space - Overrides end padding.
 * @cssprop --md-button-icon-size - Overrides icon size.
 * @cssprop --md-button-icon-label-space - Overrides spacing between icon and
 * label.
 * @cssprop --md-button-label-text-line-height - Overrides label line height.
 * @cssprop --md-button-press-duration - Overrides press transition duration.
 * @cssprop --md-button-press-easing - Overrides press transition easing.
 *
 * @event secondaryaction - Fired when the trailing action is activated.
 */
export default class SplitButton extends SplitButtonConstructor {
  static override formAssociated = true;

  constructor() {
    super();
    useCore(this, [splitButtonTemplate], {}, [splitButtonStyles]);

    const trailing = this.shadowRoot!.querySelector('mx-icon-button')!;

    useEvents(
      this,
      {
        click: (event) => {
          event.stopPropagation();
          notify(this, 'secondaryaction');
        },
      },
      trailing,
    );

    const innards = internals(this);

    useAttributes(this, {
      open(_, newValue) {
        const open = Bool.from(newValue);
        toggleState(innards, 'open', open);
        trailing.setAttribute('aria-expanded', String(open));
      },
      secondarylabel: transfer(trailing, 'aria-label'),
    });

    const group = this.shadowRoot!.querySelector('mx-connected-button-group')!;
    useAttributes(
      this,
      Object.fromEntries(
        Object.keys({ ...BUTTON_ATTRS, ...DISABLEABLE_ATTRS }).map((attr) => [
          attr,
          transfer(group, attr),
        ]),
      ),
    );
  }
}

customElements.define('mx-split-button', SplitButton);

declare global {
  interface HTMLElementTagNameMap {
    'mx-split-button': SplitButton;
  }
}
