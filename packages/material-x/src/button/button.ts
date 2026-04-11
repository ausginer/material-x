import type { EmptyObject } from 'type-fest';
import { define } from 'ydin/element.js';
import type { NameableProps } from 'ydin/traits/nameable.js';
import { Nameable, useNameable } from 'ydin/traits/nameable.js';
import type { TraitedConstructor } from 'ydin/traits/traits.js';
import { impl } from 'ydin/traits/traits.js';
import { useTypeable, Typeable } from 'ydin/traits/typeable.js';
import buttonTemplate from './button.tpl.html' with { type: 'html' };
import {
  ButtonCore as ButtonCoreBase,
  useButtonCore,
  type ButtonCoreProps,
  type ButtonSharedCSSProperties,
} from './ButtonCore.ts';
import elevatedStyles from './styles/elevated/main.css.ts' with { type: 'css' };
import outlinedStyles from './styles/outlined/main.css.ts' with { type: 'css' };
import textStyles from './styles/text/main.css.ts' with { type: 'css' };
import tonalStyles from './styles/tonal/main.css.ts' with { type: 'css' };

const ButtonCore: TraitedConstructor<
  ButtonCoreBase,
  typeof ButtonCoreBase,
  [typeof Nameable, typeof Typeable]
> = impl(ButtonCoreBase, [Nameable, Typeable]);

export type ButtonProperties = ButtonCoreProps & NameableProps;
export type ButtonEvents = EmptyObject;
export type ButtonCSSProperties = ButtonSharedCSSProperties;

/**
 * @tag mx-button
 *
 * @summary Buttons communicate actions users can take in dialogs, forms, cards,
 * and toolbars.
 *
 * @attr {"outlined"|"elevated"|"text"|"tonal"} color - Visual style variant.
 * Omit to use the default filled style.
 * @attr {"xsmall"|"medium"|"large"|"xlarge"} size - Button size. Omit to use
 * the default (small) size.
 * @attr {"round"|"square"} shape - Button shape. Omit to use round corners.
 * @attr {boolean} disabled - Disables interaction and form participation.
 * @attr {string} name - Name submitted with form data.
 * @attr {"submit"|"button"|"reset"} type - Native button type. Defaults to
 *   `"submit"` when inside a form.
 *
 * @slot - Button label/content.
 * @slot icon - Leading icon content.
 *
 * @csspart impl - Internal native button element.
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
 * @event click - Fired when the button is activated.
 */
export default class Button extends ButtonCore {
  static override readonly formAssociated = true;

  constructor() {
    super();

    const target = useButtonCore(
      this,
      buttonTemplate,
      [elevatedStyles, outlinedStyles, textStyles, tonalStyles],
      { delegatesFocus: true },
    );

    useNameable(this, target);
    useTypeable(this, target);
  }
}

define('mx-button', Button);

declare global {
  interface HTMLElementTagNameMap {
    'mx-button': Button;
  }
}
