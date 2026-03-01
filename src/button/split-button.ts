import type { Simplify } from 'type-fest';
import '../button-group/connected-button-group.ts';
import { transfer, useAttributes } from '../core/controllers/useAttributes.ts';
import { useEvents } from '../core/controllers/useEvents.ts';
import { Bool } from '../core/elements/attribute.ts';
import { define } from '../core/elements/reactive-element.ts';
import {
  impl,
  trait,
  type ConstructorWithTraits,
  type Interface,
  type Props,
  type Trait,
} from '../core/elements/traits.ts';
import { $, notify } from '../core/utils/DOM.ts';
import { useCore } from '../core/utils/useCore.ts';
import '../icon/icon.ts';
import './button.ts';
import {
  ButtonCore,
  DEFAULT_BUTTON_ATTRIBUTES,
  type ButtonCoreProps,
  type ButtonSharedCSSProperties,
} from './ButtonCore.ts';
import './icon-button.ts';
import splitButtonTemplate from './split-button.tpl.html' with { type: 'html' };
import splitButtonStyles from './styles/split/main.css.ts' with { type: 'css' };

type SplitButtonLikeDescriptor = {
  open: boolean;
};

const $splitButtonLike: unique symbol = Symbol('SplitButtonLike');

export const SplitButtonLike: Trait<
  SplitButtonLikeDescriptor,
  typeof $splitButtonLike
> = trait<SplitButtonLikeDescriptor, typeof $splitButtonLike>(
  { open: Bool },
  $splitButtonLike,
);

export type SplitButtonLike = Interface<typeof SplitButtonLike>;
export type SplitButtonLikeProps = Props<typeof SplitButtonLike>;

export const SplitButtonCore: ConstructorWithTraits<
  InstanceType<typeof ButtonCore>,
  [typeof SplitButtonLike]
> = impl(ButtonCore, [SplitButtonLike]);

export type SplitButtonProperties = Simplify<
  ButtonCoreProps & SplitButtonLikeProps
>;
export type SplitButtonEvents = Readonly<{
  toggle: Event;
}>;

export type SplitButtonCSSProperties = ButtonSharedCSSProperties;

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
 * @attr {boolean} open - Marks the trailing toggle as opened.
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
 * @event toggle - Fired when the trailing action is activated.
 */
export default class SplitButton extends SplitButtonCore {
  static readonly formAssociated = true;

  constructor() {
    super();
    useCore(this, [splitButtonTemplate], {}, [splitButtonStyles]);

    useEvents(
      this,
      {
        click: (event) => {
          event.stopPropagation();
          notify(this, 'toggle');
        },
      },
      $(this, 'mx-icon-button')!,
    );

    const group = $(this, 'mx-connected-button-group')!;
    useAttributes(
      this,
      Object.fromEntries(
        Object.keys(DEFAULT_BUTTON_ATTRIBUTES).map((attr) => [
          attr,
          transfer(group, attr),
        ]),
      ),
    );
  }
}

define('mx-split-button', SplitButton);

declare global {
  interface HTMLElementTagNameMap {
    'mx-split-button': SplitButton;
  }
}
