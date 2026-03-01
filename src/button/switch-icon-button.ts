import type { EmptyObject } from 'type-fest';
import { define } from '../core/elements/reactive-element.ts';
import { impl, type ConstructorWithTraits } from '../core/elements/traits.ts';
import { useButtonCore, type ButtonSharedCSSProperties } from './ButtonCore.ts';
import iconButtonTemplate from './icon-button.tpl.html' with { type: 'html' };
import { IconButtonLike, type IconButtonProperties } from './icon-button.ts';
import switchDefaultStyles from './styles/default/switch.css.ts' with { type: 'css' };
import mainElevatedStyles from './styles/elevated/main.css.ts' with { type: 'css' };
import switchElevatedStyles from './styles/elevated/switch.css.ts' with { type: 'css' };
import mainIconStyles from './styles/icon/main.css.ts' with { type: 'css' };
import switchIconStyles from './styles/icon/switch.css.ts' with { type: 'css' };
import mainOutlinedStyles from './styles/outlined/main.css.ts' with { type: 'css' };
import switchOutlinedStyles from './styles/outlined/switch.css.ts' with { type: 'css' };
import switchSizeStyles from './styles/size/switch.css.ts' with { type: 'css' };
import mainTonalStyles from './styles/tonal/main.css.ts' with { type: 'css' };
import switchTonalStyles from './styles/tonal/switch.css.ts' with { type: 'css' };
import { SwitchCore, useSwitch, type SwitchProps } from './SwitchCore.ts';

export type SwitchIconButtonProperties = IconButtonProperties & SwitchProps;
export type SwitchIconButtonEvents = EmptyObject;
export type SwitchIconButtonCSSProperties = ButtonSharedCSSProperties;

const SwitchIconButtonCore: ConstructorWithTraits<
  InstanceType<typeof SwitchCore>,
  [typeof IconButtonLike]
> = impl(SwitchCore, [IconButtonLike]);

/**
 * @tag mx-switch-icon-button
 *
 * @summary Switch icon buttons expose icon-only button visuals with switch
 * semantics.
 *
 * @attr {"outlined"|"elevated"|"tonal"|"standard"} color - Visual style
 * variant. Omit to use the default filled style.
 * @attr {"xsmall"|"medium"|"large"|"xlarge"} size - Button size. Omit to use
 * the default (small) size.
 * @attr {"round"|"square"} shape - Button shape. Omit to use round corners.
 * @attr {"wide"|"narrow"} width - Container width style.
 * @attr {string} value - Submitted form value.
 * @attr {boolean} checked - Current switch checked state.
 * @attr {boolean} disabled - Disables interaction and form participation.
 *
 * @slot - Icon content.
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
 * @event input - Fired when switch interaction occurs.
 * @event change - Fired when switch interaction occurs.
 */
export default class SwitchIconButton extends SwitchIconButtonCore {
  static readonly formAssociated = true;

  constructor() {
    super();
    useButtonCore(this, iconButtonTemplate, [
      mainElevatedStyles,
      mainOutlinedStyles,
      mainTonalStyles,
      mainIconStyles,
      switchDefaultStyles,
      switchElevatedStyles,
      switchOutlinedStyles,
      switchSizeStyles,
      switchTonalStyles,
      switchIconStyles,
    ]);
    useSwitch(this);
  }
}

define('mx-switch-icon-button', SwitchIconButton);

declare global {
  interface HTMLElementTagNameMap {
    'mx-switch-icon-button': SwitchIconButton;
  }
}
