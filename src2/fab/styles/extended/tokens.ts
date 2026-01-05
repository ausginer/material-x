import { computed, type ReadonlySignal } from '@preact/signals-core';
import { t, type TokenPackage } from '../../../.tproc/index.ts';
import { attribute, type Param } from '../../../.tproc/selector.ts';
import { CSSVariable } from '../../../.tproc/variable.ts';
import { defaultEffectiveTokens } from '../default/tokens.ts';
import {
  FAB_ALLOWED_TOKENS,
  createFabExtensions,
  createHostAttributeAdjuster,
  groupFabTokens,
} from '../utils.ts';

export const DEFAULTS = ['tertiary', 'small', 'tertiary-container'] as const;

const COLORS = ['primary', 'secondary'] as const;
const TONAL_COLORS = ['primary-container', 'secondary-container'] as const;
const SIZES = ['large', 'medium'] as const;

const VARIANTS: readonly [
  'tertiary',
  'small',
  'tertiary-container',
  'primary',
  'secondary',
  'primary-container',
  'secondary-container',
  'large',
  'medium',
] = [...DEFAULTS, ...COLORS, ...TONAL_COLORS, ...SIZES] as const;

type Variant = (typeof VARIANTS)[number];

const extendedAttribute = attribute('extended');
const tonalAttribute = attribute('tonal');

function variantScope(variant: Variant) {
  if ((COLORS as readonly string[]).includes(variant)) {
    return { name: 'color', value: variant } as const;
  }

  if ((TONAL_COLORS as readonly string[]).includes(variant)) {
    return {
      name: 'color',
      value: variant.replace('-container', ''),
    } as const;
  }

  if ((SIZES as readonly string[]).includes(variant)) {
    return { name: 'size', value: variant } as const;
  }

  return undefined;
}

function variantAttributes(variant: Variant): readonly Param[] {
  const attrs = [extendedAttribute];

  if (variant === 'tertiary-container') {
    attrs.push(tonalAttribute);
  }

  if ((TONAL_COLORS as readonly string[]).includes(variant)) {
    attrs.push(tonalAttribute);
  }

  return attrs;
}

const createPackage = (variant: Variant) => {
  const setName = `md.comp.extended-fab.${variant}`;
  const attributes = variantAttributes(variant);
  const scope = variantScope(variant);

  let builder = t
    .set(setName)
    .group(groupFabTokens)
    .allowTokens(FAB_ALLOWED_TOKENS)
    .extend(createFabExtensions(defaultEffectiveTokens.value))
    .adjustRender(createHostAttributeAdjuster(...attributes));

  if (variant === 'tertiary') {
    builder = builder.append({
      default: {
        'state-layer.color': `${setName}.pressed.state-layer.color`,
        direction: 'row',
        'container.width': CSSVariable.ref('container.height'),
      },
    });
  }

  if (scope) {
    builder = builder.scope(scope.name, scope.value);
  }

  return builder.build();
};

export const extendedTokens: ReadonlyArray<ReadonlySignal<TokenPackage>> =
  VARIANTS.map((variant) => computed(() => createPackage(variant)));
