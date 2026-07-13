import { computed, type ReadonlySignal } from '@preact/signals-core';
import motionEffects from '@ydinjs/tproc/default/motion-effects.js';
import { t, type TokenPackage } from '@ydinjs/tproc/index.js';
import type { ResolveAdjuster } from '@ydinjs/tproc/resolve.js';
import * as CSSVariable from '@ydinjs/tproc/variable.js';
import { createFullShapeFix } from '../../../core/styles/utils.ts';
import {
  createListItemDeclarationRenderer,
  groupListItemTokens,
  listItemAllowedTokensSelector,
} from '../utils.ts';

const SET_NAME = 'md.comp.list';

const SPECIAL_TOKENS = {
  'state-layer.color': `${SET_NAME}.pressed.state-layer.color`,
  'state-layer.opacity': `${SET_NAME}.pressed.state-layer.opacity`,
  'press.duration': motionEffects['expressive.fast-spatial.duration'],
  'press.easing': motionEffects['expressive.fast-spatial'],
  'ripple.color': CSSVariable.ref('state-layer.color'),
  'ripple.opacity': CSSVariable.ref('state-layer.opacity'),
};

const SPECIAL_DISABLED_TOKENS = {
  opacity: `${SET_NAME}.list-item.disabled.label-text.opacity`,
};

const fixFullShape: ResolveAdjuster = createFullShapeFix(
  CSSVariable.ref('shape.full'),
  (entry) => entry.includes('shape'),
);

const itemRenderer = createListItemDeclarationRenderer();

export const listItemTokens: ReadonlySignal<TokenPackage> = computed(() =>
  t
    .set(SET_NAME)
    .group(groupListItemTokens)
    .select(listItemAllowedTokensSelector)
    .adjustTokens(fixFullShape)
    .renderDeclarations(itemRenderer)
    .append('default', SPECIAL_TOKENS)
    .append('disabled', SPECIAL_DISABLED_TOKENS)
    .build(),
);
