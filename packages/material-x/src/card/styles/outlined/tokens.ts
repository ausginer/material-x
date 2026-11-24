import { computed, type ReadonlySignal } from '@preact/signals-core';
import { t, type TokenPackage } from '@ydinjs/tproc/index.js';
import { defaultTokens } from '../default/tokens.ts';
import {
  cardAllowedTokensSelector,
  createCardDeclarationRenderer,
  enabledTokenSelector,
  groupCardTokens,
} from '../utils.ts';

export const outlinedTokens: ReadonlySignal<TokenPackage> = computed(() =>
  t
    .set('md.comp.outlined-card')
    .group(groupCardTokens)
    .select(enabledTokenSelector, cardAllowedTokensSelector)
    .renderDeclarations(createCardDeclarationRenderer('outlined'))
    .extend((m) => {
      m.state('default').extends(defaultTokens.value.effective('default'));
    })
    .build(),
);
