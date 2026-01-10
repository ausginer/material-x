import { computed, type ReadonlySignal } from '@preact/signals-core';
import type { TupleToUnion } from 'type-fest';
import { t } from '../../../.tproc/index.ts';
import { attribute } from '../../../.tproc/selector.ts';
import type { TokenPackage } from '../../../.tproc/TokenPackage.ts';
import { fixFullShape } from '../../../button/styles/utils.ts';
import {
  BUTTON_GROUP_SIZES,
  buttonGroupDefaultSelector,
  createButtonGroupDeclarationRenderer,
  connectedAllowedTokensSelector,
  connectedAllowedTokensWithShapeSelector,
  groupButtonGroupTokens,
} from '../utils.ts';

const SET_BASE_NAME = 'md.comp.button-group.connected';

const createPackage = (size: TupleToUnion<typeof BUTTON_GROUP_SIZES>) => {
  const isSmall = size === 'small';
  const allowedTokensSelector = isSmall
    ? connectedAllowedTokensWithShapeSelector
    : connectedAllowedTokensSelector;

  return t
    .set(`${SET_BASE_NAME}.${size}`)
    .group(groupButtonGroupTokens)
    .select(allowedTokensSelector, buttonGroupDefaultSelector)
    .adjustTokens(fixFullShape)
    .renderDeclarations(
      createButtonGroupDeclarationRenderer({
        scope: isSmall ? null : attribute('size', size),
        onlyDefault: true,
      }),
    )
    .build();
};

export const connectedTokens: ReadonlyArray<ReadonlySignal<TokenPackage>> =
  BUTTON_GROUP_SIZES.map((size) => computed(() => createPackage(size)));
