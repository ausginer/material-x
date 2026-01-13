import { computed, type ReadonlySignal } from '@preact/signals-core';
import motionEffects from '../../../.tproc/default/motion-effects.ts';
import { t, type TokenPackage } from '../../../.tproc/index.ts';
import * as CSSVariable from '../../../.tproc/variable.ts';
import {
  createFABExtensions,
  createFABScopedDeclarationRenderer,
  fabAllowedTokensSelector,
  groupFABTokens,
} from '../utils.ts';

const SET_NAME_GENERAL = 'md.comp.fab';

const specialTokens = {
  'ripple.color': CSSVariable.ref('state-layer.color'),
  'ripple.easing': motionEffects['expressive.default-spatial'],
  'ripple.duration': motionEffects['expressive.default-spatial.duration'],
  'ripple.opacity': CSSVariable.ref('state-layer.opacity'),
  'unfold.duration': motionEffects['expressive.fast-spatial.duration'],
  'unfold.easing': motionEffects['expressive.fast-spatial'],
  'shadow.color': CSSVariable.ref('container.shadow-color'),
};

const renderer = createFABScopedDeclarationRenderer();

export const defaultTokens: ReadonlySignal<TokenPackage> = computed(() =>
  t
    .set(SET_NAME_GENERAL)
    .group(groupFABTokens)
    .select(fabAllowedTokensSelector)
    .renderDeclarations(renderer)
    .append('default', specialTokens)
    .extend(createFABExtensions())
    .build(),
);
