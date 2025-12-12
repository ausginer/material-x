import type { Constructor } from 'type-fest';
import { BUTTON_GROUP_CTX } from '../button-group/button-group-context.ts';
import { useRipple } from '../core/animations/ripple.ts';
import { useAccessors } from '../core/controllers/useAccessors.ts';
import { useConnected } from '../core/controllers/useConnected.ts';
import { useContext } from '../core/controllers/useContext.ts';
import { useCore } from '../core/controllers/useCore.ts';
import { Bool, Num, Str, type Converter } from '../core/elements/attribute.ts';
import {
  getInternals,
  type ReactiveElement,
} from '../core/elements/reactive-element.ts';
import elevationStyles from '../core/styles/elevation.css.ts?type=css' with { type: 'css' };
import type { TypedObjectConstructor } from '../interfaces.ts';
import defaultDisabledStyles from './styles/default/disabled.css.ts?type=css' with { type: 'css' };
import defaultButtonStyles from './styles/default/main.css.ts?type=css' with { type: 'css' };
import shapeStyles from './styles/shape/main.css.ts?type=css' with { type: 'css' };

export interface ButtonLike {
  color: string | null;
  size: string | null;
  shape: string | null;
  disabled: boolean;
}

const buttons = new WeakSet<ButtonLike>();

export type ButtonColor = 'outlined' | 'elevated' | 'text' | 'tonal';
export type ButtonSize = 'xsmall' | 'medium' | 'large' | 'xlarge';
export type ButtonShape = 'round' | 'square';

export type ButtonCoreProperties = Readonly<{
  color?: ButtonColor;
  size?: ButtonSize;
  shape?: ButtonShape;
  disabled?: boolean;
}>;

export const DEFAULT_BUTTON_ATTRIBUTES: Readonly<
  Record<keyof ButtonCoreProperties, Converter>
> = {
  color: Str,
  size: Str,
  shape: Str,
  disabled: Bool,
};

export function useButtonAccessors(
  ctr: Constructor<ReactiveElement>,
  attributes?: Record<string, Converter>,
): void {
  useAccessors(ctr, {
    ...DEFAULT_BUTTON_ATTRIBUTES,
    ...attributes,
  });
}

function updateByContext(
  internals: ElementInternals,
  attr: keyof ButtonCoreProperties,
  oldValue: string | boolean | number | null,
  newValue: string | boolean | number | null,
) {
  if (DEFAULT_BUTTON_ATTRIBUTES[attr] === Bool) {
    if (newValue) {
      internals.states.add(attr);
    } else {
      internals.states.delete(attr);
    }
  } else if (
    DEFAULT_BUTTON_ATTRIBUTES[attr] === Num ||
    DEFAULT_BUTTON_ATTRIBUTES[attr] === Str
  ) {
    if (oldValue) {
      internals.states.delete(String(oldValue));
    }

    if (newValue) {
      internals.states.add(String(newValue));
    }
  }
}

// eslint-disable-next-line @typescript-eslint/max-params
export function useButtonCore(
  host: ButtonLike & ReactiveElement,
  template: HTMLTemplateElement,
  role: ARIAMixin['role'],
  styles: CSSStyleSheet[],
  init?: Partial<ShadowRootInit>,
): void {
  useCore(
    host,
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

  useRipple(host, {
    easing: '--_ripple-easing',
    duration: '--_ripple-duration',
  });

  useConnected(host, () => {
    host.tabIndex = 0;
  });

  const internals = getInternals(host);

  useContext(host, BUTTON_GROUP_CTX, (data) => {
    if (data) {
      (Object as TypedObjectConstructor)
        .keys(DEFAULT_BUTTON_ATTRIBUTES)
        .forEach((attr) => {
          updateByContext(internals, attr, null, data.provider[attr]);
        });

      return data.emitter.on(({ attr, old: oldValue, new: newValue }) => {
        updateByContext(internals, attr, oldValue, newValue);
      });
    }

    return undefined;
  });

  buttons.add(host);
}

export function isButtonLike(node: unknown): node is ButtonLike {
  // @ts-expect-error: simplify check
  return buttons.has(node);
}
