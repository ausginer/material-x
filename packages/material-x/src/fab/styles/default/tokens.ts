import { computed, type ReadonlySignal } from '@preact/signals-core';
import motionEffects from '@ydinjs/tproc/default/motion-effects.js';
import { t, type TokenPackage } from '@ydinjs/tproc/index.js';
import * as CSSVariable from '@ydinjs/tproc/variable.js';
import {
  createFABExtensions,
  createFABScopedDeclarationRenderer,
  fabAllowedTokensSelector,
  groupFABTokens,
} from '../utils.ts';

const SET_NAME_GENERAL = 'md.comp.fab';

const specialTokens = {
  'ripple.color': CSSVariable.ref('state-layer.color'),
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
