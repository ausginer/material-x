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
 * @summary Buttons communicate actions that people can take. They are typically
 * placed throughout the UI, in places like:
 *
 * - Dialogs
 * - Modal windows
 * - Forms
 * - Cards
 * - Toolbars
 *
 * They can also be placed within standard button groups.
 *
 * @attr {string} color
 * @attr {boolean|undefined} disabled
 * @attr {string} size
 * @attr {string} shape
 */
export default class SplitButton extends SplitButtonCore {
  static readonly formAssociated = true;

  constructor() {
    super();
    useCore(this, splitButtonTemplate, {}, [splitButtonStyles]);

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
