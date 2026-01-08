import { computed, type ReadonlySignal } from '@preact/signals-core';
import { t } from '../../../.tproc/index.ts';
import {
  attribute,
  pseudoElement,
  selector,
  type Param,
} from '../../../.tproc/selector.ts';
import type {
  DeclarationBlockRenderer,
  TokenPackage,
} from '../../../.tproc/TokenPackage.ts';
import {
  componentStateMap,
  type GroupSelector,
} from '../../../.tproc/utils.ts';
import { defaultEffectiveTokens } from '../default/tokens.ts';
import {
  buttonAllowedTokensSelector,
  buttonMainTokenSelector,
  buttonSwitchTokenSelector,
  createButtonExtensions,
  createButtonScopedDeclarationRenderer,
  fixFullShape,
  groupButtonTokens,
  notDisabledTokenSelector,
  omitSelectedShape,
} from '../utils.ts';

export const DEFAULTS = ['small', 'filled'] as const;
export const COLORS = ['filled', 'tonal', 'standard'] as const;
export const SIZES = ['small', 'xsmall', 'medium', 'large', 'xlarge'] as const;

export const VARIANTS = [
  'small',
  'filled',
  'tonal',
  'standard',
  'xsmall',
  'medium',
  'large',
  'xlarge',
] as const;

const WIDTHS = ['wide', 'narrow'] as const;
const baseTokens = defaultEffectiveTokens;

function variantScope(variant: string): Param | undefined {
  if ((DEFAULTS as readonly string[]).includes(variant)) {
    return undefined;
  }

  if ((COLORS as readonly string[]).includes(variant)) {
    return attribute('color', variant);
  }

  if ((SIZES as readonly string[]).includes(variant)) {
    return attribute('size', variant);
  }

  return undefined;
}

const createVariantPackage = (
  variant: string,
  ...groupSelectors: readonly GroupSelector[]
): TokenPackage => {
  const setName = `md.comp.icon-button.${variant}`;
  const scope = variantScope(variant);
  const specialTokens = {
    ...(variant === 'standard' ? { 'container.color': 'transparent' } : {}),
    'state-layer.color': `${setName}.pressed.state-layer.color`,
  };
  const specialUnselectedTokens = {
    'state-layer.color': `${setName}.unselected.pressed.state-layer.color`,
  };
  const specialSelectedTokens = {
    'state-layer.color': `${setName}.selected.pressed.state-layer.color`,
  };

  return t
    .set(setName)
    .group(groupButtonTokens)
    .select(...groupSelectors, buttonAllowedTokensSelector)
    .adjustTokens(fixFullShape)
    .append({
      default: specialTokens,
      'unselected.default': specialUnselectedTokens,
      'selected.default': specialSelectedTokens,
    })
    .extend(createButtonExtensions(baseTokens.value))
    .renderDeclarations(createButtonScopedDeclarationRenderer(scope))
    .build();
};

export const variantTokens: ReadonlyArray<ReadonlySignal<TokenPackage>> =
  VARIANTS.map((variant) =>
    computed(() => createVariantPackage(variant, buttonMainTokenSelector)),
  );

export const variantSwitchTokens: ReadonlyArray<ReadonlySignal<TokenPackage>> =
  VARIANTS.map((variant) =>
    computed(() =>
      createVariantPackage(
        variant,
        buttonSwitchTokenSelector,
        notDisabledTokenSelector,
        omitSelectedShape,
      ),
    ),
  );

function widthGroup(width: string): (tokenName: string) => {
  path: string;
  name: string;
} {
  const prefix = `${width}.`;

  return (tokenName) => {
    const normalized = tokenName.includes(prefix)
      ? tokenName.replace(prefix, '')
      : `__skip.${tokenName}`;

    return groupButtonTokens(normalized);
  };
}

function createWidthRenderer(
  size: string,
  width: string,
): DeclarationBlockRenderer {
  const sizeAttribute = attribute('size', size);
  const widthAttribute = attribute('width', width);
  const slotted = pseudoElement('slotted', widthAttribute);

  return (path, declarations) => {
    const stateParam = path === 'default' ? null : componentStateMap[path];
    const baseSelector = selector(
      ':host',
      sizeAttribute,
      widthAttribute,
      stateParam,
    );
    const selectors = [baseSelector];

    if (path === 'default') {
      const hostSelector = selector(':host', sizeAttribute);
      selectors.push(`${hostSelector} ${slotted}`);
    }

    return {
      path,
      declarations,
      selectors,
    };
  };
}

const createWidthPackage = (size: string, width: string): TokenPackage =>
  t
    .set(`md.comp.icon-button.${size}`)
    .group(widthGroup(width))
    .select(buttonMainTokenSelector)
    .allowTokens(['leading-space', 'trailing-space'])
    .adjustTokens(fixFullShape)
    .extend(createButtonExtensions(baseTokens.value))
    .renderDeclarations(createWidthRenderer(size, width))
    .build();

export const widthTokens: ReadonlyArray<ReadonlySignal<TokenPackage>> =
  WIDTHS.flatMap((width) =>
    SIZES.map((size) => computed(() => createWidthPackage(size, width))),
  );
