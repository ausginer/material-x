import { computed, type ReadonlySignal } from '@preact/signals-core';
import { t } from '../../../.tproc/index.ts';
import type { TokenPackage } from '../../../.tproc/TokenPackage.ts';
import type { ProcessorAdjuster } from '../../../.tproc/utils.ts';
import {
  defaultFilledTokens,
  defaultSwitchFilledTokens,
  defaultSwitchTokens,
  defaultTokens,
} from '../default/tokens.ts';
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

const SET_NAME = 'md.comp.button.tonal';

const specialTokens = {
  'state-layer.color': `${SET_NAME}.pressed.state-layer.color`,
  'state-layer.opacity': `${SET_NAME}.pressed.state-layer.opacity`,
};

const specialSelectedTokens = {
  'state-layer.color': `${SET_NAME}.selected.pressed.state-layer.color`,
};

const renderer = createButtonScopedDeclarationRenderer({
  name: 'color',
  value: 'tonal',
  useState: true,
});

const createPackage = (
  adjuster: ProcessorAdjuster = (processor) => processor,
) =>
  adjuster(
    t
      .set(SET_NAME)
      .group(groupButtonTokens)
      .select(buttonAllowedTokensSelector)
      .adjustTokens(fixFullShape)
      .renderDeclarations(renderer),
  ).build();

export const tonalTokens: ReadonlySignal<TokenPackage> = computed(() =>
  createPackage((processor) =>
    processor
      .select(buttonMainTokenSelector)
      .append('default', specialTokens)
      .extend(
        createButtonExtensions(defaultTokens.value, defaultFilledTokens.value),
      ),
  ),
);

export const tonalSwitchTokens: ReadonlySignal<TokenPackage> = computed(() =>
  createPackage((processor) =>
    processor
      .select(
        buttonSwitchTokenSelector,
        notDisabledTokenSelector,
        omitSelectedShape,
      )
      .append('selected.default', specialSelectedTokens)
      .extend(
        createButtonExtensions(
          defaultTokens.value,
          defaultFilledTokens.value,
          defaultSwitchTokens.value,
          defaultSwitchFilledTokens.value,
        ),
      ),
  ),
);
