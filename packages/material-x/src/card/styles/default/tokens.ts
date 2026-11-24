import { computed, type ReadonlySignal } from '@preact/signals-core';
import { t, type TokenPackage } from '@ydinjs/tproc/index.js';
import * as CSSVariable from '@ydinjs/tproc/variable.js';
import {
  cardAllowedTokensSelector,
  createCardDeclarationRenderer,
  enabledTokenSelector,
  groupCardTokens,
} from '../utils.ts';

const specialTokens = {
  'shadow.color': CSSVariable.ref('container.shadow-color'),
};

export const defaultTokens: ReadonlySignal<TokenPackage> = computed(() =>
  t
    .set('md.comp.filled-card')
    .group(groupCardTokens)
    .select(enabledTokenSelector, cardAllowedTokensSelector)
    .renderDeclarations(createCardDeclarationRenderer())
    .append('default', specialTokens)
    .build(),
);
