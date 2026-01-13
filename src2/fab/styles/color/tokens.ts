import { computed, type ReadonlySignal } from '@preact/signals-core';
import type { TupleToUnion } from 'type-fest';
import { t, type TokenPackage } from '../../../.tproc/index.ts';
import { attribute } from '../../../.tproc/selector.ts';
import type { ProcessorAdjuster } from '../../../.tproc/utils.ts';
import { defaultTokens } from '../default/tokens.ts';
import {
  createFABExtensions,
  createFABScopedDeclarationRenderer,
  fabAllowedTokensSelector,
  groupFABTokens,
} from '../utils.ts';

const COLORS = ['primary', 'secondary', 'tertiary'] as const;
type Colors = TupleToUnion<typeof COLORS>;

function createSetName(color: Colors) {
  return `md.comp.fab.${color}`;
}

function createPackage(color: Colors, adjuster: ProcessorAdjuster) {
  const setName = createSetName(color);
  const specialTokens = {
    'state-layer.color': `${setName}.pressed.state-layer.color`,
  };

  return adjuster(
    t
      .set(setName)
      .group(groupFABTokens)
      .select(fabAllowedTokensSelector)
      .append('default', specialTokens),
  ).build();
}

export const defaultColorTokens: ReadonlySignal<TokenPackage> = computed(() => {
  const color = 'tertiary';
  const setName = createSetName(color);

  return createPackage('tertiary', (processor) =>
    processor
      .append('default', {
        gap: `${setName}.icon-label.space`,
        'elevation.default': `${setName}.container.elevation`,
        'elevation.hovered': `${setName}.hovered.container.elevation`,
        'state-layer.color': `${setName}.pressed.state-layer.color`,
        'state-layer.opacity': `${setName}.pressed.state-layer.opacity`,
      })
      .renderDeclarations(createFABScopedDeclarationRenderer())
      .extend(createFABExtensions(defaultTokens.value)),
  );
});

export const colorTokens: ReadonlyArray<ReadonlySignal<TokenPackage>> =
  COLORS.filter((color) => color !== 'tertiary').map((color) =>
    computed(() =>
      createPackage(color, (processor) =>
        processor
          .renderDeclarations(
            createFABScopedDeclarationRenderer(attribute('color', color)),
          )
          .extend(
            createFABExtensions(defaultTokens.value, defaultColorTokens.value),
          ),
      ),
    ),
  );
