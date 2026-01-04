import { computed, type ReadonlySignal } from '@preact/signals-core';
import { t } from '../../../.tproc/index.ts';
import type {
  RenderAdjuster,
  TokenPackage,
} from '../../../.tproc/TokenPackage.ts';
import { defaultEffectiveTokens } from '../default/tokens.ts';
import {
  BUTTON_ALLOWED_TOKENS,
  createButtonExtensions,
  createVariantStateAdjuster,
  dropNonSelectionBlocks,
  dropSelectionDisabled,
  fixFullShape,
  groupButtonTokens,
  omitTokensInPaths,
  replaceSelectionStateSelector,
} from '../utils.ts';

const SET_NAME = 'md.comp.button.tonal';
const COLOR_ATTRIBUTE = 'color';
const COLOR_VALUE = 'tonal';

const specialTokens = {
  'state-layer.color': `${SET_NAME}.pressed.state-layer.color`,
  'state-layer.opacity': `${SET_NAME}.pressed.state-layer.opacity`,
};

const specialSelectedTokens = {
  'state-layer.color': `${SET_NAME}.selected.pressed.state-layer.color`,
};

const omitSelectedShape = omitTokensInPaths(['container.shape'], (path) =>
  path.startsWith('selected.'),
);

const sharedAdjusters = [
  dropSelectionDisabled,
  omitSelectedShape,
  createVariantStateAdjuster(COLOR_ATTRIBUTE, COLOR_VALUE),
] as const;

const createPackage = (...extraAdjusters: readonly RenderAdjuster[]) =>
  t
    .set(SET_NAME)
    .scope(COLOR_ATTRIBUTE, COLOR_VALUE)
    .group(groupButtonTokens)
    .allowTokens(BUTTON_ALLOWED_TOKENS)
    .adjustTokens(fixFullShape)
    .append({
      default: specialTokens,
      'selected.default': specialSelectedTokens,
    })
    .extend(createButtonExtensions(defaultEffectiveTokens.value))
    .adjustRender(...sharedAdjusters, ...extraAdjusters)
    .build();

export const tonalTokens: ReadonlySignal<TokenPackage> = computed(() =>
  createPackage(),
);

export const tonalSwitchTokens: ReadonlySignal<TokenPackage> = computed(() =>
  createPackage(dropNonSelectionBlocks, replaceSelectionStateSelector),
);
