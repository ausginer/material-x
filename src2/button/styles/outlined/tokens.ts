import { computed } from '@preact/signals-core';
import { t } from '../../../.tproc/index.ts';
import type { RenderAdjuster } from '../../../.tproc/TokenPackage.ts';
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

const SET_NAME = 'md.comp.button.outlined';
const COLOR_ATTRIBUTE = 'color';
const COLOR_VALUE = 'outlined';

const specialTokens = {
  'container.color': 'transparent',
  'outline.width': '1px',
  'state-layer.color': `${SET_NAME}.pressed.state-layer.color`,
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

export const outlinedTokens = computed(() => createPackage());

export const outlinedSwitchTokens = computed(() =>
  createPackage(dropNonSelectionBlocks, replaceSelectionStateSelector),
);
