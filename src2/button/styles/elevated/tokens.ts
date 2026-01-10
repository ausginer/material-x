import { computed, type ReadonlySignal } from '@preact/signals-core';
import { t } from '../../../.tproc/index.ts';
import type { TokenPackage } from '../../../.tproc/TokenPackage.ts';
import type { GroupSelector } from '../../../.tproc/utils.ts';
import * as CSSVariable from '../../../.tproc/variable.ts';
import { defaultEffectiveTokens } from '../default/tokens.ts';
import {
  buttonAllowedTokensSelector,
  buttonMainTokenSelector,
  buttonSwitchTokenSelector,
  createButtonExtensions,
  createButtonScopedDeclarationRenderer,
  fixFullShape,
  groupButtonTokens,
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

const renderer = createButtonScopedDeclarationRenderer({
  name: 'color',
  value: 'elevated',
  useState: true,
});

const createPackage = (...groupSelectors: readonly GroupSelector[]) =>
  t
    .set(SET_NAME)
    .group(groupButtonTokens)
    .select(...groupSelectors, buttonAllowedTokensSelector)
    .adjustTokens(fixFullShape)
    .append('default', specialTokens)
    .append('selected.default', specialSelectedTokens)
    .extend(createButtonExtensions(defaultEffectiveTokens.value))
    .renderDeclarations(renderer)
    .build();

export const elevatedTokens: ReadonlySignal<TokenPackage> = computed(() =>
  createPackage(buttonMainTokenSelector),
);

export const elevatedSwitchTokens: ReadonlySignal<TokenPackage> = computed(() =>
  createPackage(buttonSwitchTokenSelector, omitSelectedShape),
);
