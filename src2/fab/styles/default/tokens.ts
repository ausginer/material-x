import { computed, type ReadonlySignal } from '@preact/signals-core';
import motionEffects from '../../../.tproc/default/motion-effects.ts';
import { t, type TokenPackage } from '../../../.tproc/index.ts';
import type { TokenSet, TokenValue } from '../../../.tproc/utils.ts';
import * as CSSVariable from '../../../.tproc/variable.ts';
import {
  FAB_STATES,
  createFABExtensions,
  createFABScopedDeclarationRenderer,
  fabAllowedTokensSelector,
  groupFABTokens,
} from '../utils.ts';

const SET_NAME_GENERAL = 'md.comp.fab';
const SET_NAME_TERTIARY = 'md.comp.fab.tertiary';

const specialTokens = {
  gap: `${SET_NAME_TERTIARY}.icon-label.space`,
  'elevation.default': `${SET_NAME_TERTIARY}.container.elevation`,
  'elevation.hovered': `${SET_NAME_TERTIARY}.hovered.container.elevation`,
  'state-layer.color': `${SET_NAME_TERTIARY}.pressed.state-layer.color`,
  'state-layer.opacity': `${SET_NAME_TERTIARY}.pressed.state-layer.opacity`,
  'ripple.color': CSSVariable.ref('state-layer.color'),
  'ripple.easing': motionEffects['expressive.default-spatial'],
  'ripple.duration': motionEffects['expressive.default-spatial.duration'],
  'ripple.opacity': CSSVariable.ref('state-layer.opacity'),
  'unfold.duration': motionEffects['expressive.fast-spatial.duration'],
  'unfold.easing': motionEffects['expressive.fast-spatial'],
  'shadow.color': CSSVariable.ref('container.shadow-color'),
};

const renderer = createFABScopedDeclarationRenderer();

export const defaultGeneralTokens: ReadonlySignal<TokenPackage> = computed(() =>
  t
    .set(SET_NAME_GENERAL)
    .group(groupFABTokens)
    .select(fabAllowedTokensSelector)
    .append('default', specialTokens)
    .extend(createFABExtensions())
    .renderDeclarations(renderer)
    .build(),
);

export const defaultTertiaryTokens: ReadonlySignal<TokenPackage> = computed(
  () =>
    t
      .set(SET_NAME_TERTIARY)
      .group(groupFABTokens)
      .select(fabAllowedTokensSelector)
      .extend(createFABExtensions())
      .renderDeclarations(renderer)
      .build(),
);

console.log({ tertiary: defaultTertiaryTokens.value.render() });

export const defaultEffectiveTokens: ReadonlySignal<
  Readonly<Record<string, Readonly<Record<string, TokenValue>>>>
> = computed<Readonly<Record<string, TokenSet>>>(() => {
  const general = defaultGeneralTokens.value;
  const tertiary = defaultTertiaryTokens.value;

  return Object.fromEntries(
    FAB_STATES.map((state) => [
      state,
      {
        ...general.effective(state),
        ...tertiary.effective(state),
      },
    ]),
  );
});
