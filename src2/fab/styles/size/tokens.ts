import { computed, type ReadonlySignal } from '@preact/signals-core';
import { t, type TokenPackage } from '../../../.tproc/index.ts';
import { attribute } from '../../../.tproc/selector.ts';
import { defaultColorTokens } from '../color/tokens.ts';
import { defaultTokens } from '../default/tokens.ts';
import {
  createFABExtensions,
  createFABScopedDeclarationRenderer,
  fabAllowedTokensSelector,
  groupFABTokens,
} from '../utils.ts';

const SIZES = ['large', 'medium'] as const;

const createSizePackage = (size: string) => {
  const setName = `md.comp.fab.${size}`;
  const specialTokens = {
    'state-layer.color': `${setName}.pressed.state-layer.color`,
  };

  return t
    .set(setName)
    .group(groupFABTokens)
    .select(fabAllowedTokensSelector)
    .append('default', specialTokens)
    .extend(createFABExtensions(defaultTokens.value, defaultColorTokens.value))
    .renderDeclarations(
      createFABScopedDeclarationRenderer(attribute('size', size)),
    )
    .build();
};

export const sizeTokens: ReadonlyArray<ReadonlySignal<TokenPackage>> =
  SIZES.map((size) => computed(() => createSizePackage(size)));
