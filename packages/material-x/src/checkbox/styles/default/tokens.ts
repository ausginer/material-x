import { computed, type ReadonlySignal } from '@preact/signals-core';
import motionEffects from '../../../.tproc/default/motion-effects.ts';
import { t } from '../../../.tproc/index.ts';
import type { TokenPackage } from '../../../.tproc/TokenPackage.ts';
import * as CSSVariable from '../../../.tproc/variable.ts';
import { createFullShapeFix } from '../../../core/styles/utils.ts';
import {
  allowedTokensSelector,
  createExtensions,
  createScopedDeclarationRenderer,
  groupTokens,
} from '../utils.ts';

const SET_NAME = 'md.comp.checkbox';

const renderer = createScopedDeclarationRenderer();

const fixFullShape = createFullShapeFix(
  CSSVariable.ref('shape.full'),
  (entry) => entry.includes('state-layer.shape'),
);

const specialTokens = {
  // Token spec sets icon size to 18px (matching container.size), but Figma
  // uses 24px for the `check_small` and `check_indeterminate_small` Material
  // Symbols, which visually overflow the container to match M3 proportions. The
  // token value is overridden here to match the Figma intent.
  'icon.size': '24px',
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
};

export const defaultTokens: ReadonlySignal<TokenPackage> = computed(() =>
  t
    .set(SET_NAME)
    .group(groupTokens)
    .select(allowedTokensSelector)
    .append('default', specialTokens)
    .adjustTokens(fixFullShape)
    .extend(createExtensions())
    .renderDeclarations(renderer)
    .build(),
);
