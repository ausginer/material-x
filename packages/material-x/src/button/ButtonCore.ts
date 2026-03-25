import { BUTTON_GROUP_CTX } from '../button-group/button-group-context.ts';
import { useRipple } from '../core/animations/ripple/ripple.ts';
import { transfer, useAttributes } from 'ydin/controllers/useAttributes.js';
import { useARIATransfer } from 'ydin/controllers/useARIA.js';
import { useContext } from 'ydin/controllers/useContext.js';
import { Str } from 'ydin/attribute.js';
import { getInternals, ReactiveElement } from 'ydin/reactive-element.js';
import {
  impl,
  trait,
  type ConstructorWithTraits,
  type Interface,
  type Props,
  type Trait,
} from 'ydin/traits/traits.js';
import elevationStyles from '../core/styles/elevation/elevation.css.ts' with { type: 'css' };
import '../core/styles/elevation/elevation.runtime.ts';
import focusStyles from '../core/styles/focus/focus.css.ts' with { type: 'css' };
import { Disableable, type DisableableProps } from 'ydin/traits/disableable.js';
import { $ } from 'ydin/utils/DOM.js';
import { useCore } from '../core/utils/useCore.ts';
import disabledStyles from './styles/default/disabled.css.ts' with { type: 'css' };
import defaultStyles from './styles/default/main.css.ts' with { type: 'css' };
import shapeStyles from './styles/shape/main.css.ts' with { type: 'css' };
import sizeStyles from './styles/size/main.css.ts' with { type: 'css' };

export type ButtonColor = 'outlined' | 'elevated' | 'text' | 'tonal';
export type ButtonSize = 'xsmall' | 'medium' | 'large' | 'xlarge';
export type ButtonShape = 'round' | 'square';

export const DEFAULT_BUTTON_ATTRIBUTES: DEFAULT_BUTTON_ATTRIBUTES = {
  color: Str,
  size: Str,
  shape: Str,
};
export type DEFAULT_BUTTON_ATTRIBUTES = Readonly<{
  color: Str;
  size: Str;
  shape: Str;
}>;

export type ButtonLikeDescriptor = {
  color: ButtonColor;
  size: ButtonSize;
  shape: ButtonShape;
};

const $buttonLike: unique symbol = Symbol('ButtonLike');

export const ButtonLike: Trait<ButtonLikeDescriptor, typeof $buttonLike> =
  trait<ButtonLikeDescriptor, typeof $buttonLike>(
    DEFAULT_BUTTON_ATTRIBUTES,
    $buttonLike,
  );

export type ButtonLike = Interface<typeof ButtonLike>;
export type ButtonLikeProps = Props<typeof ButtonLike>;

export const ButtonCore: ConstructorWithTraits<
  ReactiveElement,
  [typeof ButtonLike, typeof Disableable]
> = impl(ReactiveElement, [ButtonLike, Disableable]);

export type ButtonCoreProps = ButtonLikeProps & DisableableProps;

export type ButtonSharedCSSProperties = Readonly<{
  '--md-button-container-height'?: string;
  '--md-button-leading-space'?: string;
  '--md-button-trailing-space'?: string;
  '--md-button-icon-size'?: string;
  '--md-button-icon-label-space'?: string;
  '--md-button-label-text-line-height'?: string;
  '--md-button-press-duration'?: string;
  '--md-button-press-easing'?: string;
}>;

function updateByContext(
  internals: ElementInternals,
  oldValue: string | boolean | number | null,
  newValue: string | boolean | number | null,
) {
  if (oldValue) {
    internals.states.delete(String(oldValue));
  }

  if (newValue) {
    internals.states.add(String(newValue));
  }
}

export function useButtonCore(
  host: ButtonLike & ReactiveElement,
  template: HTMLTemplateElement,
  styles: ReadonlyArray<CSSStyleSheet | string>,
  init?: Partial<ShadowRootInit>,
): void {
  const shadowInit = { delegatesFocus: true, ...init };

  useCore(
    host,
    [template],
    {},
    [
      shapeStyles,
      defaultStyles,
      elevationStyles,
      focusStyles,
      sizeStyles,
      ...styles,
      disabledStyles,
    ],
    shadowInit,
  );

  const target = $<HTMLElement>(host, '.host')!;

  useAttributes(host, {
    disabled: transfer(target, 'disabled'),
  });

  useARIATransfer(host, target);

  useRipple(
    host,
    {
      easing: '--_ripple-easing',
      duration: '--_ripple-duration',
    },
    target,
  );

  const internals = getInternals(host);

  useContext(host, BUTTON_GROUP_CTX, (data) => {
    if (data) {
      for (const attr of Object.keys(DEFAULT_BUTTON_ATTRIBUTES)) {
        updateByContext(internals, null, data.provider[attr]);
      }

      return data.emitter.on((_, oldValue, newValue) => {
        updateByContext(internals, oldValue, newValue);
      });
    }

    return undefined;
  });
}
