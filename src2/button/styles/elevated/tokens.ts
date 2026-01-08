import { computed, type ReadonlySignal } from '@preact/signals-core';
import { t } from '../../../.tproc/index.ts';
import { attribute } from '../../../.tproc/selector.ts';
import type { TokenPackage } from '../../../.tproc/TokenPackage.ts';
import type { GroupSelector } from '../../../.tproc/utils.ts';
import * as CSSVariable from '../../../.tproc/variable.ts';
import { defaultEffectiveTokens } from '../default/tokens.ts';
import {
  BUTTON_ALLOWED_TOKENS,
  buttonMainTokenSelector,
  buttonSwitchTokenSelector,
  createButtonExtensions,
  createButtonScopedDeclarationRenderer,
  fixFullShape,
  groupButtonTokens,
  omitSelectedShape,
} from '../utils.ts';

const SET_NAME = 'md.comp.button.elevated';
const COLOR_ATTRIBUTE = 'color';
const COLOR_VALUE = 'elevated';

const specialTokens = {
  level: CSSVariable.ref('container-elevation'),
  'state-layer.color': `${SET_NAME}.pressed.state-layer.color`,
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
    .select(...groupSelectors)
    .allowTokens(BUTTON_ALLOWED_TOKENS)
    .adjustTokens(fixFullShape)
    .append({
      default: specialTokens,
      'selected.default': specialSelectedTokens,
    })
    .extend(createButtonExtensions(defaultEffectiveTokens.value))
    .renderDeclarations(renderer)
    .build();

export const elevatedTokens: ReadonlySignal<TokenPackage> = computed(() =>
  createPackage(buttonMainTokenSelector),
);

export const elevatedSwitchTokens: ReadonlySignal<TokenPackage> = computed(() =>
  createPackage(buttonSwitchTokenSelector, omitSelectedShape),
);
