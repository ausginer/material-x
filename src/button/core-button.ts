import { createSpringKeyframes } from '../core/animations/spring.ts';
import CoreElement from '../core/elements/core.ts';
import elevationCss from '../core/elevation/elevation.scss' with { type: 'css' };
import buttonCss from './button.scss' with { type: 'css' };

export type ButtonFlavor = 'outlined' | 'filled-tonal' | 'elevated' | 'text';
export type ButtonSize = 'xsmall' | 'small' | 'medium' | 'large' | 'xlarge';

/**
 * @attr {string} flavor
 * @attr {boolean|undefined} disabled
 */
export default class CoreButton extends CoreElement {
  constructor(
    template: HTMLTemplateElement,
    role: ARIAMixin['role'],
    styles: CSSStyleSheet[],
  ) {
    super(template, { role }, [buttonCss, elevationCss, ...styles]);
    this.tabIndex = 0;
  }

  connectedCallback(): void {
    const styles = getComputedStyle(this);
    const [damping, stiffness, duration] = [
      '--_motion-damping',
      '--_motion-stiffness',
      '--_motion-duration',
    ].map((value) => parseFloat(styles.getPropertyValue(value).trim()));
    const keyframes = createSpringKeyframes(damping, stiffness, duration);

    const animation = this.animate(
      keyframes.map((frame) => ({ '--_spring-value': frame })),
      { duration: 150, fill: 'forwards' },
    );

    animation.pause();

    this.addEventListener('pointerdown', () => {
      animation.playbackRate = 1;
      animation.play();
    });

    this.addEventListener('pointerup', () => {
      animation.playbackRate = -1;
      animation.play();
    });
  }
}
