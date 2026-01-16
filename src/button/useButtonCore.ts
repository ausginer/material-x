import { BUTTON_GROUP_CTX } from '../button-group/button-group-context.ts';
import { useRipple } from '../core/animations/ripple.ts';
import { useARIATransfer } from '../core/controllers/useARIA.ts';
import { transfer, useAttributes } from '../core/controllers/useAttributes.ts';
import { useContext } from '../core/controllers/useContext.ts';
import { Str } from '../core/elements/attribute.ts';
import {
  impl,
  trait,
  type Accessors,
  type ConstructorWithTraits,
  type Trait,
  type TraitProps,
} from '../core/elements/impl.ts';
import {
  getInternals,
  ReactiveElement,
} from '../core/elements/reactive-element.ts';
import elevationStyles from '../core/styles/elevation.ctr.css' with { type: 'css' };
import elevationTokens from '../core/styles/elevation.tokens.css.ts' with { type: 'css' };
import { Disableable } from '../core/traits/disabled.ts';
import { $ } from '../core/utils/DOM.ts';
import { useCore } from '../core/utils/useCore.ts';
import disabledStyles from './styles/default/disabled.ctr.css' with { type: 'css' };
import disabledTokens from './styles/default/disabled.tokens.css.ts' with { type: 'css' };
import defaultMainStyles from './styles/default/main.ctr.css' with { type: 'css' };
import defaultTokens from './styles/default/main.tokens.css.ts' with { type: 'css' };
import shapeTokens from './styles/shape/main.tokens.css.ts' with { type: 'css' };
import sizeTokens from './styles/size/main.tokens.css.ts' with { type: 'css' };

export const DEFAULT_BUTTON_ATTRIBUTES: Readonly<{
  color: Str;
  size: Str;
  shape: Str;
}> = {
  color: Str,
  size: Str,
  shape: Str,
};

export const ButtonLike: Trait<
  ReactiveElement,
  Accessors<typeof DEFAULT_BUTTON_ATTRIBUTES>
> = trait(DEFAULT_BUTTON_ATTRIBUTES);

export type ButtonLike = Disableable & TraitProps<typeof ButtonLike>;

export const ButtonCore: ConstructorWithTraits<
  ReactiveElement,
  [typeof ButtonLike, typeof Disableable]
> = impl(ReactiveElement, ButtonLike, Disableable);

export type ButtonColor = 'outlined' | 'elevated' | 'text' | 'tonal';
export type ButtonSize = 'xsmall' | 'medium' | 'large' | 'xlarge';
export type ButtonShape = 'round' | 'square';

export type ButtonCoreProperties = Readonly<{
  color?: ButtonColor;
  size?: ButtonSize;
  shape?: ButtonShape;
  disabled?: boolean;
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
        updateByContext(internals, null, data.provider[attr]);
      }

      return data.emitter.on(({ old: oldValue, new: newValue }) => {
        updateByContext(internals, oldValue, newValue);
      });
    }

    return undefined;
  });
}
