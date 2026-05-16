import { computed, type ReadonlySignal } from '@preact/signals-core';
import motionEffects from '../../../.tproc/default/motion-effects.ts';
import { t, type TokenPackage } from '../../../.tproc/index.ts';
import type { ResolveAdjuster } from '../../../.tproc/resolve.ts';
import * as CSSVariable from '../../../.tproc/variable.ts';
import { createFullShapeFix } from '../../../core/styles/utils.ts';
import {
  createListItemDeclarationRenderer,
  groupListItemTokens,
  groupListTokens,
  listAllowedTokensSelector,
  listItemAllowedTokensSelector,
  listItemBaseTokenSelector,
  listItemInteractiveTokenSelector,
} from '../utils.ts';

const SET_NAME = 'md.comp.list';

const SPECIAL_INTERACTIVE_TOKENS = {
  'state-layer.color': `${SET_NAME}.pressed.state-layer.color`,
  'state-layer.opacity': `${SET_NAME}.pressed.state-layer.opacity`,
  'press.duration': motionEffects['expressive.fast-spatial.duration'],
  'press.easing': motionEffects['expressive.fast-spatial'],
  'ripple.color': CSSVariable.ref('state-layer.color'),
  'ripple.opacity': CSSVariable.ref('state-layer.opacity'),
};

const SPECIAL_DISABLED_INTERACTIVE_TOKENS = {
  opacity: `${SET_NAME}.list-item.disabled.label-text.opacity`,
};

const fixFullShape: ResolveAdjuster = createFullShapeFix(
  CSSVariable.ref('shape.full'),
  (entry) => entry.includes('shape'),
);

const itemRenderer = createListItemDeclarationRenderer();

function createListItemPackage() {
  return t
    .set(SET_NAME)
    .group(groupListItemTokens)
    .select(listItemAllowedTokensSelector)
    .adjustTokens(fixFullShape)
    .renderDeclarations(itemRenderer);
}

export const listTokens: ReadonlySignal<TokenPackage> = computed(() =>
  t
    .set(SET_NAME)
    .group(groupListTokens)
    .select(listAllowedTokensSelector)
    .adjustTokens(fixFullShape)
    .build(),
);

export const listItemBaseTokens: ReadonlySignal<TokenPackage> = computed(() =>
  createListItemPackage().select(listItemBaseTokenSelector).build(),
);

export const listItemInteractiveTokens: ReadonlySignal<TokenPackage> = computed(
  () =>
    createListItemPackage()
      .select(listItemInteractiveTokenSelector)
      .append('default', SPECIAL_INTERACTIVE_TOKENS)
      .append('disabled', SPECIAL_DISABLED_INTERACTIVE_TOKENS)
      .build(),
);
