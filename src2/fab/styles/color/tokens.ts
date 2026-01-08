import { computed, type ReadonlySignal } from '@preact/signals-core';
import { t, type TokenPackage } from '../../../.tproc/index.ts';
import { attribute } from '../../../.tproc/selector.ts';
import { defaultEffectiveTokens } from '../default/tokens.ts';
import {
  createFabExtensions,
  createFABScopedDeclarationRenderer,
  fabAllowedTokensSelector,
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
    .group(groupFabTokens)
    .select(fabAllowedTokensSelector)
    .append({
      default: specialTokens,
    })
    .extend(createFabExtensions(defaultEffectiveTokens.value))
    .renderDeclarations(
      createFABScopedDeclarationRenderer(attribute('color', color)),
    )
    .build();
};

export const colorTokens: ReadonlyArray<ReadonlySignal<TokenPackage>> =
  COLORS.map((color) => computed(() => createPackage(color)));
