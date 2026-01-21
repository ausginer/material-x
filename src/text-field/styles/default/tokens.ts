import { computed, type ReadonlySignal } from '@preact/signals-core';
import motionEffects from '../../../.tproc/default/motion-effects.ts';
import { t, type TokenPackage } from '../../../.tproc/index.ts';
import { pseudoClass } from '../../../.tproc/selector.ts';
import type { ProcessorAdjuster, TokenSet } from '../../../.tproc/utils.ts';
import {
  createTextFieldExtensions,
  createTextFieldScopedDeclarationRenderer,
  disabledTokenSelector,
  errorTokenSelector,
  groupTextFieldTokens,
  notDisabledTokenSelector,
  notErrorTokenSelector,
  textFieldAllowedTokensSelector,
} from '../utils.ts';

export type Types = 'filled' | 'outlined';

// While there are no tokens for the sizes in this set, they are defined in the
// measurements section of https://m3.material.io/components/text-fields/specs.
const specialFilledTokens: TokenSet = {
  'container.icon.padding.inline': '12px',
  'container.padding.inline': '16px',
  'supporting-text.gap': '4px',
  'container.focus.padding.block': '8px',
  'input-text.prefix.gap': '2px',
  'input-text.suffix.gap': '2px',
  'focus.easing': motionEffects['expressive.fast-spatial'],
  'focus.duration': motionEffects['expressive.fast-spatial.duration'],
  'state-layer.color': 'md.comp.filled-text-field.hover.state-layer.color',
  // It looks like there is some misalignment in token names since
  // active-indicator.height is apparently active-indicator.thickness but they
  // coexist. So here we rename it to active-indicator.thickness to have them
  // aligned.
  'active-indicator.thickness':
    'md.comp.filled-text-field.active-indicator.height',
};

function createPackage(
  type: Types,
  adjuster: ProcessorAdjuster = (processor) => processor,
) {
  const setName = `md.comp.${type}-text-field`;

  return adjuster(
    t
      .set(setName)
      .group(groupTextFieldTokens)
      .select(textFieldAllowedTokensSelector),
  ).build();
}

export const defaultTokens: ReadonlySignal<TokenPackage> = computed(() =>
  createPackage('filled', (processor) =>
    processor
      .select(notDisabledTokenSelector, notErrorTokenSelector)
      .append('default', specialFilledTokens)
      .extend(createTextFieldExtensions())
      .renderDeclarations(createTextFieldScopedDeclarationRenderer()),
  ),
);

export const defaultErrorTokens: ReadonlySignal<TokenPackage> = computed(() =>
  createPackage('filled', (processor) =>
    processor
      .select(notDisabledTokenSelector, errorTokenSelector)
      .extend(createTextFieldExtensions(defaultTokens.value))
      .renderDeclarations(
        createTextFieldScopedDeclarationRenderer(pseudoClass('state', 'error')),
      ),
  ),
);

export const defaultDisabledTokens: ReadonlySignal<TokenPackage> = computed(
  () =>
    createPackage('filled', (processor) =>
      processor
        .select(disabledTokenSelector, notErrorTokenSelector)
        .extend(createTextFieldExtensions(defaultTokens.value))
        .renderDeclarations(
          createTextFieldScopedDeclarationRenderer(pseudoClass('disabled')),
        ),
    ),
);

export const outlinedTokens: ReadonlySignal<TokenPackage> = computed(() =>
  createPackage('outlined', (processor) =>
    processor
      .select(notDisabledTokenSelector, notErrorTokenSelector)
      .extend(createTextFieldExtensions(defaultTokens.value)),
  ),
);
