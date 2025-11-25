import { useRipple } from '../core/animations/ripple.ts';
import { useCore } from '../core/controllers/useCore.ts';
import {
  ReactiveElement,
  define,
  html,
} from '../core/elements/reactive-element.ts';
import elevationStyles from '../styles/core/styles/elevation.css.ts?type=css' with { type: 'css' };
import colorStyles from './styles/color/main.css.ts?type=css' with { type: 'css' };
import mainStyles from './styles/default/main.css.ts?type=css' with { type: 'css' };
import extendedStyles from './styles/extended/main.css.ts?type=css' with { type: 'css' };
import sizeStyles from './styles/size/main.css.ts?type=css' with { type: 'css' };
import tonalStyles from './styles/tonal/main.css.ts?type=css' with { type: 'css' };
import { useFABPressAnimation } from './useFABPressAnimation.ts';
import { Attribute } from '../core/elements/attribute.ts';
import { useAttribute } from '../core/controllers/useAttribute.ts';
import { useConnected } from '../core/controllers/useConnected.ts';

export type FABSize = 'medium' | 'large';
export type FABColor = 'primary' | 'secondary';
export type FABExtended = 'open' | 'closed';

export type FABAttributes = Readonly<{
  size?: FABSize;
  color?: FABColor;
  extended?: FABExtended;
  tonal?: boolean;
  disabled?: boolean;
}>;

const TEMPLATE = html`<slot name="icon"></slot><slot></slot>`;

/**
 * @attr {FABSize} size
 * @attr {FABColor} color
 * @attr {FABExtended} extended
 * @attr {boolean|undefined} tonal
 * @attr {boolean|undefined} disabled
 */
export default class FAB extends ReactiveElement {
  static readonly observedAttributes = ['extended'] as const;

  readonly #extended = Attribute.string(this, 'extended');

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
    useFABPressAnimation(this);
    useRipple(this, { easing: 'ripple-easing' });
    useAttribute(this.#extended, () =>
      this.dispatchEvent(new Event('fabtoggle')),
    );
  }

  get extended(): string | null {
    return this.#extended.get();
  }

  set extended(value: string | null) {
    this.#extended.set(value);
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
