import RippleAnimationController from '../core/animations/ripple.ts';
import SpringAnimationController from '../core/animations/spring.ts';
import AttributeObserver from '../core/elements/attribute-observer.ts';
import CoreElement, { use } from '../core/elements/core.ts';
import elevationStyles from '../core/elevation/elevation.scss' with { type: 'css' };
import { usePressAnimation } from '../core/utils/button.ts';
import { define, template } from '../utils.ts';
import colorStyles from './color/main.scss' with { type: 'css' };
import mainStyles from './default/main.scss' with { type: 'css' };
import extendedStyles from './extended/main.scss' with { type: 'css' };
import sizeStyles from './size/main.scss' with { type: 'css' };
import tonalStyles from './tonal/main.scss' with { type: 'css' };

export type FABSize = 'medium' | 'large';
export type FABColor = 'primary' | 'secondary';
export type FABExtended = 'open' | 'closed';

const TEMPLATE = template`<slot name="icon"></slot><slot></slot>`;

export class FABToggleEvent extends Event {}

/**
 * @attr {FABSize} size
 * @attr {FABColor} color
 * @attr {FABExtended} extended
 * @attr {boolean|undefined} tonal
 * @attr {boolean|undefined} disabled
 */
export default class FAB extends CoreElement {
  static readonly observedAttributes = ['extended'] as const;

  constructor() {
    super(TEMPLATE, { role: 'button' }, [
      elevationStyles,
      mainStyles,
      colorStyles,
      sizeStyles,
      tonalStyles,
      extendedStyles,
    ]);
    this.tabIndex = 0;
    usePressAnimation(this);
    use(
      this,
      new SpringAnimationController(
        this,
        {
          fabopen(_: FABToggleEvent, animation: Animation): void {
            animation.playbackRate = 1;
            animation.play();
          },
          fabclosed(_: FABToggleEvent, animation: Animation): void {
            animation.playbackRate = -1;
            animation.play();
          },
        },
        {
          damping: 'unfold-damping',
          stiffness: 'unfold-stiffness',
          duration: 'unfold-duration',
          factor: 'unfold-factor',
        },
      ),
      new RippleAnimationController(this),
      new AttributeObserver({
        extended: (_, newValue) => {
          this.dispatchEvent(
            new FABToggleEvent(newValue === 'open' ? 'fabopen' : 'fabclosed'),
          );
        },
      }),
    );
  }
}

define('mx-fab', FAB);

declare global {
  interface HTMLElementTagNameMap {
    'mx-fab': FAB;
  }

  interface HTMLElementEventMap {
    fabopen: FABToggleEvent;
    fabclosed: FABToggleEvent;
  }
}
