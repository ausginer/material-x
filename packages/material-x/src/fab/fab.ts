import { Bool, Str, type ConverterOf } from 'ydin/attribute.js';
import { useARIA } from 'ydin/controllers/useARIA.js';
import { useAttributes } from 'ydin/controllers/useAttributes.js';
import {
  ControlledElement,
  define,
  internals,
  type ControlledElementConstructor,
} from 'ydin/element.js';
import {
  Disableable,
  useDisableable,
  type DisableableProps,
} from 'ydin/traits/disableable.js';
import {
  impl,
  trait,
  type Interface,
  type Props,
  type Trait,
  type TraitedConstructor,
} from 'ydin/traits/traits.js';
import { $, notify, switchState, toggleState } from 'ydin/utils/DOM.js';
import { useRipple } from '../core/animations/ripple/ripple.ts';
import elevationStyles from '../core/styles/elevation/elevation.css.ts' with { type: 'css' };
import '../core/styles/elevation/elevation.runtime.ts';
import focusStyles from '../core/styles/focus/focus.css.ts' with { type: 'css' };
import { useCore } from '../core/utils/useCore.ts';
import template from './fab.tpl.html' with { type: 'html' };
import colorStyles from './styles/color/main.css.ts' with { type: 'css' };
import defaultStyles from './styles/default/main.css.ts' with { type: 'css' };
import extendedStyles from './styles/extended/main.css.ts' with { type: 'css' };
import sizeStyles from './styles/size/main.css.ts' with { type: 'css' };
import tonalStyles from './styles/tonal/main.css.ts' with { type: 'css' };

export type FABSize = 'medium' | 'large';
export type FABColor = 'primary' | 'secondary';
export type FABExtended = 'open' | 'closed';

const $fabLike: unique symbol = Symbol('FABLike');

export const FABLike: Trait<
  {
    size: FABSize | null;
    color: FABColor | null;
    extended: FABExtended | null;
    tonal: boolean;
  },
  typeof $fabLike
> = trait(
  {
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    size: Str as ConverterOf<FABSize>,
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    color: Str as ConverterOf<FABColor>,
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    extended: Str as ConverterOf<FABExtended>,
    tonal: Bool,
  },
  $fabLike,
);

export type FABLike = Interface<typeof FABLike>;
export type FABLikeProps = Props<typeof FABLike>;

const FABCore: TraitedConstructor<
  ControlledElement,
  ControlledElementConstructor,
  [typeof FABLike, typeof Disableable]
> = impl(ControlledElement, [FABLike, Disableable]);

export type FABProperties = Readonly<FABLikeProps & DisableableProps>;
export type FABEvents = Readonly<{
  fabtoggle: Event;
}>;
export type FABCSSProperties = Readonly<{
  '--md-fab-container-height'?: string;
  '--md-fab-container-width'?: string;
  '--md-fab-icon-size'?: string;
  '--md-fab-icon-label-space'?: string;
  '--md-fab-unfold-duration'?: string;
  '--md-fab-unfold-easing'?: string;
  '--md-fab-level'?: string;
  '--md-fab-hover-level'?: string;
}>;

/**
 * @tag mx-fab
 *
 * @summary Floating action buttons represent a promoted primary action.
 *
 * @attr {"medium"|"large"} size - Container size. Omit to use the default
 * size.
 * @attr {"primary"|"secondary"} color - Color variant. Omit to use the
 * tertiary default.
 * @attr {"open"|"closed"} extended - Extended label state.
 * @attr {boolean} tonal - Enables tonal style.
 * @attr {boolean} disabled - Disables interaction and form participation.
 *
 * @slot - Label content for extended FAB.
 * @slot icon - Leading icon content.
 *
 * @csspart impl - Internal native button element.
 *
 * @cssprop --md-fab-container-height - Overrides container height.
 * @cssprop --md-fab-container-width - Overrides container width.
 * @cssprop --md-fab-icon-size - Overrides icon size.
 * @cssprop --md-fab-icon-label-space - Overrides icon and label spacing.
 * @cssprop --md-fab-unfold-duration - Overrides unfold transition duration.
 * @cssprop --md-fab-unfold-easing - Overrides unfold transition easing.
 * @cssprop --md-fab-level - Overrides default elevation level.
 * @cssprop --md-fab-hover-level - Overrides hovered elevation level.
 *
 * @event click - Fired when the FAB is activated.
 * @event fabtoggle - Fired when the `extended` state changes.
 */
export default class FAB extends FABCore {
  constructor() {
    super();
    useCore(this, [template], {}, [
      elevationStyles,
      focusStyles,
      defaultStyles,
      colorStyles,
      sizeStyles,
      tonalStyles,
      extendedStyles,
    ]);

    const target = $<HTMLButtonElement>(this, '.host')!;
    useARIA(this, target);

    useRipple(this, target, target);

    useDisableable(this, target);

    const innards = internals(this);

    useAttributes(this, {
      extended: (_, newValue) => {
        notify(this, 'fabtoggle');
        toggleState(innards, 'extended', Bool.from(newValue));
        toggleState(innards, 'open', newValue === 'open');
      },
      color: (oldValue, newValue) => switchState(innards, oldValue, newValue),
      size: (oldValue, newValue) => switchState(innards, oldValue, newValue),
      tonal: (_, newValue) => toggleState(innards, 'tonal', Bool.from(newValue)),
    });
  }
}

define('mx-fab', FAB);

declare global {
  interface HTMLElementTagNameMap {
    'mx-fab': FAB;
  }

  interface HTMLElementEventMap {
    fabtoggle: Event;
  }
}
