import { computed, type ReadonlySignal } from '@preact/signals-core';
import { t } from '../../../.tproc/index.ts';
import type { TokenPackage } from '../../../.tproc/TokenPackage.ts';
import { fixFullShape } from '../../../button/styles/utils.ts';
import {
  BUTTON_GROUP_SIZES,
  CONNECTED_ALLOWED_TOKENS,
  CONNECTED_ALLOWED_TOKENS_WITH_SHAPE,
  createButtonGroupDeclarationRenderer,
  createHostAttributeAdjuster,
  dropNonDefaultBlocks,
  groupButtonGroupTokens,
} from '../utils.ts';

const SET_BASE_NAME = 'md.comp.button-group.connected';

const createPackage = (size: (typeof BUTTON_GROUP_SIZES)[number]) => {
  const isSmall = size === 'small';
  const allowedTokens = isSmall
    ? CONNECTED_ALLOWED_TOKENS_WITH_SHAPE
    : CONNECTED_ALLOWED_TOKENS;

  return t
    .set(`${SET_BASE_NAME}.${size}`)
    .group(groupButtonGroupTokens)
    .allowTokens(allowedTokens)
    .adjustTokens(fixFullShape)
    .renderDeclarations(
      createButtonGroupDeclarationRenderer(
        ...(!isSmall ? [createHostAttributeAdjuster('size', size)] : []),
        dropNonDefaultBlocks,
      ),
    )
    .build();
};

export const connectedTokens: ReadonlyArray<ReadonlySignal<TokenPackage>> =
  BUTTON_GROUP_SIZES.map((size) => computed(() => createPackage(size)));
