import { computed, type ReadonlySignal } from '@preact/signals-core';
import { t } from '../../../.tproc/index.ts';
import {
  attribute,
  pseudoElement,
  type Param,
} from '../../../.tproc/selector.ts';
import type {
  RenderAdjuster,
  TokenPackage,
} from '../../../.tproc/TokenPackage.ts';
import type { Grouper } from '../../../.tproc/utils.ts';
import { defaultEffectiveTokens } from '../default/tokens.ts';
import {
  BUTTON_ALLOWED_TOKENS,
  ICON_WIDTH_TOKENS,
  createButtonExtensions,
  createHostAttributeAdjuster,
  createVariantStateAdjuster,
  dropNonSelectionBlocks,
  dropSelectionDisabled,
  fixFullShape,
  groupButtonTokens,
  omitTokensInPaths,
  replaceSelectionStateSelector,
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

const omitSelectedShape = omitTokensInPaths(
  ['container.shape.round', 'container.shape.square'],
  (path) => path === 'selected.default',
);

function variantScope(
  variant: string,
): Readonly<{ name: string; value: string }> | undefined {
  if ((DEFAULTS as readonly string[]).includes(variant)) {
    return undefined;
  }

  if ((COLORS as readonly string[]).includes(variant)) {
    return { name: 'color', value: variant };
  }

  if ((SIZES as readonly string[]).includes(variant)) {
    return { name: 'size', value: variant };
  }

  return undefined;
}

const createVariantPackage = (
  variant: string,
  ...extraAdjusters: readonly RenderAdjuster[]
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

  const scopedAdjuster = scope
    ? [createVariantStateAdjuster(scope.name, scope.value)]
    : [];

  let builder = t
    .set(setName)
    .group(groupButtonTokens)
    .allowTokens(BUTTON_ALLOWED_TOKENS)
    .adjustTokens(fixFullShape)
    .append({
      default: specialTokens,
      'unselected.default': specialUnselectedTokens,
      'selected.default': specialSelectedTokens,
    })
    .extend(createButtonExtensions(baseTokens.value))
    .adjustRender(
      dropSelectionDisabled,
      omitSelectedShape,
      ...scopedAdjuster,
      ...extraAdjusters,
    );

  if (scope) {
    builder = builder.scope(scope.name, scope.value);
  }

  return builder.build();
};

export const variantTokens: ReadonlyArray<ReadonlySignal<TokenPackage>> =
  VARIANTS.map((variant) => computed(() => createVariantPackage(variant)));

export const variantSwitchTokens: ReadonlyArray<ReadonlySignal<TokenPackage>> =
  VARIANTS.map((variant) =>
    computed(() =>
      createVariantPackage(
        variant,
        dropNonSelectionBlocks,
        replaceSelectionStateSelector,
      ),
    ),
  );

function widthGroup(width: string): Grouper {
  const prefix = `${width}.`;

  return (tokenName) => {
    const normalized = tokenName.includes(prefix)
      ? tokenName.replace(prefix, '')
      : `__skip.${tokenName}`;

    return groupButtonTokens(normalized);
  };
}

function addSlottedSelector(selector: string, param: Param): string {
  const slotted = pseudoElement('slotted', param);

  return selector
    .split(',')
    .map((entry) => `${entry.trim()} ${slotted}`)
    .join(', ');
}

function createWidthAdjuster(width: string): RenderAdjuster {
  const attr = attribute('width', width);
  const hostAdjuster = createHostAttributeAdjuster('width', width);

  return (block) => {
    const adjusted = hostAdjuster(block);
    const hostBlock = Array.isArray(adjusted) ? adjusted[0] : adjusted;

    if (!hostBlock || Array.isArray(hostBlock)) {
      return hostBlock;
    }

    if (block.path !== 'default') {
      return hostBlock;
    }

    const slottedSelector = addSlottedSelector(block.selector, attr);
    return [hostBlock, { ...block, selector: slottedSelector }];
  };
}

const createWidthPackage = (size: string, width: string): TokenPackage => {
  const scope = size === 'small' ? undefined : { name: 'size', value: size };
  const scopedAdjuster = scope
    ? [createVariantStateAdjuster(scope.name, scope.value)]
    : [];

  let builder = t
    .set(`md.comp.icon-button.${size}`)
    .group(widthGroup(width))
    .allowTokens(ICON_WIDTH_TOKENS)
    .adjustTokens(fixFullShape)
    .extend(createButtonExtensions(baseTokens.value))
    .adjustRender(
      dropSelectionDisabled,
      ...scopedAdjuster,
      createWidthAdjuster(width),
    );

  if (scope) {
    builder = builder.scope(scope.name, scope.value);
  }

  return builder.build();
};

export const widthTokens: ReadonlyArray<ReadonlySignal<TokenPackage>> =
  WIDTHS.flatMap((width) =>
    SIZES.map((size) => computed(() => createWidthPackage(size, width))),
  );
