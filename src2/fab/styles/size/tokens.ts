import { computed, type ReadonlySignal } from '@preact/signals-core';
import { t, type TokenPackage } from '../../../.tproc/index.ts';
import { attribute } from '../../../.tproc/selector.ts';
import { defaultEffectiveTokens } from '../default/tokens.ts';
import {
  createFABScopedDeclarationRenderer,
  createFabExtensions,
  fabAllowedTokensSelector,
  groupFabTokens,
} from '../utils.ts';

const SIZES = ['large', 'medium'] as const;

const createPackage = (size: string) => {
  const setName = `md.comp.fab.${size}`;
  const specialTokens = {
    'state-layer.color': `${setName}.pressed.state-layer.color`,
  };

  return t
    .set(setName)
    .group(groupFabTokens)
    .select(fabAllowedTokensSelector)
    .append({
      default: specialTokens,
    })
    .extend(createFabExtensions(defaultEffectiveTokens.value))
    .renderDeclarations(
      createFABScopedDeclarationRenderer(attribute('size', size)),
    )
    .build();
};

export const sizeTokens: ReadonlyArray<ReadonlySignal<TokenPackage>> =
  SIZES.map((size) => computed(() => createPackage(size)));
