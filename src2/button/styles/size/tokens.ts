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

const SIZES = ['xsmall', 'small', 'medium', 'large', 'xlarge'] as const;

const omitSelectedShape = omitTokensInPaths(['container.shape'], (path) =>
  path.startsWith('selected.'),
);

const baseTokens = defaultEffectiveTokens;

const createPackage = (
  size: string,
  ...extraAdjusters: readonly RenderAdjuster[]
) =>
  t
    .set(`md.comp.button.${size}`)
    .scope('size', size)
    .group(groupButtonTokens)
    .allowTokens(BUTTON_ALLOWED_TOKENS)
    .adjustTokens(fixFullShape)
    .extend(createButtonExtensions(baseTokens.value))
    .adjustRender(
      dropSelectionDisabled,
      omitSelectedShape,
      createVariantStateAdjuster('size', size),
      ...extraAdjusters,
    )
    .build();

const mainTokens = SIZES.map((size) => computed(() => createPackage(size)));

const switchTokens = SIZES.map((size) =>
  computed(() =>
    createPackage(size, dropNonSelectionBlocks, replaceSelectionStateSelector),
  ),
);

export function renderSizeTokens(): string {
  return mainTokens.map((token) => token.value.render()).join('\n\n');
}

export function renderSizeSwitchTokens(): string {
  return switchTokens.map((token) => token.value.render()).join('\n\n');
}
