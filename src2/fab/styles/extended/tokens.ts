import { computed, type ReadonlySignal } from '@preact/signals-core';
import { t, type TokenPackage } from '../../../.tproc/index.ts';
import { attribute } from '../../../.tproc/selector.ts';
import * as CSSVariable from '../../../.tproc/variable.ts';
import { defaultEffectiveTokens } from '../default/tokens.ts';
import {
  createFabExtensions,
  createFABScopedDeclarationRenderer,
  fabAllowedTokensSelector,
  groupFabTokens,
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

function variantsSortComparator(a: string, b: string) {
  if (DEFAULTS.includes(a)) {
    return -1;
  }

  if (DEFAULTS.includes(b)) {
    return 1;
  }

  return 0;
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

const createPackage = (variant: Variant) => {
  const setName = `md.comp.extended-fab.${variant}`;

  let builder = t
    .set(setName)
    .group(groupFabTokens)
    .select(fabAllowedTokensSelector)
    .extend(createFabExtensions(defaultEffectiveTokens.value))
    .renderDeclarations(
      createFABScopedDeclarationRenderer(
        getScope(variant),
        EXTENDED,
        TONAL_COLORS.includes(variant) ? TONAL : null,
      ),
    );

  if (variant === 'tertiary') {
    builder = builder.append({
      default: {
        'state-layer.color': `${setName}.pressed.state-layer.color`,
        direction: 'row',
        'container.width': CSSVariable.ref('container.height'),
      },
    });
  }

  return builder.build();
};

export const extendedTokens: ReadonlyArray<ReadonlySignal<TokenPackage>> =
  VARIANTS.toSorted(variantsSortComparator).map((variant) =>
    computed(() => createPackage(variant)),
  );
