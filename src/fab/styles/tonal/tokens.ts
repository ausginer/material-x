import { computed, type ReadonlySignal } from '@preact/signals-core';
import type { TupleToUnion } from 'type-fest';
import { t, type TokenPackage } from '../../../.tproc/index.ts';
import { attribute } from '../../../.tproc/selector.ts';
import { createDefaultFirstSorter } from '../../../.tproc/utils.ts';
import { defaultColorTokens } from '../color/tokens.ts';
import { defaultTokens } from '../default/tokens.ts';
import {
  createFABExtensions,
  createFABScopedDeclarationRenderer,
  fabAllowedTokensSelector,
  groupFABTokens,
} from '../utils.ts';

const COLORS = ['primary', 'secondary', 'tertiary'] as const;
type Colors = TupleToUnion<typeof COLORS>;

const TONAL = attribute('tonal');

function isDefault(color: Colors) {
  return color === 'tertiary';
}

const createTonalPackage = (color: Colors) => {
  const setName = `md.comp.fab.${color}-container`;
  const specialTokens = {
    'state-layer.color': `${setName}.pressed.state-layer.color`,
  };
  const scope = isDefault(color) ? null : attribute('color', color);

  return t
    .set(setName)
    .group(groupFABTokens)
    .select(fabAllowedTokensSelector)
    .append('default', specialTokens)
    .extend(createFABExtensions(defaultTokens.value, defaultColorTokens.value))
    .renderDeclarations(createFABScopedDeclarationRenderer(scope, TONAL))
    .build();
};

export const tonalTokens: ReadonlyArray<ReadonlySignal<TokenPackage>> =
  COLORS.toSorted(createDefaultFirstSorter(isDefault)).map((color) =>
    computed(() => createTonalPackage(color)),
  );
