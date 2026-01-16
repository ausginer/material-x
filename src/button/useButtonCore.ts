import type { Constructor } from 'type-fest';
import { BUTTON_GROUP_CTX } from '../button-group/button-group-context.ts';
import { useRipple } from '../core/animations/ripple.ts';
import { createAccessors } from '../core/controllers/createAccessors.ts';
import { useARIATransfer } from '../core/controllers/useARIA.ts';
import { transfer, useAttributes } from '../core/controllers/useAttributes.ts';
import { useContext } from '../core/controllers/useContext.ts';
import { Bool, Num, Str, type Converter } from '../core/elements/attribute.ts';
import {
  getInternals,
  type ReactiveElement,
} from '../core/elements/reactive-element.ts';
import elevationStyles from '../core/styles/elevation.ctr.css' with { type: 'css' };
import elevationTokens from '../core/styles/elevation.tokens.css.ts' with { type: 'css' };
import { $ } from '../core/utils/DOM.ts';
import { useCore } from '../core/utils/useCore.ts';
import disabledStyles from './styles/default/disabled.ctr.css' with { type: 'css' };
import disabledTokens from './styles/default/disabled.tokens.css.ts' with { type: 'css' };
import defaultMainStyles from './styles/default/main.ctr.css' with { type: 'css' };
import defaultTokens from './styles/default/main.tokens.css.ts' with { type: 'css' };
import shapeTokens from './styles/shape/main.tokens.css.ts' with { type: 'css' };
import sizeTokens from './styles/size/main.tokens.css.ts' with { type: 'css' };

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

export function createButtonAccessors(
  ctr: Constructor<ReactiveElement>,
  attributes?: Record<string, Converter>,
): void {
  createAccessors(ctr, {
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

export function useButtonCore(
  host: ButtonLike & ReactiveElement,
  template: HTMLTemplateElement,
  styles: CSSStyleSheet[],
  init?: Partial<ShadowRootInit>,
): void {
  const shadowInit = { delegatesFocus: true, ...init };

  useCore(
    host,
    template,
    {},
    [
      shapeTokens,
      defaultTokens,
      defaultMainStyles,
      elevationTokens,
      elevationStyles,
      sizeTokens,
      ...styles,
      disabledTokens,
      disabledStyles,
    ],
    shadowInit,
  );

  const target = $<HTMLElement>(host, '.host')!;

  useAttributes(host, {
    disabled: transfer(target, 'disabled'),
  });

  useARIATransfer(host, target);

  useRipple(host, {
    easing: '--_ripple-easing',
    duration: '--_ripple-duration',
  });

  const internals = getInternals(host);

  useContext(host, BUTTON_GROUP_CTX, (data) => {
    if (data) {
      for (const attr of Object.keys(DEFAULT_BUTTON_ATTRIBUTES)) {
        updateByContext(internals, attr, null, data.provider[attr]);
      }

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
