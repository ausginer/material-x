import type { EmptyObject } from 'type-fest';
import { useRipple } from '../core/animations/ripple.ts';
import { useARIATransfer } from '../core/controllers/useARIA.ts';
import { transfer, useAttributes } from '../core/controllers/useAttributes.ts';
import { Bool, Str } from '../core/elements/attribute.ts';
import { define, ReactiveElement } from '../core/elements/reactive-element.ts';
import {
  impl,
  trait,
  type ConstructorWithTraits,
  type Interface,
  type Props,
  type Trait,
} from '../core/elements/traits.ts';
import elevationStyles from '../core/styles/elevation/elevation.css.ts' with { type: 'css' };
import '../core/styles/elevation/elevation.runtime.ts';
import focusStyles from '../core/styles/focus/focus.css.ts' with { type: 'css' };
import {
  Disableable,
  type DisableableProps,
} from '../core/traits/disableable.ts';
import { $, notify } from '../core/utils/DOM.ts';
import { useCore } from '../core/utils/useCore.ts';
import fabTemplate from './fab.tpl.html' with { type: 'html' };
import colorStyles from './styles/color/main.css.ts' with { type: 'css' };
import defaultStyles from './styles/default/main.css.ts' with { type: 'css' };
import extendedStyles from './styles/extended/main.css.ts' with { type: 'css' };
import sizeStyles from './styles/size/main.css.ts' with { type: 'css' };
import tonalStyles from './styles/tonal/main.css.ts' with { type: 'css' };

export type FABSize = 'medium' | 'large';
export type FABColor = 'primary' | 'secondary';
export type FABExtended = 'open' | 'closed';

type FABLikeDescriptor = {
  size: FABSize;
  color: FABColor;
  extended: FABExtended;
  tonal: boolean;
};

const $fabLike: unique symbol = Symbol('FABLike');

export const FABLike: Trait<FABLikeDescriptor, typeof $fabLike> = trait<
  FABLikeDescriptor,
  typeof $fabLike
>(
  {
    size: Str,
    color: Str,
    extended: Str,
    tonal: Bool,
  },
  $fabLike,
);

export type FABLike = Interface<typeof FABLike>;
export type FABLikeProps = Props<typeof FABLike>;

const FABCore: ConstructorWithTraits<
  ReactiveElement,
  [typeof FABLike, typeof Disableable]
> = impl(ReactiveElement, [FABLike, Disableable]);

export type FABProperties = Readonly<FABLikeProps & DisableableProps>;
export type FABEvents = Readonly<{
  fabtoggle: Event;
}>;
export type FABCSSProperties = EmptyObject;

/**
 * @attr {FABSize} size
 * @attr {FABColor} color
 * @attr {FABExtended} extended
 * @attr {boolean|undefined} tonal
 * @attr {boolean|undefined} disabled
 */
export default class FAB extends FABCore {
  constructor() {
    super();
    useCore(this, fabTemplate, {}, [
      elevationStyles,
      focusStyles,
      defaultStyles,
      colorStyles,
      sizeStyles,
      tonalStyles,
      extendedStyles,
    ]);

    const target = $<HTMLButtonElement>(this, '.host')!;
    useARIATransfer(this, target);

    useRipple(this, {
      easing: '--_ripple-easing',
      duration: '--_ripple-duration',
    });

    useAttributes(this, {
      disabled: transfer(target, 'disabled'),
      extended: () => notify(this, 'fabtoggle'),
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
