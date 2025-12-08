import type { EmptyObject } from 'type-fest';
import { useRipple } from '../core/animations/ripple.ts';
import { useAccessors } from '../core/controllers/useAccessors.ts';
import { useAttribute } from '../core/controllers/useAttribute.ts';
import { useConnected } from '../core/controllers/useConnected.ts';
import { useCore } from '../core/controllers/useCore.ts';
import { Bool, Str } from '../core/elements/attribute.ts';
import {
  define,
  html,
  ReactiveElement,
} from '../core/elements/reactive-element.ts';
import elevationStyles from '../core/styles/elevation.css.ts?type=css' with { type: 'css' };
import colorStyles from './styles/color/main.css.ts?type=css' with { type: 'css' };
import mainStyles from './styles/default/main.css.ts?type=css' with { type: 'css' };
import extendedStyles from './styles/extended/main.css.ts?type=css' with { type: 'css' };
import sizeStyles from './styles/size/main.css.ts?type=css' with { type: 'css' };
import tonalStyles from './styles/tonal/main.css.ts?type=css' with { type: 'css' };

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

const TEMPLATE = html`<slot class="icon" name="icon"></slot><slot></slot>`;

/**
 * @attr {FABSize} size
 * @attr {FABColor} color
 * @attr {FABExtended} extended
 * @attr {boolean|undefined} tonal
 * @attr {boolean|undefined} disabled
 */
export default class FAB extends ReactiveElement {
  static {
    useAccessors(this, {
      size: Str,
      color: Str,
      extended: Str,
      disabled: Bool,
      tonal: Bool,
    });
  }
  declare size: FABSize | null;
  declare color: FABColor | null;
  declare extended: FABExtended | null;
  declare disabled: boolean;
  declare tonal: boolean;

  constructor() {
    super();
    useCore(this, TEMPLATE, { role: 'button' }, [
      elevationStyles,
      mainStyles,
      colorStyles,
      sizeStyles,
      tonalStyles,
      extendedStyles,
    ]);
    useConnected(this, () => {
      this.tabIndex = 0;
    });
    useRipple(this, {
      easing: '--_ripple-easing',
      duration: '--_ripple-duration',
    });
    useAttribute(this, 'extended', () =>
      this.dispatchEvent(new Event('fabtoggle')),
    );
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
