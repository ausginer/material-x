import { computed, type ReadonlySignal } from '@preact/signals-core';
import { t, type TokenPackage } from '../../../.tproc/index.ts';
import { defaultEffectiveTokens } from '../default/tokens.ts';
import {
  FAB_ALLOWED_TOKENS,
  createFabExtensions,
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
    .scope('size', size)
    .group(groupFabTokens)
    .allowTokens(FAB_ALLOWED_TOKENS)
    .append({
      default: specialTokens,
    })
    .extend(createFabExtensions(defaultEffectiveTokens.value))
    .build();
};

export const sizeTokens: ReadonlyArray<ReadonlySignal<TokenPackage>> =
  SIZES.map((size) => computed(() => createPackage(size)));
