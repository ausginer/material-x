import { computed, type ReadonlySignal } from '@preact/signals-core';
import motionEffects from '../../../.tproc/default/motion-effects.ts';
import { t } from '../../../.tproc/index.ts';
import type { TokenPackage } from '../../../.tproc/TokenPackage.ts';
import * as CSSVariable from '../../../.tproc/variable.ts';
import {
  allowedTokensSelector,
  createExtensions,
  createScopedDeclarationRenderer,
  groupTokens,
} from '../utils.ts';

const SET_NAME = 'md.comp.radio-button';

const renderer = createScopedDeclarationRenderer();

const specialTokens = {
  'state-layer.color': `${SET_NAME}.selected.pressed.state-layer.color`,
  'state-layer.opacity': `${SET_NAME}.selected.pressed.state-layer.opacity`,
  'ripple.color': CSSVariable.ref('state-layer.color'),
  'ripple.opacity': CSSVariable.ref('state-layer.opacity'),
  'check.easing': motionEffects['expressive.default-effects'],
  'check.duration': motionEffects['expressive.default-effects.duration'],
};

export const defaultTokens: ReadonlySignal<TokenPackage> = computed(() =>
  t
    .set(SET_NAME)
    .group(groupTokens)
    .select(allowedTokensSelector)
    .append('default', specialTokens)
    .extend(createExtensions())
    .renderDeclarations(renderer)
    .build(),
);
