import { Str, type ConverterOf } from 'ydin/attribute.js';
import { useARIA } from 'ydin/controllers/useARIA.js';
import { useContext } from 'ydin/controllers/useContext.js';
import {
  ControlledElement,
  getInternals,
  type ControlledElementConstructor,
} from 'ydin/element.js';
import {
  Disableable,
  useDisableable,
  type DisableableProps,
} from 'ydin/traits/disableable.js';
import {
  impl,
  trait,
  type Interface,
  type Props,
  type Trait,
  type TraitedConstructor,
} from 'ydin/traits/traits.js';
import { $ } from 'ydin/utils/DOM.js';
import { BUTTON_GROUP_CTX } from '../button-group/button-group-context.ts';
import { useRipple } from '../core/animations/ripple/ripple.ts';
import elevationStyles from '../core/styles/elevation/elevation.css.ts' with { type: 'css' };
import '../core/styles/elevation/elevation.runtime.ts';
import focusStyles from '../core/styles/focus/focus.css.ts' with { type: 'css' };
import { useCore } from '../core/utils/useCore.ts';
import disabledStyles from './styles/default/disabled.css.ts' with { type: 'css' };
import defaultStyles from './styles/default/main.css.ts' with { type: 'css' };
import shapeStyles from './styles/shape/main.css.ts' with { type: 'css' };
import sizeStyles from './styles/size/main.css.ts' with { type: 'css' };

export type ButtonColor = 'outlined' | 'elevated' | 'text' | 'tonal';
export type ButtonSize = 'xsmall' | 'medium' | 'large' | 'xlarge';
export type ButtonShape = 'round' | 'square';

export const DEFAULT_BUTTON_ATTRIBUTES = {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  color: Str as ConverterOf<ButtonColor>,
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  size: Str as ConverterOf<ButtonSize>,
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  shape: Str as ConverterOf<ButtonShape>,
} as const;
export type DEFAULT_BUTTON_ATTRIBUTES = typeof DEFAULT_BUTTON_ATTRIBUTES;

const $buttonLike: unique symbol = Symbol('ButtonLike');

export const ButtonLike: Trait<
  {
    color: ButtonColor | null;
    size: ButtonSize | null;
    shape: ButtonShape | null;
  },
  typeof $buttonLike
> = trait(DEFAULT_BUTTON_ATTRIBUTES, $buttonLike);

export type ButtonLike = Interface<typeof ButtonLike>;
export type ButtonLikeProps = Props<typeof ButtonLike>;

export const ButtonCore: TraitedConstructor<
  ControlledElement,
  ControlledElementConstructor,
  [typeof ButtonLike, typeof Disableable]
> = impl(ControlledElement, [ButtonLike, Disableable]);
export type ButtonCore = InstanceType<typeof ButtonCore>;

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
  host: ButtonCore,
  template: HTMLTemplateElement,
  styles: ReadonlyArray<CSSStyleSheet | string>,
  init?: Partial<ShadowRootInit>,
): HTMLElement {
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

  useDisableable(host, target);

  useARIA(host, target);

  useRipple(host, target, target);

  const internals = getInternals(host);

  useContext(host, BUTTON_GROUP_CTX, (data) => {
    if (data) {
      for (const attr of Object.keys(DEFAULT_BUTTON_ATTRIBUTES)) {
        console.log('init', data.provider[attr]);
        updateByContext(internals, null, data.provider[attr]);
      }

      return data.emitter.on((_, oldValue, newValue) => {
        console.log('emit', { oldValue, newValue });
        updateByContext(internals, oldValue, newValue);
      });
    }

    return undefined;
  });

  return target;
}
