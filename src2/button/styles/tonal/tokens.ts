import { computed, type ReadonlySignal } from '@preact/signals-core';
import { t } from '../../../.tproc/index.ts';
import { attribute } from '../../../.tproc/selector.ts';
import type { TokenPackage } from '../../../.tproc/TokenPackage.ts';
import type { GroupSelector } from '../../../.tproc/utils.ts';
import { defaultEffectiveTokens } from '../default/tokens.ts';
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
const COLOR_ATTRIBUTE = 'color';
const COLOR_VALUE = 'tonal';

const specialTokens = {
  'state-layer.color': `${SET_NAME}.pressed.state-layer.color`,
  'state-layer.opacity': `${SET_NAME}.pressed.state-layer.opacity`,
};

const specialSelectedTokens = {
  'state-layer.color': `${SET_NAME}.selected.pressed.state-layer.color`,
};

const renderer = createButtonScopedDeclarationRenderer(
  attribute(COLOR_ATTRIBUTE, COLOR_VALUE),
);

const createPackage = (...groupSelectors: readonly GroupSelector[]) =>
  t
    .set(SET_NAME)
    .group(groupButtonTokens)
    .select(...groupSelectors, buttonAllowedTokensSelector)
    .adjustTokens(fixFullShape)
    .append({
      default: specialTokens,
      'selected.default': specialSelectedTokens,
    })
    .extend(createButtonExtensions(defaultEffectiveTokens.value))
    .renderDeclarations(renderer)
    .build();

export const tonalTokens: ReadonlySignal<TokenPackage> = computed(() =>
  createPackage(buttonMainTokenSelector),
);

export const tonalSwitchTokens: ReadonlySignal<TokenPackage> = computed(() =>
  createPackage(
    buttonSwitchTokenSelector,
    notDisabledTokenSelector,
    omitSelectedShape,
  ),
);
