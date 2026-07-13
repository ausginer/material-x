import { computed, type ReadonlySignal } from '@preact/signals-core';
import { t } from '@ydinjs/tproc/index.js';
import type { TokenPackage } from '@ydinjs/tproc/TokenPackage.js';
import type { ProcessorAdjuster } from '@ydinjs/tproc/utils.js';
import {
  defaultFilledTokens,
  defaultSwitchFilledTokens,
  defaultSwitchTokens,
  defaultTokens,
} from '../default/tokens.ts';
import {
  buttonAllowedTokensSelector,
  mainTokenSelector,
  switchTokenSelector,
  createButtonExtensions,
  createScopedDeclarationRenderer,
  fixFullShape,
  groupButtonTokens,
  notDisabledTokenSelector,
  omitBaseSpacing,
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

const renderer = createScopedDeclarationRenderer({
  name: 'color',
  value: 'tonal',
});

const createPackage = (
  adjuster: ProcessorAdjuster = (processor) => processor,
) =>
  adjuster(
    t
      .set(SET_NAME)
      .group(groupButtonTokens)
      .select(buttonAllowedTokensSelector, omitBaseSpacing)
      .adjustTokens(fixFullShape)
      .renderDeclarations(renderer),
  ).build();

export const tonalTokens: ReadonlySignal<TokenPackage> = computed(() =>
  createPackage((processor) =>
    processor
      .select(mainTokenSelector)
      .append('default', specialTokens)
      .extend(
        createButtonExtensions(defaultTokens.value, defaultFilledTokens.value),
      ),
  ),
);

export const tonalSwitchTokens: ReadonlySignal<TokenPackage> = computed(() =>
  createPackage((processor) =>
    processor
      .select(switchTokenSelector, notDisabledTokenSelector, omitSelectedShape)
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
