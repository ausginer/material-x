import { computed, type ReadonlySignal } from '@preact/signals-core';
import { t } from '../../../.tproc/index.ts';
import {
  attribute,
  pseudoElement,
  selector,
} from '../../../.tproc/selector.ts';
import type {
  DeclarationBlockRenderer,
  TokenPackage,
} from '../../../.tproc/TokenPackage.ts';
import {
  createAllowedTokensSelector,
  type Grouper,
  type ProcessorAdjuster,
} from '../../../.tproc/utils.ts';
import {
  defaultFilledTokens,
  defaultSwitchFilledTokens,
  defaultSwitchTokens,
  defaultTokens,
} from '../default/tokens.ts';
import {
  BUTTON_STATE_MAP,
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

function variantScope(variant: string) {
  if ((DEFAULTS as readonly string[]).includes(variant)) {
    return undefined;
  }

  if ((COLORS as readonly string[]).includes(variant)) {
    return {
      name: 'color',
      value: variant,
      useState: true,
    };
  }

  if ((SIZES as readonly string[]).includes(variant)) {
    return {
      name: 'size',
      value: variant,
      useState: true,
    };
  }

  return undefined;
}

const createPackage = (
  setName: string,
  renderer: DeclarationBlockRenderer,
  adjuster: ProcessorAdjuster = (processor) => processor,
): TokenPackage =>
  adjuster(
    t
      .set(setName)
      .group(groupButtonTokens)
      .select(buttonAllowedTokensSelector)
      .adjustTokens(fixFullShape)
      .renderDeclarations(renderer),
  ).build();

export const variantTokens: ReadonlyArray<ReadonlySignal<TokenPackage>> =
  VARIANTS.map((variant) =>
    computed(() => {
      const setName = `md.comp.icon-button.${variant}`;

      return createPackage(
        setName,
        createButtonScopedDeclarationRenderer(variantScope(variant)),
        (processor) =>
          processor
            .select(buttonMainTokenSelector)
            .append('default', {
              ...(variant === 'standard'
                ? { 'container.color': 'transparent' }
                : {}),
              'state-layer.color': `${setName}.pressed.state-layer.color`,
            })
            .extend(
              createButtonExtensions(
                defaultTokens.value,
                defaultFilledTokens.value,
              ),
            ),
      );
    }),
  );

export const variantSwitchTokens: ReadonlyArray<ReadonlySignal<TokenPackage>> =
  VARIANTS.map((variant) =>
    computed(() => {
      const setName = `md.comp.icon-button.${variant}`;

      return createPackage(
        setName,
        createButtonScopedDeclarationRenderer(variantScope(variant)),
        (processor) =>
          processor
            .select(
              buttonSwitchTokenSelector,
              notDisabledTokenSelector,
              omitSelectedShape,
            )
            .append('unselected.default', {
              'state-layer.color': `${setName}.unselected.pressed.state-layer.color`,
            })
            .append('selected.default', {
              'state-layer.color': `${setName}.selected.pressed.state-layer.color`,
            })
            .extend(
              createButtonExtensions(
                defaultTokens.value,
                defaultFilledTokens.value,
                defaultSwitchTokens.value,
                defaultSwitchFilledTokens.value,
              ),
            ),
      );
    }),
  );

function widthGroup(width: string): Grouper {
  const prefix = `${width}.`;

  return (tokenName) => {
    if (!tokenName.includes(prefix)) {
      return null;
    }

    return groupButtonTokens(tokenName.replace(prefix, ''));
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
    const stateParam = path === 'default' ? null : BUTTON_STATE_MAP[path];
    const selectors = [
      selector(':host', sizeAttribute, widthAttribute, stateParam),
    ];

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

const widthAllowedTokenSelector = createAllowedTokensSelector([
  'leading-space',
  'trailing-space',
]);

const createWidthPackage = (size: string, width: string): TokenPackage =>
  t
    .set(`md.comp.icon-button.${size}`)
    .group(widthGroup(width))
    .select(buttonMainTokenSelector, widthAllowedTokenSelector)
    .adjustTokens(fixFullShape)
    .extend(
      createButtonExtensions(defaultTokens.value, defaultFilledTokens.value),
    )
    .renderDeclarations(createWidthRenderer(size, width))
    .build();

export const widthTokens: ReadonlyArray<ReadonlySignal<TokenPackage>> =
  WIDTHS.flatMap((width) =>
    SIZES.map((size) => computed(() => createWidthPackage(size, width))),
  );
