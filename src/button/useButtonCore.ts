import { useRipple } from '../core/animations/ripple.ts';
import { useConnected } from '../core/controllers/useConnected.ts';
import { useCore } from '../core/controllers/useCore.ts';
import type { ReactiveElement } from '../core/elements/reactive-element.ts';
import elevationStyles from '../core/styles/elevation.css.ts?type=css' with { type: 'css' };
import defaultDisabledStyles from './styles/default/disabled.css.ts?type=css' with { type: 'css' };
import defaultButtonStyles from './styles/default/main.css.ts?type=css' with { type: 'css' };
import shapeStyles from './styles/shape/main.css.ts?type=css' with { type: 'css' };

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ButtonLike extends ReactiveElement {}

const buttons = new WeakSet<Element>();

export type ButtonColor = 'outlined' | 'elevated' | 'text' | 'tonal';
export type ButtonSize = 'xsmall' | 'small' | 'medium' | 'large' | 'xlarge';
export type ButtonShape = 'round' | 'square';

export type CoreButtonAttributes = Readonly<{
  color?: ButtonColor;
  disabled?: boolean;
  size?: ButtonSize;
  shape?: ButtonShape;
}>;

// eslint-disable-next-line @typescript-eslint/max-params
export function useButtonCore(
  element: ButtonLike,
  template: HTMLTemplateElement,
  role: ARIAMixin['role'],
  styles: CSSStyleSheet[],
  init?: Partial<ShadowRootInit>,
): void {
  useCore(
    element,
    template,
    { role },
    [
      shapeStyles,
      defaultButtonStyles,
      elevationStyles,
      ...styles,
      defaultDisabledStyles,
    ],
    init,
  );
  useRipple(element, {
    easing: '--_ripple-easing',
    duration: '--_ripple-duration',
  });
  useConnected(element, () => {
    element.tabIndex = 0;
  });
  buttons.add(element);
}

export function isButtonLike(element: Element): element is ButtonLike {
  return buttons.has(element);
}
