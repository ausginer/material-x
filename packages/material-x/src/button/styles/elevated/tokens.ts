import { computed, type ReadonlySignal } from '@preact/signals-core';
import { t } from '@ydinjs/tproc/index.js';
import type { TokenPackage } from '@ydinjs/tproc/TokenPackage.js';
import type { ProcessorAdjuster } from '@ydinjs/tproc/utils.js';
import * as CSSVariable from '@ydinjs/tproc/variable.js';
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
  omitBaseSpacing,
  omitSelectedShape,
} from '../utils.ts';

const SET_NAME = 'md.comp.button.elevated';

const specialTokens = {
  level: CSSVariable.ref('container-elevation'),
  'state-layer.color': `${SET_NAME}.pressed.state-layer.color`,
};

const specialSelectedTokens = {
  'state-layer.color': `${SET_NAME}.selected.pressed.state-layer.color`,
};

const renderer = createScopedDeclarationRenderer({
  name: 'color',
  value: 'elevated',
});

const createPackage = (adjuster: ProcessorAdjuster) =>
  adjuster(
    t
      .set(SET_NAME)
      .group(groupButtonTokens)
      .select(buttonAllowedTokensSelector, omitBaseSpacing)
      .adjustTokens(fixFullShape)
      .renderDeclarations(renderer),
  ).build();

export const elevatedTokens: ReadonlySignal<TokenPackage> = computed(() =>
  createPackage((processor) =>
    processor
      .select(mainTokenSelector)
      .append('default', specialTokens)
      .extend(
        createButtonExtensions(defaultTokens.value, defaultFilledTokens.value),
      ),
  ),
);

export const elevatedSwitchTokens: ReadonlySignal<TokenPackage> = computed(() =>
  createPackage((processor) =>
    processor
      .select(switchTokenSelector, omitSelectedShape)
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
