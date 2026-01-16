import type { EmptyObject } from 'type-fest';
import { useRipple } from '../core/animations/ripple.ts';
import { useAttributes } from '../core/controllers/useAttributes.ts';
import { Bool, Str } from '../core/elements/attribute.ts';
import {
  impl,
  trait,
  type Accessors,
  type ConstructorWithTraits,
  type Trait,
  type TraitProps,
} from '../core/elements/impl.ts';
import { define, ReactiveElement } from '../core/elements/reactive-element.ts';
import elevationStyles from '../core/styles/elevation.tokens.css.ts' with { type: 'css' };
import { Disableable } from '../core/traits/disabled.ts';
import { DEFAULT_EVENT_INIT } from '../core/utils/DOM.ts';
import { useCore } from '../core/utils/useCore.ts';
import fabTemplate from './fab.tpl.html' with { type: 'html' };
import colorTokens from './styles/color/main.tokens.css.ts' with { type: 'css' };
import mainStyles from './styles/default/main.ctr.css' with { type: 'css' };
import defaultTokens from './styles/default/main.tokens.css.ts' with { type: 'css' };
import extendedStyles from './styles/extended/main.ctr.css' with { type: 'css' };
import extendedTokens from './styles/extended/main.tokens.css.ts' with { type: 'css' };
import sizeTokens from './styles/size/main.tokens.css.ts' with { type: 'css' };
import tonalTokens from './styles/tonal/main.tokens.css.ts' with { type: 'css' };

export type FABSize = 'medium' | 'large';
export type FABColor = 'primary' | 'secondary';
export type FABExtended = 'open' | 'closed';

export type FABProperties = Readonly<{
  size?: FABSize;
  color?: FABColor;
  extended?: FABExtended;
  tonal?: boolean;
  disabled?: boolean;
}>;

export type FABEvents = Readonly<{
  fabtoggle: Event;
}>;

export type FABCSSProperties = EmptyObject;

export const FABLike: Trait<
  HTMLElement,
  Accessors<{
    size: Str;
    color: Str;
    extended: Str;
    tonal: Bool;
  }>
> = trait({
  size: Str,
  color: Str,
  extended: Str,
  disabled: Bool,
  tonal: Bool,
});
export type FABLike = Disableable & TraitProps<typeof FABLike>;

const FABCore: ConstructorWithTraits<
  ReactiveElement,
  [typeof FABLike, typeof Disableable]
> = impl(ReactiveElement, Disableable, FABLike);

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
    useCore(this, fabTemplate, { role: 'button' }, [
      elevationStyles,
      mainStyles,
      defaultTokens,
      colorTokens,
      sizeTokens,
      tonalTokens,
      extendedStyles,
      extendedTokens,
    ]);
    useRipple(this, {
      easing: '--_ripple-easing',
      duration: '--_ripple-duration',
    });
    useAttributes(this, {
      extended: () =>
        this.dispatchEvent(new Event('fabtoggle', DEFAULT_EVENT_INIT)),
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
