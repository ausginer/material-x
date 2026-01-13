import { computed, type ReadonlySignal } from '@preact/signals-core';
import { t, type TokenPackage } from '../../../.tproc/index.ts';
import { attribute } from '../../../.tproc/selector.ts';
import type { ProcessorAdjuster } from '../../../.tproc/utils.ts';
import { createDefaultFirstSorter } from '../../../.tproc/utils.ts';
import * as CSSVariable from '../../../.tproc/variable.ts';
import { defaultColorTokens } from '../color/tokens.ts';
import { defaultTokens } from '../default/tokens.ts';
import {
  createFABExtensions,
  createFABScopedDeclarationRenderer,
  fabAllowedTokensSelector,
  groupFABTokens,
} from '../utils.ts';

const COLORS = ['primary', 'secondary', 'tertiary'] as const;

const TONAL_COLORS = [
  'primary-container',
  'secondary-container',
  'tertiary-container',
] as const;

const SIZES = ['large', 'medium', 'small'] as const;

const VARIANTS = [...COLORS, ...TONAL_COLORS, ...SIZES] as const;
type Variant = (typeof VARIANTS)[number];

const DEFAULTS = ['tertiary', 'tertiary-container', 'small'] as const;

const EXTENDED = attribute('extended');
const TONAL = attribute('tonal');

function isDefaultVariant(v: Variant) {
  return DEFAULTS.includes(v);
}

function getScope(variant: Variant) {
  if (DEFAULTS.includes(variant)) {
    return null;
  }

  if (COLORS.includes(variant)) {
    return attribute('color', variant);
  }

  if (TONAL_COLORS.includes(variant)) {
    return attribute(
      'color',
      variant.substring(0, variant.length - '-container'.length),
    );
  }

  if (SIZES.includes(variant)) {
    return attribute('size', variant);
  }

  return null;
}

function createSetName(variant: Variant) {
  return `md.comp.extended-fab.${variant}`;
}

const createPackage = (
  variant: Variant,
  adjuster: ProcessorAdjuster = (processor) => processor,
) => {
  const setName = createSetName(variant);

  return adjuster(
    t
      .set(setName)
      .group(groupFABTokens)
      .select(fabAllowedTokensSelector)
      .extend(
        createFABExtensions(defaultTokens.value, defaultColorTokens.value),
      )
      .renderDeclarations(
        createFABScopedDeclarationRenderer(
          getScope(variant),
          EXTENDED,
          TONAL_COLORS.includes(variant) ? TONAL : null,
        ),
      ),
  ).build();
};

export const extendedTokens: ReadonlyArray<ReadonlySignal<TokenPackage>> =
  VARIANTS.toSorted(createDefaultFirstSorter(isDefaultVariant)).map((variant) =>
    computed(() =>
      createPackage(
        variant,
        variant === 'tertiary'
          ? (processor) =>
              processor.append('default', {
                'state-layer.color': `${createSetName(variant)}.pressed.state-layer.color`,
                direction: 'row',
                'container.width': CSSVariable.ref('container.height'),
              })
          : undefined,
      ),
    ),
  );
