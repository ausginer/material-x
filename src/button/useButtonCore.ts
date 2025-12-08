import type { Constructor } from 'type-fest';
import { useRipple } from '../core/animations/ripple.ts';
import { useAccessors } from '../core/controllers/useAccessors.ts';
import { useConnected } from '../core/controllers/useConnected.ts';
import { useCore } from '../core/controllers/useCore.ts';
import { Bool, Str, type Converter } from '../core/elements/attribute.ts';
import type { ReactiveElement } from '../core/elements/reactive-element.ts';
import elevationStyles from '../core/styles/elevation.css.ts?type=css' with { type: 'css' };
import defaultDisabledStyles from './styles/default/disabled.css.ts?type=css' with { type: 'css' };
import defaultButtonStyles from './styles/default/main.css.ts?type=css' with { type: 'css' };
import shapeStyles from './styles/shape/main.css.ts?type=css' with { type: 'css' };

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ButtonLike extends ReactiveElement {}

const buttons = new WeakSet<Element>();

export type ButtonColor = 'outlined' | 'elevated' | 'text' | 'tonal';
export type ButtonSize = 'xsmall' | 'medium' | 'large' | 'xlarge';
export type ButtonShape = 'round' | 'square';

export type CoreButtonProperties = Readonly<{
  color?: ButtonColor;
  size?: ButtonSize;
  shape?: ButtonShape;
  disabled?: boolean;
}>;

export function useButtonAccessors(
  ctr: Constructor<ReactiveElement>,
  attributes?: Record<string, Converter>,
): void {
  useAccessors(ctr, {
    color: Str,
    size: Str,
    shape: Str,
    disabled: Bool,
    ...attributes,
  });
}

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

export function isButtonLike(node: unknown): node is ButtonLike {
  // @ts-expect-error: simplify check
  return buttons.has(node);
}
