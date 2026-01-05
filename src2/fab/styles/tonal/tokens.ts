import { computed, type ReadonlySignal } from '@preact/signals-core';
import { t, type TokenPackage } from '../../../.tproc/index.ts';
import { attribute } from '../../../.tproc/selector.ts';
import { defaultEffectiveTokens } from '../default/tokens.ts';
import {
  FAB_ALLOWED_TOKENS,
  createFabExtensions,
  createHostAttributeAdjuster,
  groupFabTokens,
} from '../utils.ts';

const COLORS = ['primary', 'secondary', 'tertiary'] as const;
const tonalAttribute = attribute('tonal');

const createPackage = (color: string) => {
  const setName = `md.comp.fab.${color}-container`;
  const specialTokens = {
    'state-layer.color': `${setName}.pressed.state-layer.color`,
  };

  let builder = t
    .set(setName)
    .group(groupFabTokens)
    .allowTokens(FAB_ALLOWED_TOKENS)
    .append({
      default: specialTokens,
    })
    .extend(createFabExtensions(defaultEffectiveTokens.value))
    .adjustRender(createHostAttributeAdjuster(tonalAttribute));

  if (color !== 'tertiary') {
    builder = builder.scope('color', color);
  }

  return builder.build();
};

export const tonalTokens: ReadonlyArray<ReadonlySignal<TokenPackage>> =
  COLORS.map((color) => computed(() => createPackage(color)));
