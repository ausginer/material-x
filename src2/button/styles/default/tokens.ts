import { computed, type ReadonlySignal } from '@preact/signals-core';
import type { TupleToUnion } from 'type-fest';
import motionEffects from '../../../.tproc/default/motion-effects.ts';
import { t } from '../../../.tproc/index.ts';
import type { TokenPackage } from '../../../.tproc/TokenPackage.ts';
import type { GroupSelector, TokenSet } from '../../../.tproc/utils.ts';
import * as CSSVariable from '../../../.tproc/variable.ts';
import {
  BUTTON_STATES,
  buttonAllowedTokensSelector,
  buttonMainTokenSelector,
  buttonSwitchTokenSelector,
  createButtonExtensions,
  createButtonScopedDeclarationRenderer,
  fixFullShape,
  groupButtonTokens,
  notDisabledTokenSelector,
  omitSelectedShape,
} from '../utils.ts';

const GENERAL_SET_NAME = 'md.comp.button';
const FILLED_SET_NAME = 'md.comp.button.filled';

const SETS = [GENERAL_SET_NAME, FILLED_SET_NAME] as const;
type Sets = TupleToUnion<typeof SETS>;

const specialTokens = {
  'state-layer.opacity': `${GENERAL_SET_NAME}.pressed.state-layer.opacity`,
  'state-layer.color': `${GENERAL_SET_NAME}.pressed.state-layer.color`,
  'press.easing': motionEffects['expressive.fast-spatial'],
  'press.duration': motionEffects['expressive.fast-spatial.duration'],
  'ripple.color': CSSVariable.ref('state-layer.color'),
  'ripple.easing': motionEffects['expressive.default-spatial'],
  'ripple.duration': motionEffects['expressive.default-spatial.duration'],
  'ripple.opacity': CSSVariable.ref('state-layer.opacity'),
  'shadow.color': CSSVariable.ref('container.shadow-color'),
};

const specialUnselectedTokens = {
  'state-layer.color': `${GENERAL_SET_NAME}.unselected.pressed.state-layer.color`,
  'container.color.reverse': `${GENERAL_SET_NAME}.selected.container.color`,
  'label-text.color.reverse': `${GENERAL_SET_NAME}.label-text.selected.color`,
};

const specialSelectedTokens = {
  'state-layer.color': `${GENERAL_SET_NAME}.selected.pressed.state-layer.color`,
};

export function disabledTokenSelector(path: string): boolean {
  return path === 'disabled';
}

const renderer = createButtonScopedDeclarationRenderer();

const createPackage = (
  set: Sets,
  ...groupSelectors: readonly GroupSelector[]
) =>
  t
    .set(set)
    .group(groupButtonTokens)
    .select(...groupSelectors, buttonAllowedTokensSelector)
    .adjustTokens(fixFullShape)
    .append('default', specialTokens)
    .append('unselected.default', specialUnselectedTokens)
    .append('selected.default', specialSelectedTokens)
    .extend(createButtonExtensions())
    .renderDeclarations(renderer)
    .build();

export const defaultTokens: ReadonlyArray<ReadonlySignal<TokenPackage>> =
  SETS.map((set) =>
    computed(() =>
      createPackage(set, buttonMainTokenSelector, notDisabledTokenSelector),
    ),
  );

export const defaultSwitchTokens: ReadonlyArray<ReadonlySignal<TokenPackage>> =
  SETS.map((set) =>
    computed(() =>
      createPackage(
        set,
        buttonSwitchTokenSelector,
        notDisabledTokenSelector,
        omitSelectedShape,
      ),
    ),
  );

export const disabledTokens: ReadonlySignal<TokenPackage> = computed(() =>
  createPackage(GENERAL_SET_NAME, disabledTokenSelector),
);

export const defaultEffectiveTokens: ReadonlySignal<
  Readonly<Record<string, readonly TokenSet[]>>
> = computed(() => {
  const base = defaultTokens.map((s) => s.value);

  return Object.fromEntries(
    BUTTON_STATES.map((state) => [
      state,
      base.map((pack) => pack.effective(state) ?? {}),
    ]),
  );
});
