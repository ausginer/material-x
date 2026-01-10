import { computed, type ReadonlySignal } from '@preact/signals-core';
import { t, type TokenPackage } from '../../../.tproc/index.ts';
import { attribute } from '../../../.tproc/selector.ts';
import { defaultEffectiveTokens } from '../default/tokens.ts';
import {
  createFABExtensions,
  createFABScopedDeclarationRenderer,
  fabAllowedTokensSelector,
  groupFABTokens,
} from '../utils.ts';

const COLORS = ['primary', 'secondary', 'tertiary'] as const;
const DEFAULT = 'tertiary';
const TONAL = attribute('tonal');

const createPackage = (color: string) => {
  const setName = `md.comp.fab.${color}-container`;
  const specialTokens = {
    'state-layer.color': `${setName}.pressed.state-layer.color`,
  };
  const scope = color === DEFAULT ? null : attribute('color', color);

  return t
    .set(setName)
    .group(groupFABTokens)
    .select(fabAllowedTokensSelector)
    .append('default', specialTokens)
    .extend(createFABExtensions(defaultEffectiveTokens.value))
    .renderDeclarations(createFABScopedDeclarationRenderer(scope, TONAL))
    .build();
};

export const tonalTokens: ReadonlyArray<ReadonlySignal<TokenPackage>> =
  COLORS.map((color) => computed(() => createPackage(color)));
