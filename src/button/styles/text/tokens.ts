import { computed, type ReadonlySignal } from '@preact/signals-core';
import { t } from '../../../.tproc/index.ts';
import type { TokenPackage } from '../../../.tproc/TokenPackage.ts';
import { defaultFilledTokens, defaultTokens } from '../default/tokens.ts';
import {
  buttonAllowedTokensSelector,
  buttonMainTokenSelector,
  createButtonExtensions,
  createButtonScopedDeclarationRenderer,
  fixFullShape,
  groupButtonTokens,
} from '../utils.ts';

const SET_NAME = 'md.comp.button.text';

const specialTokens = {
  'container.color': 'transparent',
  'state-layer.color': `${SET_NAME}.pressed.state-layer.color`,
};

const renderer = createButtonScopedDeclarationRenderer({
  name: 'color',
  value: 'text',
  useState: true,
});

export const textTokens: ReadonlySignal<TokenPackage> = computed(() =>
  t
    .set(SET_NAME)
    .group(groupButtonTokens)
    .select(buttonAllowedTokensSelector)
    .select(buttonMainTokenSelector)
    .append('default', specialTokens)
    .extend(
      createButtonExtensions(defaultTokens.value, defaultFilledTokens.value),
    )
    .adjustTokens(fixFullShape)
    .renderDeclarations(renderer)
    .build(),
);
