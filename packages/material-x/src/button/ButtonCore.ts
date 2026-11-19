import { Bool, Str, type ConverterOf } from '@ydinjs/core/attribute.js';
import { useARIA } from '@ydinjs/core/controllers/useARIA.js';
import { useAttributes } from '@ydinjs/core/controllers/useAttributes.js';
import { internals, type ControlledElement } from '@ydinjs/core/element.js';
import {
  AnyElement,
  attributes,
  type Props,
} from '@ydinjs/core/traits/attribute-traits.js';
import { trait, type Composed } from '@ydinjs/core/traits/composition.js';
import {
  type Disableable,
  DISABLEABLE_ATTRS,
  useDisableable,
  type DisableableProps,
} from '@ydinjs/core/traits/disableable.js';
import { $, switchState, toggleState } from '@ydinjs/core/utils/DOM.js';
import { BUTTON_GROUP_CTX } from '../button-group/button-group-context.ts';
import { useRipple } from '../core/animations/ripple/ripple.ts';
import elevationStyles from '../core/styles/elevation/elevation.css.ts' with { type: 'css' };
import '../core/styles/elevation/elevation.runtime.ts';
import focusStyles from '../core/styles/focus/focus.css.ts' with { type: 'css' };
import {
  useFocusForwarding,
  type FocusForwarding,
} from '../core/traits/focus-forwarding.ts';
import { useContext } from '../core/utils/useContext.ts';
import { useCore } from '../core/utils/useCore.ts';
import disabledStyles from './styles/default/disabled.css.ts' with { type: 'css' };
import defaultStyles from './styles/default/main.css.ts' with { type: 'css' };
import shapeStyles from './styles/shape/main.css.ts' with { type: 'css' };
import sizeStyles from './styles/size/main.css.ts' with { type: 'css' };

export type ButtonColor = 'outlined' | 'elevated' | 'text' | 'tonal';
export type ButtonSize = 'xsmall' | 'medium' | 'large' | 'xlarge';
export type ButtonShape = 'square';

export const BUTTON_ATTRS = {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  color: Str as ConverterOf<ButtonColor>,
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  size: Str as ConverterOf<ButtonSize>,
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  shape: Str as ConverterOf<ButtonShape>,
} as const;
export type BUTTON_ATTRS = typeof BUTTON_ATTRS;

export class ButtonLike extends AnyElement {
  static {
    trait(this);
    attributes(this, BUTTON_ATTRS);
  }

  accessor color!: ButtonColor | null;
  accessor size!: ButtonSize | null;
  accessor shape!: ButtonShape | null;
}

export type ButtonLikeProps = Props<typeof ButtonLike>;

export type ButtonCoreTraits = readonly [typeof ButtonLike, typeof Disableable];

export type ButtonCore = InstanceType<
  Composed<typeof ControlledElement, ButtonCoreTraits>
>;

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

const BUTTON_CORE_ATTRS = { ...BUTTON_ATTRS, ...DISABLEABLE_ATTRS };

export function useButtonCore(
  host: ButtonCore & FocusForwarding,
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

  const target = $<HTMLButtonElement>(host, '.host')!;

  useDisableable(host, target);

  useARIA(host, target);

  useFocusForwarding(host, target);

  useRipple(host, target, target);

  const innards = internals(host);
  const switcher = (oldValue: string | null, newValue: string | null) =>
    switchState(innards, oldValue, newValue);

  useAttributes(host, {
    color: switcher,
    size: switcher,
    shape: switcher,
    disabled: (_, newValue) =>
      toggleState(innards, 'disabled', Bool.from(newValue)),
  });

  useContext(
    host,
    BUTTON_GROUP_CTX,
    BUTTON_CORE_ATTRS,
    (attr, oldValue, newValue) => {
      if (attr === 'disabled') {
        target.disabled = host.disabled || (newValue as boolean);
        toggleState(innards, 'disabled', newValue as boolean);
      } else {
        switchState(
          innards,
          oldValue as ButtonColor | ButtonSize | ButtonShape | null,
          newValue as ButtonColor | ButtonSize | ButtonShape | null,
        );
      }
    },
  );

  return target;
}
