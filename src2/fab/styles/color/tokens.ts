import { computed, type ReadonlySignal } from '@preact/signals-core';
import { t, type TokenPackage } from '../../../.tproc/index.ts';
import { defaultEffectiveTokens } from '../default/tokens.ts';
import {
  FAB_ALLOWED_TOKENS,
  createFabExtensions,
  groupFabTokens,
} from '../utils.ts';

const COLORS = ['primary', 'secondary'] as const;

const createPackage = (color: string) => {
  const setName = `md.comp.fab.${color}`;
  const specialTokens = {
    'state-layer.color': `${setName}.pressed.state-layer.color`,
  };

  return t
    .set(setName)
    .scope('color', color)
    .group(groupFabTokens)
    .allowTokens(FAB_ALLOWED_TOKENS)
    .append({
      default: specialTokens,
    })
    .extend(createFabExtensions(defaultEffectiveTokens.value))
    .build();
};

export const colorTokens: ReadonlyArray<ReadonlySignal<TokenPackage>> =
  COLORS.map((color) => computed(() => createPackage(color)));
