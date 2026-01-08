import { computed, type ReadonlySignal } from '@preact/signals-core';
import motionEffects from '../../../.tproc/default/motion-effects.ts';
import { t } from '../../../.tproc/index.ts';
import type { TokenPackage } from '../../../.tproc/TokenPackage.ts';
import type { TokenValue } from '../../../.tproc/utils.ts';
import type { GroupSelector } from '../../../.tproc/utils.ts';
import * as CSSVariable from '../../../.tproc/variable.ts';
import {
  BUTTON_ALLOWED_TOKENS,
  BUTTON_STATES,
  buttonMainTokenSelector,
  buttonSwitchTokenSelector,
  createButtonExtensions,
  createButtonScopedDeclarationRenderer,
  fixFullShape,
  groupButtonTokens,
  notDisabledTokenSelector,
  omitSelectedShape,
} from '../utils.ts';

const SET_NAME = 'md.comp.button';

const specialTokens = {
  'state-layer.opacity': `${SET_NAME}.pressed.state-layer.opacity`,
  'state-layer.color': `${SET_NAME}.pressed.state-layer.color`,
  'press.easing': motionEffects['expressive.fast-spatial'],
  'press.duration': motionEffects['expressive.fast-spatial.duration'],
  'ripple.color': CSSVariable.ref('state-layer.color'),
  'ripple.easing': motionEffects['expressive.default-spatial'],
  'ripple.duration': motionEffects['expressive.default-spatial.duration'],
  'ripple.opacity': CSSVariable.ref('state-layer.opacity'),
  'shadow.color': CSSVariable.ref('container.shadow-color'),
};

const specialUnselectedTokens = {
  'state-layer.color': `${SET_NAME}.unselected.pressed.state-layer.color`,
  'container.color.reverse': `${SET_NAME}.selected.container.color`,
  'label-text.color.reverse': `${SET_NAME}.label-text.selected.color`,
};

const specialSelectedTokens = {
  'state-layer.color': `${SET_NAME}.selected.pressed.state-layer.color`,
};

export function disabledTokenSelector(path: string): boolean {
  return path === 'disabled';
}

const renderer = createButtonScopedDeclarationRenderer();

const createPackage = (...groupSelectors: readonly GroupSelector[]) =>
  t
    .set(SET_NAME)
    .group(groupButtonTokens)
    .select(...groupSelectors)
    .allowTokens(BUTTON_ALLOWED_TOKENS)
    .adjustTokens(fixFullShape)
    .append({
      default: specialTokens,
      'unselected.default': specialUnselectedTokens,
      'selected.default': specialSelectedTokens,
    })
    .extend(createButtonExtensions())
    .renderDeclarations(renderer)
    .build();

export const defaultTokens: ReadonlySignal<TokenPackage> = computed(() =>
  createPackage(buttonMainTokenSelector, notDisabledTokenSelector),
);

export const defaultSwitchTokens: ReadonlySignal<TokenPackage> = computed(() =>
  createPackage(
    buttonSwitchTokenSelector,
    notDisabledTokenSelector,
    omitSelectedShape,
  ),
);

export const disabledTokens: ReadonlySignal<TokenPackage> = computed(() =>
  createPackage(disabledTokenSelector),
);

export const defaultEffectiveTokens: ReadonlySignal<
  Readonly<Record<string, Readonly<Record<string, TokenValue>>>>
> = computed(() => {
  const base = defaultTokens.value;

  return Object.fromEntries(
    BUTTON_STATES.map((state) => [state, base.effective(state) ?? {}]),
  );
});
