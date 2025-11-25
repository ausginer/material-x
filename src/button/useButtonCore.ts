import { useConnected } from '../core/controllers/useConnected.ts';
import { useCore } from '../core/controllers/useCore.ts';
import { ReactiveElement } from '../core/elements/reactive-element.ts';
import elevationStyles from '../styles/core/styles/elevation.css.ts?type=css' with { type: 'css' };
import defaultDisabledStyles from './styles/default/disabled.css.ts?type=css' with { type: 'css' };
import defaultButtonStyles from './styles/default/main.css.ts?type=css' with { type: 'css' };
import shapeStyles from './styles/shape/main.css.ts?type=css' with { type: 'css' };

export type ButtonColor = 'outlined' | 'elevated' | 'text' | 'tonal';
export type ButtonSize = 'xsmall' | 'small' | 'medium' | 'large' | 'xlarge';
export type ButtonShape = 'round' | 'square';

export type CoreButtonAttributes = Readonly<{
  color?: ButtonColor;
  disabled?: boolean;
  size?: ButtonSize;
  shape?: ButtonShape;
}>;

export function useButtonCore(
  element: ReactiveElement,
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
      defaultButtonStyles,
      elevationStyles,
      shapeStyles,
      ...styles,
      defaultDisabledStyles,
    ],
    init,
  );
  useConnected(element, () => {
    element.tabIndex = 0;
  });
}
