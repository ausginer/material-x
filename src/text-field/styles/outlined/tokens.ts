import { computed, type ReadonlySignal } from '@preact/signals-core';
import { t, type TokenPackage } from '../../../.tproc/index.ts';
import { attribute } from '../../../.tproc/selector.ts';
import type { ProcessorAdjuster } from '../../../.tproc/utils.ts';
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

function createPackage(adjuster: ProcessorAdjuster = (processor) => processor) {
  return adjuster(
    t
      .set('md.comp.outlined-text-field')
      .group(groupTextFieldTokens)
      .select(textFieldAllowedTokensSelector),
  ).build();
}

export const outlinedTokens: ReadonlySignal<TokenPackage> = computed(() =>
  createPackage((processor) =>
    processor
      .select(notDisabledTokenSelector, notErrorTokenSelector)
      .extend(createTextFieldExtensions())
      .renderDeclarations(
        createTextFieldScopedDeclarationRenderer(attribute('outlined')),
      ),
  ),
);

export const outlinedErrorTokens: ReadonlySignal<TokenPackage> = computed(() =>
  createPackage((processor) =>
    processor
      .select(notDisabledTokenSelector, errorTokenSelector)
      .extend(createTextFieldExtensions(outlinedTokens.value))
      .renderDeclarations(
        createTextFieldScopedDeclarationRenderer(attribute('outlined')),
      ),
  ),
);

export const outlinedDisabledTokens: ReadonlySignal<TokenPackage> = computed(
  () =>
    createPackage((processor) =>
      processor
        .select(disabledTokenSelector, notErrorTokenSelector)
        .extend(createTextFieldExtensions(outlinedTokens.value))
        .renderDeclarations(
          createTextFieldScopedDeclarationRenderer(attribute('outlined')),
        ),
    ),
);
