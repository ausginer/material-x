import { computed, type ReadonlySignal } from '@preact/signals-core';
import motionEffects from '../../../.tproc/default/motion-effects.ts';
import { t } from '../../../.tproc/index.ts';
import type { TokenPackage } from '../../../.tproc/TokenPackage.ts';
import * as CSSVariable from '../../../.tproc/variable.ts';
import { createFullShapeFix } from '../../../core/styles/utils.ts';
import {
  checkboxAllowedTokensSelector,
  createCheckboxExtensions,
  createCheckboxScopedDeclarationRenderer,
  groupCheckboxTokens,
} from '../utils.ts';

const SET_NAME = 'md.comp.checkbox';

const renderer = createCheckboxScopedDeclarationRenderer();

const fixFullShape = createFullShapeFix(
  CSSVariable.ref('shape.full'),
  (entry) => entry.includes('state-layer.shape'),
);

const specialTokens = {
  'outline.width': `${SET_NAME}.unselected.outline.width`,
  'outline.color': `${SET_NAME}.unselected.outline.color`,
  'state-layer.color': `${SET_NAME}.unselected.pressed.state-layer.color`,
  'state-layer.opacity': `${SET_NAME}.unselected.pressed.state-layer.opacity`,
  'ripple.color': CSSVariable.ref('state-layer.color'),
  'ripple.opacity': CSSVariable.ref('state-layer.opacity'),
  'icon.color': `${SET_NAME}.selected.pressed.icon.color`,
  'icon.opacity': `${SET_NAME}.selected.pressed.icon.opacity`,
  'check.easing': motionEffects['expressive.default-effects'],
  'check.duration': motionEffects['expressive.default-effects.duration'],
  'ripple.easing': motionEffects['expressive.default-spatial'],
  'ripple.duration': motionEffects['expressive.default-spatial.duration'],
};

export const defaultTokens: ReadonlySignal<TokenPackage> = computed(() =>
  t
    .set(SET_NAME)
    .group(groupCheckboxTokens)
    .select(checkboxAllowedTokensSelector)
    .append('default', specialTokens)
    .adjustTokens(fixFullShape)
    .extend(createCheckboxExtensions())
    .renderDeclarations(renderer)
    .build(),
);
