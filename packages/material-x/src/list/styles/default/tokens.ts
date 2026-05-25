import { computed, type ReadonlySignal } from '@preact/signals-core';
import motionEffects from '../../../.tproc/default/motion-effects.ts';
import { t, type TokenPackage } from '../../../.tproc/index.ts';
import type { ResolveAdjuster } from '../../../.tproc/resolve.ts';
import * as CSSVariable from '../../../.tproc/variable.ts';
import { createFullShapeFix } from '../../../core/styles/utils.ts';
import { groupListTokens, listAllowedTokensSelector } from '../utils.ts';

const SET_NAME = 'md.comp.list';

const SPECIAL_TOKENS = {
  'drag.duration': motionEffects['expressive.slow-spatial.duration'],
  'drag.easing': motionEffects['expressive.slow-spatial'],
  'footprint.color': `${SET_NAME}.list-item.dragged.state-layer.color`,
  'footprint.opacity': `${SET_NAME}.list-item.dragged.state-layer.opacity`,
};

const fixFullShape: ResolveAdjuster = createFullShapeFix(
  CSSVariable.ref('shape.full'),
  (entry) => entry.includes('shape'),
);

export const listTokens: ReadonlySignal<TokenPackage> = computed(() =>
  t
    .set(SET_NAME)
    .group(groupListTokens)
    .select(listAllowedTokensSelector)
    .adjustTokens(fixFullShape)
    .append('default', SPECIAL_TOKENS)
    .build(),
);
