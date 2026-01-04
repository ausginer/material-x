import { computed, type ReadonlySignal } from '@preact/signals-core';
import { t } from '../../../.tproc/index.ts';
import type {
  RenderAdjuster,
  TokenPackage,
} from '../../../.tproc/TokenPackage.ts';
import { CSSVariable } from '../../../.tproc/variable.ts';
import { defaultEffectiveTokens } from '../default/tokens.ts';
import {
  BUTTON_ALLOWED_TOKENS,
  createButtonExtensions,
  createVariantStateAdjuster,
  dropNonSelectionBlocks,
  dropSelectionDisabled,
  fixFullShape,
  omitTokens,
  replaceSelectionStateSelector,
} from '../utils.ts';
import { groupButtonTokens } from '../utils.ts';

const SET_NAME = 'md.comp.button.elevated';
const COLOR_ATTRIBUTE = 'color';
const COLOR_VALUE = 'elevated';

const specialTokens = {
  level: CSSVariable.ref('container-elevation'),
  'state-layer.color': `${SET_NAME}.pressed.state-layer.color`,
};

const specialSelectedTokens = {
  'state-layer.color': `${SET_NAME}.selected.pressed.state-layer.color`,
};

const omitSelectedShape = omitTokens(['container.shape'], (path) =>
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

export const elevatedTokens: ReadonlySignal<TokenPackage> = computed(() =>
  createPackage(),
);

export const elevatedSwitchTokens: ReadonlySignal<TokenPackage> = computed(() =>
  createPackage(dropNonSelectionBlocks, replaceSelectionStateSelector),
);
